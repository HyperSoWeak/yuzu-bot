import type { CompiledTrigger, MatchedGroup } from './types.js';

/**
 * Match `content` against all triggers; returns the set of (kind, groupKey)
 * pairs that fired at least once. Each pair appears at most once.
 *
 * Matching rules:
 * - CONTAINS / EQUALS: case-insensitive
 * - REGEX: as authored; invalid regexes are skipped silently (logged at compile time)
 */
export function matchTriggers(
  content: string,
  triggers: readonly CompiledTrigger[],
): MatchedGroup[] {
  const lower = content.toLowerCase();
  const seen = new Set<string>();
  const out: MatchedGroup[] = [];

  for (const t of triggers) {
    let hit = false;
    switch (t.matchMode) {
      case 'CONTAINS':
        hit = t.needle ? lower.includes(t.needle) : false;
        break;
      case 'EQUALS':
        hit = lower === t.needle;
        break;
      case 'REGEX':
        hit = t.regex ? t.regex.test(content) : false;
        break;
    }
    if (!hit) continue;
    const key = `${t.kind}:${t.groupKey}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ kind: t.kind, groupKey: t.groupKey });
  }
  return out;
}
