import type { ReactionRoleMapping, ReactionRoleMenu } from '@prisma/client';
import { prisma } from '@/db/client.js';

export type MenuWithMappings = ReactionRoleMenu & { mappings: ReactionRoleMapping[] };

export async function findMenuByMessage(
  guildId: string,
  messageId: string,
): Promise<MenuWithMappings | null> {
  return prisma.reactionRoleMenu
    .findUnique({ where: { messageId }, include: { mappings: true } })
    .then((m) => (m && m.guildId === guildId ? m : null));
}

export async function getOrCreateMenu(input: {
  guildId: string;
  channelId: string;
  messageId: string;
}): Promise<MenuWithMappings> {
  const existing = await prisma.reactionRoleMenu.findUnique({
    where: { messageId: input.messageId },
    include: { mappings: true },
  });
  if (existing) return existing;
  return prisma.reactionRoleMenu.create({ data: input, include: { mappings: true } });
}

export async function addRoleButton(input: {
  menuId: string;
  roleId: string;
  label?: string;
}): Promise<ReactionRoleMapping> {
  return prisma.reactionRoleMapping.create({
    data: { menuId: input.menuId, roleId: input.roleId, label: input.label ?? null },
  });
}

export async function removeMappingByRole(menuId: string, roleId: string): Promise<boolean> {
  const result = await prisma.reactionRoleMapping.deleteMany({ where: { menuId, roleId } });
  return result.count > 0;
}

export async function deleteMenu(guildId: string, messageId: string): Promise<boolean> {
  const result = await prisma.reactionRoleMenu.deleteMany({ where: { guildId, messageId } });
  return result.count > 0;
}

export async function listMenus(guildId: string): Promise<MenuWithMappings[]> {
  return prisma.reactionRoleMenu.findMany({
    where: { guildId },
    include: { mappings: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function findMappingByRole(
  menuId: string,
  roleId: string,
): Promise<ReactionRoleMapping | null> {
  return prisma.reactionRoleMapping.findFirst({ where: { menuId, roleId } });
}
