import { loadConfig } from '@/config/config.js';
import type { AchievementDefinition } from './types.js';

export function getAchievementDefinitions(): readonly AchievementDefinition[] {
  return loadConfig().achievement.definition.map((d) => ({
    key: d.key,
    name: d.name,
    description: d.description,
    ruleType: d.rule_type,
    ruleConfig: d.rule_config,
  }));
}
