import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CooldownTracker } from '../src/core/command/cooldown.js';

describe('CooldownTracker', () => {
  let cd: CooldownTracker;

  beforeEach(() => {
    vi.useFakeTimers();
    cd = new CooldownTracker();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 0 when no cooldown active', () => {
    expect(cd.check('cmd', 'user-1')).toBe(0);
  });

  it('reports remaining ms after apply', () => {
    cd.apply('cmd', 'user-1', 5);
    expect(cd.check('cmd', 'user-1')).toBeGreaterThan(4000);
    expect(cd.check('cmd', 'user-1')).toBeLessThanOrEqual(5000);
  });

  it('clears after expiry', () => {
    cd.apply('cmd', 'user-1', 1);
    vi.advanceTimersByTime(1500);
    expect(cd.check('cmd', 'user-1')).toBe(0);
  });

  it('is per-user and per-command', () => {
    cd.apply('cmd-a', 'user-1', 5);
    expect(cd.check('cmd-b', 'user-1')).toBe(0);
    expect(cd.check('cmd-a', 'user-2')).toBe(0);
  });

  it('apply with 0 or negative seconds is a no-op', () => {
    cd.apply('cmd', 'user-1', 0);
    cd.apply('cmd', 'user-1', -3);
    expect(cd.check('cmd', 'user-1')).toBe(0);
  });
});
