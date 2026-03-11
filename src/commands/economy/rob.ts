import { Message, EmbedBuilder } from 'discord.js';
import { Command } from '../../types/Command';
import { executeRob } from '../../services/economyService';
import { ensureUser } from '../../services/userService';

export const robCommand: Command = {
  name: 'rob',
  description: 'Attempt to rob another user.',
  usage: '!rob @user',
  cooldownMs: 30 * 60 * 1000, // 30 minutes
  guildOnly: true,
  async execute(message: Message, _args: string[]): Promise<void> {
    const target = message.mentions.users.first();

    if (!target) {
      const embed = new EmbedBuilder()
        .setColor(0xff4444)
        .setTitle('❌ Usage Error')
        .setDescription('You need to mention a user to rob. `!rob @user`');
      await message.reply({ embeds: [embed] });
      return;
    }

    if (target.id === message.author.id) {
      const embed = new EmbedBuilder()
        .setColor(0xff4444)
        .setTitle('❌ Self-Robbery')
        .setDescription('Robbing yourself? That\'s a different kind of broke.');
      await message.reply({ embeds: [embed] });
      return;
    }

    if (target.bot) {
      const embed = new EmbedBuilder()
        .setColor(0xff4444)
        .setTitle('❌ Nice Try')
        .setDescription('Bots don\'t carry cash. Try a human.');
      await message.reply({ embeds: [embed] });
      return;
    }

    ensureUser(target.id, target.username);
    const result = executeRob(
      message.author.id,
      message.author.username,
      target.id,
      target.username
    );
    await message.reply({ embeds: [result.embed] });
  },
};
