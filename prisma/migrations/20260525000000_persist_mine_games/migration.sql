CREATE TABLE "mine_game_sessions" (
    "guild_id" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mine_game_sessions_pkey" PRIMARY KEY ("guild_id")
);

CREATE INDEX "mine_game_sessions_expires_at_idx" ON "mine_game_sessions"("expires_at");
