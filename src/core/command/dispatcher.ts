import { MessageFlags, PermissionFlagsBits, type ChatInputCommandInteraction } from 'discord.js';
import { loadEnv } from '@/config/env.js';
import { loadConfig } from '@/config/config.js';
import { logger } from '@/core/logger.js';
import { commandRegistry } from './registry.js';
import { commandCooldowns } from './cooldown.js';
import { CommandError, CooldownError, PermissionDeniedError } from './errors.js';
import type { Command } from './types.js';

const env = loadEnv();
const config = loadConfig();

async function reply(interaction: ChatInputCommandInteraction, content: string): Promise<void> {
  const payload = { content, flags: MessageFlags.Ephemeral as const };
  if (interaction.replied || interaction.deferred) {
    await interaction.followUp(payload);
  } else {
    await interaction.reply(payload);
  }
}

function checkPermission(interaction: ChatInputCommandInteraction, command: Command): void {
  const perm = command.permissions;
  if (!perm) return;

  if (perm.ownerOnly && !env.DISCORD_OWNER_IDS.includes(interaction.user.id)) {
    throw new PermissionDeniedError('此指令僅限 bot owner 使用。');
  }

  if (perm.adminOnly) {
    const memberPerms = interaction.memberPermissions;
    if (!memberPerms?.has(PermissionFlagsBits.ManageGuild)) {
      throw new PermissionDeniedError('此指令需要「管理伺服器」權限。');
    }
  }
}

export async function dispatchInteraction(interaction: ChatInputCommandInteraction): Promise<void> {
  const command = commandRegistry.get(interaction.commandName);
  const log = logger.child({
    command: interaction.commandName,
    userId: interaction.user.id,
    guildId: interaction.guildId,
  });

  if (!command) {
    log.warn('unknown command');
    await reply(interaction, '指令不存在或尚未同步。');
    return;
  }

  try {
    checkPermission(interaction, command);

    const cdSeconds = command.cooldownSeconds ?? config.command.default_cooldown_seconds;
    const remaining = commandCooldowns.check(command.data.name, interaction.user.id);
    if (remaining > 0) throw new CooldownError(remaining);
    commandCooldowns.apply(command.data.name, interaction.user.id, cdSeconds);

    const start = Date.now();
    await command.execute({ interaction, logger: log });
    log.info({ ms: Date.now() - start }, 'command ok');
  } catch (err) {
    if (err instanceof CommandError) {
      log.info({ code: err.code }, 'command rejected');
      await reply(interaction, err.message).catch((e) => log.error({ err: e }, 'reply failed'));
      return;
    }
    log.error({ err }, 'command failed');
    await reply(interaction, '指令執行時發生錯誤，請稍後再試。').catch((e) =>
      log.error({ err: e }, 'error reply failed'),
    );
  }
}
