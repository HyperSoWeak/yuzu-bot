import {
  type ButtonInteraction,
  type Client,
  Events,
  type MessageReaction,
  type PartialMessageReaction,
  type PartialUser,
  type User,
} from 'discord.js';
import { logger } from '@/core/logger.js';
import { emojiToKey } from './emoji.js';
import { findMappingForButton, findRoleForReaction } from './service.js';

const BUTTON_PREFIX = 'rr:';

export function makeButtonId(menuId: string, roleId: string): string {
  return `${BUTTON_PREFIX}${menuId}:${roleId}`;
}

export function parseButtonId(customId: string): { menuId: string; roleId: string } | null {
  if (!customId.startsWith(BUTTON_PREFIX)) return null;
  const rest = customId.slice(BUTTON_PREFIX.length);
  const idx = rest.indexOf(':');
  if (idx < 0) return null;
  return { menuId: rest.slice(0, idx), roleId: rest.slice(idx + 1) };
}

async function handleReactionChange(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
  add: boolean,
): Promise<void> {
  try {
    if (user.bot) return;
    if (!reaction.message.guildId) return;

    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch().catch(() => null);

    const key = emojiToKey(reaction.emoji);
    if (!key) return;
    const hit = await findRoleForReaction(reaction.message.id, key);
    if (!hit) return;
    if (hit.menu.guildId !== reaction.message.guildId) return;

    const guild = reaction.message.guild;
    if (!guild) return;
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return;

    if (add) {
      await member.roles.add(hit.mapping.roleId, 'reaction-role assign').catch((err) => {
        logger.warn(
          { err, userId: user.id, roleId: hit.mapping.roleId, guildId: guild.id },
          'rr role add failed (perm/hierarchy/missing)',
        );
      });
      logger.info(
        { userId: user.id, roleId: hit.mapping.roleId, guildId: guild.id },
        'rr role assigned',
      );
    } else {
      await member.roles.remove(hit.mapping.roleId, 'reaction-role unassign').catch((err) => {
        logger.warn(
          { err, userId: user.id, roleId: hit.mapping.roleId, guildId: guild.id },
          'rr role remove failed',
        );
      });
      logger.info(
        { userId: user.id, roleId: hit.mapping.roleId, guildId: guild.id },
        'rr role removed',
      );
    }
  } catch (err) {
    logger.error({ err }, 'reaction handler failed');
  }
}

async function handleButton(interaction: ButtonInteraction): Promise<void> {
  try {
    const parsed = parseButtonId(interaction.customId);
    if (!parsed) return;
    if (!interaction.guild || !interaction.member) {
      await interaction.reply({ content: '此按鈕僅限在伺服器內使用。', ephemeral: true });
      return;
    }
    const mapping = await findMappingForButton(parsed.menuId, interaction.customId);
    if (!mapping) {
      await interaction.reply({ content: '此按鈕的設定已失效。', ephemeral: true });
      return;
    }

    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member) {
      await interaction.reply({ content: '找不到你的成員資料。', ephemeral: true });
      return;
    }

    const hasRole = member.roles.cache.has(mapping.roleId);
    try {
      if (hasRole) {
        await member.roles.remove(mapping.roleId, 'button-role toggle off');
        await interaction.reply({ content: `已移除 <@&${mapping.roleId}>`, ephemeral: true });
      } else {
        await member.roles.add(mapping.roleId, 'button-role toggle on');
        await interaction.reply({ content: `已加上 <@&${mapping.roleId}>`, ephemeral: true });
      }
      logger.info(
        { userId: interaction.user.id, roleId: mapping.roleId, action: hasRole ? 'remove' : 'add' },
        'rr button toggled',
      );
    } catch (err) {
      logger.warn({ err, roleId: mapping.roleId }, 'rr button role change failed');
      await interaction
        .reply({ content: '無法調整身份組（可能是權限或階層問題）。', ephemeral: true })
        .catch(() => null);
    }
  } catch (err) {
    logger.error({ err }, 'button handler failed');
  }
}

export function registerReactionRoleListeners(client: Client): void {
  client.on(Events.MessageReactionAdd, (reaction, user) => {
    void handleReactionChange(reaction, user, true);
  });
  client.on(Events.MessageReactionRemove, (reaction, user) => {
    void handleReactionChange(reaction, user, false);
  });
  client.on(Events.InteractionCreate, (interaction) => {
    if (interaction.isButton()) void handleButton(interaction);
  });
}
