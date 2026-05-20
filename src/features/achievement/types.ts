import type { Achievement, Prisma } from '@prisma/client';
import type { DomainEvents } from '@/core/event-bus.js';

export type { Achievement };

/** Definition shipped in code; upserted into DB at boot. */
export interface AchievementDefinition {
  key: string;
  name: string;
  description: string;
  ruleType: string;
  ruleConfig: Prisma.InputJsonValue;
}

/**
 * A rule decides whether a given achievement should fire based on a domain event.
 * Implementations live in `rules/<rule-type>.ts` and self-register at module load.
 */
export interface AchievementRule {
  type: string;
  events: ReadonlyArray<keyof DomainEvents>;
  evaluate(
    achievement: Achievement,
    eventName: keyof DomainEvents,
    payload: DomainEvents[keyof DomainEvents],
  ): boolean | Promise<boolean>;
}
