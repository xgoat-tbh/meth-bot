import { Message, EmbedBuilder } from 'discord.js';
import { Command } from '../../types/Command';
import { executeGive } from '../../services/economyService';
import { ensureUser } from '../../services/userService';

export const giveCommand: Command = {
  name: 'give',
  aliases: ['pay', 'transfer'],
  description: 'Transfer coins to another user.',
  usage: '!give @user <amount>',
  cooldownMs: 10_000,
  guildOnly: true,
  async execute(message: Message, args: string[]): Promise<void> {
    const target = message.mentions.users.first();

    if (!target || !args[1]) {
      const embed = new EmbedBuilder()
        .setColor(0xff4444)
        .setTitle('❌ Usage Error')
        .setDescription('Usage: `!give @user <amount>`');
      await message.reply({ embeds: [embed] });
      return;
    }

    if (target.bot) {
      const embed = new EmbedBuilder()
        .setColor(0xff4444)
        .setTitle('❌ Invalid Target')
        .setDescription('You cannot give coins to bots.');
      await message.reply({ embeds: [embed] });
      return;
    }

    const amount = parseInt(args[1], 10);
    if (isNaN(amount) || amount < 1) {
      const embed = new EmbedBuilder()
        .setColor(0xff4444)
        .setTitle('❌ Invalid Amount')
        .setDescription('Enter a valid positive number.');
      await message.reply({ embeds: [embed] });
      return;
    }

    const sender = ensureUser(message.author.id, message.author.username);
    if (amount > sender.coins) {
      const embed = new EmbedBuilder()
        .setColor(0xff4444)
        .setTitle('❌ Insufficient Coins')
        .setDescription(`You only have **${sender.coins.toLocaleString()} coins**.`);
      await message.reply({ embeds: [embed] });
      return;
    }

    ensureUser(target.id, target.username);
    const embed = executeGive(
      message.author.id,
      message.author.username,
      target.id,
      target.username,
      amount
    );
    await message.reply({ embeds: [embed] });
  },
};
