import { CommandError } from '@/core/command/errors.js';
import { computeAdjacency, placeMines } from './board.js';
import {
  DIFFICULTIES,
  MAX_CONSECUTIVE_STEPS,
  type CellValue,
  type Difficulty,
  type MineGame,
} from './types.js';

export function createGame(guildId: string, difficulty: Difficulty): MineGame {
  const { cols, rows, mines: mineCount } = DIFFICULTIES[difficulty];
  const total = cols * rows;
  return {
    guildId,
    difficulty,
    cols,
    rows,
    cells: Array<CellValue>(total).fill('hidden'),
    minesPlaced: false,
    mines: new Set(),
    adjacency: Array<number>(total).fill(0),
    status: 'playing',
    safeOpened: 0,
    totalSafe: total - mineCount,
    lastPlayerId: null,
    consecutiveSteps: 0,
    playerRecords: {},
    lastActionDesc: null,
    startedAt: Date.now(),
    lastActionAt: Date.now(),
  };
}

export function parseCell(input: string, cols: number, rows: number): number {
  const match = /^([A-Za-z])(\d+)$/.exec(input.trim());
  if (!match) {
    throw new CommandError(`無效的座標格式「${input}」，請使用例如 B4。`);
  }
  const col = match[1]!.toUpperCase().charCodeAt(0) - 65;
  const row = parseInt(match[2]!, 10) - 1;
  if (col < 0 || col >= cols) {
    const maxLetter = String.fromCharCode(65 + cols - 1);
    throw new CommandError(`欄位超出範圍，此盤面欄位為 A–${maxLetter}。`);
  }
  if (row < 0 || row >= rows) {
    throw new CommandError(`列位超出範圍，此盤面列位為 1–${rows}。`);
  }
  return row * cols + col;
}

function validateMove(game: MineGame, userId: string): void {
  if (game.status !== 'playing') {
    throw new CommandError('遊戲已結束。');
  }
  if (game.lastPlayerId === userId && game.consecutiveSteps >= MAX_CONSECUTIVE_STEPS) {
    throw new CommandError(`你已連續操作 ${MAX_CONSECUTIVE_STEPS} 步，請讓其他玩家先行動。`);
  }
}

function ensureRecord(game: MineGame, userId: string): void {
  if (!game.playerRecords[userId]) {
    game.playerRecords[userId] = { moves: 0, flagsPlaced: 0, hitMine: false };
  }
}

function floodFill(game: MineGame, start: number): void {
  const stack = [start];
  while (stack.length > 0) {
    const idx = stack.pop()!;
    if (game.cells[idx] !== 'hidden') continue;
    const adj = game.adjacency[idx]!;
    game.cells[idx] = adj;
    game.safeOpened++;
    if (adj === 0) {
      const r = Math.floor(idx / game.cols);
      const c = idx % game.cols;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < game.rows && nc >= 0 && nc < game.cols) {
            const ni = nr * game.cols + nc;
            if (game.cells[ni] === 'hidden') stack.push(ni);
          }
        }
      }
    }
  }
}

export type OpenResult = { outcome: 'mine' } | { outcome: 'safe'; opened: number };

export function openCell(game: MineGame, index: number, userId: string): OpenResult {
  validateMove(game, userId);

  const cell = game.cells[index];
  if (typeof cell === 'number') {
    return chordCell(game, index, userId);
  }
  if (cell === 'mine' || cell === 'mine-hit') {
    throw new CommandError('這個格子已經打開了。');
  }
  if (cell === 'flagged') {
    throw new CommandError('這個格子有旗子，請先移除旗子再開。');
  }

  if (!game.minesPlaced) {
    const { mines: mineCount } = DIFFICULTIES[game.difficulty];
    game.mines = placeMines(game.cols, game.rows, mineCount, index);
    game.adjacency = computeAdjacency(game.cols, game.rows, game.mines);
    game.minesPlaced = true;
  }

  ensureRecord(game, userId);
  const record = game.playerRecords[userId]!;
  record.moves++;
  game.consecutiveSteps = game.lastPlayerId === userId ? game.consecutiveSteps + 1 : 1;
  game.lastPlayerId = userId;
  game.lastActionAt = Date.now();

  if (game.mines.has(index)) {
    game.cells[index] = 'mine-hit';
    record.hitMine = true;
    for (const mi of game.mines) {
      if (mi !== index && game.cells[mi] === 'hidden') {
        game.cells[mi] = 'mine';
      }
    }
    game.status = 'lost';
    return { outcome: 'mine' };
  }

  const before = game.safeOpened;
  floodFill(game, index);
  const opened = game.safeOpened - before;

  if (game.safeOpened >= game.totalSafe) {
    game.status = 'won';
  }

  return { outcome: 'safe', opened };
}

type ChordResult = { outcome: 'mine' } | { outcome: 'safe'; opened: number };

function chordCell(game: MineGame, index: number, userId: string): ChordResult {
  validateMove(game, userId);

  const cell = game.cells[index];
  if (typeof cell !== 'number') {
    throw new CommandError('只能對已翻開的數字格執行和弦展開。');
  }

  const r = Math.floor(index / game.cols);
  const c = index % game.cols;
  const neighbors: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < game.rows && nc >= 0 && nc < game.cols) {
        neighbors.push(nr * game.cols + nc);
      }
    }
  }

  const flaggedCount = neighbors.filter((ni) => game.cells[ni] === 'flagged').length;
  if (flaggedCount !== cell) {
    throw new CommandError(`周圍插旗數（${flaggedCount}）與數字（${cell}）不符，無法展開。`);
  }

  ensureRecord(game, userId);
  const record = game.playerRecords[userId]!;
  record.moves++;
  game.consecutiveSteps = game.lastPlayerId === userId ? game.consecutiveSteps + 1 : 1;
  game.lastPlayerId = userId;
  game.lastActionAt = Date.now();

  const hiddenNeighbors = neighbors.filter((ni) => game.cells[ni] === 'hidden');
  const mineHits = hiddenNeighbors.filter((ni) => game.mines.has(ni));

  if (mineHits.length > 0) {
    for (const mi of mineHits) {
      game.cells[mi] = 'mine-hit';
    }
    record.hitMine = true;
    for (const mi of game.mines) {
      if (game.cells[mi] === 'hidden') {
        game.cells[mi] = 'mine';
      }
    }
    game.status = 'lost';
    return { outcome: 'mine' };
  }

  const before = game.safeOpened;
  for (const ni of hiddenNeighbors) {
    floodFill(game, ni);
  }
  const opened = game.safeOpened - before;

  if (game.safeOpened >= game.totalSafe) {
    game.status = 'won';
  }

  return { outcome: 'safe', opened };
}

export type FlagResult = 'flagged' | 'unflagged';

export function toggleFlag(game: MineGame, index: number, userId: string): FlagResult {
  validateMove(game, userId);

  const cell = game.cells[index];
  if (typeof cell === 'number' || cell === 'mine' || cell === 'mine-hit') {
    throw new CommandError('這個格子已經打開了，無法插旗。');
  }

  ensureRecord(game, userId);
  const record = game.playerRecords[userId]!;
  record.moves++;
  game.consecutiveSteps = game.lastPlayerId === userId ? game.consecutiveSteps + 1 : 1;
  game.lastPlayerId = userId;
  game.lastActionAt = Date.now();

  if (cell === 'hidden') {
    game.cells[index] = 'flagged';
    record.flagsPlaced++;
    return 'flagged';
  } else {
    game.cells[index] = 'hidden';
    return 'unflagged';
  }
}
