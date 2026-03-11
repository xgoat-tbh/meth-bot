import { Message } from 'discord.js';

export interface Command {
  name: string;
  aliases?: string[];
  description: string;
  usage?: string;
  cooldownMs?: number;
  guildOnly?: boolean;
  execute(message: Message, args: string[]): Promise<void>;
}
