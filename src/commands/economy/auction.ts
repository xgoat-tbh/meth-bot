import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ComponentType,
  Message,
  TextChannel,
} from 'discord.js';
import { Command } from '../../types/Command';
import { ensureUser } from '../../services/userService';
import {
  createAuction,
  buildAuctionEmbed,
  getActiveAuction,
  setAuctionMessageId,
  setAuctionEndCallback,
  placeBid,
  deductWinnerCoins,
  AuctionRow,
} from '../../services/auctionService';

const DEFAULT_DURATION = 5;
const MAX_DURATION = 60;

// Keyed by auction id — stores the live Discord message reference
const liveMessages = new Map<number, Message>();

function buildBidRow(disabled = false): ActionRowBuilder<ButtonBuilder> {
  const btn = (id: string, label: string, style: ButtonStyle) =>
    new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(disabled ? ButtonStyle.Secondary : style).setDisabled(disabled);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    btn('auction_bid_100',  '+100',   ButtonStyle.Primary),
    btn('auction_bid_500',  '+500',   ButtonStyle.Primary),
    btn('auction_bid_1000', '+1,000', ButtonStyle.Primary),
    btn('auction_bid_5000', '+5,000', ButtonStyle.Danger),
  );
}

// Register end callback once at module load
setAuctionEndCallback(async (auction: AuctionRow) => {
  const msg = liveMessages.get(auction.id);
  liveMessages.delete(auction.id);

  if (auction.current_bidder_id) {
    deductWinnerCoins(auction);
  }

  const finalEmbed = buildAuctionEmbed(auction)
    .setColor(0x95a5a6)
    .setTitle(`🔨  Auction Ended — ${auction.item_name}`);

  const resultLine = auction.current_bidder_id
    ? `🏆 **${auction.current_bidder_name}** won **${auction.item_name}** for **${auction.current_bid.toLocaleString()} coins**!`
    : `😔 No bids were placed on **${auction.item_name}**. Item returned to sender.`;

  if (msg) {
    await msg.edit({ embeds: [finalEmbed], components: [buildBidRow(true)] }).catch(() => null);
    await (msg.channel as TextChannel).send(resultLine).catch(() => null);
  }
});

export const auctionCommand: Command = {
  name: 'startauction',
  aliases: ['sa'],
  description: 'Start a public auction and ping @everyone.',
  usage: '!startauction <item name> <starting price> [duration in minutes]',
  guildOnly: true,

  async execute(message, args) {
    if (!message.guild) return;
    ensureUser(message.author.id, message.author.username);

    const existing = getActiveAuction(message.guild.id);
    if (existing) {
      await message.reply(`There's already an active auction for **${existing.item_name}**. Wait for it to end.`);
      return;
    }

    if (args.length < 2) {
      await message.reply(
        'Usage: `!startauction <item name> <starting price> [duration in minutes]`\n' +
        'Example: `!startauction Golden Brick 1000 10`',
      );
      return;
    }

    // Parse trailing numbers: if last two args are both numbers, last = duration, second-to-last = price
    let durationMinutes = DEFAULT_DURATION;
    let priceIndex = args.length - 1;

    const last = parseInt(args[args.length - 1], 10);
    const secondLast = parseInt(args[args.length - 2], 10);

    if (!isNaN(last) && !isNaN(secondLast)) {
      durationMinutes = Math.min(Math.max(1, last), MAX_DURATION);
      priceIndex = args.length - 2;
    }

    const startingPrice = parseInt(args[priceIndex], 10);
    if (isNaN(startingPrice) || startingPrice < 1) {
      await message.reply('Starting price must be a positive number.');
      return;
    }

    const itemName = args.slice(0, priceIndex).join(' ').trim();
    if (!itemName) {
      await message.reply('Please provide an item name.');
      return;
    }

    const durationMs = durationMinutes * 60_000;
    const auction = createAuction(
      message.guild.id,
      message.channel.id,
      message.author.id,
      message.author.username,
      itemName,
      '',
      startingPrice,
      durationMs,
    );

    const embed = buildAuctionEmbed(auction);
    const auctionMsg = await (message.channel as TextChannel).send({
      content: `@everyone 🔨 **Auction started!** You have **${durationMinutes} minute${durationMinutes !== 1 ? 's' : ''}** to bid!`,
      allowedMentions: { parse: ['everyone'] },
      embeds: [embed],
      components: [buildBidRow()],
    });

    setAuctionMessageId(auction.id, auctionMsg.id);
    liveMessages.set(auction.id, auctionMsg);

    // Bid button collector
    const collector = auctionMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: durationMs,
    });

    const increments: Record<string, number> = {
      auction_bid_100:  100,
      auction_bid_500:  500,
      auction_bid_1000: 1000,
      auction_bid_5000: 5000,
    };

    collector.on('collect', async (interaction: ButtonInteraction) => {
      if (!message.guild) return;
      const increment = increments[interaction.customId];
      if (increment === undefined) { await interaction.deferUpdate(); return; }

      ensureUser(interaction.user.id, interaction.user.username);

      const current = getActiveAuction(message.guild.id);
      if (!current) { await interaction.deferUpdate(); return; }

      const bidAmount = current.current_bid + increment;
      const result = placeBid(message.guild.id, interaction.user.id, interaction.user.username, bidAmount);

      if (!result.success) {
        await interaction.reply({ content: `❌ ${result.reason}`, ephemeral: true });
        return;
      }

      await interaction.update({ embeds: [buildAuctionEmbed(result.auction!)], components: [buildBidRow()] });
    });

    await message.delete().catch(() => null);
  },
};
