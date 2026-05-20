import type { AchievementDefinition } from './types.js';

const BREAKDOWN_TIERS = [1, 10, 30, 100, 300, 1000] as const;

const breakdownAchievements: AchievementDefinition[] = BREAKDOWN_TIERS.map((n) => ({
  key: `breakdown_count_${n}`,
  name: `破防 ${n}`,
  description: `累積說過 ${n} 次破防關鍵字。`,
  ruleType: 'stat_threshold',
  ruleConfig: { statKey: 'breakdown', threshold: n },
}));

export const achievementDefinitions: readonly AchievementDefinition[] = [...breakdownAchievements];
