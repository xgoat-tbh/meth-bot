import { Client, Events, GatewayIntentBits, Partials } from 'discord.js';
import { createServer } from 'http';
import { config } from './config';
import { logger } from './utils/logger';
import { readyHandler } from './events/ready';
import { messageCreateHandler } from './events/messageCreate';
import { errorHandler, warnHandler } from './events/error';
import { startChaosScheduler } from './schedulers/chaosScheduler';
import { closeDatabase } from './database/db';

// ── Client setup ──────────────────────────────────────────────────────────────

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

// ── Event wiring ──────────────────────────────────────────────────────────────

client.once(Events.ClientReady, async () => {
  await readyHandler(client);
  startChaosScheduler(client);
});

client.on(Events.MessageCreate, messageCreateHandler);
client.on(Events.Error, errorHandler);
client.on(Events.Warn, warnHandler);

// ── Graceful shutdown ─────────────────────────────────────────────────────────

function shutdown(signal: string): void {
  logger.info(`Received ${signal} — shutting down gracefully`);
  client.destroy();
  closeDatabase();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise rejection', { reason });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

// ── Health check server (required for Render free web service) ────────────────

const PORT = process.env.PORT ?? 3000;
createServer((_, res) => { res.writeHead(200); res.end('ok'); }).listen(PORT, () => {
  logger.info(`Health check listening on port ${PORT}`);
});

// ── Login ─────────────────────────────────────────────────────────────────────

logger.info('Meth Bot is starting...');
client.login(config.DISCORD_TOKEN).catch((err: Error) => {
  logger.error('Failed to login to Discord', { error: err.message });
  client.destroy();
  setTimeout(() => process.exit(1), 500);
});
