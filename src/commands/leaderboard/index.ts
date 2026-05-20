import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { Command } from '@/core/command/types.js';
import { CommandError } from '@/core/command/errors.js';
import { topStats } from '@/features/keyword/stats.js';
import { prisma } from '@/db/client.js';

const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('統計排行榜')
  .setDMPermission(false)
  .addStringOption((o) =>
    o
      .setName('stat')
      .setDescription('統計 key (例如 breakdown)')
      .setRequired(true)
      .setAutocomplete(true),
  )
  .addIntegerOption((o) =>
    o
      .setName('limit')
      .setDescription('顯示前幾名 (預設 10, 最多 25)')
      .setMinValue(1)
      .setMaxValue(25),
  );

const leaderboardCommand: Command = {
  category: 'leaderboard',
  data,
  async execute({ interaction }) {
    const guildId = interaction.guildId;
    if (!guildId) throw new CommandError('此指令僅限在伺服器內使用。');

    const statKey = interaction.options.getString('stat', true);
    const limit = interaction.options.getInteger('limit') ?? 10;

    const rows = await topStats({ guildId, statKey, limit });
    if (rows.length === 0) {
      await interaction.reply({
        content: `\`${statKey}\` 尚無紀錄。`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const lines = rows.map((r, i) => `**${i + 1}.** <@${r.userId}> — ${r.value}`);
    const embed = new EmbedBuilder()
      .setTitle(`排行榜 · ${statKey}`)
      .setColor(0xffcc66)
      .setDescription(lines.join('\n'));
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

/** Autocomplete handler: suggest known stat keys for this guild. */
export async function leaderboardAutocomplete(
  guildId: string,
  query: string,
): Promise<{ name: string; value: string }[]> {
  const rows = await prisma.userStat.findMany({
    where: { guildId },
    select: { statKey: true },
    distinct: ['statKey'],
    orderBy: { statKey: 'asc' },
    take: 25,
  });
  const q = query.toLowerCase();
  return rows
    .map((r) => r.statKey)
    .filter((k) => (q ? k.toLowerCase().includes(q) : true))
    .slice(0, 25)
    .map((k) => ({ name: k, value: k }));
}

export const leaderboardCommands: readonly Command[] = [leaderboardCommand];
