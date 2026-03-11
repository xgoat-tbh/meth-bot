import {
  Message,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  TextChannel,
} from 'discord.js';
import { Command } from '../../types/Command';
import { executeGamble } from '../../services/economyService';
import { ensureUser } from '../../services/userService';
import { getCooldownRemaining, setCooldown, formatCooldown } from '../../utils/cooldown';

const COOLDOWN_MS = 30_000;

/** Send an error reply that auto-deletes after 8 s, and delete the triggering message. */
async function replyThenDelete(message: Message, embed: EmbedBuilder): Promise<void> {
  message.delete().catch(() => null);
  const reply = await (message.channel as TextChannel).send({ embeds: [embed] });
  setTimeout(() => reply.delete().catch(() => null), 8_000);
}

function buildPlayAgainRow(disabled = false): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('gamble_again')
      .setLabel('Play Again')
      .setStyle(disabled ? ButtonStyle.Secondary : ButtonStyle.Primary)
      .setEmoji('🎲')
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId('gamble_double')
      .setLabel('Double Down')
      .setStyle(disabled ? ButtonStyle.Secondary : ButtonStyle.Danger)
      .setEmoji('🔥')
      .setDisabled(disabled)
  );
}

export const gambleCommand: Command = {
  name: 'gamble',
  aliases: ['bet'],
  description: 'Gamble your coins. Could double, triple, or jackpot.',
  usage: '!gamble <amount|all>',
  cooldownMs: COOLDOWN_MS,
  async execute(message: Message, args: string[]): Promise<void> {
    const user = ensureUser(message.author.id, message.author.username);

    if (!args[0]) {
      await replyThenDelete(message, new EmbedBuilder()
        .setColor(0xff4444)
        .setTitle('❌ Missing Amount')
        .setDescription('Usage: `!gamble <amount>` or `!gamble all`')
        .setFooter({ text: 'Minimum bet: 1 coin • Maximum bet: 5,000 coins.' }));
      return;
    }

    const isAll = args[0].toLowerCase() === 'all';
    let amount = isAll ? Math.min(user.coins, 5000) : parseInt(args[0], 10);

    if (isNaN(amount) || amount < 1) {
      await replyThenDelete(message, new EmbedBuilder()
        .setColor(0xff4444)
        .setTitle('❌ Invalid Amount')
        .setDescription('Enter a positive number or `all`.'));
      return;
    }

    if (amount > 5000) {
      await replyThenDelete(message, new EmbedBuilder()
        .setColor(0xff4444)
        .setTitle('❌ Bet Too High')
        .setDescription('Maximum bet is **5,000 coins** per gamble.'));
      return;
    }

    if (amount > user.coins) {
      await replyThenDelete(message, new EmbedBuilder()
        .setColor(0xff4444)
        .setTitle('❌ Insufficient Coins')
        .setDescription(`You only have **${user.coins.toLocaleString()} coins**.`));
      return;
    }

    const result = executeGamble(message.author.id, message.author.username, amount);
    const row = buildPlayAgainRow();
    const reply = await message.reply({ embeds: [result.embed], components: [row] });

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 180_000,
      filter: (i) => i.user.id === message.author.id,
    });

    collector.on('collect', async (interaction) => {
      const remaining = getCooldownRemaining('gamble', interaction.user.id);
      if (remaining > 0) {
        await interaction.reply({
          content: `⏳ Cooldown — wait **${formatCooldown(remaining)}** before gambling again.`,
          ephemeral: true,
        });
        return;
      }

      const currentUser = ensureUser(interaction.user.id, interaction.user.username);
      const isDoubleDown = interaction.customId === 'gamble_double';
      const nextBet = isDoubleDown ? Math.min(amount * 2, currentUser.coins, 5000) : amount;

      if (currentUser.coins < 1) {
        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0xff4444)
              .setTitle('💀 Completely Broke')
              .setDescription("You've gambled everything away. A true degenerate.")
              .setFooter({ text: 'Use !work or !daily to earn more coins.' }),
          ],
          components: [buildPlayAgainRow(true)],
        });
        collector.stop();
        return;
      }

      if (nextBet > currentUser.coins) {
        await interaction.reply({
          content: `❌ You only have **${currentUser.coins.toLocaleString()} coins** — can't bet **${nextBet.toLocaleString()}**.`,
          ephemeral: true,
        });
        return;
      }

      setCooldown('gamble', interaction.user.id, COOLDOWN_MS);
      amount = nextBet;
      const newResult = executeGamble(interaction.user.id, interaction.user.username, amount);
      await interaction.update({ embeds: [newResult.embed], components: [buildPlayAgainRow()] });
    });

    collector.on('end', async (_collected, reason) => {
      if (reason === 'time') {
        await reply.edit({ components: [buildPlayAgainRow(true)] }).catch(() => null);
      }
    });
  },
};
