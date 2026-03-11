import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { Command } from '../../types/Command';
import {
  buildShopEmbed,
  buildInventoryEmbed,
  buyItem,
  equipItem,
  getShopItem,
  ShopItemRow,
} from '../../services/shopService';
import { ensureUser } from '../../services/userService';

function buildSelectRow(items: ShopItemRow[], disabled = false): ActionRowBuilder<StringSelectMenuBuilder> {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('shop_select')
    .setPlaceholder('Select an item to view details…')
    .setDisabled(disabled)
    .addOptions(
      items.map(i =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`${i.name} — ${i.price.toLocaleString()} coins`)
          .setDescription(i.description.slice(0, 100))
          .setValue(String(i.id))
          .setEmoji(i.emoji),
      ),
    );
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

function buildItemDetailRow(itemId: number, disabled = false): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`shop_buy_${itemId}`)
      .setLabel('Buy')
      .setStyle(disabled ? ButtonStyle.Secondary : ButtonStyle.Success)
      .setEmoji('💰')
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId('shop_back')
      .setLabel('Back')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('◀️')
      .setDisabled(disabled),
  );
}

function buildPageRow(page: number, totalPages: number, disabled = false): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('shop_prev')
      .setLabel('◀ Prev')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || page === 0),
    new ButtonBuilder()
      .setCustomId('shop_next')
      .setLabel('Next ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || page >= totalPages - 1),
  );
}

function errorEmbed(reason: string): EmbedBuilder {
  return new EmbedBuilder().setColor(0xff0000).setTitle('❌ Purchase Failed').setDescription(reason);
}

function successEmbed(emoji: string, name: string, price: number, newBalance: number): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle(`${emoji}  Purchased!`)
    .setDescription(`You bought **${name}** for **${price.toLocaleString()} coins**.`)
    .addFields({ name: '💰 New Balance', value: `${newBalance.toLocaleString()} coins` })
    .setFooter({ text: '!shop inv to see your inventory' });
}

export const shopCommand: Command = {
  name: 'shop',
  aliases: ['store'],
  description: 'Browse and buy items from the shop.',
  usage: '!shop | !shop buy <id> | !shop equip <id> | !shop inv',
  guildOnly: true,
  cooldownMs: 10_000,

  async execute(message, args) {
    ensureUser(message.author.id, message.author.username);
    const sub = args[0]?.toLowerCase();

    // !shop inv
    if (sub === 'inv' || sub === 'inventory') {
      const embed = buildInventoryEmbed(message.author.id, message.author.username);
      await message.reply({ embeds: [embed] });
      return;
    }

    // !shop equip <id>
    if (sub === 'equip') {
      const id = parseInt(args[1] ?? '', 10);
      if (isNaN(id)) {
        await message.reply('Usage: `!shop equip <item_id>` — equip a title item you own.');
        return;
      }
      const result = equipItem(message.author.id, id);
      if (!result.success) {
        await message.reply({ embeds: [errorEmbed(result.reason!)] });
        return;
      }
      const item = result.item!;
      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle(`${item.emoji}  Title Equipped!`)
        .setDescription(`You are now displaying **${item.name}** as your title.\nIt will appear on your \`!balance\` and the leaderboard.`)
        .setFooter({ text: 'Perks from owned items are always active — equipping just changes the display title.' });
      await message.reply({ embeds: [embed] });
      return;
    }

    // !shop buy <id>
    if (sub === 'buy') {
      const id = parseInt(args[1] ?? '', 10);
      if (isNaN(id)) {
        await message.reply('Usage: `!shop buy <item_id>` — find IDs with `!shop`.');
        return;
      }
      const result = buyItem(message.author.id, id);
      if (!result.success) {
        await message.reply({ embeds: [errorEmbed(result.reason!)] });
        return;
      }
      const item = result.item!;
      await message.reply({ embeds: [successEmbed(item.emoji, item.name, item.price, result.newBalance!)] });
      return;
    }

    // Default: interactive browse
    let currentPage = 0;
    const { embed, items, totalPages } = buildShopEmbed(currentPage);
    const reply = await message.reply({
      embeds: [embed],
      components: [buildSelectRow(items), buildPageRow(currentPage, totalPages)],
    });

    const collector = reply.createMessageComponentCollector({
      time: 120_000,
      filter: i => i.user.id === message.author.id,
    });

    collector.on('collect', async interaction => {
      // Item selected from dropdown
      if (interaction.componentType === ComponentType.StringSelect && interaction.customId === 'shop_select') {
        const itemId = parseInt(interaction.values[0], 10);
        const item = getShopItem(itemId);
        if (!item) { await interaction.deferUpdate(); return; }

        const detailEmbed = new EmbedBuilder()
          .setColor(0x9b59b6)
          .setTitle(`${item.emoji}  ${item.name}`)
          .setDescription(item.description)
          .addFields(
            { name: '💰 Price', value: `${item.price.toLocaleString()} coins`, inline: true },
            { name: '📦 Type', value: item.type, inline: true },
            { name: '🔖 ID', value: `\`${item.id}\``, inline: true },
          )
          .setFooter({ text: 'Buy to purchase • Back to browse more' });

        await interaction.update({ embeds: [detailEmbed], components: [buildItemDetailRow(item.id)] });
        return;
      }

      // Pagination buttons
      if (interaction.componentType === ComponentType.Button && interaction.customId === 'shop_prev') {
        currentPage = Math.max(0, currentPage - 1);
        const { embed: pageEmbed, items: pageItems, totalPages: tp } = buildShopEmbed(currentPage);
        await interaction.update({ embeds: [pageEmbed], components: [buildSelectRow(pageItems), buildPageRow(currentPage, tp)] });
        return;
      }

      if (interaction.componentType === ComponentType.Button && interaction.customId === 'shop_next') {
        const { embed: pageEmbed, items: pageItems, totalPages: tp } = buildShopEmbed(currentPage + 1);
        currentPage = currentPage + 1;
        await interaction.update({ embeds: [pageEmbed], components: [buildSelectRow(pageItems), buildPageRow(currentPage, tp)] });
        return;
      }

      // Back button
      if (interaction.componentType === ComponentType.Button && interaction.customId === 'shop_back') {
        const { embed: shopEmbed, items: shopItems, totalPages: tp } = buildShopEmbed(currentPage);
        await interaction.update({ embeds: [shopEmbed], components: [buildSelectRow(shopItems), buildPageRow(currentPage, tp)] });
        return;
      }

      // Buy button
      if (interaction.componentType === ComponentType.Button && interaction.customId.startsWith('shop_buy_')) {
        const itemId = parseInt(interaction.customId.replace('shop_buy_', ''), 10);
        const result = buyItem(message.author.id, itemId);
        if (!result.success) {
          await interaction.reply({ embeds: [errorEmbed(result.reason!)], ephemeral: true });
          return;
        }
        const item = result.item!;
        await interaction.reply({
          embeds: [successEmbed(item.emoji, item.name, item.price, result.newBalance!)],
          ephemeral: true,
        });
      }
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'time') {
        const { items: ti, totalPages: tp } = buildShopEmbed(currentPage);
        await reply.edit({
          components: [buildSelectRow(ti, true), buildPageRow(currentPage, tp, true)],
        }).catch(() => null);
      }
    });
  },
};
