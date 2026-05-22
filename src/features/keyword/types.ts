export type KeywordKind = 'STAT' | 'REPLY';

export interface MatchedGroup {
  kind: KeywordKind;
  groupKey: string;
}

export interface CompiledTrigger {
  groupKey: string;
  kind: KeywordKind;
  regex: RegExp;
}
