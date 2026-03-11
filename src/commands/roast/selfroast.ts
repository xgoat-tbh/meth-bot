import { Message, EmbedBuilder } from 'discord.js';
import { Command } from '../../types/Command';
import { generateRoast } from '../../services/roastService';
import { ensureUser } from '../../services/userService';

export const selfroastCommand: Command = {
  name: 'selfroast',
  description: 'Roast yourself. You masochist.',
  usage: '!selfroast',
  cooldownMs: 10_000,
  async execute(message: Message, _args: string[]): Promise<void> {
    ensureUser(message.author.id, message.author.username);
    const roast = await generateRoast(message.author.displayName ?? message.author.username);

    const embed = new EmbedBuilder()
      .setColor(0xff00ff)
      .setTitle(`🪞 Self-Roast: ${message.author.displayName ?? message.author.username}`)
      .setDescription(`*"${roast}"*`)
      .setFooter({ text: 'Pain is temporary. This roast is permanent.' })
      .setThumbnail(message.author.displayAvatarURL())
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
