import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { Command } from '@/core/command/types.js';
import { CommandError } from '@/core/command/errors.js';
import {
  listAchievements,
  topUsersByAchievementCount,
  userAchievements,
} from '@/features/achievement/service.js';

function truncateField(s: string): string {
  return s.length <= 1024 ? s : s.slice(0, 1020) + '…';
}

const data = new SlashCommandBuilder()
  .setName('achievement')
  .setDescription('成就系統')
  .setDMPermission(false)
  .addSubcommand((s) => s.setName('list').setDescription('列出所有成就'))
  .addSubcommand((s) =>
    s
      .setName('user')
      .setDescription('查詢使用者已獲得的成就')
      .addUserOption((o) => o.setName('user').setDescription('預設為自己')),
  )
  .addSubcommand((s) => s.setName('top').setDescription('總成就數排行榜 (前 10)'));

const achievementCommand: Command = {
  category: 'achievement',
  data,
  async execute({ interaction }) {
    const guildId = interaction.guildId;
    if (!guildId) throw new CommandError('此指令僅限在伺服器內使用。');

    const sub = interaction.options.getSubcommand(true);

    if (sub === 'list') {
      const items = await listAchievements();
      if (items.length === 0) {
        await interaction.reply({ content: '_(尚未定義任何成就)_', flags: MessageFlags.Ephemeral });
        return;
      }
      const lines = items.map((a) => `🏆 **${a.name}** — ${a.description}`);
      await interaction.reply({
        content: truncateField(lines.join('\n')),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (sub === 'user') {
      const target = interaction.options.getUser('user') ?? interaction.user;
      const rows = await userAchievements(guildId, target.id);
      if (rows.length === 0) {
        await interaction.reply({
          content: `${target.tag} 尚未獲得任何成就。`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      const embed = new EmbedBuilder()
        .setTitle(`${target.tag} 的成就 (${rows.length})`)
        .setColor(0xffcc66)
        .setDescription(
          truncateField(
            rows
              .map(
                (r) =>
                  `🏆 **${r.achievement.name}** · <t:${Math.floor(r.earnedAt.getTime() / 1000)}:R>`,
              )
              .join('\n'),
          ),
        );
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    if (sub === 'top') {
      const rows = await topUsersByAchievementCount(guildId, 10);
      if (rows.length === 0) {
        await interaction.reply({
          content: '_(尚無成就紀錄)_',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      const lines = rows.map((r, i) => `**${i + 1}.** <@${r.userId}> — ${r.count}`);
      const embed = new EmbedBuilder()
        .setTitle('成就排行榜')
        .setColor(0xffcc66)
        .setDescription(lines.join('\n'));
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    throw new CommandError('未支援的子指令。');
  },
};

export const achievementCommands: readonly Command[] = [achievementCommand];
