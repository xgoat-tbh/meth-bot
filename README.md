# Meth Bot

A production-quality chaotic entertainment Discord bot built with **Node.js**, **TypeScript**, and **discord.js v14**.

Features a persistent economy system, AI-powered roast engine, and a dynamic chaos event system.

---

## Features

| Category | Commands |
|---|---|
| **Economy** | `!balance`, `!work`, `!crime`, `!rob`, `!daily`, `!gamble`, `!give`, `!leaderboard` |
| **Roast Engine** | `!roast @user`, `!selfroast` |
| **Chaos Engine** | `!chaos`, `!spin`, `!victim` |
| **Admin** | `!help` |

- Passive chaos events fire every hour via cron scheduler
- Persistent SQLite database with WAL mode
- Winston structured logging to console + `/logs/`
- Zod-validated environment configuration
- Per-command cooldown system
- Auto-removal of slash commands on startup
- Graceful shutdown handling

---

## Prerequisites

- Node.js v18+
- npm or yarn

---

## Installation

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd meth-bot

# 2. Install dependencies
npm install

# 3. Copy and configure environment variables
cp .env.example .env
```

---

## Environment Configuration

Edit `.env` with your values:

```env
# Required
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_application_client_id

# Optional — enables AI roasts (OpenAI-compatible API)
AI_API_URL=https://api.openai.com/v1/chat/completions
AI_API_KEY=your_openai_api_key
AI_MODEL=gpt-3.5-turbo

# Optional defaults
PREFIX=!
DATABASE_PATH=./data/meth-bot.db
LOG_LEVEL=info
NODE_ENV=production
```

### Getting your Discord credentials

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Navigate to **Bot** → copy the **Token** → set as `DISCORD_TOKEN`
4. On the **General Information** page, copy the **Application ID** → set as `CLIENT_ID`
5. Under **Bot** → **Privileged Gateway Intents**, enable:
   - **Server Members Intent**
   - **Message Content Intent**

### Invite the bot

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=274878221376&scope=bot
```

---

## Running the Bot

### Development (with hot reload)

```bash
npm run dev
```

### Production

```bash
# Build TypeScript
npm run build

# Start compiled output
npm start
```

---

## Production Deployment

### Option A — PM2

```bash
npm install -g pm2

# Build first
npm run build

# Start with PM2
pm2 start dist/bot.js --name "meth-bot"

# Auto-restart on reboot
pm2 save
pm2 startup
```

### Option B — systemd (Linux)

Create `/etc/systemd/system/meth-bot.service`:

```ini
[Unit]
Description=Meth Bot
After=network.target

[Service]
Type=simple
User=your_user
WorkingDirectory=/path/to/meth-bot
ExecStart=/usr/bin/node dist/bot.js
Restart=on-failure
EnvironmentFile=/path/to/meth-bot/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable meth-bot
sudo systemctl start meth-bot
```

### Option C — Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["node", "dist/bot.js"]
```

---

## Project Structure

```
meth-bot/
├── src/
│   ├── bot.ts                    # Entrypoint
│   ├── config.ts                 # Zod-validated env config
│   ├── types/
│   │   └── Command.ts            # Command interface
│   ├── commands/
│   │   ├── admin/help.ts
│   │   ├── economy/
│   │   │   ├── balance.ts
│   │   │   ├── work.ts
│   │   │   ├── crime.ts
│   │   │   ├── rob.ts
│   │   │   ├── daily.ts
│   │   │   ├── gamble.ts
│   │   │   ├── give.ts
│   │   │   └── leaderboard.ts
│   │   ├── roast/
│   │   │   ├── roast.ts
│   │   │   └── selfroast.ts
│   │   └── chaos/
│   │       ├── chaos.ts
│   │       ├── spin.ts
│   │       └── victim.ts
│   ├── services/
│   │   ├── userService.ts        # DB CRUD
│   │   ├── economyService.ts     # Economy logic + embeds
│   │   ├── roastService.ts       # AI + fallback roasts
│   │   └── chaosService.ts       # Chaos event logic
│   ├── events/
│   │   ├── ready.ts              # Startup + slash command cleanup
│   │   ├── messageCreate.ts      # Command dispatcher
│   │   └── error.ts
│   ├── database/
│   │   ├── db.ts                 # SQLite connection
│   │   └── schema.ts             # Table definitions + types
│   ├── utils/
│   │   ├── logger.ts             # Winston logger
│   │   ├── cooldown.ts           # Cooldown manager
│   │   └── random.ts             # Random utilities
│   └── schedulers/
│       └── chaosScheduler.ts     # Hourly cron chaos events
├── logs/                         # Auto-created at runtime
├── data/                         # SQLite database (auto-created)
├── .env.example
├── package.json
├── tsconfig.json
└── nodemon.json
```

---

## Economy System

**Currency:** Coins

### Title Progression

| Coins | Title |
|---|---|
| 0 | Peasant |
| 500 | Broke Boy |
| 1,000 | Hustler |
| 5,000 | Grinder |
| 10,000 | Kingpin |
| 25,000 | Drug Lord |
| 50,000 | Crime Boss |
| 100,000 | Meth Mogul |

### Gamble Odds

| Outcome | Probability | Payout |
|---|---|---|
| Lose | 45% | 0x |
| Double | 45% | 2x |
| Triple | 8% | 3x |
| Jackpot | 2% | 10x |

---

## AI Roast Engine

Set `AI_API_URL` and `AI_API_KEY` in `.env` to use an OpenAI-compatible endpoint.

If the API is unavailable or not configured, the bot falls back to a built-in roast template library automatically.

---

## Logs

Logs are written to:
- **Console** — coloured, abbreviated format
- **`logs/bot.log`** — full structured logs (rotates at 10MB, 5 files)
- **`logs/error.log`** — errors only (rotates at 5MB, 3 files)

---

## Development Scripts

```bash
npm run dev        # Start with nodemon hot-reload
npm run build      # Compile TypeScript
npm start          # Run compiled output
npm run lint       # ESLint
npm run format     # Prettier
npm run typecheck  # tsc --noEmit
```
