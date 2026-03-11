import { Message, TextChannel } from 'discord.js';
import { Command } from '../../types/Command';
import { triggerChaosEvent } from '../../services/chaosService';

export const chaosCommand: Command = {
  name: 'chaos',
  description: 'Trigger a random chaos event.',
  usage: '!chaos',
  cooldownMs: 30_000,
  guildOnly: true,
  async execute(message: Message, _args: string[]): Promise<void> {
    if (!message.guild) return;

    const channel = message.channel as TextChannel;
    const result = await triggerChaosEvent(message.guild, channel, message.author.id);

    await message.reply({ embeds: [result.embed] });
  },
};
