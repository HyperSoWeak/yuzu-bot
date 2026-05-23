-- Drop FK before dropping the referenced table
ALTER TABLE "user_achievements" DROP CONSTRAINT "user_achievements_achievement_key_fkey";

-- Drop achievements table (definitions now live in config)
DROP TABLE "achievements";
