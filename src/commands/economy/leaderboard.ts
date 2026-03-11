import { Message } from 'discord.js';
import { Command } from '../../types/Command';
import { buildLeaderboardEmbed } from '../../services/economyService';

export const leaderboardCommand: Command = {
  name: 'leaderboard',
  aliases: ['lb', 'top', 'rich'],
  description: 'View the top 10 richest users.',
  usage: '!leaderboard',
  cooldownMs: 10_000,
  async execute(message: Message, _args: string[]): Promise<void> {
    const embed = buildLeaderboardEmbed();
    await message.reply({ embeds: [embed] });
  },
};
