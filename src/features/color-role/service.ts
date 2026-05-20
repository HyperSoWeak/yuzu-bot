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
 * Raise a color role to sit just below the bot's highest role so its color
 * actually wins over other roles. No-op when already high enough.
 */
async function placeColorRoleAtTop(role: Role): Promise<void> {
  const me = role.guild.members.me;
  if (!me) return;
  const target = me.roles.highest.position - 1;
  if (target <= 0) return;
  if (role.position >= target) return;
  try {
    await role.setPosition(target, { reason: 'color role priority' });
  } catch (err) {
    logger.warn(
      { err, guildId: role.guild.id, roleId: role.id, target },
      'failed to raise color role position',
    );
  }
}

/**
 * Delete a color role if no DB assignment references it anymore.
 * Guarded by the configured name prefix so non-managed roles are never touched.
 */
async function cleanupOrphanedColorRole(guild: Guild, roleId: string): Promise<void> {
  const count = await prisma.colorRoleAssignment.count({ where: { roleId } });
  if (count > 0) return;

  const role = await guild.roles.fetch(roleId).catch(() => null);
  if (!role) return;
  if (!role.name.startsWith(config.color_role.role_name_prefix)) return;

  try {
    await role.delete('orphaned color role (no users)');
    logger.info({ guildId: guild.id, roleId }, 'color role cleaned up');
  } catch (err) {
    logger.warn({ err, guildId: guild.id, roleId }, 'failed to delete orphaned color role');
  }
}

/**
 * Find an existing color role for this hex, or create one. Roles are matched by
 * exact name (config-prefix + hex) so they remain stable across restarts.
 */
export async function getOrCreateColorRole(guild: Guild, hex: string): Promise<Role> {
  const name = roleNameFor(hex);
  const existing = guild.roles.cache.find((r) => r.name === name);
  if (existing) {
    await placeColorRoleAtTop(existing);
    logger.info({ guildId: guild.id, roleId: existing.id, hex }, 'color role reused');
    return existing;
  }
  const created = await guild.roles.create({
    name,
    color: hexToInt(hex),
    mentionable: false,
    reason: 'self color role',
  });
  await placeColorRoleAtTop(created);
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

  if (prior && prior.roleId !== role.id) {
    await cleanupOrphanedColorRole(member.guild, prior.roleId);
  }
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

  await cleanupOrphanedColorRole(member.guild, row.roleId);
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
