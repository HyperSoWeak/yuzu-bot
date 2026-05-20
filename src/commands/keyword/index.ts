import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { KeywordKind, MatchMode } from '@prisma/client';
import type { Command } from '@/core/command/types.js';
import { CommandError } from '@/core/command/errors.js';
import { recordAudit } from '@/core/audit-log.js';
import {
  addReply,
  addTrigger,
  listReplies,
  listTriggers,
  removeReplyById,
  removeTrigger,
} from '@/features/keyword/service.js';
import { prisma } from '@/db/client.js';

const KIND_CHOICES = [
  { name: 'stat (累積統計)', value: 'STAT' },
  { name: 'reply (純回覆)', value: 'REPLY' },
] as const;

const MATCH_CHOICES = [
  { name: 'contains (預設, 子字串)', value: 'CONTAINS' },
  { name: 'equals (完全相符)', value: 'EQUALS' },
  { name: 'regex (正規表達式)', value: 'REGEX' },
] as const;

const data = new SlashCommandBuilder()
  .setName('keyword')
  .setDescription('管理關鍵字觸發與回覆')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addSubcommandGroup((g) =>
    g
      .setName('trigger')
      .setDescription('管理觸發詞')
      .addSubcommand((s) =>
        s
          .setName('add')
          .setDescription('新增觸發詞')
          .addStringOption((o) =>
            o
              .setName('kind')
              .setDescription('類型')
              .setRequired(true)
              .addChoices(...KIND_CHOICES),
          )
          .addStringOption((o) =>
            o.setName('group').setDescription('群組 key，例如 breakdown').setRequired(true),
          )
          .addStringOption((o) => o.setName('trigger').setDescription('觸發詞').setRequired(true))
          .addStringOption((o) =>
            o
              .setName('match')
              .setDescription('比對模式')
              .addChoices(...MATCH_CHOICES),
          ),
      )
      .addSubcommand((s) =>
        s
          .setName('remove')
          .setDescription('移除觸發詞')
          .addStringOption((o) =>
            o
              .setName('kind')
              .setDescription('類型')
              .setRequired(true)
              .addChoices(...KIND_CHOICES),
          )
          .addStringOption((o) => o.setName('group').setDescription('群組 key').setRequired(true))
          .addStringOption((o) => o.setName('trigger').setDescription('觸發詞').setRequired(true)),
      )
      .addSubcommand((s) =>
        s
          .setName('list')
          .setDescription('列出觸發詞')
          .addStringOption((o) =>
            o
              .setName('kind')
              .setDescription('類型')
              .addChoices(...KIND_CHOICES),
          )
          .addStringOption((o) => o.setName('group').setDescription('群組 key')),
      ),
  )
  .addSubcommandGroup((g) =>
    g
      .setName('reply')
      .setDescription('管理回覆池')
      .addSubcommand((s) =>
        s
          .setName('add')
          .setDescription('新增一則回覆')
          .addStringOption((o) =>
            o
              .setName('kind')
              .setDescription('類型')
              .setRequired(true)
              .addChoices(...KIND_CHOICES),
          )
          .addStringOption((o) => o.setName('group').setDescription('群組 key').setRequired(true))
          .addStringOption((o) =>
            o
              .setName('content')
              .setDescription('回覆內容 (最長 1500 字)')
              .setRequired(true)
              .setMaxLength(1500),
          ),
      )
      .addSubcommand((s) =>
        s
          .setName('remove')
          .setDescription('依 ID 移除回覆')
          .addStringOption((o) => o.setName('id').setDescription('reply id').setRequired(true)),
      )
      .addSubcommand((s) =>
        s
          .setName('list')
          .setDescription('列出回覆')
          .addStringOption((o) =>
            o
              .setName('kind')
              .setDescription('類型')
              .addChoices(...KIND_CHOICES),
          )
          .addStringOption((o) => o.setName('group').setDescription('群組 key')),
      ),
  )
  .addSubcommand((s) => s.setName('groups').setDescription('列出本 guild 所有 group keys'));

function truncate(s: string, max = 1900): string {
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
}

