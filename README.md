# Meth Bot

A chaotic entertainment Discord bot built with **Node.js**, **TypeScript**, and **discord.js v14**.

Persistent economy, item shop with active perks, roast engine, auctions, and a chaos event system — all prefix-based, no slash commands.

---

## Commands

### Economy

| Command | Description | Cooldown |
|---|---|---|
| `!balance` | Check your coin balance and title | — |
| `!work` | Earn coins from working | 1 hour |
| `!crime` | Attempt a crime for bigger rewards (60% success) | 2 hours |
| `!rob @user` | Rob another user (chance-based) | 30 minutes |
| `!daily` | Collect your daily reward (300 coins) | 24 hours |
| `!gamble <amount\|all>` | Bet up to 5,000 coins per spin | 30 seconds |
| `!give @user <amount>` | Send coins to another user | 10 seconds |
| `!leaderboard` | Top 10 richest users | 10 seconds |

### Shop & Auction

| Command | Description | Cooldown |
|---|---|---|
| `!shop` | Browse the item shop with interactive pages | 10 seconds |
| `!shop buy <id>` | Buy an item directly by ID | 10 seconds |
| `!shop inv` | View your inventory | 10 seconds |
| `!shop equip <id>` | Equip a title item to display on your balance | 10 seconds |
| `!startauction <item> <price> [mins]` | Start a public auction (pings @everyone) | — |
| `!sa` | Alias for `!startauction` | — |
| `!bid <amount>` | Place a custom bid on the active auction | 5 seconds |

### Roast Engine

| Command | Description | Cooldown |
|---|---|---|
| `!roast @user` | Roast a user | 10 seconds |
| `!selfroast` | Roast yourself | 10 seconds |

### Chaos

| Command | Description | Cooldown |
|---|---|---|
| `!chaos` | Trigger a random chaos event | 30 seconds |
| `!spin` | Spin the chaos wheel | 20 seconds |
| `!victim` | Set a chaos victim | 10 seconds |

### General

| Command | Description |
|---|---|
| `!help` | Interactive help menu with category dropdown |

---

## Shop Items & Perks

All perks are **passive** — active as long as you own the item. Equipping a title only changes your display name on `!balance`.

| # | Item | Price | Perk |
|---|---|---|---|
| 1 | 🐀 Street Rat | 500 | Cosmetic title only |
| 2 | 🐁 Rat Bastard | 2,000 | Rob cooldown 30m → 15m |
| 3 | 📱 Burner Phone | 3,500 | Crime cooldown 2h → 1h |
| 4 | 🔌 The Plug | 5,000 | Work earns +20% more coins |
| 5 | 🍀 Lucky Charm | 7,500 | Gamble: jackpot 4%, triple 12% |
| 6 | 🧪 Walter White | 10,000 | Work earns +35% more coins |
| 7 | 🎩 Heisenberg | 15,000 | Crime +10% success rate, +25% winnings |
| 8 | 🎿 Ski Mask | 8,000 | Rob minimum 50% success chance |
| 9 | 🧱 Golden Brick | 12,000 | +25 flat coins per work action |
| 10 | 👑 El Jefe | 25,000 | Daily reward doubled (600 coins) |

> Work perks stack: Walter White / The Plug apply a multiplier, then Golden Brick adds a flat bonus on top.

---

## Economy System

**Currency:** Coins

### Title Progression

| Coins | Auto Title |
|---|---|
| 0 | Peasant |
| 500 | Broke Boy |
| 1,000 | Hustler |
| 5,000 | Grinder |
| 10,000 | Kingpin |
| 25,000 | Drug Lord |
| 50,000 | Crime Boss |
| 100,000 | Meth Mogul |

### Gamble Odds (base)

| Outcome | Chance | Payout |
|---|---|---|
| Lose | 45% | 0× |
| Double | 45% | 2× |
| Triple | 8% | 3× |
| Jackpot | 2% | 10× |

Max bet: **5,000 coins** per spin. Lucky Charm improves jackpot to 4% and triple to 12%.

---

## Logs

- **Console** — coloured output
- **`logs/bot.log`** — full structured logs (rotates at 10 MB, 5 files)
- **`logs/error.log`** — errors only (rotates at 5 MB, 3 files)
