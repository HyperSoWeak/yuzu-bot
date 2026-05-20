import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { loadConfig } from '@/config/config.js';
import type { Command } from '@/core/command/types.js';

const config = loadConfig();

const command: Command = {
  category: 'info',
  data: new SlashCommandBuilder().setName('changelog').setDescription('開啟 GitHub changelog 頁面'),
  async execute({ interaction }) {
    const url = `${config.bot.github_url.replace(/\/$/, '')}/blob/main/CHANGELOG.md`;
    await interaction.reply({
      content: `📜 Changelog: ${url}`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default command;
