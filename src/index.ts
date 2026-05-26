import 'dotenv/config';
import { Client, Events, GatewayIntentBits, Partials } from 'discord.js';
import { loadEnv } from '@/config/env.js';
import { loadConfig } from '@/config/config.js';
import { logger } from '@/core/logger.js';
import { prisma } from '@/db/client.js';
import { commandRegistry } from '@/core/command/registry.js';
import { dispatchInteraction } from '@/core/command/dispatcher.js';
import { deployCommands } from '@/core/command/deploy.js';
import { allCommands } from '@/commands/index.js';
import { leaderboardAutocomplete } from '@/commands/leaderboard/index.js';
import { ownerSetStatAutocomplete } from '@/commands/owner/index.js';
import { handleMessageForKeywords } from '@/features/keyword/listener.js';
import { getCompiledTriggers } from '@/features/keyword/service.js';
import { startAchievementEngine } from '@/features/achievement/engine.js';
import { registerRoleMenuListeners } from '@/features/role-menu/listeners.js';

async function main() {
  const env = loadEnv();
  const config = loadConfig();

  logger.info({ env: env.NODE_ENV, name: config.bot.name }, 'starting yuzu');

  await prisma.$connect();
  logger.info('postgres connected');

  const triggers = getCompiledTriggers();
  logger.info({ count: triggers.length }, 'keyword triggers compiled');

  commandRegistry.registerAll(allCommands);
  logger.info({ count: commandRegistry.size() }, 'commands registered');

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel, Partials.GuildMember],
  });

  client.once(Events.ClientReady, async (c) => {
    logger.info({ user: c.user.tag, guilds: c.guilds.cache.size }, 'discord ready');
    startAchievementEngine(c);
    registerRoleMenuListeners(c);
    try {
      await deployCommands();
    } catch (err) {
      logger.error({ err }, 'command deploy failed');
    }
  });

  client.on(Events.InteractionCreate, (interaction) => {
    if (interaction.isChatInputCommand()) {
      void dispatchInteraction(interaction);
      return;
    }
    if (interaction.isAutocomplete()) {
      if (interaction.commandName === 'leaderboard') {
        const focused = interaction.options.getFocused(true);
        if (focused.name === 'stat') {
          void leaderboardAutocomplete(focused.value)
            .then((choices) => interaction.respond(choices))
            .catch((err) => logger.warn({ err }, 'autocomplete failed'));
        }
      }
      if (interaction.commandName === 'owner') {
        const focused = interaction.options.getFocused(true);
        if (focused.name === 'stat') {
          void interaction
            .respond(ownerSetStatAutocomplete(focused.value))
            .catch((err) => logger.warn({ err }, 'autocomplete failed'));
        }
      }
    }
  });

  client.on(Events.MessageCreate, (message) => {
    void handleMessageForKeywords(message);
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down');
    try {
      await client.destroy();
      await prisma.$disconnect();
    } catch (err) {
      logger.error({ err }, 'shutdown error');
    }
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'unhandled rejection');
  });
  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'uncaught exception');
  });

  await client.login(env.DISCORD_TOKEN);
}

main().catch((err) => {
  logger.error({ err }, 'fatal startup error');
  process.exit(1);
});
