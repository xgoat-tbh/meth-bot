import { EmbedBuilder, User } from 'discord.js';
import {
  ensureUser,
  updateCoins,
  updateLastCommand,
  getLeaderboard,
  getLeaderboardRank,
  getRecentTransactions,
  getUser,
} from './userService';
import { ownedItemNames, getEquippedItem } from './shopService';
import { randInt, chance, weightedPick } from '../utils/random';
import { logger } from '../utils/logger';

const TITLE_THRESHOLDS: Array<{ coins: number; title: string }> = [
  { coins: 0, title: 'Peasant' },
  { coins: 500, title: 'Broke Boy' },
  { coins: 1_000, title: 'Hustler' },
  { coins: 5_000, title: 'Grinder' },
  { coins: 10_000, title: 'Kingpin' },
  { coins: 25_000, title: 'Drug Lord' },
  { coins: 50_000, title: 'Crime Boss' },
  { coins: 100_000, title: 'Meth Mogul' },
];

export function computeTitle(coins: number): string {
  let title = TITLE_THRESHOLDS[0].title;
  for (const t of TITLE_THRESHOLDS) {
    if (coins >= t.coins) title = t.title;
  }
  return title;
}

function getNextTitle(coins: number): string | null {
  for (const t of TITLE_THRESHOLDS) {
    if (coins < t.coins) return `${t.title} at ${t.coins.toLocaleString()} coins`;
  }
  return null;
}

function refreshTitle(userId: string): void {
  const user = getUser(userId);
  if (!user) return;
  const newTitle = computeTitle(user.coins);
  if (newTitle !== user.title) {
    import('./userService').then(({ updateTitle }) => updateTitle(userId, newTitle));
  }
}

// ── Slot machine helper ────────────────────────────────────────────────────────

const SLOT_SYMS = ['🍋', '🍊', '🍇', '🔔', '💎'];
const JACKPOT_SYM = '7️⃣';

export function buildSlots(outcome: 'lose' | 'double' | 'triple' | 'jackpot'): string {
  if (outcome === 'jackpot') return `${JACKPOT_SYM} ${JACKPOT_SYM} ${JACKPOT_SYM}`;
  if (outcome === 'triple') {
    const s = SLOT_SYMS[Math.floor(Math.random() * SLOT_SYMS.length)];
    return `${s} ${s} ${s}`;
  }
  if (outcome === 'double') {
    const s = SLOT_SYMS[Math.floor(Math.random() * SLOT_SYMS.length)];
    const rest = SLOT_SYMS.filter((x) => x !== s);
    const other = rest[Math.floor(Math.random() * rest.length)];
    const slotArr = [s, s, s];
    slotArr[Math.floor(Math.random() * 3)] = other;
    return slotArr.join('  ');
  }
  return [...SLOT_SYMS].sort(() => Math.random() - 0.5).slice(0, 3).join('  ');
}

// ── !balance ──────────────────────────────────────────────────────────────────

export function buildBalanceEmbed(discordUser: User): EmbedBuilder {
  const user = ensureUser(discordUser.id, discordUser.username);
  const rank = getLeaderboardRank(discordUser.id);
  const recent = getRecentTransactions(discordUser.id, 5);
  const autoTitle = computeTitle(user.coins);
  const nextTitle = getNextTitle(user.coins);
  const equipped = getEquippedItem(discordUser.id);
  const displayTitle = equipped ? `${equipped.emoji} ${equipped.name}` : autoTitle;

  const recentStr =
    recent.length === 0
      ? '*No transactions yet — get to work!*'
      : recent
          .map((t) => {
            const sign = t.amount >= 0 ? '+' : '';
            return `• \`${t.type}\` **${sign}${t.amount}** — <t:${t.timestamp}:R>`;
          })
          .join('\n');

  return new EmbedBuilder()
    .setColor(0xffd700)
    .setAuthor({ name: `${discordUser.displayName}'s Wallet`, iconURL: discordUser.displayAvatarURL() })
    .setTitle('💰 Balance')
    .addFields(
      { name: '🪙 Coins', value: `**${user.coins.toLocaleString()}**`, inline: true },
      { name: '🏆 Title', value: `**${displayTitle}**`, inline: true },
      { name: '📊 Rank', value: `**#${rank}**`, inline: true },
      { name: '📜 Recent Activity', value: recentStr },
      ...(nextTitle ? [{ name: '⬆️ Next Title', value: nextTitle, inline: true }] : [])
    )
    .setFooter({ text: equipped ? `Economy rank: ${autoTitle} • Equipped: ${equipped.name}` : 'Use !work, !crime, or !gamble to earn more.' })
    .setTimestamp();
}

