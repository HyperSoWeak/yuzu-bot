import type { ReactionRoleMapping, ReactionRoleMenu } from '@prisma/client';
import { prisma } from '@/db/client.js';

export type MenuWithMappings = ReactionRoleMenu & { mappings: ReactionRoleMapping[] };

export async function findMenuByMessage(
  guildId: string,
  messageId: string,
): Promise<MenuWithMappings | null> {
  return prisma.reactionRoleMenu
    .findUnique({
      where: { messageId },
      include: { mappings: true },
    })
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
  return prisma.reactionRoleMenu.create({
    data: input,
    include: { mappings: true },
  });
}

export async function addReactionMapping(input: {
  menuId: string;
  emoji: string;
  roleId: string;
}): Promise<ReactionRoleMapping> {
  return prisma.reactionRoleMapping.create({
    data: { menuId: input.menuId, emoji: input.emoji, roleId: input.roleId, buttonId: null },
  });
}

export async function addButtonMapping(input: {
  menuId: string;
  buttonId: string;
  roleId: string;
}): Promise<ReactionRoleMapping> {
  return prisma.reactionRoleMapping.create({
    data: { menuId: input.menuId, buttonId: input.buttonId, roleId: input.roleId, emoji: null },
  });
}

export async function removeMappingById(menuId: string, mappingId: string): Promise<boolean> {
  const result = await prisma.reactionRoleMapping.deleteMany({
    where: { id: mappingId, menuId },
  });
  return result.count > 0;
}

export async function deleteMenu(guildId: string, messageId: string): Promise<boolean> {
  const result = await prisma.reactionRoleMenu.deleteMany({
    where: { guildId, messageId },
  });
  return result.count > 0;
}

export async function listMenus(guildId: string): Promise<MenuWithMappings[]> {
  return prisma.reactionRoleMenu.findMany({
    where: { guildId },
    include: { mappings: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function findRoleForReaction(
  messageId: string,
  emojiKey: string,
): Promise<{ menu: ReactionRoleMenu; mapping: ReactionRoleMapping } | null> {
  const menu = await prisma.reactionRoleMenu.findUnique({ where: { messageId } });
  if (!menu) return null;
  const mapping = await prisma.reactionRoleMapping.findFirst({
    where: { menuId: menu.id, emoji: emojiKey },
  });
  return mapping ? { menu, mapping } : null;
}

export async function findMappingForButton(
  menuId: string,
  buttonId: string,
): Promise<ReactionRoleMapping | null> {
  return prisma.reactionRoleMapping.findFirst({ where: { menuId, buttonId } });
}
