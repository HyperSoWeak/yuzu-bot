import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';
import type { Logger } from '@/core/logger.js';

export const COMMAND_CATEGORIES = [
  'info',
  'settings',
  'keyword',
  'achievement',
  'leaderboard',
  'reaction-role',
  'color-role',
  'owner',
] as const;

export type CommandCategory = (typeof COMMAND_CATEGORIES)[number];

export interface CommandPermission {
  /** Restrict to bot owners (env DISCORD_OWNER_IDS). */
  ownerOnly?: boolean;
  /** Require ManageGuild permission. */
  adminOnly?: boolean;
}

/** Any Discord.js slash command builder shape. */
export type CommandBuilder =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder
  | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;

export interface CommandContext {
  interaction: ChatInputCommandInteraction;
  logger: Logger;
}

export interface Command {
  data: CommandBuilder;
  category: CommandCategory;
  /** Per-user cooldown in seconds; falls back to config default if undefined. */
  cooldownSeconds?: number;
  permissions?: CommandPermission;
  execute(ctx: CommandContext): Promise<void>;
}