// ── !work ─────────────────────────────────────────────────────────────────────

export interface WorkResult {
  amount: number;
  type: 'normal' | 'overtime' | 'lazy';
  message: string;
  embed: EmbedBuilder;
}

export function executeWork(userId: string, username: string): WorkResult {
  ensureUser(userId, username);
  const roll = Math.random();
  let amount: number;
  let type: WorkResult['type'];
  let flavor: string;

  if (roll < 0.15) {
    amount = randInt(10, 50);
    type = 'lazy';
    flavor = 'You showed up late, smelled like cheese, and barely lifted a finger.';
  } else if (roll < 0.85) {
    amount = randInt(50, 200);
    type = 'normal';
    flavor = pickWorkFlavor();
  } else {
    amount = randInt(200, 400);
    type = 'overtime';
    flavor = 'You worked overtime and impressed absolutely nobody, but the bag was secured.';
  }

  // Perks
  const owned = ownedItemNames(userId);
  const perkLines: string[] = [];
  if (owned.has('Walter White')) {
    amount = Math.floor(amount * 1.35);
    perkLines.push('🧪 Walter White +35%');
  } else if (owned.has('The Plug')) {
    amount = Math.floor(amount * 1.20);
    perkLines.push('🔌 The Plug +20%');
  }
  if (owned.has('Golden Brick')) {
    amount += 25;
    perkLines.push('🧱 Golden Brick +25');
  }

  updateCoins(userId, amount, 'work', flavor);
  updateLastCommand(userId, 'last_work');
  refreshTitle(userId);
  logger.info(`Work: ${username} earned ${amount} coins (${type})`);

  const color = type === 'lazy' ? 0xff4444 : type === 'overtime' ? 0x00ff88 : 0x4488ff;
  const perkNote = perkLines.length ? `\n*Perks: ${perkLines.join(' · ')}*` : '';
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(type === 'overtime' ? '💼 Overtime Bonus!' : type === 'lazy' ? '😴 Lazy Day' : '💼 Shift Complete')
    .setDescription(flavor + perkNote)
    .addFields({ name: '🪙 Earned', value: `**+${amount} coins**`, inline: true })
    .setFooter({ text: type === 'overtime' ? 'Big bag energy.' : 'Back in 1 hour for another shift.' })
    .setTimestamp();

  return { amount, type, message: flavor, embed };
}

function pickWorkFlavor(): string {
  const flavors = [
    'You cooked meth for your boss — professionally and legally, of course.',
    'You delivered packages that definitely weren\'t drugs.',
    'You managed the server\'s underground casino. Efficient.',
    'You sold questionable herbal remedies at a marked-up price.',
    'You drove getaway cars for "totally legitimate" clients.',
    'You laundered money through a charity bake sale. Genius.',
    'You ran a protection racket for local pigeons. Business is booming.',
  ];
  return flavors[Math.floor(Math.random() * flavors.length)];
}

// ── !crime ────────────────────────────────────────────────────────────────────

export interface CrimeResult {
  success: boolean;
  amount: number;
  rareEvent: boolean;
  embed: EmbedBuilder;
}

