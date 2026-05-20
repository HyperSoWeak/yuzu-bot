import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '@/core/command/types.js';

const command: Command = {
  category: 'info',
  data: new SlashCommandBuilder().setName('ping').setDescription('回傳 bot 的延遲'),
  async execute({ interaction }) {
    const sent = await interaction.reply({ content: '🏓 pong...', fetchReply: true });
    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    const ws = Math.round(interaction.client.ws.ping);
    await interaction.editReply(`🏓 pong! roundtrip ${roundtrip}ms · websocket ${ws}ms`);
  },
};

export default command;
