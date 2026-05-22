import { ChannelType, PermissionsBitField, type Guild } from 'discord.js';
import { logger } from '@/core/logger.js';
import { getCompiledTriggers } from './service.js';
import { matchTriggers } from './matcher.js';

const DISCORD_EPOCH = 1420070400000n;

function timestampToSnowflake(ms: number): string {
  return String((BigInt(ms - 1) - DISCORD_EPOCH) << 22n);
}

export interface BackfillEntry {
  userId: string;
  groupKey: string;
  delta: number;
}

export interface BackfillResult {
  entries: BackfillEntry[];
  scannedChannels: number;
  skippedChannels: number;
  scannedMessages: number;
}

export async function scanForKeywords(guild: Guild, sinceMs: number): Promise<BackfillResult> {
  const triggers = getCompiledTriggers().filter((t) => t.kind === 'STAT');
  const afterSnowflake = timestampToSnowflake(sinceMs);

  const counts = new Map<string, Map<string, number>>();
  let scannedChannels = 0;
  let skippedChannels = 0;
  let scannedMessages = 0;

  const channels = await guild.channels.fetch();
  const me = guild.members.me;

  for (const [, channel] of channels) {
    if (!channel) continue;
    if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement) {
      continue;
    }

    if (me) {
      const perms = channel.permissionsFor(me);
      if (
        !perms?.has(PermissionsBitField.Flags.ViewChannel) ||
        !perms.has(PermissionsBitField.Flags.ReadMessageHistory)
      ) {
        skippedChannels++;
        continue;
      }
    }

    scannedChannels++;

    let cursor = afterSnowflake;
    while (true) {
      let batch;
      try {
        batch = await channel.messages.fetch({ after: cursor, limit: 100 });
      } catch (err) {
        logger.warn({ err, channelId: channel.id }, 'backfill: fetch failed, skipping channel');
        break;
      }

      if (batch.size === 0) break;

      for (const [, message] of batch) {
        if (message.author.bot) continue;
        scannedMessages++;

        const matches = matchTriggers(message.content, triggers);
        for (const m of matches) {
          const userMap = counts.get(message.author.id) ?? new Map<string, number>();
          counts.set(message.author.id, userMap);
          userMap.set(m.groupKey, (userMap.get(m.groupKey) ?? 0) + 1);
        }
      }

      if (batch.size < 100) break;

      const maxId = [...batch.keys()].reduce((a, b) => (BigInt(a) > BigInt(b) ? a : b));
      cursor = maxId;
    }
  }

  const entries: BackfillEntry[] = [];
  for (const [userId, groupMap] of counts) {
    for (const [groupKey, delta] of groupMap) {
      entries.push({ userId, groupKey, delta });
    }
  }

  return { entries, scannedChannels, skippedChannels, scannedMessages };
}
