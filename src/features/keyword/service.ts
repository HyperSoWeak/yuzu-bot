import { logger } from '@/core/logger.js';
import { loadConfig } from '@/config/config.js';
import type { CompiledTrigger, KeywordKind } from './types.js';

let compiled: CompiledTrigger[] | null = null;

export function getCompiledTriggers(): CompiledTrigger[] {
  if (compiled !== null) return compiled;

  const config = loadConfig();
  const result: CompiledTrigger[] = [];

  for (const group of config.keyword.group) {
    for (const pattern of group.triggers) {
      try {
        result.push({ groupKey: group.name, kind: group.kind, regex: new RegExp(pattern, 'i') });
      } catch (err) {
        logger.error({ err, pattern, group: group.name }, 'invalid keyword trigger regex');
        throw err;
      }
    }
  }

  compiled = result;
  return compiled;
}

export function pickRandomReply(kind: KeywordKind, groupKey: string): string | null {
  const config = loadConfig();
  const group = config.keyword.group.find((g) => g.name === groupKey && g.kind === kind);
  if (!group || group.replies.length === 0) return null;
  return group.replies[Math.floor(Math.random() * group.replies.length)] ?? null;
}
