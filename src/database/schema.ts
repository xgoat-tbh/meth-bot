export const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT    PRIMARY KEY,
    username    TEXT    NOT NULL DEFAULT 'Unknown',
    coins       INTEGER NOT NULL DEFAULT 0,
    title       TEXT    NOT NULL DEFAULT 'Peasant',
    last_work   INTEGER,
    last_crime  INTEGER,
    last_daily  INTEGER,
    last_rob    INTEGER,
    created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id   TEXT    NOT NULL,
    type      TEXT    NOT NULL,
    amount    INTEGER NOT NULL,
    reason    TEXT,
    timestamp INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS victims (
    guild_id  TEXT    PRIMARY KEY,
    user_id   TEXT    NOT NULL,
    date      TEXT    NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
  CREATE INDEX IF NOT EXISTS idx_users_coins ON users(coins DESC);

  CREATE TABLE IF NOT EXISTS shop_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL UNIQUE,
    description TEXT    NOT NULL,
    price       INTEGER NOT NULL,
    type        TEXT    NOT NULL DEFAULT 'title',
    emoji       TEXT    NOT NULL DEFAULT '🏷️',
    active      INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS user_inventory (
    user_id      TEXT    NOT NULL,
    item_id      INTEGER NOT NULL,
    quantity     INTEGER NOT NULL DEFAULT 1,
    purchased_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, item_id)
  );

  CREATE TABLE IF NOT EXISTS auctions (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id            TEXT    NOT NULL,
    channel_id          TEXT    NOT NULL,
    message_id          TEXT,
    item_name           TEXT    NOT NULL,
    description         TEXT    NOT NULL DEFAULT '',
    starting_price      INTEGER NOT NULL,
    current_bid         INTEGER NOT NULL,
    current_bidder_id   TEXT,
    current_bidder_name TEXT,
    started_by_id       TEXT    NOT NULL,
    started_by_name     TEXT    NOT NULL,
    ends_at             INTEGER NOT NULL,
    status              TEXT    NOT NULL DEFAULT 'active',
    created_at          INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    user_id     TEXT PRIMARY KEY,
    equipped_id INTEGER
  );
`;

export interface UserRow {
  id: string;
  username: string;
  coins: number;
  title: string;
  last_work: number | null;
  last_crime: number | null;
  last_daily: number | null;
  last_rob: number | null;
  created_at: number;
}

export interface TransactionRow {
  id: number;
  user_id: string;
  type: string;
  amount: number;
  reason: string | null;
  timestamp: number;
}

export interface VictimRow {
  guild_id: string;
  user_id: string;
  date: string;
}

export interface ShopItemRow {
  id: number;
  name: string;
  description: string;
  price: number;
  type: string;
  emoji: string;
  active: number;
}

export interface InventoryRow {
  user_id: string;
  item_id: number;
  quantity: number;
  purchased_at: number;
  name: string;
  description: string;
  emoji: string;
  type: string;
}

export interface AuctionRow {
  id: number;
  guild_id: string;
  channel_id: string;
  message_id: string | null;
  item_name: string;
  description: string;
  starting_price: number;
  current_bid: number;
  current_bidder_id: string | null;
  current_bidder_name: string | null;
  started_by_id: string;
  started_by_name: string;
  ends_at: number;
  status: string;
  created_at: number;
}

export const SHOP_SEED_SQL = `
  INSERT OR IGNORE INTO shop_items (name, description, price, type, emoji) VALUES
  ('Street Rat',    'A title for those who hustle from the bottom.',         500,   'title',       '🐀'),
  ('The Plug',      'Everyone on the street knows your name.',               1500,  'title',       '🔌'),
  ('Walter White',  'You cook the best product. Nobody else is even close.', 3000,  'title',       '🧪'),
  ('Heisenberg',    'Say my name. You''re goddamn right.',                   6000,  'title',       '🎩'),
  ('El Jefe',       'The boss above all bosses. Untouchable.',               12000, 'title',       '👑'),
  ('Rat Bastard',   'Notorious. Untrustworthy. Respected.',                  800,   'title',       '🐍'),
  ('Lucky Charm',   'A rare charm dropped by the chaos gods.',               2500,  'collectible', '🍀'),
  ('Golden Brick',  'Pure flex. No utility. Maximum disrespect.',            10000, 'collectible', '🧱'),
  ('Burner Phone',  'They can''t trace this one. Probably.',                 1200,  'collectible', '📱'),
  ('Ski Mask',      'For when you need to be anonymous. Classic.',           900,   'collectible', '🎭');
`;

// Always runs on startup — updates descriptions to reflect current perks for existing DBs
export const SHOP_PERK_UPDATE_SQL = `
  UPDATE shop_items SET description = 'Cosmetic title. No perks, just raw street cred.'
    WHERE name = 'Street Rat';
  UPDATE shop_items SET description = 'PERK: Work earns +20% more coins. Equippable title.'
    WHERE name = 'The Plug';
  UPDATE shop_items SET description = 'PERK: Work earns +35% more coins. Equippable title.'
    WHERE name = 'Walter White';
  UPDATE shop_items SET description = 'PERK: Crime success +10% & winnings +25%. Equippable title.'
    WHERE name = 'Heisenberg';
  UPDATE shop_items SET description = 'PERK: Daily reward doubled (600 coins). Equippable title.'
    WHERE name = 'El Jefe';
  UPDATE shop_items SET description = 'PERK: Rob cooldown cut to 15 min. Equippable title.'
    WHERE name = 'Rat Bastard';
  UPDATE shop_items SET description = 'PERK: Gamble odds improved — jackpot 4%, triple 12%.'
    WHERE name = 'Lucky Charm';
  UPDATE shop_items SET description = 'PERK: +25 flat bonus added to every work payout. Flex item.'
    WHERE name = 'Golden Brick';
  UPDATE shop_items SET description = 'PERK: Crime cooldown cut from 2h to 1h.'
    WHERE name = 'Burner Phone';
  UPDATE shop_items SET description = 'PERK: Rob minimum success chance raised to 50%.'
    WHERE name = 'Ski Mask';
`;
