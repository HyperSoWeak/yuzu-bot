import {
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import type { Command } from '@/core/command/types.js';
import { CommandError } from '@/core/command/errors.js';
import { recordAudit } from '@/core/audit-log.js';
import { prisma } from '@/db/client.js';
import { setStat } from '@/features/keyword/stats.js';

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
      .addStringOption((o) => o.setName('stat').setDescription('stat key').setRequired(true))
      .addIntegerOption((o) =>
        o.setName('value').setDescription('新值').setRequired(true).setMinValue(0),
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
      const newVal = await setStat({ guildId, userId: user.id, statKey, value });
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

    throw new CommandError('未支援的子指令。');
  },
};

export const ownerCommands: readonly Command[] = [ownerCommand];
