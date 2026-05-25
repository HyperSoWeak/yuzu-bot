export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export const MINE_GAME_TIMEOUT_MS = 24 * 60 * 60 * 1000;

export interface DifficultyConfig {
  cols: number;
  rows: number;
  mines: number;
  maxMovesPerPlayer: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: { cols: 8, rows: 8, mines: 10, maxMovesPerPlayer: 8 },
  medium: { cols: 10, rows: 10, mines: 20, maxMovesPerPlayer: 12 },
  hard: { cols: 12, rows: 12, mines: 30, maxMovesPerPlayer: 16 },
  expert: { cols: 16, rows: 16, mines: 51, maxMovesPerPlayer: 20 },
};

export type CellValue = 'hidden' | 'flagged' | 'mine' | 'mine-hit' | number;

export interface PlayerRecord {
  moves: number;
  flagsPlaced: number;
  hitMine: boolean;
}

export type GameStatus = 'playing' | 'won' | 'lost';

export interface MineGame {
  guildId: string;
  difficulty: Difficulty;
  cols: number;
  rows: number;
  cells: CellValue[];
  minesPlaced: boolean;
  mines: Set<number>;
  adjacency: number[];
  status: GameStatus;
  safeOpened: number;
  totalSafe: number;
  lastPlayerId: string | null;
  playerRecords: Record<string, PlayerRecord>;
  lastActionDesc: string | null;
  startedAt: number;
  lastActionAt: number;
}
