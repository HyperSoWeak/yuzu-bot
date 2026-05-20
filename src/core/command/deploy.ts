import { REST, Routes } from 'discord.js';
import { loadEnv } from '@/config/env.js';
import { logger } from '@/core/logger.js';
import { commandRegistry } from './registry.js';

/**
 * Sync all registered slash commands to Discord.
 * - If DISCORD_DEV_GUILD_ID is set, registers to that guild only (instant).
 * - Otherwise registers globally (may take up to 1 hour to propagate).
 */
export async function deployCommands(): Promise<void> {
  const env = loadEnv();
  const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);
  const body = commandRegistry.list().map((c) => c.data.toJSON());

  if (env.DISCORD_DEV_GUILD_ID) {
    await rest.put(
      Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_DEV_GUILD_ID),
      { body },
    );
    logger.info(
      { count: body.length, guildId: env.DISCORD_DEV_GUILD_ID },
      'deployed guild commands',
    );
  } else {
    await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), { body });
    logger.info({ count: body.length }, 'deployed global commands');
  }
}
