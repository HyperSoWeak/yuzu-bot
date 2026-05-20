import { describe, it, expect } from 'vitest';
import { matchTriggers } from '../src/features/keyword/matcher.js';
import type { CompiledTrigger } from '../src/features/keyword/types.js';

function t(
  kind: 'STAT' | 'REPLY',
  groupKey: string,
  trigger: string,
  matchMode: 'CONTAINS' | 'EQUALS' | 'REGEX' = 'CONTAINS',
): CompiledTrigger {
  if (matchMode === 'REGEX') {
    return { kind, groupKey, matchMode, raw: trigger, regex: new RegExp(trigger) };
  }
  return { kind, groupKey, matchMode, raw: trigger, needle: trigger.toLowerCase() };
}

describe('matchTriggers', () => {
  it('matches CONTAINS case-insensitively', () => {
    const triggers = [t('STAT', 'breakdown', '破防')];
    expect(matchTriggers('我破防了', triggers)).toEqual([{ kind: 'STAT', groupKey: 'breakdown' }]);
    expect(matchTriggers('沒事', triggers)).toEqual([]);
  });

  it('matches EQUALS exactly', () => {
    const triggers = [t('REPLY', 'hi', 'hello', 'EQUALS')];
    expect(matchTriggers('hello', triggers)).toEqual([{ kind: 'REPLY', groupKey: 'hi' }]);
    expect(matchTriggers('hello world', triggers)).toEqual([]);
  });

  it('matches REGEX', () => {
    const triggers = [t('STAT', 'numbers', '\\d+', 'REGEX')];
    expect(matchTriggers('abc 123', triggers)).toEqual([{ kind: 'STAT', groupKey: 'numbers' }]);
    expect(matchTriggers('no digits', triggers)).toEqual([]);
  });

  it('dedupes (kind, groupKey) when multiple triggers match', () => {
    const triggers = [t('STAT', 'breakdown', '破防'), t('STAT', 'breakdown', '破大防')];
    const r = matchTriggers('破防 破大防', triggers);
    expect(r).toEqual([{ kind: 'STAT', groupKey: 'breakdown' }]);
  });

  it('returns matches across multiple groups', () => {
    const triggers = [t('STAT', 'a', 'foo'), t('REPLY', 'b', 'bar')];
    const r = matchTriggers('foo bar', triggers);
    expect(r).toEqual(
      expect.arrayContaining([
        { kind: 'STAT', groupKey: 'a' },
        { kind: 'REPLY', groupKey: 'b' },
      ]),
    );
    expect(r).toHaveLength(2);
  });
});
