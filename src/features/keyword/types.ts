import type { KeywordKind, KeywordTrigger, MatchMode } from '@prisma/client';

export type { KeywordKind, KeywordTrigger, MatchMode };

export interface MatchedGroup {
  kind: KeywordKind;
  groupKey: string;
}

/** A pre-compiled trigger for fast in-memory matching. */
export interface CompiledTrigger {
  groupKey: string;
  kind: KeywordKind;
  matchMode: MatchMode;
  raw: string;
  regex?: RegExp;
  /** lowercased trigger for contains/equals comparison */
  needle?: string;
}