export function executeCrime(userId: string, username: string): CrimeResult {
  ensureUser(userId, username);
  const owned = ownedItemNames(userId);
  const hasHeisenberg = owned.has('Heisenberg');

  const success = chance(hasHeisenberg ? 0.70 : 0.60);
  const rareEvent = chance(0.05);
  let amount: number;

  if (success) {
    amount = randInt(150, 500);
    if (hasHeisenberg) amount = Math.floor(amount * 1.25);
    updateCoins(userId, amount, 'crime', 'Successful crime');
  } else {
    amount = randInt(50, 200);
    updateCoins(userId, -amount, 'crime', 'Failed crime fine');
  }

  updateLastCommand(userId, 'last_crime');
  refreshTitle(userId);
  logger.info(`Crime: ${username} ${success ? 'succeeded' : 'failed'} (${success ? '+' : '-'}${amount})`);

  const crimeFlavorSuccess = [
    'You robbed a vending machine with a level of professionalism rarely seen.',
    'You hacked into a local pizza shop\'s loyalty points. Genius.',
    'You pickpocketed the mayor during his speech. Respect.',
    'You sold fake crypto to an HOA president. Poetic.',
    'You stole a food truck and sold it back to the owner. Twice.',
  ];
  const crimeFlavorFail = [
    'The cops caught you. You bribed them, but it cost you.',
    'You tripped over your own feet mid-heist. Classic.',
    'The alarm went off. You ran. You didn\'t run fast enough.',
    'Your getaway driver was an Uber. It went badly.',
    'You left your Discord notification on during the heist.',
  ];

  const description = success
    ? crimeFlavorSuccess[Math.floor(Math.random() * crimeFlavorSuccess.length)]
    : crimeFlavorFail[Math.floor(Math.random() * crimeFlavorFail.length)];

  const heisenbergNote = hasHeisenberg && success ? '\n*🎩 Heisenberg: +10% chance & +25% payout*' : '';
  const embed = new EmbedBuilder()
    .setColor(success ? 0x00cc44 : 0xcc0000)
    .setTitle(success ? '🦹 Crime Pays!' : '🚔 Caught Red-Handed')
    .setDescription(
      (rareEvent
        ? '🚨 **POLICE CHASE!** You barely escaped, but you still got something...'
        : description) + heisenbergNote
    )
    .addFields({
      name: success ? '🪙 Stolen' : '💸 Fine',
      value: `**${success ? '+' : '-'}${amount} coins**`,
      inline: true,
    })
    .setFooter({ text: success ? (hasHeisenberg ? 'Heisenberg always wins.' : '60% of the time, crime pays every time.') : 'Next attempt in 2 hours.' })
    .setTimestamp();

  return { success, amount, rareEvent, embed };
}

// ── !rob @user ────────────────────────────────────────────────────────────────

export interface RobResult {
  success: boolean;
  amount: number;
  embed: EmbedBuilder;
}

