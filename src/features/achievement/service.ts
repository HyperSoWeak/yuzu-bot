import type { Achievement, UserAchievement } from '@prisma/client';
import { prisma } from '@/db/client.js';
import { logger } from '@/core/logger.js';
import { achievementDefinitions } from './definitions.js';

export async function seedAchievements(): Promise<void> {
  for (const def of achievementDefinitions) {
    await prisma.achievement.upsert({
      where: { key: def.key },
      create: def,
      update: {
        name: def.name,
        description: def.description,
        ruleType: def.ruleType,
        ruleConfig: def.ruleConfig,
      },
    });
  }
  logger.info({ count: achievementDefinitions.length }, 'achievements seeded');
}

export async function listAchievements(): Promise<Achievement[]> {
  return prisma.achievement.findMany({ orderBy: { key: 'asc' } });
}

export async function findAchievementsByRuleType(ruleType: string): Promise<Achievement[]> {
  return prisma.achievement.findMany({ where: { ruleType } });
}

export async function userAchievements(
  userId: string,
): Promise<(UserAchievement & { achievement: Achievement })[]> {
  return prisma.userAchievement.findMany({
    where: { userId },
    include: { achievement: true },
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
