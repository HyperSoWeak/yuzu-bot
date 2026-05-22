import type { CompiledTrigger, MatchedGroup } from './types.js';

export function matchTriggers(
  content: string,
  triggers: readonly CompiledTrigger[],
): MatchedGroup[] {
  const seen = new Set<string>();
  const out: MatchedGroup[] = [];

  for (const t of triggers) {
    if (!t.regex.test(content)) continue;
    const key = `${t.kind}:${t.groupKey}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ kind: t.kind, groupKey: t.groupKey });
  }
  return out;
}
