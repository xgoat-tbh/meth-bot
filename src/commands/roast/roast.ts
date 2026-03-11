import { Message, EmbedBuilder } from 'discord.js';
import { Command } from '../../types/Command';
import { generateRoast } from '../../services/roastService';
import { ensureUser } from '../../services/userService';

export const roastCommand: Command = {
  name: 'roast',
  description: 'Generate an AI-powered roast for a user.',
  usage: '!roast @user',
  cooldownMs: 10_000,
  guildOnly: true,
  async execute(message: Message, _args: string[]): Promise<void> {
    const target = message.mentions.users.first();

    if (!target) {
      const embed = new EmbedBuilder()
        .setColor(0xff4444)
        .setTitle('❌ Usage Error')
        .setDescription('You need to mention someone to roast. `!roast @user`');
      await message.reply({ embeds: [embed] });
      return;
    }

    if (target.bot) {
      const embed = new EmbedBuilder()
        .setColor(0xff4444)
        .setTitle('❌ Immune')
        .setDescription('Bots are immune to roasts. They have no feelings.');
      await message.reply({ embeds: [embed] });
      return;
    }

    ensureUser(target.id, target.username);
    const roast = await generateRoast(target.displayName ?? target.username);

    const embed = new EmbedBuilder()
      .setColor(0xff6600)
      .setTitle(`🔥 Roasting ${target.displayName ?? target.username}`)
      .setDescription(`*"${roast}"*`)
      .setFooter({ text: `Requested by ${message.author.username}` })
      .setThumbnail(target.displayAvatarURL())
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
