-- CreateEnum
CREATE TYPE "keyword_kind" AS ENUM ('STAT', 'REPLY');

-- CreateEnum
CREATE TYPE "match_mode" AS ENUM ('CONTAINS', 'EQUALS', 'REGEX');

-- CreateTable
CREATE TABLE "guild_settings" (
    "guild_id" TEXT NOT NULL,
    "keyword_stats_enabled" BOOLEAN NOT NULL DEFAULT true,
    "keyword_replies_enabled" BOOLEAN NOT NULL DEFAULT true,
    "keyword_reply_cooldown_seconds" INTEGER NOT NULL DEFAULT 10,
    "achievements_enabled" BOOLEAN NOT NULL DEFAULT true,
    "achievement_announce_channel_id" TEXT,
    "color_role_enabled" BOOLEAN NOT NULL DEFAULT false,
    "audit_log_channel_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guild_settings_pkey" PRIMARY KEY ("guild_id")
);

-- CreateTable
CREATE TABLE "user_stats" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "stat_key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keyword_triggers" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "kind" "keyword_kind" NOT NULL,
    "group_key" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "match_mode" "match_mode" NOT NULL DEFAULT 'CONTAINS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "keyword_triggers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keyword_replies" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "kind" "keyword_kind" NOT NULL,
    "group_key" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "keyword_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rule_type" TEXT NOT NULL,
    "rule_config" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "achievement_key" TEXT NOT NULL,
    "earned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reaction_role_menus" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reaction_role_menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reaction_role_mappings" (
    "id" TEXT NOT NULL,
    "menu_id" TEXT NOT NULL,
    "emoji" TEXT,
    "button_id" TEXT,
    "role_id" TEXT NOT NULL,

    CONSTRAINT "reaction_role_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "color_role_assignments" (
    "guild_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "hex_color" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "color_role_assignments_pkey" PRIMARY KEY ("guild_id","user_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_stats_guild_id_stat_key_value_idx" ON "user_stats"("guild_id", "stat_key", "value" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "user_stats_guild_id_user_id_stat_key_key" ON "user_stats"("guild_id", "user_id", "stat_key");

-- CreateIndex
CREATE INDEX "keyword_triggers_guild_id_kind_idx" ON "keyword_triggers"("guild_id", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "keyword_triggers_guild_id_kind_group_key_trigger_key" ON "keyword_triggers"("guild_id", "kind", "group_key", "trigger");

-- CreateIndex
CREATE INDEX "keyword_replies_guild_id_kind_group_key_idx" ON "keyword_replies"("guild_id", "kind", "group_key");

-- CreateIndex
CREATE INDEX "user_achievements_guild_id_achievement_key_idx" ON "user_achievements"("guild_id", "achievement_key");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_guild_id_user_id_achievement_key_key" ON "user_achievements"("guild_id", "user_id", "achievement_key");

-- CreateIndex
CREATE UNIQUE INDEX "reaction_role_menus_message_id_key" ON "reaction_role_menus"("message_id");

-- CreateIndex
CREATE INDEX "reaction_role_menus_guild_id_idx" ON "reaction_role_menus"("guild_id");

-- CreateIndex
CREATE UNIQUE INDEX "reaction_role_mappings_menu_id_emoji_button_id_key" ON "reaction_role_mappings"("menu_id", "emoji", "button_id");

-- CreateIndex
CREATE INDEX "color_role_assignments_guild_id_hex_color_idx" ON "color_role_assignments"("guild_id", "hex_color");

-- CreateIndex
CREATE INDEX "audit_logs_guild_id_created_at_idx" ON "audit_logs"("guild_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_guild_id_action_idx" ON "audit_logs"("guild_id", "action");

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_key_fkey" FOREIGN KEY ("achievement_key") REFERENCES "achievements"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reaction_role_mappings" ADD CONSTRAINT "reaction_role_mappings_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "reaction_role_menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

