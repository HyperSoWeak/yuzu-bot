import type { Prisma } from '@prisma/client';
import { logger } from '@/core/logger.js';
import { prisma } from '@/db/client.js';
import type { MineGame } from './types.js';

type PersistedMineGame = Omit<MineGame, 'mines'> & { mines: number[] };

const store = new Map<string, MineGame>();

function serializeGame(game: MineGame): PersistedMineGame {
  return { ...game, mines: [...game.mines] };
}

function deserializeGame(state: Prisma.JsonValue): MineGame {
  const raw = state as unknown as PersistedMineGame;
  return { ...raw, mines: new Set(raw.mines), consecutiveSteps: raw.consecutiveSteps ?? 0 };
}

export async function getGame(guildId: string): Promise<MineGame | undefined> {
  const cached = store.get(guildId);
  if (cached) return cached;

  const row = await prisma.mineGameSession.findUnique({ where: { guildId } });
  if (!row) return undefined;

  const game = deserializeGame(row.state);
  store.set(guildId, game);
  return game;
}

export async function setGame(guildId: string, game: MineGame): Promise<void> {
  const state = serializeGame(game);
  await prisma.mineGameSession.upsert({
    where: { guildId },
    create: { guildId, state: state as unknown as Prisma.InputJsonValue },
    update: { state: state as unknown as Prisma.InputJsonValue },
  });
  store.set(guildId, game);
}

export async function removeGame(guildId: string): Promise<void> {
  store.delete(guildId);
  await prisma.mineGameSession
    .deleteMany({ where: { guildId } })
    .catch((err: unknown) => logger.warn({ err, guildId }, 'mine game removal failed'));
}

export function clearMineStoreForTests(): void {
  store.clear();
}
