import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '@/core/command/types.js';
import { CommandError } from '@/core/command/errors.js';
import { createGame, openCell, parseCell, toggleFlag } from '@/features/mine/game.js';
import { getGame, removeGame, resetTimeout, setGame } from '@/features/mine/store.js';
import { renderBoard } from '@/features/mine/display.js';
import type { Difficulty } from '@/features/mine/types.js';

const data = new SlashCommandBuilder()
  .setName('mine')
  .setDescription('合作踩地雷')
  .setDMPermission(false)
  .addSubcommand((s) =>
    s
      .setName('start')
      .setDescription('開始新一局')
      .addStringOption((o) =>
        o
          .setName('difficulty')
          .setDescription('難度（預設 medium）')
          .addChoices(
            { name: 'Easy  8×8  10 地雷', value: 'easy' },
            { name: 'Medium  10×10  20 地雷', value: 'medium' },
            { name: 'Hard  12×12  30 地雷', value: 'hard' },
          ),
      ),
  )
  .addSubcommand((s) => s.setName('board').setDescription('顯示目前盤面'))
  .addSubcommand((s) =>
    s
      .setName('open')
      .setDescription('打開一格')
      .addStringOption((o) => o.setName('cell').setDescription('座標，例如 B4').setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName('flag')
      .setDescription('插旗 / 移除旗子（算一步）')
      .addStringOption((o) => o.setName('cell').setDescription('座標，例如 B4').setRequired(true)),
  );

const mineCommand: Command = {
  category: 'mine',
  data,
  cooldownSeconds: 1,
  async execute({ interaction, logger }) {
    const guildId = interaction.guildId;
    if (!guildId) throw new CommandError('此指令僅限在伺服器內使用。');

    const sub = interaction.options.getSubcommand(true);

    if (sub === 'start') {
      if (getGame(guildId)) {
        throw new CommandError('目前已有進行中的遊戲，請用 `/mine board` 查看盤面。');
      }
      const difficulty = (interaction.options.getString('difficulty') ?? 'medium') as Difficulty;
      const game = createGame(guildId, difficulty);
      setGame(guildId, game);
      logger.info({ guildId, difficulty }, 'mine game started');
      await interaction.reply({ content: renderBoard(game) });
      return;
    }

    const game = getGame(guildId);
    if (!game) throw new CommandError('目前沒有進行中的遊戲，請使用 `/mine start` 開始。');

    if (sub === 'board') {
      await interaction.reply({ content: renderBoard(game) });
      return;
    }

    const cellInput = interaction.options.getString('cell', true);
    const index = parseCell(cellInput, game.cols, game.rows);
    const displayName = interaction.user.displayName;
    const cellLabel = cellInput.toUpperCase();

    if (sub === 'open') {
      const result = openCell(game, index, interaction.user.id);
      game.lastActionDesc =
        result.outcome === 'mine'
          ? `**${displayName}** 在 ${cellLabel} 踩到地雷`
          : `**${displayName}** 開了 ${cellLabel}（展開 ${result.opened} 格）`;
      resetTimeout(guildId);
      if (game.status !== 'playing') removeGame(guildId);
      logger.info(
        { guildId, userId: interaction.user.id, cell: cellLabel, outcome: result.outcome },
        'mine open',
      );
      await interaction.reply({ content: renderBoard(game) });
      return;
    }

    if (sub === 'flag') {
      const result = toggleFlag(game, index, interaction.user.id);
      game.lastActionDesc =
        result === 'flagged'
          ? `**${displayName}** 在 ${cellLabel} 插旗`
          : `**${displayName}** 移除 ${cellLabel} 的旗子`;
      resetTimeout(guildId);
      logger.info({ guildId, userId: interaction.user.id, cell: cellLabel, result }, 'mine flag');
      await interaction.reply({ content: renderBoard(game) });
    }
  },
};

export const mineCommands: readonly Command[] = [mineCommand];