export function executeRob(
  robberId: string,
  robberName: string,
  targetId: string,
  targetName: string
): RobResult {
  ensureUser(robberId, robberName);
  const target = ensureUser(targetId, targetName);

  if (target.coins < 50) {
    return {
      success: false,
      amount: 0,
      embed: new EmbedBuilder()
        .setColor(0xff8800)
        .setTitle('🚫 Rob Failed — Target is Broke')
        .setDescription(`**${targetName}** is already broke. Pick a better target, you monster.`)
        .setFooter({ text: 'Minimum target balance: 50 coins.' })
        .setTimestamp(),
    };
  }

  const owned = ownedItemNames(robberId);
  const hasMask = owned.has('Ski Mask');
  const baseChance = Math.min(0.7, 0.3 + target.coins / 20_000);
  const successChance = hasMask ? Math.max(0.50, baseChance) : baseChance;
  const success = chance(successChance);

  let amount: number;
  if (success) {
    const pct = (randInt(10, 30)) / 100;
    amount = Math.floor(target.coins * pct);
    updateCoins(robberId, amount, 'rob_receive', `Robbed ${targetName}`);
    updateCoins(targetId, -amount, 'rob_victim', `Robbed by ${robberName}`);
  } else {
    amount = randInt(50, 200);
    updateCoins(robberId, -amount, 'rob_fine', `Failed rob of ${targetName}`);
  }

  updateLastCommand(robberId, 'last_rob');
  refreshTitle(robberId);
  refreshTitle(targetId);

  logger.info(`Rob: ${robberName} → ${targetName}: ${success ? 'success' : 'failed'} ${amount} coins`);

  const maskNote = hasMask && success ? '\n*🎭 Ski Mask: min 50% success chance applied*' : '';
  return {
    success,
    amount,
    embed: new EmbedBuilder()
      .setColor(success ? 0x00cc44 : 0xcc0000)
      .setTitle(success ? '💰 Robbery Successful' : '🚔 Caught in the Act')
      .setDescription(
        (success
          ? `You mugged **${targetName}** in broad daylight. Iconic.`
          : `You got caught trying to rob **${targetName}** and paid a fine.`) + maskNote
      )
      .addFields(
        {
          name: success ? '🪙 Stolen' : '💸 Fine',
          value: `**${success ? '+' : '-'}${amount} coins**`,
          inline: true,
        },
        { name: '🎯 Target', value: `**${targetName}**`, inline: true }
      )
      .setFooter({ text: success ? 'Crime does pay (sometimes).' : '30 minute cooldown.' })
      .setTimestamp(),
  };
}

// ── !daily ────────────────────────────────────────────────────────────────────

export function executeDaily(userId: string, username: string): EmbedBuilder {
  ensureUser(userId, username);
  const owned = ownedItemNames(userId);
  const hasElJefe = owned.has('El Jefe');
  const DAILY_AMOUNT = hasElJefe ? 600 : 300;

  updateCoins(userId, DAILY_AMOUNT, 'daily', 'Daily reward');
  updateLastCommand(userId, 'last_daily');
  refreshTitle(userId);
  logger.info(`Daily: ${username} claimed ${DAILY_AMOUNT} coins`);

  return new EmbedBuilder()
    .setColor(0xffd700)
    .setTitle('🎁 Daily Reward Claimed!')
    .setDescription(
      hasElJefe
        ? '👑 **El Jefe perk**: Your daily is doubled. As expected.'
        : 'Come back tomorrow for another hit of the good stuff.'
    )
    .addFields({ name: '🪙 Reward', value: `**+${DAILY_AMOUNT} coins**`, inline: true })
    .setFooter({ text: 'Next daily in 24 hours.' })
    .setTimestamp();
}

// ── !gamble <amount> ──────────────────────────────────────────────────────────

export interface GambleResult {
  outcome: 'lose' | 'double' | 'triple' | 'jackpot';
  net: number;
  newBalance: number;
  slots: string;
  embed: EmbedBuilder;
}

