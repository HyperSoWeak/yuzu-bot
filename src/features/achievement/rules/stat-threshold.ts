import { z } from 'zod';
import { logger } from '@/core/logger.js';
import type { AchievementRule } from '../types.js';
import { registerRule } from './registry.js';

const ConfigSchema = z.object({
  statKey: z.string().min(1),
  threshold: z.number().int().positive(),
});

/**
 * Fires when a user's stat reaches a threshold (>=).
 * Config: { statKey: string, threshold: number }
 */
export const statThresholdRule: AchievementRule = {
  type: 'stat_threshold',
  events: ['stat.updated'],
  evaluate(achievement, eventName, payload) {
    if (eventName !== 'stat.updated') return false;
    const parsed = ConfigSchema.safeParse(achievement.ruleConfig);
    if (!parsed.success) {
      logger.warn(
        { key: achievement.key, issues: parsed.error.issues },
        'invalid stat_threshold config',
      );
      return false;
    }
    const evt = payload as { statKey: string; value: number };
    return evt.statKey === parsed.data.statKey && evt.value >= parsed.data.threshold;
  },
};

registerRule(statThresholdRule);
