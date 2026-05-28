export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export const MAX_CONSECUTIVE_STEPS = 5;

export interface DifficultyConfig {
  cols: number;
  rows: number;
  mines: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: { cols: 8, rows: 8, mines: 10 },
  medium: { cols: 10, rows: 10, mines: 20 },
  hard: { cols: 12, rows: 12, mines: 30 },
  expert: { cols: 16, rows: 16, mines: 51 },
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
  consecutiveSteps: number;
  playerRecords: Record<string, PlayerRecord>;
  lastActionDesc: string | null;
  startedAt: number;
  lastActionAt: number;
}
