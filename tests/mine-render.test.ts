import { describe, it, expect } from 'vitest';
import { renderBoardImage } from '../src/features/mine/render.js';
import { createGame, openCell } from '../src/features/mine/game.js';
import type { MineGame } from '../src/features/mine/types.js';

const PNG_MAGIC = '89504e47';

describe('renderBoardImage', () => {
  it('returns a PNG buffer for a fresh game', async () => {
    const game = createGame('g', 'medium');
    const buf = await renderBoardImage(game);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.subarray(0, 4).toString('hex')).toBe(PNG_MAGIC);
  });

  it('returns a PNG buffer with some cells opened and flagged', async () => {
    const game = createGame('g', 'easy');
    openCell(game, 0, 'u1');
    game.cells[1] = 'flagged';
    const buf = await renderBoardImage(game);
    expect(buf.subarray(0, 4).toString('hex')).toBe(PNG_MAGIC);
  });

  it('returns a PNG buffer for lost game (mines revealed)', async () => {
    const game: MineGame = { ...createGame('g', 'medium'), status: 'lost' };
    game.cells[5] = 'mine-hit';
    game.cells[6] = 'mine';
    const buf = await renderBoardImage(game);
    expect(buf.subarray(0, 4).toString('hex')).toBe(PNG_MAGIC);
  });

  it('returns a PNG buffer for won game', async () => {
    const game: MineGame = { ...createGame('g', 'easy'), status: 'won' };
    const buf = await renderBoardImage(game);
    expect(buf.subarray(0, 4).toString('hex')).toBe(PNG_MAGIC);
  });

  it('returns a PNG buffer for expert 16×16', async () => {
    const game = createGame('g', 'expert');
    const buf = await renderBoardImage(game);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.subarray(0, 4).toString('hex')).toBe(PNG_MAGIC);
    expect(buf.length).toBeGreaterThan(1000);
  });
});
