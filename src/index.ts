import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { loadEnv } from '@/config/env.js';
import { loadConfig } from '@/config/config.js';
import { logger } from '@/core/logger.js';
import { prisma } from '@/db/client.js';

async function main() {
  const env = loadEnv();
  const config = loadConfig();

  logger.info({ env: env.NODE_ENV, name: config.bot.name }, 'starting yuzu');

  await prisma.$connect();
  logger.info('postgres connected');

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.GuildMember],
  });

  client.once('ready', (c) => {
    logger.info({ user: c.user.tag, guilds: c.guilds.cache.size }, 'discord ready');
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
