import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGame } from '../src/features/mine/game.js';
import { MINE_GAME_TIMEOUT_MS } from '../src/features/mine/types.js';
import {
  clearMineStoreForTests,
  getGame,
  removeGame,
  resetTimeout,
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
    vi.useRealTimers();
    clearMineStoreForTests();
    prismaMocks.deleteMany.mockReset().mockResolvedValue({ count: 1 });
    prismaMocks.findUnique.mockReset().mockResolvedValue(null);
    prismaMocks.updateMany.mockReset().mockResolvedValue({ count: 1 });
    prismaMocks.upsert.mockReset().mockResolvedValue({});
    loggerMocks.warn.mockReset();
  });

  it('persists a serializable game state with an expiration time', async () => {
    const game = createGame('guild-1', 'easy');
    game.lastActionAt = 1_767_225_600_000;
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
    expect(call.create.expiresAt).toEqual(new Date(game.lastActionAt + MINE_GAME_TIMEOUT_MS));
    expect(call.update.state.mines).toEqual([3, 7, 9]);
    expect(call.update.expiresAt).toEqual(new Date(game.lastActionAt + MINE_GAME_TIMEOUT_MS));
  });

  it('hydrates a persisted game when memory is empty', async () => {
    const game = createGame('guild-2', 'medium');
    game.lastActionAt = Date.now();
    game.minesPlaced = true;
    game.mines = new Set([5, 10]);
    game.cells[5] = 'flagged';
    prismaMocks.findUnique.mockResolvedValue({
      guildId: game.guildId,
      state: { ...game, mines: [5, 10] },
      expiresAt: new Date(Date.now() + MINE_GAME_TIMEOUT_MS),
    });

    const restored = await getGame(game.guildId);

    expect(restored?.guildId).toBe('guild-2');
    expect(restored?.difficulty).toBe('medium');
    expect(restored?.mines).toBeInstanceOf(Set);
    expect([...restored!.mines]).toEqual([5, 10]);
    expect(restored?.cells[5]).toBe('flagged');
  });

  it('removes expired persisted games while hydrating', async () => {
    const game = createGame('guild-expired', 'easy');
    prismaMocks.findUnique.mockResolvedValue({
      guildId: game.guildId,
      state: { ...game, mines: [] },
      expiresAt: new Date(Date.now() - 1),
    });

    await expect(getGame(game.guildId)).resolves.toBeUndefined();
    expect(prismaMocks.deleteMany).toHaveBeenCalledWith({ where: { guildId: game.guildId } });
  });

  it('persists the current state and refreshed expiration after an action', async () => {
    const game = createGame('guild-3', 'easy');
    await setGame(game.guildId, game);
    prismaMocks.updateMany.mockClear();

    game.lastActionAt += 60_000;
    game.cells[1] = 'flagged';
    game.mines = new Set([1]);

    await resetTimeout(game.guildId);

    const call = prismaMocks.updateMany.mock.calls[0]?.[0];
    expect(call.where).toEqual({ guildId: game.guildId });
    expect(call.data.state.cells[1]).toBe('flagged');
    expect(call.data.state.mines).toEqual([1]);
    expect(call.data.expiresAt).toEqual(new Date(game.lastActionAt + MINE_GAME_TIMEOUT_MS));
  });

  it('removes games from memory and persistence', async () => {
    const game = createGame('guild-4', 'easy');
    await setGame(game.guildId, game);

    await removeGame(game.guildId);

    await expect(getGame(game.guildId)).resolves.toBeUndefined();
    expect(prismaMocks.deleteMany).toHaveBeenCalledWith({ where: { guildId: game.guildId } });
  });
});
