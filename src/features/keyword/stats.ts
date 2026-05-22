import { prisma } from '@/db/client.js';
import { bus } from '@/core/event-bus.js';

export async function incrementStat(input: {
  userId: string;
  statKey: string;
  delta?: number;
  guildId?: string;
  channelId?: string;
}): Promise<number> {
  const delta = input.delta ?? 1;
  const row = await prisma.userStat.upsert({
    where: { userId_statKey: { userId: input.userId, statKey: input.statKey } },
    create: { userId: input.userId, statKey: input.statKey, value: delta },
    update: { value: { increment: delta } },
  });
  bus.emit('stat.updated', {
    guildId: input.guildId ?? '',
    userId: input.userId,
    statKey: input.statKey,
    delta,
    value: row.value,
    channelId: input.channelId,
  });
  return row.value;
}

export async function setStat(input: {
  userId: string;
  statKey: string;
  value: number;
  guildId?: string;
}): Promise<number> {
  const row = await prisma.userStat.upsert({
    where: { userId_statKey: { userId: input.userId, statKey: input.statKey } },
    create: { userId: input.userId, statKey: input.statKey, value: input.value },
    update: { value: input.value },
  });
  bus.emit('stat.updated', {
    guildId: input.guildId ?? '',
    userId: input.userId,
    statKey: input.statKey,
    delta: 0,
    value: row.value,
  });
  return row.value;
}

export async function getStat(input: { userId: string; statKey: string }): Promise<number> {
  const row = await prisma.userStat.findUnique({
    where: { userId_statKey: { userId: input.userId, statKey: input.statKey } },
  });
  return row?.value ?? 0;
}

export async function topStats(input: {
  statKey: string;
  limit?: number;
}): Promise<{ userId: string; value: number }[]> {
  return prisma.userStat.findMany({
    where: { statKey: input.statKey },
    orderBy: { value: 'desc' },
    take: input.limit ?? 10,
    select: { userId: true, value: true },
  });
}
