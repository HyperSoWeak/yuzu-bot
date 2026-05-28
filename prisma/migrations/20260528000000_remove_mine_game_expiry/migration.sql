DROP INDEX "mine_game_sessions_expires_at_idx";

ALTER TABLE "mine_game_sessions" DROP COLUMN "expires_at";
