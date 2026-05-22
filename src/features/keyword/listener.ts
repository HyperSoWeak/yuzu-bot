import type { Message } from 'discord.js';
import { logger } from '@/core/logger.js';
import { getSettings } from '@/features/settings/service.js';
import { bus } from '@/core/event-bus.js';
import { matchTriggers } from './matcher.js';
import { getCompiledTriggers, pickRandomReply } from './service.js';
import { incrementStat } from './stats.js';
import type { KeywordKind } from './types.js';

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

const STAT_VARS = new Set(['count', 'name', 'mention', 'username']);
const REPLY_VARS = new Set(['name', 'mention', 'username']);

function interpolate(
  template: string,
  vars: Record<string, string>,
  kind: KeywordKind,
): string | null {
  const supported = kind === 'STAT' ? STAT_VARS : REPLY_VARS;
  let hasUnknown = false;
  const result = template.replace(/\{\{|\}\}|\{(\w+)\}/g, (match, key?: string) => {
    if (match === '{{') return '{';
    if (match === '}}') return '}';
    if (key && supported.has(key)) return vars[key] ?? match;
    hasUnknown = true;
    return match;
  });
  return hasUnknown ? null : result;
}

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

    const triggers = getCompiledTriggers();
    if (triggers.length === 0) return;

    const matches = matchTriggers(message.content, triggers);
    if (matches.length === 0) return;

    const displayName = message.member?.displayName ?? message.author.username;
    const vars: Record<string, string> = {
      name: displayName,
      mention: `<@${message.author.id}>`,
      username: message.author.username,
    };

    for (const m of matches) {
      let count: number | undefined;

      if (m.kind === 'STAT' && settings.keywordStatsEnabled) {
        count = await incrementStat({
          userId: message.author.id,
          statKey: m.groupKey,
          guildId: message.guildId,
          channelId: message.channelId,
        }).catch((err) => {
          logger.error({ err, m }, 'incrementStat failed');
          return undefined;
        });
        if (count === undefined) continue;
      }

      if (!settings.keywordRepliesEnabled) continue;
      if (!message.channel.isSendable()) continue;

      const cdOk = checkCooldown(
        message.channelId,
        `${m.kind}:${m.groupKey}`,
        settings.keywordReplyCooldownSeconds,
      );
      if (!cdOk) continue;

      const template = pickRandomReply(m.kind, m.groupKey);
      if (!template) continue;

      const replyVars = count !== undefined ? { ...vars, count: String(count) } : vars;
      const text = interpolate(template, replyVars, m.kind);
      if (!text) {
        logger.error(
          { template, kind: m.kind, group: m.groupKey },
          'reply template contains unknown variables',
        );
        continue;
      }

      await message.channel
        .send(text)
        .catch((err) => logger.warn({ err, channelId: message.channelId }, 'reply send failed'));
    }
  } catch (err) {
    logger.error({ err, messageId: message.id }, 'keyword listener failed');
  }
}
