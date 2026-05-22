import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { ChannelType } from 'discord.js';
import type { Command } from '@/core/command/types.js';
import { CommandError } from '@/core/command/errors.js';
import { getSettings, updateSettings, type SettingsPatch } from '@/features/settings/service.js';
import { recordAudit } from '@/core/audit-log.js';
import { executeShow, showSubcommand } from './show.js';

const data = new SlashCommandBuilder()
  .setName('settings')
  .setDescription('查詢或修改 guild 設定')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addSubcommand(showSubcommand)
  .addSubcommand((s) =>
    s
      .setName('keyword-stats')
      .setDescription('開啟 / 關閉關鍵字統計')
      .addBooleanOption((o) => o.setName('enabled').setDescription('啟用').setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName('keyword-replies')
      .setDescription('開啟 / 關閉關鍵字回覆')
      .addBooleanOption((o) => o.setName('enabled').setDescription('啟用').setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName('keyword-reply-cooldown')
      .setDescription('設定關鍵字回覆冷卻 (秒)')
      .addIntegerOption((o) =>
        o
          .setName('seconds')
          .setDescription('0~3600')
          .setRequired(true)
          .setMinValue(0)
          .setMaxValue(3600),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName('achievements')
      .setDescription('開啟 / 關閉成就系統')
      .addBooleanOption((o) => o.setName('enabled').setDescription('啟用').setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName('color-role')
      .setDescription('開啟 / 關閉 self color role')
      .addBooleanOption((o) => o.setName('enabled').setDescription('啟用').setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName('audit-log-channel')
      .setDescription('設定 audit log 鏡像頻道；留空為清除')
      .addChannelOption((o) =>
        o
          .setName('channel')
          .setDescription('文字頻道；不選即為清除')
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
      ),
  );

const settingsCommand: Command = {
  category: 'settings',
  data,
  permissions: { adminOnly: true },
  async execute({ interaction, logger }) {
    const guildId = interaction.guildId;
    if (!guildId) throw new CommandError('此指令僅限在伺服器內使用。');

    const sub = interaction.options.getSubcommand(true);

    if (sub === 'show') {
      await executeShow(interaction);
      return;
    }

    const before = await getSettings(guildId);
    let patch: SettingsPatch = {};
    let label = '';

    switch (sub) {
      case 'keyword-stats': {
        const v = interaction.options.getBoolean('enabled', true);
        patch = { keywordStatsEnabled: v };
        label = `關鍵字統計 = ${v}`;
        break;
      }
      case 'keyword-replies': {
        const v = interaction.options.getBoolean('enabled', true);
        patch = { keywordRepliesEnabled: v };
        label = `關鍵字回覆 = ${v}`;
        break;
      }
      case 'keyword-reply-cooldown': {
        const v = interaction.options.getInteger('seconds', true);
        patch = { keywordReplyCooldownSeconds: v };
        label = `關鍵字回覆冷卻 = ${v}s`;
        break;
      }
      case 'achievements': {
        const v = interaction.options.getBoolean('enabled', true);
        patch = { achievementsEnabled: v };
        label = `成就系統 = ${v}`;
        break;
      }
      case 'color-role': {
        const v = interaction.options.getBoolean('enabled', true);
        patch = { colorRoleEnabled: v };
        label = `Color role = ${v}`;
        break;
      }
      case 'audit-log-channel': {
        const c = interaction.options.getChannel('channel');
        patch = { auditLogChannelId: c?.id ?? null };
        label = c ? `Audit log 頻道 = <#${c.id}>` : 'Audit log 頻道已清除';
        break;
      }
      default:
        throw new CommandError(`未知子指令: ${sub}`);
    }

    await updateSettings(guildId, patch);

    const beforeSnapshot: Record<string, unknown> = {};
    const beforeRecord = before as unknown as Record<string, unknown>;
    for (const key of Object.keys(patch)) beforeSnapshot[key] = beforeRecord[key] ?? null;

    await recordAudit({
      guildId,
      actorId: interaction.user.id,
      action: 'settings.update',
      targetType: 'guild_settings',
      targetId: guildId,
      payload: { subcommand: sub, before: beforeSnapshot, after: patch },
    });

    logger.info({ sub, patch }, 'settings updated');
    await interaction.reply({ content: `✅ ${label}`, flags: MessageFlags.Ephemeral });
  },
};

export const settingsCommands: readonly Command[] = [settingsCommand];
