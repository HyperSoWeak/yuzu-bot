import type { Command } from '@/core/command/types.js';
import { infoCommands } from './info/index.js';
import { settingsCommands } from './settings/index.js';

export const allCommands: readonly Command[] = [...infoCommands, ...settingsCommands];
