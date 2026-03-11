import { Message, Collection, EmbedBuilder } from 'discord.js';
import { Command } from '../types/Command';
import { config } from '../config';
import { logger } from '../utils/logger';
import { getCooldownRemaining, setCooldown, formatCooldown } from '../utils/cooldown';
import { getEffectiveCooldownMs } from '../services/shopService';

// ── Command registry ──────────────────────────────────────────────────────────

import { balanceCommand } from '../commands/economy/balance';
import { workCommand } from '../commands/economy/work';
import { crimeCommand } from '../commands/economy/crime';
import { robCommand } from '../commands/economy/rob';
import { dailyCommand } from '../commands/economy/daily';
import { gambleCommand } from '../commands/economy/gamble';
import { giveCommand } from '../commands/economy/give';
import { leaderboardCommand } from '../commands/economy/leaderboard';
import { roastCommand } from '../commands/roast/roast';
import { selfroastCommand } from '../commands/roast/selfroast';
import { chaosCommand } from '../commands/chaos/chaos';
import { spinCommand } from '../commands/chaos/spin';
import { victimCommand } from '../commands/chaos/victim';
import { helpCommand } from '../commands/general/help';
import { shopCommand } from '../commands/economy/shop';
import { auctionCommand } from '../commands/economy/auction';
import { bidCommand } from '../commands/economy/bid';

const commandList: Command[] = [
  balanceCommand,
  workCommand,
  crimeCommand,
  robCommand,
  dailyCommand,
  gambleCommand,
  giveCommand,
  leaderboardCommand,
  roastCommand,
  selfroastCommand,
  chaosCommand,
  spinCommand,
  victimCommand,
  helpCommand,
  shopCommand,
  auctionCommand,
  bidCommand,
];

const commands = new Collection<string, Command>();
for (const cmd of commandList) {
  commands.set(cmd.name, cmd);
  for (const alias of cmd.aliases ?? []) {
    commands.set(alias, cmd);
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function messageCreateHandler(message: Message): Promise<void> {
  if (message.author.bot) return;
  if (!message.content.startsWith(config.PREFIX)) return;

  const args = message.content.slice(config.PREFIX.length).trim().split(/\s+/);
  const commandName = args.shift()?.toLowerCase();
  if (!commandName) return;

  const command = commands.get(commandName);
  if (!command) return;

  if (command.guildOnly && !message.guild) {
    await message.reply('This command can only be used in a server.');
    return;
  }

  // Cooldown check (may be reduced by shop item perks)
  if (command.cooldownMs) {
    const effectiveMs = getEffectiveCooldownMs(message.author.id, command.name, command.cooldownMs);
    const remaining = getCooldownRemaining(command.name, message.author.id);
    if (remaining > 0) {
      const embed = new EmbedBuilder()
        .setColor(0xff8800)
        .setTitle('⏳ Slow down!')
        .setDescription(
          `You need to wait **${formatCooldown(remaining)}** before using \`${config.PREFIX}${command.name}\` again.`
        );
      await message.reply({ embeds: [embed] });
      return;
    }
    setCooldown(command.name, message.author.id, effectiveMs);
  }

  try {
    logger.info(
      `Command: ${command.name} | User: ${message.author.tag} | Guild: ${message.guild?.name ?? 'DM'}`
    );
    await command.execute(message, args);
  } catch (err) {
    const error = err as Error;
    logger.error(`Command error: ${command.name}`, {
      user: message.author.tag,
      error: error.message,
      stack: error.stack,
    });

    const errEmbed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('❌ Something went wrong')
      .setDescription(error.message ?? 'An unexpected error occurred.');
    await message.reply({ embeds: [errEmbed] }).catch(() => null);
  }
}

export { commands };
