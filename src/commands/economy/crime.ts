import { Message } from 'discord.js';
import { Command } from '../../types/Command';
import { executeCrime } from '../../services/economyService';

export const crimeCommand: Command = {
  name: 'crime',
  description: 'Commit a crime. High risk, high reward.',
  usage: '!crime',
  cooldownMs: 2 * 60 * 60 * 1000, // 2 hours
  async execute(message: Message, _args: string[]): Promise<void> {
    const result = executeCrime(message.author.id, message.author.username);
    await message.reply({ embeds: [result.embed] });
  },
};
