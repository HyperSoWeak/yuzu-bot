import { prisma } from '@/db/client.js';
import { bus } from '@/core/event-bus.js';

/**
 * Increment a (guild, user, statKey) counter and emit a `stat.updated` event.
 * Returns the new value.
 */
export async function incrementStat(input: {
  guildId: string;
  userId: string;
  statKey: string;
  delta?: number;
  channelId?: string;
}): Promise<number> {
  const delta = input.delta ?? 1;
  const row = await prisma.userStat.upsert({
    where: {
      guildId_userId_statKey: {
        guildId: input.guildId,
        userId: input.userId,
        statKey: input.statKey,
      },
    },
    create: {
      guildId: input.guildId,
      userId: input.userId,
      statKey: input.statKey,
      value: delta,
    },
    update: { value: { increment: delta } },
  });
  bus.emit('stat.updated', {
    guildId: input.guildId,
    userId: input.userId,
    statKey: input.statKey,
    delta,
    value: row.value,
    channelId: input.channelId,
  });
  return row.value;
}

export async function setStat(input: {
  guildId: string;
  userId: string;
  statKey: string;
  value: number;
}): Promise<number> {
  const row = await prisma.userStat.upsert({
    where: {
      guildId_userId_statKey: {
        guildId: input.guildId,
        userId: input.userId,
        statKey: input.statKey,
      },
    },
    create: {
      guildId: input.guildId,
      userId: input.userId,
      statKey: input.statKey,
      value: input.value,
    },
    update: { value: input.value },
  });
  bus.emit('stat.updated', {
    guildId: input.guildId,
    userId: input.userId,
    statKey: input.statKey,
    delta: 0,
    value: row.value,
  });
  return row.value;
}

export async function getStat(input: {
  guildId: string;
  userId: string;
  statKey: string;
}): Promise<number> {
  const row = await prisma.userStat.findUnique({
    where: {
      guildId_userId_statKey: {
        guildId: input.guildId,
        userId: input.userId,
        statKey: input.statKey,
      },
    },
  });
  return row?.value ?? 0;
}

export async function topStats(input: {
  guildId: string;
  statKey: string;
  limit?: number;
}): Promise<{ userId: string; value: number }[]> {
  const rows = await prisma.userStat.findMany({
    where: { guildId: input.guildId, statKey: input.statKey },
    orderBy: { value: 'desc' },
    take: input.limit ?? 10,
    select: { userId: true, value: true },
  });
  return rows;
}
