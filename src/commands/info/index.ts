import type { Command } from '@/core/command/types.js';
import ping from './ping.js';
import botinfo from './botinfo.js';
import guildinfo from './guildinfo.js';
import userinfo from './userinfo.js';
import help from './help.js';
import changelog from './changelog.js';

export const infoCommands: readonly Command[] = [
  ping,
  botinfo,
  guildinfo,
  userinfo,
  help,
  changelog,
];
