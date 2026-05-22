-- Drop old indexes on user_stats
DROP INDEX "user_stats_guild_id_stat_key_value_idx";
DROP INDEX "user_stats_guild_id_user_id_stat_key_key";

-- Remove guild_id from user_stats
ALTER TABLE "user_stats" DROP COLUMN "guild_id";

-- Add new unique constraint and index
CREATE UNIQUE INDEX "user_stats_user_id_stat_key_key" ON "user_stats"("user_id", "stat_key");
CREATE INDEX "user_stats_stat_key_value_idx" ON "user_stats"("stat_key", "value" DESC);

-- Drop old indexes on user_achievements
DROP INDEX "user_achievements_guild_id_achievement_key_idx";
DROP INDEX "user_achievements_guild_id_user_id_achievement_key_key";

-- Remove guild_id from user_achievements
ALTER TABLE "user_achievements" DROP COLUMN "guild_id";

-- Add new unique constraint and index
CREATE UNIQUE INDEX "user_achievements_user_id_achievement_key_key" ON "user_achievements"("user_id", "achievement_key");
CREATE INDEX "user_achievements_achievement_key_idx" ON "user_achievements"("achievement_key");
