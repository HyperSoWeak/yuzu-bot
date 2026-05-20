import { prisma } from '@/db/client.js';
import { logger } from '@/core/logger.js';

export interface AuditEntry {
  guildId: string;
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  payload?: Record<string, unknown>;
}

/**
 * Persist an audit log row. Must never throw — audit failures must not break user-facing flows.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        guildId: entry.guildId,
        actorId: entry.actorId,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        payload: (entry.payload ?? {}) as object,
      },
    });
  } catch (err) {
    logger.error({ err, entry }, 'audit log write failed');
  }
}