const keywordCommand: Command = {
  category: 'keyword',
  data,
  permissions: { adminOnly: true },
  async execute({ interaction, logger }) {
    const guildId = interaction.guildId;
    if (!guildId) throw new CommandError('此指令僅限在伺服器內使用。');

    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand(true);

    if (group === 'trigger' && sub === 'add') {
      const kind = interaction.options.getString('kind', true) as KeywordKind;
      const groupKey = interaction.options.getString('group', true);
      const trigger = interaction.options.getString('trigger', true);
      const match = (interaction.options.getString('match') ?? 'CONTAINS') as MatchMode;

      if (match === 'REGEX') {
        try {
          new RegExp(trigger);
        } catch {
          throw new CommandError('regex 語法錯誤。');
        }
      }

      const row = await addTrigger({ guildId, kind, groupKey, trigger, matchMode: match });
      await recordAudit({
        guildId,
        actorId: interaction.user.id,
        action: 'keyword.trigger.add',
        targetType: 'keyword_trigger',
        targetId: row.id,
        payload: { kind, groupKey, trigger, match },
      });
      logger.info({ id: row.id }, 'trigger added');
      await interaction.reply({
        content: `✅ 已新增 trigger \`${trigger}\` → \`${kind}/${groupKey}\` (${match})`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (group === 'trigger' && sub === 'remove') {
      const kind = interaction.options.getString('kind', true) as KeywordKind;
      const groupKey = interaction.options.getString('group', true);
      const trigger = interaction.options.getString('trigger', true);
      const count = await removeTrigger({ guildId, kind, groupKey, trigger });
      if (count === 0) throw new CommandError('找不到符合條件的 trigger。');
      await recordAudit({
        guildId,
        actorId: interaction.user.id,
        action: 'keyword.trigger.remove',
        targetType: 'keyword_trigger',
        payload: { kind, groupKey, trigger, count },
      });
      await interaction.reply({
        content: `🗑️ 已移除 ${count} 個 trigger。`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (group === 'trigger' && sub === 'list') {
      const kind = interaction.options.getString('kind') as KeywordKind | null;
      const groupKey = interaction.options.getString('group');
      const rows = await listTriggers({
        guildId,
        kind: kind ?? undefined,
        groupKey: groupKey ?? undefined,
      });
      if (rows.length === 0) {
        await interaction.reply({ content: '_(無)_', flags: MessageFlags.Ephemeral });
        return;
      }
      const lines = rows.map(
        (r) => `\`${r.kind}\` \`${r.groupKey}\` · ${r.matchMode} · \`${r.trigger}\``,
      );
      await interaction.reply({
        content: truncate(lines.join('\n')),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (group === 'reply' && sub === 'add') {
      const kind = interaction.options.getString('kind', true) as KeywordKind;
      const groupKey = interaction.options.getString('group', true);
      const content = interaction.options.getString('content', true);
      const row = await addReply({ guildId, kind, groupKey, content });
      await recordAudit({
        guildId,
        actorId: interaction.user.id,
        action: 'keyword.reply.add',
        targetType: 'keyword_reply',
        targetId: row.id,
        payload: { kind, groupKey, contentPreview: content.slice(0, 64) },
      });
      await interaction.reply({
        content: `✅ 已新增 reply \`${row.id}\` → \`${kind}/${groupKey}\``,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (group === 'reply' && sub === 'remove') {
      const id = interaction.options.getString('id', true);
      const ok = await removeReplyById(guildId, id);
      if (!ok) throw new CommandError('找不到 reply id。');
      await recordAudit({
        guildId,
        actorId: interaction.user.id,
        action: 'keyword.reply.remove',
        targetType: 'keyword_reply',
        targetId: id,
      });
      await interaction.reply({
        content: `🗑️ 已移除 reply \`${id}\``,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (group === 'reply' && sub === 'list') {
      const kind = interaction.options.getString('kind') as KeywordKind | null;
      const groupKey = interaction.options.getString('group');
      const rows = await listReplies({
        guildId,
        kind: kind ?? undefined,
        groupKey: groupKey ?? undefined,
      });
      if (rows.length === 0) {
        await interaction.reply({ content: '_(無)_', flags: MessageFlags.Ephemeral });
        return;
      }
      const lines = rows.map(
        (r) =>
          `\`${r.id}\` \`${r.kind}/${r.groupKey}\` · ${truncate(r.content, 80).replace(/`/g, 'ˋ')}`,
      );
      await interaction.reply({
        content: truncate(lines.join('\n')),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (sub === 'groups') {
      const rows = await prisma.keywordTrigger.findMany({
        where: { guildId },
        select: { kind: true, groupKey: true },
        distinct: ['kind', 'groupKey'],
        orderBy: [{ kind: 'asc' }, { groupKey: 'asc' }],
      });
      if (rows.length === 0) {
        await interaction.reply({ content: '_(無)_', flags: MessageFlags.Ephemeral });
        return;
      }
      const lines = rows.map((r) => `\`${r.kind}\` · \`${r.groupKey}\``);
      await interaction.reply({
        content: truncate(lines.join('\n')),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    throw new CommandError('未支援的子指令。');
  },
};

export const keywordCommands: readonly Command[] = [keywordCommand];
