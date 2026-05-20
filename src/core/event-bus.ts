import { EventEmitter } from 'node:events';
import { logger } from './logger.js';

/**
 * Domain events emitted across features (e.g. stat increments → achievement checks).
 * Keep payload types explicit; do not lean on `any`.
 */
export interface DomainEvents {
  'stat.updated': {
    guildId: string;
    userId: string;
    statKey: string;
    delta: number;
    value: number;
    channelId?: string;
  };
  'message.created': {
    guildId: string;
    userId: string;
    channelId: string;
    content: string;
  };
}

class TypedBus {
  private readonly inner = new EventEmitter({ captureRejections: true });

  on<K extends keyof DomainEvents>(
    event: K,
    handler: (payload: DomainEvents[K]) => void | Promise<void>,
  ): void {
    this.inner.on(event, (payload) => {
      Promise.resolve(handler(payload as DomainEvents[K])).catch((err) =>
        logger.error({ err, event }, 'event handler failed'),
      );
    });
  }

  emit<K extends keyof DomainEvents>(event: K, payload: DomainEvents[K]): void {
    this.inner.emit(event, payload);
  }
}

export const bus = new TypedBus();
