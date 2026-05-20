import type { KeywordKind, KeywordTrigger, MatchMode } from '@prisma/client';
import { prisma } from '@/db/client.js';
import { logger } from '@/core/logger.js';
import { loadConfig } from '@/config/config.js';
import type { CompiledTrigger } from './types.js';

const config = loadConfig();

interface GuildCache {
  triggers: CompiledTrigger[];
  loadedAt: number;
}

const cache = new Map<string, GuildCache>();

function compile(t: KeywordTrigger): CompiledTrigger | null {
  const lower = t.trigger.toLowerCase();
  switch (t.matchMode) {
    case 'CONTAINS':
    case 'EQUALS':
      return {
        groupKey: t.groupKey,
        kind: t.kind,
        matchMode: t.matchMode,
        raw: t.trigger,
        needle: lower,
      };
    case 'REGEX':
      try {
        return {
          groupKey: t.groupKey,
          kind: t.kind,
          matchMode: t.matchMode,
          raw: t.trigger,
          regex: new RegExp(t.trigger),
        };
      } catch (err) {
        logger.warn({ err, trigger: t.trigger, id: t.id }, 'invalid regex trigger; skipped');
        return null;
      }
  }
}

export async function getTriggers(guildId: string): Promise<CompiledTrigger[]> {
  const hit = cache.get(guildId);
  if (hit) return hit.triggers;

  const rows = await prisma.keywordTrigger.findMany({
    where: { guildId },
    take: config.keyword.max_triggers_per_guild,
  });
  const compiled = rows.map(compile).filter((x): x is CompiledTrigger => x !== null);
  cache.set(guildId, { triggers: compiled, loadedAt: Date.now() });
  return compiled;
}

export function invalidateTriggerCache(guildId: string): void {
  cache.delete(guildId);
}

export async function addTrigger(input: {
  guildId: string;
  kind: KeywordKind;
  groupKey: string;
  trigger: string;
  matchMode?: MatchMode;
}): Promise<KeywordTrigger> {
  const row = await prisma.keywordTrigger.create({
    data: {
      guildId: input.guildId,
      kind: input.kind,
      groupKey: input.groupKey,
      trigger: input.trigger,
      matchMode: input.matchMode ?? 'CONTAINS',
    },
  });
  invalidateTriggerCache(input.guildId);
  return row;
}

export async function removeTrigger(input: {
  guildId: string;
  kind: KeywordKind;
  groupKey: string;
  trigger: string;
}): Promise<number> {
  const result = await prisma.keywordTrigger.deleteMany({
    where: {
      guildId: input.guildId,
      kind: input.kind,
      groupKey: input.groupKey,
      trigger: input.trigger,
    },
  });
  if (result.count > 0) invalidateTriggerCache(input.guildId);
  return result.count;
}

export async function listTriggers(input: {
  guildId: string;
  kind?: KeywordKind;
  groupKey?: string;
}): Promise<KeywordTrigger[]> {
  return prisma.keywordTrigger.findMany({
    where: {
      guildId: input.guildId,
      kind: input.kind,
      groupKey: input.groupKey,
    },
    orderBy: [{ kind: 'asc' }, { groupKey: 'asc' }, { trigger: 'asc' }],
  });
}

export async function addReply(input: {
  guildId: string;
  kind: KeywordKind;
  groupKey: string;
  content: string;
}) {
  return prisma.keywordReply.create({
    data: {
      guildId: input.guildId,
      kind: input.kind,
      groupKey: input.groupKey,
      content: input.content,
    },
  });
}

export async function removeReplyById(guildId: string, id: string): Promise<boolean> {
  const result = await prisma.keywordReply.deleteMany({ where: { guildId, id } });
  return result.count > 0;
}

export async function listReplies(input: {
  guildId: string;
  kind?: KeywordKind;
  groupKey?: string;
}) {
  return prisma.keywordReply.findMany({
    where: {
      guildId: input.guildId,
      kind: input.kind,
      groupKey: input.groupKey,
    },
    orderBy: [{ kind: 'asc' }, { groupKey: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function pickRandomReply(input: {
  guildId: string;
  kind: KeywordKind;
  groupKey: string;
}): Promise<string | null> {
  const replies = await prisma.keywordReply.findMany({
    where: input,
    select: { content: true },
  });
  if (replies.length === 0) return null;
  const idx = Math.floor(Math.random() * replies.length);
  return replies[idx]?.content ?? null;
}
