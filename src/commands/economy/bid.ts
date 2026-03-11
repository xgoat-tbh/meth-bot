import { EmbedBuilder } from 'discord.js';
import { Command } from '../../types/Command';
import { ensureUser } from '../../services/userService';
import { placeBid, getActiveAuction } from '../../services/auctionService';

export const bidCommand: Command = {
  name: 'bid',
  description: 'Place a custom bid on the active auction.',
  usage: '!bid <amount>',
  guildOnly: true,
  cooldownMs: 5_000,

  async execute(message, args) {
    if (!message.guild) return;
    ensureUser(message.author.id, message.author.username);

    const amount = parseInt(args[0] ?? '', 10);
    if (isNaN(amount) || amount < 1) {
      await message.reply('Usage: `!bid <amount>`');
      return;
    }

    const auction = getActiveAuction(message.guild.id);
    if (!auction) {
      await message.reply('There is no active auction right now.');
      return;
    }

    const result = placeBid(message.guild.id, message.author.id, message.author.username, amount);

    if (!result.success) {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('❌ Bid Failed')
        .setDescription(result.reason!);
      await message.reply({ embeds: [embed] });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('✅ Bid Placed!')
      .setDescription(
        `Your bid of **${amount.toLocaleString()} coins** is now the highest on **${auction.item_name}**!`,
      )
      .setFooter({ text: 'Use the buttons on the auction or !bid <amount> to outbid.' });

    await message.reply({ embeds: [embed] });
  },
};
