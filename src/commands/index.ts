import type { Command } from '@/core/command/types.js';
import { infoCommands } from './info/index.js';
import { settingsCommands } from './settings/index.js';
import { keywordCommands } from './keyword/index.js';
import { achievementCommands } from './achievement/index.js';
import { reactionRoleCommands } from './reaction-role/index.js';
import { colorRoleCommands } from './color-role/index.js';

export const allCommands: readonly Command[] = [
  ...infoCommands,
  ...settingsCommands,
  ...keywordCommands,
  ...achievementCommands,
  ...reactionRoleCommands,
  ...colorRoleCommands,
];
