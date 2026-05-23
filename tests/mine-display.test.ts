import { describe, it, expect } from 'vitest';
import { renderBoard } from '../src/features/mine/display.js';
import { createGame } from '../src/features/mine/game.js';
import type { MineGame } from '../src/features/mine/types.js';

describe('renderBoard', () => {
  it('includes the title line with difficulty', () => {
    const game = createGame('g', 'easy');
    const out = renderBoard(game);
    expect(out).toContain('合作踩地雷');
    expect(out).toContain('Easy');
  });

  it('renders correct number of board rows', () => {
    const game = createGame('g', 'easy'); // 8 rows
    const out = renderBoard(game);
    const rowLines = out.split('\n').filter((l) => l.includes('🟦'));
    expect(rowLines.length).toBe(8);
  });

  it('shows safe opened count', () => {
    const game = createGame('g', 'medium');
    game.safeOpened = 12;
    const out = renderBoard(game);
    expect(out).toContain('12');
  });

  it('shows last action description when set', () => {
    const game = createGame('g', 'easy');
    game.lastActionDesc = '**TestUser** 開了 B3';
    const out = renderBoard(game);
    expect(out).toContain('TestUser');
  });

  it('shows timeout reminder while game is playing', () => {
    const game = createGame('g', 'easy');
    const out = renderBoard(game);
    expect(out).toContain('24');
  });

  it('shows win message on status won', () => {
    const game: MineGame = { ...createGame('g', 'easy'), status: 'won' };
    const out = renderBoard(game);
    expect(out).toContain('勝利');
  });

  it('shows loss message on status lost', () => {
    const game: MineGame = { ...createGame('g', 'easy'), status: 'lost' };
    const out = renderBoard(game);
    expect(out).toContain('結束');
  });

  it('shows player stats on game over', () => {
    const game: MineGame = {
      ...createGame('g', 'easy'),
      status: 'won',
      playerRecords: {
        'user-123': { moves: 5, flagsPlaced: 2, hitMine: false },
      },
    };
    const out = renderBoard(game);
    expect(out).toContain('<@user-123>');
    expect(out).toContain('5');
  });

  it('marks the culprit with skull on loss', () => {
    const game: MineGame = {
      ...createGame('g', 'easy'),
      status: 'lost',
      playerRecords: {
        'user-boom': { moves: 3, flagsPlaced: 0, hitMine: true },
        'user-safe': { moves: 4, flagsPlaced: 1, hitMine: false },
      },
    };
    const out = renderBoard(game);
    expect(out).toContain('💀');
    expect(out.split('💀').length - 1).toBe(1);
  });
});
