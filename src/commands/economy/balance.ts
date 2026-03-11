import { Message } from 'discord.js';
import { Command } from '../../types/Command';
import { buildBalanceEmbed } from '../../services/economyService';
import { ensureUser } from '../../services/userService';

export const balanceCommand: Command = {
  name: 'balance',
  aliases: ['bal', 'wallet'],
  description: 'Check your coin balance and economy rank.',
  usage: '!balance [@user]',
  async execute(message: Message, _args: string[]): Promise<void> {
    const target = message.mentions.users.first() ?? message.author;
    ensureUser(target.id, target.username);
    const embed = buildBalanceEmbed(target);
    await message.reply({ embeds: [embed] });
  },
};
