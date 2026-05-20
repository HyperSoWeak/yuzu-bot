import { EmbedBuilder, MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction, SlashCommandSubcommandBuilder } from 'discord.js';
import { getSettings } from '@/features/settings/service.js';
import { CommandError } from '@/core/command/errors.js';

export const showSubcommand = (sub: SlashCommandSubcommandBuilder) =>
  sub.setName('show').setDescription('顯示本 guild 設定');

export async function executeShow(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) throw new CommandError('此指令僅限在伺服器內使用。');

  const s = await getSettings(guildId);
  const fmt = (v: boolean) => (v ? '✅ on' : '❌ off');
  const ch = (id: string | null) => (id ? `<#${id}>` : '_(未設定)_');

  const embed = new EmbedBuilder()
    .setTitle('Guild 設定')
    .setColor(0xffcc66)
    .addFields(
      { name: '關鍵字統計', value: fmt(s.keywordStatsEnabled), inline: true },
      { name: '關鍵字回覆', value: fmt(s.keywordRepliesEnabled), inline: true },
      {
        name: '回覆冷卻 (秒)',
        value: `${s.keywordReplyCooldownSeconds}`,
        inline: true,
      },
      { name: '成就系統', value: fmt(s.achievementsEnabled), inline: true },
      {
        name: '成就公告頻道',
        value: ch(s.achievementAnnounceChannelId),
        inline: true,
      },
      { name: 'Color role', value: fmt(s.colorRoleEnabled), inline: true },
      { name: 'Audit log 頻道', value: ch(s.auditLogChannelId), inline: false },
    )
    .setFooter({ text: `updated ${s.updatedAt.toISOString()}` });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
