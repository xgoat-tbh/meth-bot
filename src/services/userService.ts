import { getDatabase } from '../database/db';
import { UserRow, TransactionRow } from '../database/schema';
import { logger } from '../utils/logger';

export function ensureUser(userId: string, username: string): UserRow {
  const db = getDatabase();
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as unknown as UserRow | undefined;
  if (existing) {
    // Keep username fresh
    if (existing.username !== username) {
      db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, userId);
      existing.username = username;
    }
    return existing;
  }
  db.prepare('INSERT INTO users (id, username) VALUES (?, ?)').run(userId, username);
  logger.info(`New user registered: ${username} (${userId})`);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as unknown as UserRow;
}

export function getUser(userId: string): UserRow | undefined {
  return getDatabase().prepare('SELECT * FROM users WHERE id = ?').get(userId) as unknown as UserRow | undefined;
}

export function updateCoins(
  userId: string,
  delta: number,
  type: string,
  reason?: string
): { newBalance: number } {
  const db = getDatabase();
  const user = db.prepare('SELECT coins FROM users WHERE id = ?').get(userId) as unknown as
    | { coins: number }
    | undefined;
  if (!user) throw new Error(`User ${userId} not found`);

  const newBalance = Math.max(0, user.coins + delta);
  db.prepare('UPDATE users SET coins = ? WHERE id = ?').run(newBalance, userId);
  recordTransaction(userId, type, delta, reason);
  return { newBalance };
}

export function setCoins(userId: string, amount: number, type: string, reason?: string): void {
  const db = getDatabase();
  const safe = Math.max(0, amount);
  db.prepare('UPDATE users SET coins = ? WHERE id = ?').run(safe, userId);
  recordTransaction(userId, type, safe, reason);
}

export function updateTitle(userId: string, title: string): void {
  getDatabase().prepare('UPDATE users SET title = ? WHERE id = ?').run(title, userId);
}

export function updateLastCommand(
  userId: string,
  field: 'last_work' | 'last_crime' | 'last_daily' | 'last_rob'
): void {
  const now = Math.floor(Date.now() / 1000);
  getDatabase()
    .prepare(`UPDATE users SET ${field} = ? WHERE id = ?`)
    .run(now, userId);
}

export function getLeaderboard(limit = 10): UserRow[] {
  return getDatabase()
    .prepare('SELECT * FROM users ORDER BY coins DESC LIMIT ?')
    .all(limit) as unknown as UserRow[];
}

export function getLeaderboardRank(userId: string): number {
  const result = getDatabase()
    .prepare('SELECT COUNT(*) as rank FROM users WHERE coins > (SELECT coins FROM users WHERE id = ?)')
    .get(userId) as unknown as { rank: number } | undefined;
  return (result?.rank ?? 0) + 1;
}

export function getRecentTransactions(userId: string, limit = 5): TransactionRow[] {
  return getDatabase()
    .prepare(
      'SELECT * FROM transactions WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?'
    )
    .all(userId, limit) as unknown as TransactionRow[];
}

function recordTransaction(
  userId: string,
  type: string,
  amount: number,
  reason?: string
): void {
  getDatabase()
    .prepare('INSERT INTO transactions (user_id, type, amount, reason) VALUES (?, ?, ?, ?)')
    .run(userId, type, amount, reason ?? null);
}

export function getAllUsers(): UserRow[] {
  return getDatabase().prepare('SELECT * FROM users').all() as unknown as UserRow[];
}

export function getOrSetVictim(guildId: string, pickFn: () => string): string {
  const db = getDatabase();
  const today = new Date().toISOString().slice(0, 10);
  const existing = db
    .prepare('SELECT * FROM victims WHERE guild_id = ? AND date = ?')
    .get(guildId, today) as unknown as { user_id: string } | undefined;
  if (existing) return existing.user_id;

  const userId = pickFn();
  db.prepare(
    'INSERT OR REPLACE INTO victims (guild_id, user_id, date) VALUES (?, ?, ?)'
  ).run(guildId, userId, today);
  return userId;
}
