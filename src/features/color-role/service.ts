import type { Guild, GuildMember, Role } from 'discord.js';
import { prisma } from '@/db/client.js';
import { loadConfig } from '@/config/config.js';
import { logger } from '@/core/logger.js';
import { hexToInt } from './parser.js';

const config = loadConfig();

function roleNameFor(hex: string): string {
  return `${config.color_role.role_name_prefix}${hex}`;
}

/**
 * Find an existing color role for this hex, or create one. Roles are matched by
 * exact name (config-prefix + hex) so they remain stable across restarts.
 */
export async function getOrCreateColorRole(guild: Guild, hex: string): Promise<Role> {
  const name = roleNameFor(hex);
  // Ensure roles are loaded; managed by discord.js cache normally.
  const existing = guild.roles.cache.find((r) => r.name === name);
  if (existing) {
    logger.info({ guildId: guild.id, roleId: existing.id, hex }, 'color role reused');
    return existing;
  }
  const created = await guild.roles.create({
    name,
    color: hexToInt(hex),
    mentionable: false,
    reason: 'self color role',
  });
  logger.info({ guildId: guild.id, roleId: created.id, hex }, 'color role created');
  return created;
}

/**
 * Replace the user's current color role with the new one.
 * Stored assignment in DB lets us reliably remove the old role even if cache is cold.
 */
export async function assignColorRole(member: GuildMember, role: Role, hex: string): Promise<void> {
  const prior = await prisma.colorRoleAssignment.findUnique({
    where: { guildId_userId: { guildId: member.guild.id, userId: member.id } },
  });

  if (prior && prior.roleId !== role.id) {
    await member.roles.remove(prior.roleId, 'switching color role').catch((err) => {
      logger.warn(
        { err, guildId: member.guild.id, userId: member.id, roleId: prior.roleId },
        'failed to remove previous color role (will overwrite anyway)',
      );
    });
  }

  await member.roles.add(role.id, 'self color role');

  await prisma.colorRoleAssignment.upsert({
    where: { guildId_userId: { guildId: member.guild.id, userId: member.id } },
    create: { guildId: member.guild.id, userId: member.id, roleId: role.id, hexColor: hex },
    update: { roleId: role.id, hexColor: hex },
  });

  logger.info(
    { guildId: member.guild.id, userId: member.id, roleId: role.id, hex },
    'color role assigned',
  );
}

export async function clearColorRole(member: GuildMember): Promise<boolean> {
  const row = await prisma.colorRoleAssignment.findUnique({
    where: { guildId_userId: { guildId: member.guild.id, userId: member.id } },
  });
  if (!row) return false;
  await member.roles.remove(row.roleId, 'clear color role').catch((err) => {
    logger.warn(
      { err, guildId: member.guild.id, userId: member.id, roleId: row.roleId },
      'failed to remove color role',
    );
  });
  await prisma.colorRoleAssignment.delete({
    where: { guildId_userId: { guildId: member.guild.id, userId: member.id } },
  });
  logger.info({ guildId: member.guild.id, userId: member.id }, 'color role cleared');
  return true;
}

export async function getCurrentColor(guildId: string, userId: string) {
  return prisma.colorRoleAssignment.findUnique({
    where: { guildId_userId: { guildId, userId } },
  });
}

/** Verify bot can manage roles and its highest role is above where the new role will sit. */
export function ensureBotCanManageRoles(guild: Guild): void | never {
  const me = guild.members.me;
  if (!me) throw new Error('bot member not cached');
  if (!me.permissions.has('ManageRoles')) {
    throw new Error('Bot lacks Manage Roles permission.');
  }
}
