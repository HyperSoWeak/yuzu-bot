import type { AchievementRule } from '../types.js';

const rules = new Map<string, AchievementRule>();

export function registerRule(rule: AchievementRule): void {
  if (rules.has(rule.type)) throw new Error(`duplicate achievement rule type: ${rule.type}`);
  rules.set(rule.type, rule);
}

export function getRule(type: string): AchievementRule | undefined {
  return rules.get(type);
}

export function allRules(): AchievementRule[] {
  return [...rules.values()];
}
