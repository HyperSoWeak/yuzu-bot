import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { COMMAND_CATEGORIES, type Command, type CommandCategory } from '@/core/command/types.js';
import { commandRegistry } from '@/core/command/registry.js';

const CATEGORY_LABELS: Record<CommandCategory, string> = {
  info: '資訊',
  settings: '設定',
  keyword: '關鍵字',
  achievement: '成就',
  leaderboard: '排行榜',
  'reaction-role': 'Reaction Role',
  'color-role': 'Color Role',
  owner: 'Owner Only',
};

const command: Command = {
  category: 'info',
  data: new SlashCommandBuilder().setName('help').setDescription('列出所有指令'),
  async execute({ interaction }) {
    const embed = new EmbedBuilder().setTitle('Yuzu 指令列表').setColor(0xffcc66);

    for (const cat of COMMAND_CATEGORIES) {
      const cmds = commandRegistry.listByCategory(cat);
      if (cmds.length === 0) continue;
      const value = cmds.map((c) => `\`/${c.data.name}\` — ${c.data.description}`).join('\n');
      embed.addFields({ name: CATEGORY_LABELS[cat], value });
    }

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

export default command;
