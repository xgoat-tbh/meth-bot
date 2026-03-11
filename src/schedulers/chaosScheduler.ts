import cron from 'node-cron';
import { Client, Guild, TextChannel } from 'discord.js';
import { triggerChaosEvent } from '../services/chaosService';
import { logger } from '../utils/logger';
import { pickRandom } from '../utils/random';

/**
 * Starts the passive chaos scheduler.
 * Every 60 minutes a random event fires in a random text channel of each guild.
 */
export function startChaosScheduler(client: Client): void {
  // Run at minute 0 of every hour
  cron.schedule('0 * * * *', async () => {
    logger.info('Chaos Scheduler: tick');

    for (const [, guild] of client.guilds.cache) {
      try {
        await runChaosForGuild(guild);
      } catch (err) {
        logger.error(`Chaos Scheduler error for guild ${guild.name}`, {
          error: (err as Error).message,
        });
      }
    }
  });

  logger.info('Chaos Scheduler started (fires every hour)');
}

async function runChaosForGuild(guild: Guild): Promise<void> {
  const textChannels = [...guild.channels.cache.values()].filter(
    (c): c is TextChannel =>
      c.isTextBased() &&
      'send' in c &&
      !c.isDMBased()
  );

  if (textChannels.length === 0) return;

  const channel = pickRandom(textChannels);
  const result = await triggerChaosEvent(guild, channel);

  await channel.send({ embeds: [result.embed] });
  logger.info(
    `Chaos Scheduler: ${result.type} fired in ${guild.name} #${channel.name}`
  );
}
