import { describe, it, expect } from 'vitest';
import { CommandError } from '../src/core/command/errors.js';
import { createGame, openCell, parseCell, toggleFlag } from '../src/features/mine/game.js';

describe('parseCell', () => {
  it('parses A1 to index 0 on 8x8', () => {
    expect(parseCell('A1', 8, 8)).toBe(0);
  });

  it('parses B1 to index 1 on 8x8', () => {
    expect(parseCell('B1', 8, 8)).toBe(1);
  });

  it('parses A2 to index 8 on 8x8', () => {
    expect(parseCell('A2', 8, 8)).toBe(8);
  });

  it('parses H8 to index 63 on 8x8', () => {
    expect(parseCell('H8', 8, 8)).toBe(63);
  });

  it('is case-insensitive', () => {
    expect(parseCell('b4', 8, 8)).toBe(parseCell('B4', 8, 8));
  });

  it('throws CommandError for invalid format', () => {
    expect(() => parseCell('44', 8, 8)).toThrow(CommandError);
    expect(() => parseCell('', 8, 8)).toThrow(CommandError);
    expect(() => parseCell('AA', 8, 8)).toThrow(CommandError);
  });

  it('throws CommandError for out-of-range column', () => {
    expect(() => parseCell('Z1', 8, 8)).toThrow(CommandError);
  });

  it('throws CommandError for row 0 or out-of-range row', () => {
    expect(() => parseCell('A0', 8, 8)).toThrow(CommandError);
    expect(() => parseCell('A9', 8, 8)).toThrow(CommandError);
  });
});

describe('createGame', () => {
  it('creates a game with correct initial state', () => {
    const game = createGame('guild-1', 'easy');
    expect(game.guildId).toBe('guild-1');
    expect(game.difficulty).toBe('easy');
    expect(game.cols).toBe(8);
    expect(game.rows).toBe(8);
    expect(game.cells.length).toBe(64);
    expect(game.cells.every((c) => c === 'hidden')).toBe(true);
    expect(game.minesPlaced).toBe(false);
    expect(game.status).toBe('playing');
    expect(game.safeOpened).toBe(0);
    expect(game.totalSafe).toBe(54); // 64 - 10 mines
    expect(game.lastPlayerId).toBeNull();
  });

  it('creates an expert game with correct dimensions', () => {
    const game = createGame('g', 'expert');
    expect(game.cols).toBe(16);
    expect(game.rows).toBe(16);
    expect(game.totalSafe).toBe(256 - 51);
    expect(game.cells).toHaveLength(256);
  });
});

