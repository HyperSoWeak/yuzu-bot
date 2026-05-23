import { describe, it, expect } from 'vitest';
import { placeMines, computeAdjacency } from '../src/features/mine/board.js';

describe('placeMines', () => {
  it('returns exactly count mines', () => {
    const mines = placeMines(8, 8, 10, 0);
    expect(mines.size).toBe(10);
  });

  it('never places a mine on neighbors of the safe cell', () => {
    const cols = 8;
    const safeCell = 27;
    for (let trial = 0; trial < 20; trial++) {
      const mines = placeMines(cols, 8, 10, safeCell);
      const sr = Math.floor(safeCell / cols);
      const sc = safeCell % cols;
      for (const mine of mines) {
        const mr = Math.floor(mine / cols);
        const mc = mine % cols;
        expect(Math.abs(mr - sr) > 1 || Math.abs(mc - sc) > 1).toBe(true);
      }
    }
  });

  it('all mine indices are in-bounds', () => {
    const mines = placeMines(10, 10, 20, 55);
    for (const m of mines) {
      expect(m).toBeGreaterThanOrEqual(0);
      expect(m).toBeLessThan(100);
    }
  });
});

describe('computeAdjacency', () => {
  it('returns all zeros when no mines', () => {
    const adj = computeAdjacency(4, 4, new Set());
    expect(adj.every((v) => v === 0)).toBe(true);
  });

  it('counts correctly for a single mine at index 0 on a 3x3 grid', () => {
    const adj = computeAdjacency(3, 3, new Set([0]));
    expect(adj[0]).toBe(0);
    expect(adj[1]).toBe(1);
    expect(adj[3]).toBe(1);
    expect(adj[4]).toBe(1);
    expect(adj[2]).toBe(0);
    expect(adj[6]).toBe(0);
  });

  it('counts correctly for a mine at center of 3x3', () => {
    const adj = computeAdjacency(3, 3, new Set([4]));
    expect(adj[4]).toBe(0);
    for (const i of [0, 1, 2, 3, 5, 6, 7, 8]) {
      expect(adj[i]).toBe(1);
    }
  });

  it('sums adjacent mines from multiple sources', () => {
    const adj = computeAdjacency(3, 3, new Set([0, 2]));
    expect(adj[1]).toBe(2);
  });
});
