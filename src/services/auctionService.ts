import { EmbedBuilder } from 'discord.js';
import { getDatabase } from '../database/db';
import { AuctionRow } from '../database/schema';
import { getUser, updateCoins } from './userService';

export { AuctionRow };

// In-memory timeout handles keyed by auction id
const auctionTimeouts = new Map<number, NodeJS.Timeout>();

export type AuctionEndCallback = (auction: AuctionRow) => Promise<void>;
let endCallback: AuctionEndCallback | null = null;

export function setAuctionEndCallback(cb: AuctionEndCallback): void {
  endCallback = cb;
}

export function getActiveAuction(guildId: string): AuctionRow | undefined {
  const db = getDatabase();
  return db
    .prepare(`SELECT * FROM auctions WHERE guild_id = ? AND status = 'active'`)
    .get(guildId) as unknown as AuctionRow | undefined;
}

export function createAuction(
  guildId: string,
  channelId: string,
  startedById: string,
  startedByName: string,
  itemName: string,
  description: string,
  startingPrice: number,
  durationMs: number,
): AuctionRow {
  const db = getDatabase();
  const now = Date.now();
  const endsAt = now + durationMs;

  const result = db
    .prepare(`
      INSERT INTO auctions
        (guild_id, channel_id, item_name, description, starting_price, current_bid,
         started_by_id, started_by_name, ends_at, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `)
    .run(guildId, channelId, itemName, description, startingPrice, startingPrice,
      startedById, startedByName, endsAt, now);

  const auction = db
    .prepare('SELECT * FROM auctions WHERE id = ?')
    .get(result.lastInsertRowid) as unknown as AuctionRow;

  const timeout = setTimeout(async () => {
    const latest = getDatabase()
      .prepare('SELECT * FROM auctions WHERE id = ?')
      .get(auction.id) as unknown as AuctionRow;
    if (latest.status !== 'active') return;
    getDatabase().prepare(`UPDATE auctions SET status = 'ended' WHERE id = ?`).run(auction.id);
    if (endCallback) await endCallback(latest);
    auctionTimeouts.delete(auction.id);
  }, durationMs);

  auctionTimeouts.set(auction.id, timeout);
  return auction;
}

export function setAuctionMessageId(auctionId: number, messageId: string): void {
  getDatabase().prepare('UPDATE auctions SET message_id = ? WHERE id = ?').run(messageId, auctionId);
}

export interface BidResult {
  success: boolean;
  reason?: string;
  auction?: AuctionRow;
}

export function placeBid(guildId: string, userId: string, username: string, amount: number): BidResult {
  const auction = getActiveAuction(guildId);
  if (!auction) return { success: false, reason: 'There is no active auction right now.' };

  if (userId === auction.started_by_id) {
    return { success: false, reason: "You can't bid on your own auction." };
  }

  const minBid = auction.current_bid + 1;
  if (amount < minBid) {
    return {
      success: false,
      reason: `Bid must be at least **${minBid.toLocaleString()} coins** (current: ${auction.current_bid.toLocaleString()}).`,
    };
  }

  const user = getUser(userId);
  if (!user) return { success: false, reason: 'User not found.' };
  if (user.coins < amount) {
    return {
      success: false,
      reason: `Not enough coins. You have **${user.coins.toLocaleString()}** but bid **${amount.toLocaleString()}**.`,
    };
  }

  getDatabase()
    .prepare(`UPDATE auctions SET current_bid = ?, current_bidder_id = ?, current_bidder_name = ? WHERE id = ?`)
    .run(amount, userId, username, auction.id);

  const updated = getDatabase()
    .prepare('SELECT * FROM auctions WHERE id = ?')
    .get(auction.id) as unknown as AuctionRow;

  return { success: true, auction: updated };
}

export function deductWinnerCoins(auction: AuctionRow): void {
  if (!auction.current_bidder_id) return;
  updateCoins(auction.current_bidder_id, -auction.current_bid, 'auction_win', `Won auction: ${auction.item_name}`);
}

export function buildAuctionEmbed(auction: AuctionRow): EmbedBuilder {
  const timeLeft = auction.ends_at - Date.now();
  const minutesLeft = Math.max(0, Math.round(timeLeft / 60_000));

  const bidStatus = auction.current_bidder_id
    ? `**${auction.current_bid.toLocaleString()} coins** by ${auction.current_bidder_name}`
    : `${auction.current_bid.toLocaleString()} coins — no bids yet`;

  return new EmbedBuilder()
    .setColor(0xe67e22)
    .setTitle(`🔨  Auction — ${auction.item_name}`)
    .setDescription(auction.description || 'A rare item is up for grabs. Bid now or lose it forever.')
    .addFields(
      { name: '🏁 Starting Price', value: `${auction.starting_price.toLocaleString()} coins`, inline: true },
      { name: '📈 Current Bid', value: bidStatus, inline: true },
      { name: '⏳ Time Left', value: minutesLeft > 0 ? `~${minutesLeft} min` : 'Ending soon…', inline: true },
    )
    .setFooter({ text: `Started by ${auction.started_by_name} • Use !bid <amount> for a custom bid` })
    .setTimestamp(new Date(auction.ends_at));
}

export function cancelAuctionTimeout(auctionId: number): void {
  const t = auctionTimeouts.get(auctionId);
  if (t) {
    clearTimeout(t);
    auctionTimeouts.delete(auctionId);
  }
}
