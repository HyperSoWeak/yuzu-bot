import type { Client } from 'discord.js';
import { logger } from '@/core/logger.js';
import { loadConfig } from '@/config/config.js';
import { bus, type DomainEvents } from '@/core/event-bus.js';
import { getSettings } from '@/features/settings/service.js';
import './rules/index.js';
import { allRules } from './rules/registry.js';
import { awardAchievement } from './service.js';
import { getAchievementDefinitions } from './definitions.js';
import type { AchievementDefinition, AchievementRule } from './types.js';

const config = loadConfig();

async function announce(
  client: Client,
  channelId: string,
  userId: string,
  achievementName: string,
): Promise<void> {
  try {
    const ch = await client.channels.fetch(channelId);
    if (!ch || !ch.isTextBased() || !ch.isSendable()) return;
    await ch.send(`🏆 <@${userId}> 解鎖成就：**${achievementName}**`);
  } catch (err) {
    logger.warn({ err, channelId }, 'announce failed');
  }
}

export function startAchievementEngine(client: Client): void {
  const handlersByEvent = new Map<keyof DomainEvents, AchievementRule[]>();
  for (const rule of allRules()) {
    for (const ev of rule.events) {
      const list = handlersByEvent.get(ev) ?? [];
      list.push(rule);
      handlersByEvent.set(ev, list);
    }
  }

  const definitionsByRuleType = new Map<string, AchievementDefinition[]>();
  for (const def of getAchievementDefinitions()) {
    const list = definitionsByRuleType.get(def.ruleType) ?? [];
    list.push(def);
    definitionsByRuleType.set(def.ruleType, list);
  }

  const handle = async <K extends keyof DomainEvents>(
    eventName: K,
    payload: DomainEvents[K] & { guildId: string; userId: string },
  ) => {
    const settings = await getSettings(payload.guildId);
    if (!settings.achievementsEnabled) return;

    const matchingRules = handlersByEvent.get(eventName) ?? [];
    for (const rule of matchingRules) {
      const achievements = definitionsByRuleType.get(rule.type) ?? [];
      for (const a of achievements) {
        let ok: boolean;
        try {
          ok = await rule.evaluate(a, eventName, payload);
        } catch (err) {
          logger.error({ err, rule: rule.type, key: a.key }, 'rule evaluate failed');
          continue;
        }
        if (!ok) continue;

        const created = await awardAchievement({
          userId: payload.userId,
          achievementKey: a.key,
        }).catch((err) => {
          logger.error({ err, key: a.key }, 'awardAchievement failed');
          return null;
        });
        if (!created) continue;

        logger.info({ key: a.key, userId: payload.userId }, 'achievement awarded');

        if (config.achievement.announce_enabled && payload.channelId) {
          void announce(client, payload.channelId, payload.userId, a.name);
        }
      }
    }
  };

  for (const ev of handlersByEvent.keys()) {
    bus.on(ev, (payload) => {
      const p = payload as DomainEvents[typeof ev] & { guildId?: string; userId?: string };
      if (!p.guildId || !p.userId) return;
      void handle(ev, p as DomainEvents[typeof ev] & { guildId: string; userId: string });
    });
  }

  logger.info({ rules: allRules().length }, 'achievement engine started');
}
