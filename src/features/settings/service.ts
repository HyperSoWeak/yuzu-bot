import type { GuildSettings } from '@prisma/client';
import { prisma } from '@/db/client.js';

const cache = new Map<string, GuildSettings>();

export type SettingsPatch = Partial<
  Pick<
    GuildSettings,
    | 'keywordStatsEnabled'
    | 'keywordRepliesEnabled'
    | 'keywordReplyCooldownSeconds'
    | 'achievementsEnabled'
    | 'colorRoleEnabled'
    | 'auditLogChannelId'
  >
>;

export async function getSettings(guildId: string): Promise<GuildSettings> {
  const hit = cache.get(guildId);
  if (hit) return hit;

  const row = await prisma.guildSettings.upsert({
    where: { guildId },
    create: { guildId },
    update: {},
  });
  cache.set(guildId, row);
  return row;
}

export async function updateSettings(
  guildId: string,
  patch: SettingsPatch,
): Promise<GuildSettings> {
  const row = await prisma.guildSettings.upsert({
    where: { guildId },
    create: { guildId, ...patch },
    update: patch,
  });
  cache.set(guildId, row);
  return row;
}

/** For tests. */
export function clearSettingsCache(): void {
  cache.clear();
}
