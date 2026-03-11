/**
 * In-memory cooldown manager.
 * Each entry is keyed by `commandName:userId` and stores
 * the timestamp (ms) when the cooldown expires.
 */
const cooldowns = new Map<string, number>();

/**
 * Check whether a user is on cooldown for a command.
 * Returns remaining ms if on cooldown, or 0 if free.
 */
export function getCooldownRemaining(commandName: string, userId: string): number {
  const key = `${commandName}:${userId}`;
  const expiry = cooldowns.get(key);
  if (!expiry) return 0;
  const remaining = expiry - Date.now();
  if (remaining <= 0) {
    cooldowns.delete(key);
    return 0;
  }
  return remaining;
}

/**
 * Set a cooldown for a user on a command.
 * @param durationMs Cooldown duration in milliseconds.
 */
export function setCooldown(commandName: string, userId: string, durationMs: number): void {
  const key = `${commandName}:${userId}`;
  cooldowns.set(key, Date.now() + durationMs);
}

/** Format remaining cooldown ms to a human-readable string. */
export function formatCooldown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);
  return parts.join(' ') || '0s';
}
