import { Message, EmbedBuilder, GuildMember } from 'discord.js';
import { Command } from '../../types/Command';
import { ensureUser } from '../../services/userService';
import { getOrSetVictim } from '../../services/userService';
import { pickRandom } from '../../utils/random';

export const victimCommand: Command = {
  name: 'victim',
  description: 'Find out who the Victim of the Day is.',
  usage: '!victim',
  cooldownMs: 10_000,
  guildOnly: true,
  async execute(message: Message, _args: string[]): Promise<void> {
    if (!message.guild) return;

    let members: GuildMember[];
    try {
      const fetched = await message.guild.members.fetch();
      members = [...fetched.values()].filter((m) => !m.user.bot);
    } catch {
      const embed = new EmbedBuilder()
        .setColor(0xff4444)
        .setTitle('❌ Error')
        .setDescription('Failed to fetch server members.');
      await message.reply({ embeds: [embed] });
      return;
    }

    if (members.length === 0) {
      await message.reply('No eligible victims found.');
      return;
    }

    const victimId = getOrSetVictim(message.guild.id, () => pickRandom(members).id);
    const victimMember = members.find((m) => m.id === victimId) ?? pickRandom(members);
    ensureUser(victimMember.id, victimMember.user.username);

    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('🎯 Victim of the Day')
      .setDescription(`Today's unfortunate soul has been selected.`)
      .setThumbnail(victimMember.user.displayAvatarURL())
      .addFields(
        { name: '🎯 Target', value: `**${victimMember.displayName}**`, inline: true },
        { name: '📅 Date', value: today, inline: true }
      )
      .setFooter({ text: 'A new victim is chosen each day.' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
