-- Drop keyword tables
DROP TABLE "keyword_triggers";
DROP TABLE "keyword_replies";

-- Remove achievement_announce_channel_id from guild_settings
ALTER TABLE "guild_settings" DROP COLUMN "achievement_announce_channel_id";

-- Drop now-unused enums
DROP TYPE "keyword_kind";
DROP TYPE "match_mode";
