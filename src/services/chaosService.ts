import {
  Guild,
  EmbedBuilder,
  TextChannel,
  GuildMember,
} from 'discord.js';
import { ensureUser, updateCoins, updateTitle } from './userService';
import { generateRoast } from './roastService';
import { randInt, pickRandom, weightedPick } from '../utils/random';
import { logger } from '../utils/logger';

const COMEDIC_TITLES = [
  'Professional Idiot',
  'Certified Clown',
  'Lord of Nothing',
  'Discount Human',
  'Background Character',
  'Walking Mistake',
  'NPC Energy',
  'Participation Award Winner',
  'Chief Chaos Officer',
  'Broke Villain',
];

export type ChaosEventType =
  | 'coin_boost'
  | 'coin_drain'
  | 'roast_storm'
  | 'title_curse'
  | 'chaos_jackpot';

export interface ChaosResult {
  type: ChaosEventType;
  embed: EmbedBuilder;
}

export async function triggerChaosEvent(
  guild: Guild,
  _channel: TextChannel,
  initiatorId?: string
): Promise<ChaosResult> {
  const events = [
    { weight: 25, type: 'coin_boost' as const },
    { weight: 25, type: 'coin_drain' as const },
    { weight: 20, type: 'roast_storm' as const },
    { weight: 20, type: 'title_curse' as const },
    { weight: 10, type: 'chaos_jackpot' as const },
  ];

  const picked = weightedPick(events);
  const victim = await pickRandomMember(guild, initiatorId);

  if (!victim) {
    return {
      type: picked.type,
      embed: new EmbedBuilder()
        .setColor(0xff8800)
        .setTitle('🌪️ Chaos Fizzled')
        .setDescription('Chaos tried to strike but found no worthy targets.')
        .setTimestamp(),
    };
  }

  ensureUser(victim.id, victim.user.username);

  switch (picked.type) {
    case 'coin_boost':
      return chaosBoost(victim);
    case 'coin_drain':
      return chaosDrain(victim);
    case 'roast_storm':
      return chaosRoast(victim);
    case 'title_curse':
      return chaosTitleCurse(victim);
    case 'chaos_jackpot':
      return chaosJackpot(victim);
  }
}

async function pickRandomMember(guild: Guild, excludeId?: string): Promise<GuildMember | null> {
  try {
    const members = await guild.members.fetch();
    const human = members.filter((m) => !m.user.bot && m.id !== excludeId);
    if (human.size === 0) return null;
    const arr = [...human.values()];
    return pickRandom(arr);
  } catch {
    return null;
  }
}

function chaosBoost(member: GuildMember): ChaosResult {
  const amount = randInt(100, 500);
  updateCoins(member.id, amount, 'chaos_boost', 'Chaos coin boost');
  logger.info(`Chaos boost: ${member.user.username} +${amount} coins`);
  return {
    type: 'coin_boost',
    embed: new EmbedBuilder()
      .setColor(0x00ff88)
      .setTitle('🌪️ Chaos Coin Rain!')
      .setDescription(`**${member.displayName}** has been blessed by the chaos gods!`)
      .addFields({ name: '🪙 Gained', value: `+${amount} coins`, inline: true })
      .setTimestamp(),
  };
}

function chaosDrain(member: GuildMember): ChaosResult {
  const amount = randInt(50, 300);
  updateCoins(member.id, -amount, 'chaos_drain', 'Chaos coin drain');
  logger.info(`Chaos drain: ${member.user.username} -${amount} coins`);
  return {
    type: 'coin_drain',
    embed: new EmbedBuilder()
      .setColor(0xff4444)
      .setTitle('🌪️ Chaos Tax Collector!')
      .setDescription(`**${member.displayName}** has been visited by the chaos tax man.`)
      .addFields({ name: '💸 Drained', value: `-${amount} coins`, inline: true })
      .setTimestamp(),
  };
}

async function chaosRoast(member: GuildMember): Promise<ChaosResult> {
  const roast = await generateRoast(member.displayName);
  logger.info(`Chaos roast: ${member.user.username}`);
  return {
    type: 'roast_storm',
    embed: new EmbedBuilder()
      .setColor(0xff6600)
      .setTitle('🌪️ Roast Storm!')
      .setDescription(`🔥 **${member.displayName}**, the chaos gods have spoken:\n\n*"${roast}"*`)
      .setTimestamp(),
  };
}

function chaosTitleCurse(member: GuildMember): ChaosResult {
  const title = pickRandom(COMEDIC_TITLES);
  updateTitle(member.id, title);
  logger.info(`Chaos title: ${member.user.username} → ${title}`);
  return {
    type: 'title_curse',
    embed: new EmbedBuilder()
      .setColor(0xaa44ff)
      .setTitle('🌪️ Title Reassignment!')
      .setDescription(`**${member.displayName}** has been officially re-titled.`)
      .addFields({ name: '🏷️ New Title', value: `**${title}**`, inline: true })
      .setTimestamp(),
  };
}

function chaosJackpot(member: GuildMember): ChaosResult {
  const amount = randInt(1_000, 5_000);
  updateCoins(member.id, amount, 'chaos_jackpot', 'Chaos jackpot');
  logger.info(`Chaos jackpot: ${member.user.username} +${amount} coins`);
  return {
    type: 'chaos_jackpot',
    embed: new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle('🌪️ CHAOS JACKPOT!!!')
      .setDescription(
        `💥 **${member.displayName}** just hit the chaos jackpot! The universe made a mistake.`
      )
      .addFields({ name: '🎰 Jackpot', value: `+${amount} coins`, inline: true })
      .setTimestamp(),
  };
}

// ── !spin ──────────────────────────────────────────────────────────────────────

export interface SpinResult {
  outcome: string;
  net: number;
  embed: EmbedBuilder;
}

export async function executeSpin(
  userId: string,
  username: string,
  _guild: Guild
): Promise<SpinResult> {
  ensureUser(userId, username);

  const outcomes = [
    { weight: 30, label: '💰 Coin Win', net: randInt(100, 500) },
    { weight: 30, label: '💸 Coin Loss', net: -randInt(50, 300) },
    { weight: 25, label: '🔥 Roast', net: 0 },
    { weight: 15, label: '🎰 Jackpot', net: randInt(500, 2_000) },
  ];

  const picked = weightedPick(outcomes);

  if (picked.net !== 0) {
    updateCoins(userId, picked.net, 'spin', `Spin: ${picked.label}`);
  }

  let description = `The wheel lands on **${picked.label}**!`;
  if (picked.label === '🔥 Roast') {
    const roast = await generateRoast(username);
    description += `\n\n*"${roast}"*`;
  }

  logger.info(`Spin: ${username} → ${picked.label} (${picked.net >= 0 ? '+' : ''}${picked.net})`);

  return {
    outcome: picked.label,
    net: picked.net,
    embed: new EmbedBuilder()
      .setColor(0xff88ff)
      .setTitle('🎡 Chaos Spin Wheel')
      .setDescription(description)
      .addFields(
        picked.net !== 0
          ? {
              name: picked.net > 0 ? '🪙 Won' : '💸 Lost',
              value: `**${picked.net > 0 ? '+' : ''}${picked.net} coins**`,
              inline: true,
            }
          : { name: '\u200b', value: '\u200b', inline: true }
      )
      .setTimestamp(),
  };
}
