import { EmbedBuilder, MessageFlags, SlashCommandBuilder, version as djsVersion } from 'discord.js';
import { loadConfig } from '@/config/config.js';
import type { Command } from '@/core/command/types.js';

const config = loadConfig();

function fmtUptime(seconds: number): string {
  const s = Math.floor(seconds);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${d}d ${h}h ${m}m ${sec}s`;
}

const command: Command = {
  category: 'info',
  data: new SlashCommandBuilder().setName('botinfo').setDescription('顯示 bot 資訊'),
  async execute({ interaction }) {
    const client = interaction.client;
    const embed = new EmbedBuilder()
      .setTitle(`${config.bot.name} 資訊`)
      .setColor(0xffcc66)
      .addFields(
        { name: 'User', value: `${client.user?.tag ?? '?'}`, inline: true },
        { name: 'Guilds', value: `${client.guilds.cache.size}`, inline: true },
        { name: 'Uptime', value: fmtUptime(process.uptime()), inline: true },
        { name: 'Node', value: process.version, inline: true },
        { name: 'discord.js', value: djsVersion, inline: true },
        { name: 'GitHub', value: config.bot.github_url },
      );
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

export default command;