export function executeGamble(userId: string, username: string, bet: number): GambleResult {
  const user = ensureUser(userId, username);
  if (bet > user.coins) throw new Error('Insufficient coins');
  if (bet < 1) throw new Error('Minimum bet is 1 coin');

  const owned = ownedItemNames(userId);
  const hasCharm = owned.has('Lucky Charm');

  const outcomes = hasCharm
    ? [
        { weight: 39, outcome: 'lose' as const, multiplier: 0 },
        { weight: 45, outcome: 'double' as const, multiplier: 2 },
        { weight: 12, outcome: 'triple' as const, multiplier: 3 },
        { weight: 4,  outcome: 'jackpot' as const, multiplier: 10 },
      ]
    : [
        { weight: 45, outcome: 'lose' as const, multiplier: 0 },
        { weight: 45, outcome: 'double' as const, multiplier: 2 },
        { weight: 8,  outcome: 'triple' as const, multiplier: 3 },
        { weight: 2,  outcome: 'jackpot' as const, multiplier: 10 },
      ];

  const picked = weightedPick(outcomes);
  const winnings = bet * picked.multiplier;
  const net = winnings - bet;
  const newBalance = user.coins + net;

  updateCoins(userId, net, 'gamble', `Gamble ${picked.outcome}`);
  refreshTitle(userId);
  logger.info(`Gamble: ${username} bet ${bet}, outcome: ${picked.outcome}, net: ${net}`);

  const slots = buildSlots(picked.outcome);

  const colors = { lose: 0xcc0000, double: 0x4488ff, triple: 0xffd700, jackpot: 0xff00ff };
  const titles = {
    lose: '💀 House Wins',
    double: '✨ Double Up!',
    triple: '🎉 Triple!',
    jackpot: '🎰 J A C K P O T',
  };
  const descs = {
    lose: 'The market crashed. Your wallet followed.',
    double: `**${username}** doubled their bet. The dealer is sweating.`,
    triple: `**${username}** hit a triple! The casino is in shambles.`,
    jackpot: `💥 **${username}** OBLITERATED the casino. Legendary.`,
  };

  const footerOdds = hasCharm
    ? '🍀 Lucky Charm odds: 39% lose · 45% double · 12% triple · 4% jackpot'
    : 'Odds: 45% lose · 45% double · 8% triple · 2% jackpot';

  const embed = new EmbedBuilder()
    .setColor(colors[picked.outcome])
    .setTitle(titles[picked.outcome])
    .setDescription(`\`\`\`\n  ${slots}  \n\`\`\`\n${descs[picked.outcome]}`)
    .addFields(
      { name: '🎲 Bet', value: `${bet.toLocaleString()} coins`, inline: true },
      {
        name: net >= 0 ? '🪙 Won' : '💸 Lost',
        value: `**${net >= 0 ? '+' : ''}${net.toLocaleString()} coins**`,
        inline: true,
      },
      { name: '💰 New Balance', value: `${newBalance.toLocaleString()} coins`, inline: true }
    )
    .setFooter({ text: footerOdds })
    .setTimestamp();

  return { outcome: picked.outcome, net, newBalance, slots, embed };
}

// ── !give @user <amount> ──────────────────────────────────────────────────────

export function executeGive(
  fromId: string,
  fromName: string,
  toId: string,
  toName: string,
  amount: number
): EmbedBuilder {
  const from = ensureUser(fromId, fromName);
  ensureUser(toId, toName);

  if (amount < 1) throw new Error('Amount must be at least 1');
  if (amount > from.coins) throw new Error('Insufficient coins');
  if (fromId === toId) throw new Error('You cannot give coins to yourself');

  updateCoins(fromId, -amount, 'give_out', `Gave to ${toName}`);
  updateCoins(toId, amount, 'give_in', `Received from ${fromName}`);
  refreshTitle(fromId);
  refreshTitle(toId);
  logger.info(`Give: ${fromName} → ${toName}: ${amount} coins`);

  return new EmbedBuilder()
    .setColor(0x00cc88)
    .setTitle('💸 Transfer Complete')
    .setDescription(`**${fromName}** sent coins to **${toName}**. Suspicious generosity detected.`)
    .addFields(
      { name: '🪙 Amount', value: `**${amount.toLocaleString()} coins**`, inline: true },
      { name: '📬 Recipient', value: `**${toName}**`, inline: true }
    )
    .setFooter({ text: 'Money laundering? We don\'t ask questions.' })
    .setTimestamp();
}

// ── !leaderboard ──────────────────────────────────────────────────────────────

export function buildLeaderboardEmbed(): EmbedBuilder {
  const top = getLeaderboard(10);

  const medals = ['🥇', '🥈', '🥉'];
  const rows = top
    .map((u, i) => {
      const medal = medals[i] ?? `**${i + 1}.**`;
      return `${medal} **${u.username}** — ${u.coins.toLocaleString()} coins *(${u.title})*`;
    })
    .join('\n');

  return new EmbedBuilder()
    .setColor(0xffd700)
    .setTitle('🏆 Richest Degenerates')
    .setDescription(rows || 'Nobody has any coins yet. Start grinding.')
    .setFooter({ text: 'Updated in real-time. Grind harder.' })
    .setTimestamp();
}
