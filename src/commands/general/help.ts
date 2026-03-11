import {
  Message,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ComponentType,
} from 'discord.js';
import { Command } from '../../types/Command';
import { config } from '../../config';

function buildOverviewEmbed(p: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('🧪 Meth Bot — Command Centre')
    .setDescription(
      `Prefix: \`${p}\`\n\nChoose a category below to see detailed commands, or scroll the full list:\n\n` +
      `💰 **Economy** — earn, steal, gamble, shop & auction\n` +
      `🔥 **Roast Engine** — AI-powered roasts\n` +
      `🌪️ **Chaos Engine** — random chaos & the spin wheel`
    )
    .setFooter({ text: 'Chaos never sleeps. Select a category ↓' })
    .setTimestamp();
}

function buildCategoryEmbed(category: string, p: string): EmbedBuilder {
  if (category === 'economy') {
    return new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle('💰 Economy Commands')
      .setDescription('Earn, spend, and steal coins.')
      .addFields(
        { name: `\`${p}balance [@user]\``, value: 'View your wallet, rank, and recent transactions.', inline: false },
        { name: `\`${p}work\``, value: 'Do a shift and earn coins. **1h cooldown.**', inline: false },
        { name: `\`${p}crime\``, value: 'Attempt a crime — 60% success rate. **2h cooldown.**', inline: false },
        { name: `\`${p}rob @user\``, value: 'Rob someone. Higher reward if they\'re rich. **30m cooldown.**', inline: false },
        { name: `\`${p}daily\``, value: 'Claim your free daily 300 coins. **24h cooldown.**', inline: false },
        { name: `\`${p}gamble <amount|all>\``, value: 'Bet coins. Max 5,000 per spin. 45% double · 8% triple · 2% jackpot. **30s cooldown.** Includes Play Again & Double Down buttons.', inline: false },
        { name: `\`${p}give @user <amount>\``, value: 'Transfer coins to another user. **10s cooldown.**', inline: false },
        { name: `\`${p}leaderboard\``, value: 'Top 10 richest users. **10s cooldown.**', inline: false },
        { name: `\`${p}shop\``, value: 'Browse the item shop. Select items to view details & buy. **10s cooldown.**', inline: false },
        { name: `\`${p}shop buy <id>\``, value: 'Directly purchase a shop item by ID.', inline: false },
        { name: `\`${p}shop inv\``, value: 'View your inventory.', inline: false },
        { name: `\`${p}startauction <item> <price> [mins]\``, value: 'Start a public auction. Pings @everyone. Default 5 min, max 60 min.', inline: false },
        { name: `\`${p}bid <amount>\``, value: 'Place a custom bid on the active auction. **5s cooldown.**', inline: false }
      )
      .setFooter({ text: 'Grind hard. Stay broke. — Economy Module' })
      .setTimestamp();
  }

  if (category === 'roast') {
    return new EmbedBuilder()
      .setColor(0xff6600)
      .setTitle('🔥 Roast Engine Commands')
      .setDescription('AI-generated roasts powered by OpenAI → Gemini → fallback list.')
      .addFields(
        { name: `\`${p}roast @user\``, value: 'Generate an AI roast targeting a specific user. **10s cooldown.**', inline: false },
        { name: `\`${p}selfroast\``, value: 'Roast yourself. For the brave or the broken. **10s cooldown.**', inline: false }
      )
      .setFooter({ text: 'Roasts are humorous, never hateful. — Roast Engine' })
      .setTimestamp();
  }

  // chaos
  return new EmbedBuilder()
    .setColor(0xaa44ff)
    .setTitle('🌪️ Chaos Engine Commands')
    .setDescription('Random events, the spin wheel, and passive hourly chaos.')
    .addFields(
      { name: `\`${p}chaos\``, value: 'Trigger a random chaos event on a server member (coin boost, drain, roast, title, jackpot). **30s cooldown.**', inline: false },
      { name: `\`${p}spin\``, value: 'Spin the chaos wheel — could win coins, lose coins, get roasted, or hit the jackpot. **20s cooldown.** Includes Spin Again button.', inline: false },
      { name: `\`${p}victim\``, value: 'Reveal today\'s randomly chosen Victim of the Day. **10s cooldown.**', inline: false },
      { name: '⏰ Passive Events', value: 'Every hour the chaos scheduler fires automatically, picking a random member and triggering a chaos event in the first available text channel.', inline: false }
    )
    .setFooter({ text: 'May the odds never be in your favour. — Chaos Engine' })
    .setTimestamp();
}

function buildCategoryMenu(disabled = false): ActionRowBuilder<StringSelectMenuBuilder> {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('help_category')
    .setPlaceholder(disabled ? 'Session expired' : 'Choose a category...')
    .setDisabled(disabled)
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('💰 Economy')
        .setDescription('Earn, gamble, steal, and flex coins')
        .setValue('economy'),
      new StringSelectMenuOptionBuilder()
        .setLabel('🔥 Roast Engine')
        .setDescription('AI-powered roasts for friends and enemies')
        .setValue('roast'),
      new StringSelectMenuOptionBuilder()
        .setLabel('🌪️ Chaos Engine')
        .setDescription('Spin the wheel, trigger chaos, become a victim')
        .setValue('chaos')
    );

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

export const helpCommand: Command = {
  name: 'help',
  aliases: ['commands', 'h'],
  description: 'Display all available commands.',
  usage: '!help',
  async execute(message: Message, _args: string[]): Promise<void> {
    const p = config.PREFIX;
    const row = buildCategoryMenu();
    const reply = await message.reply({ embeds: [buildOverviewEmbed(p)], components: [row] });

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 120_000,
      filter: (i) => i.user.id === message.author.id,
    });

    collector.on('collect', async (interaction) => {
      const category = interaction.values[0];
      await interaction.update({
        embeds: [buildCategoryEmbed(category, p)],
        components: [buildCategoryMenu()],
      });
    });

    collector.on('end', async (_collected, reason) => {
      if (reason === 'time') {
        await reply.edit({ components: [buildCategoryMenu(true)] }).catch(() => null);
      }
    });
  },
};
