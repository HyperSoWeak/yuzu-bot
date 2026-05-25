import type { Prisma } from '@prisma/client';
import { logger } from '@/core/logger.js';
import { prisma } from '@/db/client.js';
import { MINE_GAME_TIMEOUT_MS, type MineGame } from './types.js';

type PersistedMineGame = Omit<MineGame, 'mines'> & { mines: number[] };

interface StoredEntry {
  game: MineGame;
  timeout: ReturnType<typeof setTimeout>;
}

const store = new Map<string, StoredEntry>();

function serializeGame(game: MineGame): PersistedMineGame {
  return { ...game, mines: [...game.mines] };
}

function deserializeGame(state: Prisma.JsonValue): MineGame {
  const game = state as unknown as PersistedMineGame;
  return { ...game, mines: new Set(game.mines) };
}

function expiresAtFor(game: MineGame): Date {
  return new Date(game.lastActionAt + MINE_GAME_TIMEOUT_MS);
}

function clearMemoryEntry(guildId: string): void {
  const entry = store.get(guildId);
  if (!entry) return;
  clearTimeout(entry.timeout);
  store.delete(guildId);
}

function scheduleExpiry(guildId: string, expiresAt: Date): ReturnType<typeof setTimeout> {
  const delay = Math.max(0, expiresAt.getTime() - Date.now());
  return setTimeout(() => {
    store.delete(guildId);
    void prisma.mineGameSession
      .deleteMany({ where: { guildId } })
      .catch((err: unknown) => logger.warn({ err, guildId }, 'mine game expiry cleanup failed'));
  }, delay);
}

function setMemoryEntry(guildId: string, game: MineGame, expiresAt: Date): void {
  clearMemoryEntry(guildId);
  store.set(guildId, { game, timeout: scheduleExpiry(guildId, expiresAt) });
}

export async function getGame(guildId: string): Promise<MineGame | undefined> {
  const entry = store.get(guildId);
  if (entry) return entry.game;

  const row = await prisma.mineGameSession.findUnique({ where: { guildId } });
  if (!row) return undefined;

  if (row.expiresAt.getTime() <= Date.now()) {
    await prisma.mineGameSession.deleteMany({ where: { guildId } });
    return undefined;
  }

  const game = deserializeGame(row.state);
  setMemoryEntry(guildId, game, row.expiresAt);
  return game;
}

export async function setGame(guildId: string, game: MineGame): Promise<void> {
  const state = serializeGame(game);
  const expiresAt = expiresAtFor(game);
  await prisma.mineGameSession.upsert({
    where: { guildId },
    create: { guildId, state: state as unknown as Prisma.InputJsonValue, expiresAt },
    update: { state: state as unknown as Prisma.InputJsonValue, expiresAt },
  });
  setMemoryEntry(guildId, game, expiresAt);
}

export async function resetTimeout(guildId: string): Promise<void> {
  const entry = store.get(guildId);
  if (!entry) return;

  const state = serializeGame(entry.game);
  const expiresAt = expiresAtFor(entry.game);
  await prisma.mineGameSession.updateMany({
    where: { guildId },
    data: { state: state as unknown as Prisma.InputJsonValue, expiresAt },
  });
  setMemoryEntry(guildId, entry.game, expiresAt);
}

export async function removeGame(guildId: string): Promise<void> {
  clearMemoryEntry(guildId);
  await prisma.mineGameSession.deleteMany({ where: { guildId } });
}

export function clearMineStoreForTests(): void {
  for (const entry of store.values()) {
    clearTimeout(entry.timeout);
  }
  store.clear();
}
