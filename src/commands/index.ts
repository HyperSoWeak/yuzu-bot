import type { Command } from '@/core/command/types.js';
import { infoCommands } from './info/index.js';
import { settingsCommands } from './settings/index.js';
import { achievementCommands } from './achievement/index.js';
import { roleMenuCommands } from './role-menu/index.js';
import { colorRoleCommands } from './color-role/index.js';
import { leaderboardCommands } from './leaderboard/index.js';
import { ownerCommands } from './owner/index.js';
import { mineCommands } from './mine/index.js';

export const allCommands: readonly Command[] = [
  ...infoCommands,
  ...settingsCommands,
  ...achievementCommands,
  ...roleMenuCommands,
  ...colorRoleCommands,
  ...leaderboardCommands,
  ...mineCommands,
  ...ownerCommands,
];
