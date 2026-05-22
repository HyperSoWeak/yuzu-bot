import type { MineGame } from './types.js';

const TIMEOUT_MS = 24 * 60 * 60 * 1000;

interface StoredEntry {
  game: MineGame;
  timeout: ReturnType<typeof setTimeout>;
}

const store = new Map<string, StoredEntry>();

export function getGame(guildId: string): MineGame | undefined {
  return store.get(guildId)?.game;
}

export function setGame(guildId: string, game: MineGame): void {
  removeGame(guildId);
  const timeout = setTimeout(() => store.delete(guildId), TIMEOUT_MS);
  store.set(guildId, { game, timeout });
}

export function resetTimeout(guildId: string): void {
  const entry = store.get(guildId);
  if (!entry) return;
  clearTimeout(entry.timeout);
  entry.timeout = setTimeout(() => store.delete(guildId), TIMEOUT_MS);
}

export function removeGame(guildId: string): void {
  const entry = store.get(guildId);
  if (!entry) return;
  clearTimeout(entry.timeout);
  store.delete(guildId);
}
