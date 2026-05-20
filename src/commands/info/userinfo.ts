import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { Command } from '@/core/command/types.js';

const command: Command = {
  category: 'info',
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('顯示使用者資訊')
    .addUserOption((o) => o.setName('user').setDescription('要查詢的使用者；不填則查自己')),
  async execute({ interaction }) {
    const target = interaction.options.getUser('user') ?? interaction.user;
    const member = interaction.guild?.members.cache.get(target.id);

    const embed = new EmbedBuilder()
      .setTitle(target.tag)
      .setThumbnail(target.displayAvatarURL())
      .setColor(member?.displayColor ?? 0xffcc66)
      .addFields(
        { name: 'ID', value: target.id, inline: true },
        { name: 'Bot', value: target.bot ? 'yes' : 'no', inline: true },
        {
          name: 'Account created',
          value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`,
          inline: true,
        },
      );

    if (member) {
      embed.addFields(
        {
          name: 'Joined',
          value: member.joinedTimestamp
            ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
            : '?',
          inline: true,
        },
        {
          name: 'Roles',
          value: `${member.roles.cache.size - 1}`,
          inline: true,
        },
      );
    }

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

export default command;
