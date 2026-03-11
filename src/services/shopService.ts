import { EmbedBuilder } from 'discord.js';
import { getDatabase } from '../database/db';
import { ShopItemRow, InventoryRow } from '../database/schema';
import { getUser, updateCoins } from './userService';

export { ShopItemRow, InventoryRow };

export function getShopItems(): ShopItemRow[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM shop_items WHERE active = 1 ORDER BY price ASC')
    .all() as unknown as ShopItemRow[];
}

export function getShopItem(id: number): ShopItemRow | undefined {
  const db = getDatabase();
  return db.prepare('SELECT * FROM shop_items WHERE id = ? AND active = 1')
    .get(id) as unknown as ShopItemRow | undefined;
}

export function getUserInventory(userId: string): InventoryRow[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT ui.user_id, ui.item_id, ui.quantity, ui.purchased_at,
           si.name, si.description, si.emoji, si.type
    FROM user_inventory ui
    JOIN shop_items si ON ui.item_id = si.id
    WHERE ui.user_id = ?
    ORDER BY ui.purchased_at DESC
  `).all(userId) as unknown as InventoryRow[];
}

export function hasItem(userId: string, itemId: number): boolean {
  const db = getDatabase();
  const row = db.prepare('SELECT 1 FROM user_inventory WHERE user_id = ? AND item_id = ?')
    .get(userId, itemId) as unknown as { '1': number } | undefined;
  return !!row;
}

export interface BuyResult {
  success: boolean;
  reason?: string;
  newBalance?: number;
  item?: ShopItemRow;
}

export function buyItem(userId: string, itemId: number): BuyResult {
  const item = getShopItem(itemId);
  if (!item) return { success: false, reason: 'Item not found.' };

  if (item.type === 'title' && hasItem(userId, itemId)) {
    return { success: false, reason: `You already own **${item.name}**.` };
  }

  const user = getUser(userId);
  if (!user) return { success: false, reason: 'User not found.' };
  if (user.coins < item.price) {
    return {
      success: false,
      reason: `Not enough coins. You need **${item.price.toLocaleString()}** but only have **${user.coins.toLocaleString()}**.`,
    };
  }

  updateCoins(userId, -item.price, 'shop_buy', `Bought ${item.name}`);

  const db = getDatabase();
  db.prepare(`
    INSERT INTO user_inventory (user_id, item_id, quantity, purchased_at)
    VALUES (?, ?, 1, ?)
    ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = quantity + 1
  `).run(userId, itemId, Date.now());

  const updated = getUser(userId);
  return { success: true, newBalance: updated?.coins ?? 0, item };
}

const PAGE_SIZE = 5;

export function buildShopEmbed(page = 0): { embed: EmbedBuilder; items: ShopItemRow[]; totalPages: number } {
  const all = getShopItems();
  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const pageItems = all.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle('🛒  The Shop')
    .setDescription('Select an item below to view details and purchase.\n\u200b')
    .setFooter({ text: `Page ${page + 1}/${totalPages} • !shop buy <id> to purchase directly` });

  for (const item of pageItems) {
    embed.addFields({
      name: `${item.emoji}  ${item.name}  —  🪙 ${item.price.toLocaleString()}`,
      value: `> ${item.description}\n> Type: \`${item.type}\`  •  ID: \`${item.id}\``,
    });
  }

  return { embed, items: pageItems, totalPages };
}

export function buildInventoryEmbed(userId: string, username: string): EmbedBuilder {
  const inventory = getUserInventory(userId);
  const equipped = getEquippedItem(userId);
  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle(`🎒  ${username}'s Inventory`);

  if (inventory.length === 0) {
    embed.setDescription('Your inventory is empty. Visit the shop with `!shop`.');
    return embed;
  }

  for (const item of inventory) {
    const isEquipped = equipped?.id === item.item_id;
    embed.addFields({
      name: `${item.emoji}  ${item.name}${isEquipped ? '  ✅ Equipped' : ''}`,
      value: `> ${item.description}\n> Qty: \`${item.quantity}\`  •  Type: \`${item.type}\``,
      inline: true,
    });
  }

  embed.setFooter({ text: 'Use !shop equip <id> to equip a title item' });
  return embed;
}

// ── Perk system ───────────────────────────────────────────────────────────────

/** Returns the set of item names this user owns (for perk checks). */
export function ownedItemNames(userId: string): Set<string> {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT si.name FROM user_inventory ui
    JOIN shop_items si ON ui.item_id = si.id
    WHERE ui.user_id = ?
  `).all(userId) as unknown as Array<{ name: string }>;
  return new Set(rows.map(r => r.name));
}

// ── Equipped title ─────────────────────────────────────────────────────────────

export interface EquipResult {
  success: boolean;
  reason?: string;
  item?: ShopItemRow;
}

export function getEquippedItem(userId: string): ShopItemRow | undefined {
  const db = getDatabase();
  const setting = db.prepare('SELECT equipped_id FROM user_settings WHERE user_id = ?')
    .get(userId) as unknown as { equipped_id: number | null } | undefined;
  if (!setting?.equipped_id) return undefined;
  return getShopItem(setting.equipped_id);
}

export function equipItem(userId: string, itemId: number): EquipResult {
  const item = getShopItem(itemId);
  if (!item) return { success: false, reason: 'Item not found.' };
  if (item.type !== 'title') return { success: false, reason: `**${item.name}** is not a title — it cannot be equipped. Its perk is always active.` };
  if (!hasItem(userId, itemId)) return { success: false, reason: `You don't own **${item.name}**. Buy it first with \`!shop buy ${itemId}\`.` };

  const db = getDatabase();
  db.prepare(`
    INSERT INTO user_settings (user_id, equipped_id) VALUES (?, ?)
    ON CONFLICT (user_id) DO UPDATE SET equipped_id = ?
  `).run(userId, itemId, itemId);

  return { success: true, item };
}

// ── Dynamic cooldowns ─────────────────────────────────────────────────────────

/** Returns the effective cooldown for a command, reduced by any perks the user owns. */
export function getEffectiveCooldownMs(userId: string, commandName: string, defaultMs: number): number {
  const owned = ownedItemNames(userId);
  if (commandName === 'crime' && owned.has('Burner Phone')) return 60 * 60 * 1000;  // 2h → 1h
  if (commandName === 'rob'   && owned.has('Rat Bastard'))  return 15 * 60 * 1000;  // 30m → 15m
  return defaultMs;
}
