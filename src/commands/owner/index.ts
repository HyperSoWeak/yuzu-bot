import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ComponentType,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '@/core/command/types.js';
import { CommandError } from '@/core/command/errors.js';
import { recordAudit } from '@/core/audit-log.js';
import { logger } from '@/core/logger.js';
import { prisma } from '@/db/client.js';
import { loadConfig } from '@/config/config.js';
import { setStat, incrementStat } from '@/features/keyword/stats.js';
import { scanForKeywords } from '@/features/keyword/backfill.js';

function statGroupNames(): string[] {
  return loadConfig()
    .keyword.group.filter((g) => g.kind === 'STAT')
    .map((g) => g.name);
}

export function ownerSetStatAutocomplete(query: string): { name: string; value: string }[] {
  const q = query.toLowerCase();
  return statGroupNames()
    .filter((k) => (q ? k.toLowerCase().includes(q) : true))
    .slice(0, 25)
    .map((k) => ({ name: k, value: k }));
}

const data = new SlashCommandBuilder()
  .setName('owner')
  .setDescription('Owner-only 維運指令')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setDMPermission(false)
  .addSubcommand((s) => s.setName('ping').setDescription('owner-only 測試 ping'))
  .addSubcommand((s) => s.setName('health').setDescription('健康檢查 (DB / cache / ws)'))
  .addSubcommand((s) =>
    s
      .setName('say')
      .setDescription('讓 bot 在指定頻道發送訊息')
      .addStringOption((o) => o.setName('content').setDescription('訊息內容').setRequired(true))
      .addChannelOption((o) =>
        o
          .setName('channel')
          .setDescription('預設為目前頻道')
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName('set-stat')
      .setDescription('手動設定使用者統計值')
      .addUserOption((o) => o.setName('user').setDescription('目標使用者').setRequired(true))
      .addStringOption((o) =>
        o.setName('stat').setDescription('stat key').setRequired(true).setAutocomplete(true),
      )
      .addIntegerOption((o) =>
        o.setName('value').setDescription('新值').setRequired(true).setMinValue(0),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName('backfill')
      .setDescription('補回下線期間的 keyword 統計')
      .addStringOption((o) =>
        o
          .setName('since')
          .setDescription('起始時間 (ISO 8601，例：2026-05-23T10:00:00+08:00)')
          .setRequired(false),
      )
      .addIntegerOption((o) =>
        o
          .setName('hours')
          .setDescription('往回幾小時')
          .setMinValue(1)
          .setMaxValue(720)
          .setRequired(false),
      )
      .addStringOption((o) =>
        o.setName('until').setDescription('結束時間 (ISO 8601，不填則掃到現在)').setRequired(false),
      ),
  );

const ownerCommand: Command = {
  category: 'owner',
  data,
  permissions: { ownerOnly: true },
  async execute({ interaction }) {
    const sub = interaction.options.getSubcommand(true);

    if (sub === 'ping') {
      await interaction.reply({ content: 'pong (owner)', flags: MessageFlags.Ephemeral });
      return;
    }

    if (sub === 'health') {
      const start = Date.now();
      let dbOk = false;
      let dbMs = 0;
      try {
        const t = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        dbMs = Date.now() - t;
        dbOk = true;
      } catch {
        dbOk = false;
      }
      const embed = new EmbedBuilder()
        .setTitle('Health')
        .setColor(dbOk ? 0x55cc55 : 0xff5555)
        .addFields(
          { name: 'DB', value: dbOk ? `✅ ${dbMs}ms` : '❌ unreachable', inline: true },
          { name: 'WS', value: `${Math.round(interaction.client.ws.ping)}ms`, inline: true },
          {
            name: 'Uptime',
            value: `${Math.floor(process.uptime())}s`,
            inline: true,
          },
          {
            name: 'Memory',
            value: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
            inline: true,
          },
          { name: 'Total', value: `${Date.now() - start}ms`, inline: true },
        );
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    if (sub === 'say') {
      const content = interaction.options.getString('content', true);
      const channelOpt = interaction.options.getChannel('channel');
      const channelId = channelOpt?.id ?? interaction.channelId;
      if (!channelId) throw new CommandError('無法決定發送頻道。');
      const channel = await interaction.client.channels.fetch(channelId).catch(() => null);
      if (!channel || !channel.isTextBased() || !channel.isSendable())
        throw new CommandError('無法在該頻道發送訊息。');
      const msg = await channel.send({ content });
      await recordAudit({
        guildId: interaction.guildId ?? 'dm',
        actorId: interaction.user.id,
        action: 'owner.say',
        targetType: 'channel',
        targetId: channelId,
        payload: { messageId: msg.id, preview: content.slice(0, 200) },
      });
      await interaction.reply({ content: `✅ 已發送 → ${msg.url}`, flags: MessageFlags.Ephemeral });
      return;
    }

    if (sub === 'set-stat') {
      const guildId = interaction.guildId;
      if (!guildId) throw new CommandError('此指令僅限在伺服器內使用。');
      const user = interaction.options.getUser('user', true);
      const statKey = interaction.options.getString('stat', true);
      const value = interaction.options.getInteger('value', true);
      const validKeys = statGroupNames();
      if (!validKeys.includes(statKey))
        throw new CommandError(
          `無效的 stat key：\`${statKey}\`。\n有效值：${validKeys.map((k) => `\`${k}\``).join('、') || '（尚未設定任何 STAT group）'}`,
        );
      const newVal = await setStat({ userId: user.id, statKey, value, guildId });
      await recordAudit({
        guildId,
        actorId: interaction.user.id,
        action: 'owner.set_stat',
        targetType: 'user_stat',
        targetId: user.id,
        payload: { statKey, value: newVal },
      });
      await interaction.reply({
        content: `✅ <@${user.id}> · \`${statKey}\` = ${newVal}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (sub === 'backfill') {
      await handleBackfill(interaction);
      return;
    }

    throw new CommandError('未支援的子指令。');
  },
};

function formatDate(ms: number): string {
  return new Date(ms).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

async function handleBackfill(interaction: ChatInputCommandInteraction): Promise<void> {
  const guild = interaction.guild;
  if (!guild) throw new CommandError('此指令僅限在伺服器內使用。');

  const sinceStr = interaction.options.getString('since');
  const hours = interaction.options.getInteger('hours');
  const untilStr = interaction.options.getString('until');

  if (!sinceStr && !hours) throw new CommandError('請提供 `since` 或 `hours` 其中一個參數。');

  let sinceMs: number;
  if (sinceStr) {
    sinceMs = new Date(sinceStr).getTime();
    if (Number.isNaN(sinceMs))
      throw new CommandError(
        '`since` 格式無效，請使用 ISO 8601（例：`2026-05-23T10:00:00+08:00`）。',
      );
    if (sinceMs >= Date.now()) throw new CommandError('`since` 不能是未來時間。');
  } else {
    sinceMs = Date.now() - hours! * 60 * 60 * 1000;
  }

  let untilMs: number | undefined;
  if (untilStr) {
    untilMs = new Date(untilStr).getTime();
    if (Number.isNaN(untilMs))
      throw new CommandError(
        '`until` 格式無效，請使用 ISO 8601（例：`2026-04-01T00:00:00+08:00`）。',
      );
    if (untilMs >= Date.now()) throw new CommandError('`until` 不能是未來時間。');
    if (untilMs <= sinceMs) throw new CommandError('`until` 必須晚於 `since`。');
  }

  const sinceDisplay = formatDate(sinceMs);
  const untilDisplay = untilMs ? formatDate(untilMs) : '現在';
  const id = interaction.id;

  const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`bf-ok-${id}`)
      .setLabel('確認掃描')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`bf-no-${id}`).setLabel('取消').setStyle(ButtonStyle.Secondary),
  );

  await interaction.reply({
    content: `準備掃描所有可讀頻道，從 **${sinceDisplay}** 到 **${untilDisplay}**。確認開始掃描？`,
    components: [confirmRow],
  });

  const step1 = await (
    await interaction.fetchReply()
  )
    .awaitMessageComponent({
      filter: (i) => i.user.id === interaction.user.id,
      componentType: ComponentType.Button,
      time: 120_000,
    })
    .catch(() => null);

  if (!step1 || step1.customId === `bf-no-${id}`) {
    const content = step1 ? '已取消。' : '已逾時，操作取消。';
    if (step1) await step1.update({ content, components: [] });
    else await interaction.editReply({ content, components: [] });
    return;
  }

  await step1.update({ content: '掃描中，請稍候...', components: [] });

  let result;
  try {
    result = await scanForKeywords(guild, sinceMs, untilMs);
  } catch (err) {
    logger.error({ err }, 'backfill scan failed');
    await interaction.editReply({ content: '掃描時發生錯誤，請查看 log。' });
    return;
  }

  const skipNote =
    result.skippedChannels > 0 ? `（跳過 ${result.skippedChannels} 個無權限頻道）` : '';
  const scanSummary = `掃描 ${result.scannedChannels} 個頻道 · ${result.scannedMessages} 則訊息${skipNote}`;

  if (result.entries.length === 0) {
    await interaction.editReply({
      content: `**掃描結果** — ${sinceDisplay} → ${untilDisplay}\n${scanSummary}\n\n沒有找到任何 keyword 命中。`,
    });
    return;
  }

  const totalDelta = result.entries.reduce((s, e) => s + e.delta, 0);

  const byGroup = new Map<string, { userId: string; delta: number }[]>();
  for (const e of result.entries) {
    const arr = byGroup.get(e.groupKey) ?? [];
    byGroup.set(e.groupKey, arr);
    arr.push({ userId: e.userId, delta: e.delta });
  }

  const lines: string[] = [`**掃描結果** — ${sinceDisplay} → ${untilDisplay}`, scanSummary, ''];
  for (const [groupKey, entries] of byGroup) {
    lines.push(`**${groupKey}**`);
    for (const e of entries.sort((a, b) => b.delta - a.delta)) {
      lines.push(`<@${e.userId}>: +${e.delta}`);
    }
    lines.push('');
  }
  lines.push(`共 ${byGroup.size} 個 stat group · ${totalDelta} 次增量`);

  const body = lines.join('\n');
  const display = body.length > 1900 ? body.slice(0, 1900) + '\n... (結果過長)' : body;

  const applyRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`bf-apply-${id}`)
      .setLabel('Apply')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`bf-abort-${id}`)
      .setLabel('取消')
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.editReply({ content: display, components: [applyRow] });

  const step2 = await (
    await interaction.fetchReply()
  )
    .awaitMessageComponent({
      filter: (i) => i.user.id === interaction.user.id,
      componentType: ComponentType.Button,
      time: 300_000,
    })
    .catch(() => null);

  if (!step2 || step2.customId === `bf-abort-${id}`) {
    const suffix = step2 ? '已取消，未 apply。' : '已逾時，未 apply。';
    if (step2) await step2.update({ content: `${display}\n\n${suffix}`, components: [] });
    else await interaction.editReply({ content: `${display}\n\n${suffix}`, components: [] });
    return;
  }

  await step2.update({ content: `${display}\n\n套用中...`, components: [] });

  try {
    await Promise.all(
      result.entries.map((e) =>
        incrementStat({ userId: e.userId, statKey: e.groupKey, delta: e.delta, guildId: guild.id }),
      ),
    );
  } catch (err) {
    logger.error({ err }, 'backfill apply failed');
    await interaction.editReply({ content: `${display}\n\n❌ Apply 時發生錯誤，請查看 log。` });
    return;
  }

  await interaction.editReply({ content: `${display}\n\n✅ 已套用。` });

  await recordAudit({
    guildId: guild.id,
    actorId: interaction.user.id,
    action: 'owner.backfill',
    targetType: 'guild',
    targetId: guild.id,
    payload: {
      sinceMs,
      scannedMessages: result.scannedMessages,
      entries: result.entries.length,
      totalDelta,
    },
  });
}

export const ownerCommands: readonly Command[] = [ownerCommand];
