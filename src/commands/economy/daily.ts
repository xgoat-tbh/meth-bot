import { Message } from 'discord.js';
import { Command } from '../../types/Command';
import { executeDaily } from '../../services/economyService';

export const dailyCommand: Command = {
  name: 'daily',
  description: 'Claim your daily 300 coin reward.',
  usage: '!daily',
  cooldownMs: 24 * 60 * 60 * 1000, // 24 hours
  async execute(message: Message, _args: string[]): Promise<void> {
    const embed = executeDaily(message.author.id, message.author.username);
    await message.reply({ embeds: [embed] });
  },
};
