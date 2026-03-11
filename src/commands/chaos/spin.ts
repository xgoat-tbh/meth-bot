import {
  Message,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';
import { Command } from '../../types/Command';
import { executeSpin } from '../../services/chaosService';
import { getCooldownRemaining, setCooldown, formatCooldown } from '../../utils/cooldown';

const COOLDOWN_MS = 20_000;

function buildSpinRow(disabled = false): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('spin_again')
      .setLabel('Spin Again')
      .setStyle(disabled ? ButtonStyle.Secondary : ButtonStyle.Primary)
      .setEmoji('🎡')
      .setDisabled(disabled)
  );
}

export const spinCommand: Command = {
  name: 'spin',
  description: 'Spin the chaos wheel.',
  usage: '!spin',
  cooldownMs: COOLDOWN_MS,
  guildOnly: true,
  async execute(message: Message, _args: string[]): Promise<void> {
    if (!message.guild) return;

    const result = await executeSpin(message.author.id, message.author.username, message.guild);
    const row = buildSpinRow();
    const reply = await message.reply({ embeds: [result.embed], components: [row] });

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 180_000,
      filter: (i) => i.user.id === message.author.id,
    });

    collector.on('collect', async (interaction) => {
      const remaining = getCooldownRemaining('spin', interaction.user.id);
      if (remaining > 0) {
        await interaction.reply({
          content: `⏳ Cooldown — wait **${formatCooldown(remaining)}** before spinning again.`,
          ephemeral: true,
        });
        return;
      }

      const guild = interaction.guild;
      if (!guild) {
        await interaction.deferUpdate();
        return;
      }

      setCooldown('spin', interaction.user.id, COOLDOWN_MS);
      const newResult = await executeSpin(interaction.user.id, interaction.user.username, guild);
      await interaction.update({ embeds: [newResult.embed], components: [buildSpinRow()] });
    });

    collector.on('end', async (_collected, reason) => {
      if (reason === 'time') {
        await reply.edit({ components: [buildSpinRow(true)] }).catch(() => null);
      }
    });
  },
};
