import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGame } from '../src/features/mine/game.js';
import {
  clearMineStoreForTests,
  getGame,
  removeGame,
  setGame,
} from '../src/features/mine/store.js';

const prismaMocks = vi.hoisted(() => ({
  deleteMany: vi.fn(),
  findUnique: vi.fn(),
  updateMany: vi.fn(),
  upsert: vi.fn(),
}));
const loggerMocks = vi.hoisted(() => ({
  warn: vi.fn(),
}));

vi.mock('@/db/client.js', () => ({
  prisma: {
    mineGameSession: prismaMocks,
  },
}));

vi.mock('@/core/logger.js', () => ({
  logger: loggerMocks,
}));

describe('mine store', () => {
  beforeEach(() => {
    clearMineStoreForTests();
    prismaMocks.deleteMany.mockReset().mockResolvedValue({ count: 1 });
    prismaMocks.findUnique.mockReset().mockResolvedValue(null);
    prismaMocks.updateMany.mockReset().mockResolvedValue({ count: 1 });
    prismaMocks.upsert.mockReset().mockResolvedValue({});
    loggerMocks.warn.mockReset();
  });

  it('persists a serializable game state', async () => {
    const game = createGame('guild-1', 'easy');
    game.minesPlaced = true;
    game.mines = new Set([3, 7, 9]);
    game.cells[3] = 'flagged';
    game.playerRecords['user-a'] = { moves: 1, flagsPlaced: 1, hitMine: false };

    await setGame(game.guildId, game);

    const call = prismaMocks.upsert.mock.calls[0]?.[0];
    expect(call.where).toEqual({ guildId: 'guild-1' });
    expect(call.create.guildId).toBe('guild-1');
    expect(call.create.state.mines).toEqual([3, 7, 9]);
    expect(call.create.state.cells[3]).toBe('flagged');
    expect(call.update.state.mines).toEqual([3, 7, 9]);
  });

  it('hydrates a persisted game when memory is empty', async () => {
    const game = createGame('guild-2', 'medium');
    game.minesPlaced = true;
    game.mines = new Set([5, 10]);
    game.cells[5] = 'flagged';
    prismaMocks.findUnique.mockResolvedValue({
      guildId: game.guildId,
      state: { ...game, mines: [5, 10] },
    });

    const restored = await getGame(game.guildId);

    expect(restored?.guildId).toBe('guild-2');
    expect(restored?.difficulty).toBe('medium');
    expect(restored?.mines).toBeInstanceOf(Set);
    expect([...restored!.mines]).toEqual([5, 10]);
    expect(restored?.cells[5]).toBe('flagged');
  });

  it('defaults consecutiveSteps to 0 when missing from persisted state', async () => {
    const game = createGame('guild-old', 'easy');
    const stateWithoutConsecutive = { ...game, mines: [], consecutiveSteps: undefined };
    prismaMocks.findUnique.mockResolvedValue({
      guildId: game.guildId,
      state: stateWithoutConsecutive,
    });

    const restored = await getGame(game.guildId);

    expect(restored?.consecutiveSteps).toBe(0);
  });

  it('removes games from memory and persistence', async () => {
    const game = createGame('guild-4', 'easy');
    await setGame(game.guildId, game);

    await removeGame(game.guildId);

    await expect(getGame(game.guildId)).resolves.toBeUndefined();
    expect(prismaMocks.deleteMany).toHaveBeenCalledWith({ where: { guildId: game.guildId } });
  });

  it('returns cached game without DB query on second call', async () => {
    const game = createGame('guild-5', 'easy');
    await setGame(game.guildId, game);
    prismaMocks.findUnique.mockClear();

    const result = await getGame(game.guildId);

    expect(result).toBe(game);
    expect(prismaMocks.findUnique).not.toHaveBeenCalled();
  });
});
