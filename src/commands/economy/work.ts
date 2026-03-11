import { Message } from 'discord.js';
import { Command } from '../../types/Command';
import { executeWork } from '../../services/economyService';

export const workCommand: Command = {
  name: 'work',
  description: 'Do some work and earn coins.',
  usage: '!work',
  cooldownMs: 60 * 60 * 1000, // 1 hour
  guildOnly: false,
  async execute(message: Message, _args: string[]): Promise<void> {
    const result = executeWork(message.author.id, message.author.username);
    await message.reply({ embeds: [result.embed] });
  },
};
