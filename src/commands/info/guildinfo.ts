import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { Command } from '@/core/command/types.js';
import { CommandError } from '@/core/command/errors.js';

const command: Command = {
  category: 'info',
  data: new SlashCommandBuilder().setName('guildinfo').setDescription('顯示本 guild 的資訊'),
  async execute({ interaction }) {
    const guild = interaction.guild;
    if (!guild) throw new CommandError('此指令僅限在伺服器內使用。');

    const owner = await guild.fetchOwner().catch(() => null);
    const embed = new EmbedBuilder()
      .setTitle(guild.name)
      .setThumbnail(guild.iconURL())
      .setColor(0xffcc66)
      .addFields(
        { name: 'ID', value: guild.id, inline: true },
        { name: 'Owner', value: owner?.user.tag ?? guild.ownerId, inline: true },
        { name: 'Members', value: `${guild.memberCount}`, inline: true },
        { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
        { name: 'Channels', value: `${guild.channels.cache.size}`, inline: true },
        {
          name: 'Created',
          value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
          inline: true,
        },
      );
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

export default command;
