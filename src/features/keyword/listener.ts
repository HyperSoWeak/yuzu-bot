import type { Message } from 'discord.js';
import { logger } from '@/core/logger.js';
import { getSettings } from '@/features/settings/service.js';
import { bus } from '@/core/event-bus.js';
import { matchTriggers } from './matcher.js';
import { getTriggers, pickRandomReply } from './service.js';
import { incrementStat } from './stats.js';

const replyCooldown = new Map<string, number>();

function checkCooldown(channelId: string, key: string, seconds: number): boolean {
  if (seconds <= 0) return true;
  const k = `${channelId}:${key}`;
  const now = Date.now();
  const exp = replyCooldown.get(k);
  if (exp && exp > now) return false;
  replyCooldown.set(k, now + seconds * 1000);
  return true;
}

/**
 * Process a Discord message for keyword stats + replies.
 * - statsEnabled gates stat increments
 * - repliesEnabled gates bot replies (for both STAT and REPLY kinds)
 * Errors are caught and logged — never throws.
 */
export async function handleMessageForKeywords(message: Message): Promise<void> {
  try {
    if (message.author.bot) return;
    if (!message.guildId) return;

    bus.emit('message.created', {
      guildId: message.guildId,
      userId: message.author.id,
      channelId: message.channelId,
      content: message.content,
    });

    const settings = await getSettings(message.guildId);
    if (!settings.keywordStatsEnabled && !settings.keywordRepliesEnabled) return;

    const triggers = await getTriggers(message.guildId);
    if (triggers.length === 0) return;

    const matches = matchTriggers(message.content, triggers);
    if (matches.length === 0) return;

    for (const m of matches) {
      // Stat increments
      if (m.kind === 'STAT' && settings.keywordStatsEnabled) {
        await incrementStat({
          guildId: message.guildId,
          userId: message.author.id,
          statKey: m.groupKey,
          channelId: message.channelId,
        }).catch((err) => logger.error({ err, m }, 'incrementStat failed'));
      }

      // Bot replies (gated by keywordRepliesEnabled regardless of kind)
      if (!settings.keywordRepliesEnabled) continue;
      if (!message.channel.isSendable()) continue;

      const cdOk = checkCooldown(
        message.channelId,
        `${m.kind}:${m.groupKey}`,
        settings.keywordReplyCooldownSeconds,
      );
      if (!cdOk) continue;

      const reply = await pickRandomReply({
        guildId: message.guildId,
        kind: m.kind,
        groupKey: m.groupKey,
      });
      if (!reply) continue;

      await message.channel
        .send(reply)
        .catch((err) => logger.warn({ err, channelId: message.channelId }, 'reply send failed'));
    }
  } catch (err) {
    logger.error({ err, messageId: message.id }, 'keyword listener failed');
  }
}
