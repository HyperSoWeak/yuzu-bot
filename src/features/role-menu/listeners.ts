import { type ButtonInteraction, type Client, Events, MessageFlags } from 'discord.js';
import { logger } from '@/core/logger.js';
import { findMappingByRole } from './service.js';

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

async function handleButton(interaction: ButtonInteraction): Promise<void> {
  try {
    const parsed = parseButtonId(interaction.customId);
    if (!parsed) return;
    if (!interaction.guild || !interaction.member) {
      await interaction.reply({
        content: '此按鈕僅限在伺服器內使用。',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const mapping = await findMappingByRole(parsed.menuId, parsed.roleId);
    if (!mapping) {
      await interaction.reply({ content: '此按鈕的設定已失效。', flags: MessageFlags.Ephemeral });
      return;
    }
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member) {
      await interaction.reply({ content: '找不到你的成員資料。', flags: MessageFlags.Ephemeral });
      return;
    }
    const hasRole = member.roles.cache.has(mapping.roleId);
    try {
      if (hasRole) {
        await member.roles.remove(mapping.roleId, 'button-role toggle off');
        await interaction.reply({
          content: `已移除 <@&${mapping.roleId}>`,
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await member.roles.add(mapping.roleId, 'button-role toggle on');
        await interaction.reply({
          content: `已加上 <@&${mapping.roleId}>`,
          flags: MessageFlags.Ephemeral,
        });
      }
      logger.info(
        { userId: interaction.user.id, roleId: mapping.roleId, action: hasRole ? 'remove' : 'add' },
        'role-menu button toggled',
      );
    } catch (err) {
      logger.warn({ err, roleId: mapping.roleId }, 'role-menu button role change failed');
      await interaction
        .reply({
          content: '無法調整身份組（可能是權限或階層問題）。',
          flags: MessageFlags.Ephemeral,
        })
        .catch(() => null);
    }
  } catch (err) {
    logger.error({ err }, 'button handler failed');
  }
}

export function registerRoleMenuListeners(client: Client): void {
  client.on(Events.InteractionCreate, (interaction) => {
    if (interaction.isButton()) void handleButton(interaction);
  });
}
