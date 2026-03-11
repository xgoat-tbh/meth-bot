import { Client, ActivityType, REST, Routes } from 'discord.js';
import { config } from '../config';
import { logger } from '../utils/logger';
import { getDatabase } from '../database/db';

export async function readyHandler(client: Client): Promise<void> {
  if (!client.user) return;

  logger.info(`Bot online as ${client.user.tag}`);
  logger.info(`Serving ${client.guilds.cache.size} guild(s)`);

  client.user.setPresence({
    activities: [{ name: '!help | cooking chaos', type: ActivityType.Custom }],
    status: 'online',
  });

  // Ensure the database is initialised
  getDatabase();

  // Clear all slash commands (global + per-guild)
  await clearSlashCommands(client);
}

async function clearSlashCommands(client: Client): Promise<void> {
  try {
    const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);

    // Clear global commands
    await rest.put(Routes.applicationCommands(config.CLIENT_ID), { body: [] });
    logger.info('Cleared global slash commands');

    // Clear guild-specific commands for every guild
    const guildIds = [...client.guilds.cache.keys()];
    await Promise.all(
      guildIds.map((guildId) =>
        rest
          .put(Routes.applicationGuildCommands(config.CLIENT_ID, guildId), { body: [] })
          .catch((err: Error) =>
            logger.warn(`Failed to clear slash commands for guild ${guildId}: ${err.message}`)
          )
      )
    );

    if (guildIds.length > 0) {
      logger.info(`Cleared slash commands for ${guildIds.length} guild(s)`);
    }
  } catch (err) {
    logger.error('Error clearing slash commands', { error: (err as Error).message });
  }
}
