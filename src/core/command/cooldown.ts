/**
 * Per-user per-command cooldown tracker (in-memory).
 * For multi-instance deployments this would need replacing with Redis; not required for v0.
 */
export class CooldownTracker {
  private readonly entries = new Map<string, number>();

  private key(commandName: string, userId: string): string {
    return `${commandName}:${userId}`;
  }

  /** Returns remaining cooldown in ms (0 if ready). */
  check(commandName: string, userId: string): number {
    const expires = this.entries.get(this.key(commandName, userId));
    if (!expires) return 0;
    const remaining = expires - Date.now();
    if (remaining <= 0) {
      this.entries.delete(this.key(commandName, userId));
      return 0;
    }
    return remaining;
  }

  /** Apply cooldown; seconds = 0 is a no-op. */
  apply(commandName: string, userId: string, seconds: number): void {
    if (seconds <= 0) return;
    this.entries.set(this.key(commandName, userId), Date.now() + seconds * 1000);
  }
}

export const commandCooldowns = new CooldownTracker();
