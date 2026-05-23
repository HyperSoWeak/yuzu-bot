import type { UserAchievement } from '@prisma/client';
import { prisma } from '@/db/client.js';
import { getAchievementDefinitions } from './definitions.js';

export async function userAchievements(userId: string): Promise<UserAchievement[]> {
  return prisma.userAchievement.findMany({
    where: { userId },
    orderBy: { earnedAt: 'asc' },
  });
}

export async function awardAchievement(input: {
  userId: string;
  achievementKey: string;
}): Promise<UserAchievement | null> {
  try {
    return await prisma.userAchievement.create({ data: input });
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') return null;
    throw err;
  }
}

export interface FixEntry {
  userId: string;
  achievementKey: string;
  achievementName: string;
}

export async function previewFixAchievements(): Promise<FixEntry[]> {
  const defs = getAchievementDefinitions();
  const entries: FixEntry[] = [];

  for (const def of defs) {
    if (def.ruleType !== 'stat_threshold') continue;
    const cfg = def.ruleConfig as { stat_key: string; threshold: number };

    const qualifying = await prisma.userStat.findMany({
      where: { statKey: cfg.stat_key, value: { gte: cfg.threshold } },
      select: { userId: true },
    });
    if (qualifying.length === 0) continue;

    const qualifyingIds = qualifying.map((r) => r.userId);
    const existing = await prisma.userAchievement.findMany({
      where: { achievementKey: def.key, userId: { in: qualifyingIds } },
      select: { userId: true },
    });
    const existingIds = new Set(existing.map((r) => r.userId));

    for (const { userId } of qualifying) {
      if (!existingIds.has(userId)) {
        entries.push({ userId, achievementKey: def.key, achievementName: def.name });
      }
    }
  }

  return entries;
}

export async function applyFixAchievements(entries: FixEntry[]): Promise<number> {
  let awarded = 0;
  for (const entry of entries) {
    const created = await awardAchievement({
      userId: entry.userId,
      achievementKey: entry.achievementKey,
    }).catch(() => null);
    if (created) awarded++;
  }
  return awarded;
}

export async function topUsersByAchievementCount(
  limit = 10,
): Promise<{ userId: string; count: number }[]> {
  const rows = await prisma.userAchievement.groupBy({
    by: ['userId'],
    _count: { userId: true },
    orderBy: { _count: { userId: 'desc' } },
    take: limit,
  });
  return rows.map((r) => ({ userId: r.userId, count: r._count.userId }));
}
