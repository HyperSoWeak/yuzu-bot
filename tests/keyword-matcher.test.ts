import { describe, it, expect } from 'vitest';
import { matchTriggers } from '../src/features/keyword/matcher.js';
import type { CompiledTrigger } from '../src/features/keyword/types.js';

function t(kind: 'STAT' | 'REPLY', groupKey: string, pattern: string): CompiledTrigger {
  return { kind, groupKey, regex: new RegExp(pattern, 'i') };
}

describe('matchTriggers', () => {
  it('matches substring case-insensitively', () => {
    const triggers = [t('STAT', 'breakdown', '破防')];
    expect(matchTriggers('我破防了', triggers)).toEqual([{ kind: 'STAT', groupKey: 'breakdown' }]);
    expect(matchTriggers('沒事', triggers)).toEqual([]);
  });

  it('matches equals via anchored regex', () => {
    const triggers = [t('REPLY', 'hi', '^hello$')];
    expect(matchTriggers('hello', triggers)).toEqual([{ kind: 'REPLY', groupKey: 'hi' }]);
    expect(matchTriggers('hello world', triggers)).toEqual([]);
  });

  it('matches regex patterns', () => {
    const triggers = [t('STAT', 'numbers', '\\d+')];
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
