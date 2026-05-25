import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '@/core/command/types.js';
import type { Logger } from '@/core/logger.js';
import { CommandError } from '@/core/command/errors.js';
import { createGame, openCell, parseCell, toggleFlag } from '@/features/mine/game.js';
import { getGame, removeGame, resetTimeout, setGame } from '@/features/mine/store.js';
import { renderBoard, renderStatusText } from '@/features/mine/display.js';
import { renderBoardImage } from '@/features/mine/render.js';
import type { Difficulty, MineGame } from '@/features/mine/types.js';

async function replyWithBoard(
  interaction: ChatInputCommandInteraction,
  game: MineGame,
  logger: Logger,
): Promise<void> {
  try {
    const buf = await renderBoardImage(game);
    await interaction.reply({
      content: renderStatusText(game),
      files: [{ attachment: buf, name: 'board.png' }],
    });
  } catch (err) {
    logger.warn({ err }, 'image render failed, falling back to text');
    await interaction.reply({ content: renderBoard(game) });
  }
}

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
            { name: 'Expert  16×16  51 地雷', value: 'expert' },
          ),
      ),
  )
  .addSubcommand((s) => s.setName('board').setDescription('顯示目前盤面'))
  .addSubcommand((s) =>
    s
      .setName('open')
      .setDescription('打開一格；對已翻開的數字格執行則進行和弦展開')
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
      if (await getGame(guildId)) {
        throw new CommandError('目前已有進行中的遊戲，請用 `/mine board` 查看盤面。');
      }
      const difficulty = (interaction.options.getString('difficulty') ?? 'medium') as Difficulty;
      const game = createGame(guildId, difficulty);
      await setGame(guildId, game);
      logger.info({ guildId, difficulty }, 'mine game started');
      await replyWithBoard(interaction, game, logger);
      return;
    }

    const game = await getGame(guildId);
    if (!game) throw new CommandError('目前沒有進行中的遊戲，請使用 `/mine start` 開始。');

    if (sub === 'board') {
      await replyWithBoard(interaction, game, logger);
      return;
    }

    const cellInput = interaction.options.getString('cell', true);
    const index = parseCell(cellInput, game.cols, game.rows);
    const displayName = interaction.user.displayName;
    const cellLabel = cellInput.toUpperCase();

    if (sub === 'open') {
      const isChord = typeof game.cells[index] === 'number';
      const result = openCell(game, index, interaction.user.id);
      if (result.outcome === 'mine') {
        game.lastActionDesc = isChord
          ? `**${displayName}** 對 ${cellLabel} 和弦展開，踩到地雷！`
          : `**${displayName}** 在 ${cellLabel} 踩到地雷`;
      } else {
        game.lastActionDesc = isChord
          ? `**${displayName}** 對 ${cellLabel} 和弦展開（+${result.opened} 格）`
          : `**${displayName}** 開了 ${cellLabel}（展開 ${result.opened} 格）`;
      }
      if (game.status === 'playing') {
        await resetTimeout(guildId);
      } else {
        await removeGame(guildId);
      }
      logger.info(
        { guildId, userId: interaction.user.id, cell: cellLabel, outcome: result.outcome, isChord },
        'mine open',
      );
      await replyWithBoard(interaction, game, logger);
      return;
    }

    if (sub === 'flag') {
      const result = toggleFlag(game, index, interaction.user.id);
      game.lastActionDesc =
        result === 'flagged'
          ? `**${displayName}** 在 ${cellLabel} 插旗`
          : `**${displayName}** 移除 ${cellLabel} 的旗子`;
      await resetTimeout(guildId);
      logger.info({ guildId, userId: interaction.user.id, cell: cellLabel, result }, 'mine flag');
      await replyWithBoard(interaction, game, logger);
    }
  },
};

export const mineCommands: readonly Command[] = [mineCommand];
