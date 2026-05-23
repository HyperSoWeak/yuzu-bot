import type { UserAchievement } from '@prisma/client';
import { prisma } from '@/db/client.js';

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