describe('openCell', () => {
  it('places mines on first open', () => {
    const game = createGame('g', 'easy');
    expect(game.minesPlaced).toBe(false);
    openCell(game, 0, 'user-a');
    expect(game.minesPlaced).toBe(true);
    expect(game.mines.size).toBe(10);
  });

  it('first opened cell is never a mine', () => {
    for (let i = 0; i < 30; i++) {
      const game = createGame('g', 'easy');
      openCell(game, 0, 'user-a');
      expect(game.mines.has(0)).toBe(false);
    }
  });

  it('throws if game is over', () => {
    const game = createGame('g', 'easy');
    game.status = 'lost';
    expect(() => openCell(game, 5, 'user-a')).toThrow(CommandError);
  });

  it('throws if same player goes twice in a row', () => {
    const game = createGame('g', 'easy');
    openCell(game, 0, 'user-a');
    const idx = game.cells.findIndex((c) => c === 'hidden');
    expect(() => openCell(game, idx, 'user-a')).toThrow(CommandError);
  });

  it('allows same player again after another player moves', () => {
    const game = createGame('g', 'easy');
    game.minesPlaced = true;
    game.mines = new Set([63]);
    game.adjacency = new Array(64).fill(1);
    openCell(game, 0, 'user-a');
    expect(game.status).toBe('playing');
    openCell(game, 1, 'user-b');
    expect(game.status).toBe('playing');
    expect(() => openCell(game, 2, 'user-a')).not.toThrow();
  });

  it('throws when player exceeds maxMovesPerPlayer', () => {
    const game = createGame('g', 'easy'); // k = 8
    game.minesPlaced = true;
    game.mines = new Set();
    game.adjacency = new Array(64).fill(1);
    game.playerRecords['user-a'] = { moves: 8, flagsPlaced: 0, hitMine: false };
    game.lastPlayerId = 'user-b';
    expect(() => openCell(game, 5, 'user-a')).toThrow(CommandError);
  });

  it('throws if cell is already open', () => {
    const game = createGame('g', 'easy');
    game.minesPlaced = true;
    game.cells[5] = 1;
    expect(() => openCell(game, 5, 'user-a')).toThrow(CommandError);
  });

  it('throws if cell is flagged', () => {
    const game = createGame('g', 'easy');
    game.minesPlaced = true;
    game.cells[5] = 'flagged';
    expect(() => openCell(game, 5, 'user-a')).toThrow(CommandError);
  });

  it('sets status to lost and marks cell as mine-hit when mine is opened', () => {
    const game = createGame('g', 'easy');
    game.minesPlaced = true;
    game.mines = new Set([5]);
    game.adjacency = new Array(64).fill(0);
    const result = openCell(game, 5, 'user-a');
    expect(result.outcome).toBe('mine');
    expect(game.status).toBe('lost');
    expect(game.cells[5]).toBe('mine-hit');
    expect(game.playerRecords['user-a']!.hitMine).toBe(true);
  });

  it('reveals all other mines on game over', () => {
    const game = createGame('g', 'easy');
    game.minesPlaced = true;
    game.mines = new Set([5, 10, 15]);
    game.adjacency = new Array(64).fill(0);
    openCell(game, 5, 'user-a');
    expect(game.cells[10]).toBe('mine');
    expect(game.cells[15]).toBe('mine');
  });

  it('flood fills when adjacency is 0', () => {
    const game = createGame('g', 'easy');
    game.minesPlaced = true;
    game.mines = new Set([63]);
    game.adjacency = new Array(64).fill(0);
    game.adjacency[54] = 1;
    game.adjacency[55] = 1;
    game.adjacency[62] = 1;
    game.totalSafe = 63;
    openCell(game, 0, 'user-a');
    expect(game.safeOpened).toBe(63);
  });

  it('sets status to won when last safe cell is opened', () => {
    const game = createGame('g', 'easy');
    game.minesPlaced = true;
    game.mines = new Set([0]);
    game.adjacency = new Array(64).fill(0);
    game.adjacency[1] = 1;
    game.adjacency[8] = 1;
    game.adjacency[9] = 1;
    game.totalSafe = 63;
    game.safeOpened = 62;
    game.cells = new Array(64).fill(1) as typeof game.cells;
    game.cells[0] = 'mine';
    game.cells[63] = 'hidden';
    const result = openCell(game, 63, 'user-a');
    expect(result.outcome).toBe('safe');
    expect(game.status).toBe('won');
  });
});

describe('toggleFlag', () => {
  it('flags a hidden cell and returns flagged', () => {
    const game = createGame('g', 'easy');
    const result = toggleFlag(game, 5, 'user-a');
    expect(result).toBe('flagged');
    expect(game.cells[5]).toBe('flagged');
    expect(game.playerRecords['user-a']!.flagsPlaced).toBe(1);
  });

  it('unflags a flagged cell and returns unflagged', () => {
    const game = createGame('g', 'easy');
    game.cells[5] = 'flagged';
    game.lastPlayerId = 'user-b';
    const result = toggleFlag(game, 5, 'user-a');
    expect(result).toBe('unflagged');
    expect(game.cells[5]).toBe('hidden');
  });

  it('throws if cell is already open', () => {
    const game = createGame('g', 'easy');
    game.cells[5] = 3;
    expect(() => toggleFlag(game, 5, 'user-a')).toThrow(CommandError);
  });

  it('counts flag move in player moves', () => {
    const game = createGame('g', 'easy');
    toggleFlag(game, 5, 'user-a');
    expect(game.playerRecords['user-a']!.moves).toBe(1);
  });

  it('updates lastPlayerId', () => {
    const game = createGame('g', 'easy');
    toggleFlag(game, 5, 'user-a');
    expect(game.lastPlayerId).toBe('user-a');
  });

  it('unflagging does not increment flagsPlaced', () => {
    const game = createGame('g', 'easy');
    game.cells[5] = 'flagged';
    game.lastPlayerId = 'user-b';
    toggleFlag(game, 5, 'user-a');
    expect(game.playerRecords['user-a']!.flagsPlaced).toBe(0);
  });
});
