import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
// Note: button style is not currently configurable per mapping (no DB column);
// all buttons render as Secondary. Add a column + option later if needed.
import type { ChatInputCommandInteraction, Message, Role, TextBasedChannel } from 'discord.js';
import type { Command } from '@/core/command/types.js';
import { CommandError } from '@/core/command/errors.js';
import { recordAudit } from '@/core/audit-log.js';
import {
  addButtonMapping,
  addReactionMapping,
  deleteMenu,
  findMenuByMessage,
  getOrCreateMenu,
  listMenus,
  removeMappingById,
  type MenuWithMappings,
} from '@/features/reaction-role/service.js';
import { formatEmojiKey, parseUserEmoji } from '@/features/reaction-role/emoji.js';
import { parseMessageUrl } from '@/features/reaction-role/url.js';
import { makeButtonId } from '@/features/reaction-role/listeners.js';

async function fetchMessageByUrl(
  interaction: ChatInputCommandInteraction,
  url: string,
): Promise<Message> {
  const parsed = parseMessageUrl(url);
  if (!parsed) throw new CommandError('訊息連結格式錯誤。');
  if (parsed.guildId !== interaction.guildId) throw new CommandError('訊息必須在本伺服器。');
  const channel = await interaction.guild!.channels.fetch(parsed.channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) throw new CommandError('找不到訊息所在的頻道。');
  const message = await channel.messages.fetch(parsed.messageId).catch(() => null);
  if (!message) throw new CommandError('找不到訊息。');
  return message;
}

function ensureRoleAssignable(role: Role, interaction: ChatInputCommandInteraction): void {
  if (role.managed) throw new CommandError('受管理的角色 (bot / integration) 不能指派。');
  if (role.id === interaction.guild!.roles.everyone.id)
    throw new CommandError('不能指派 @everyone。');
  const me = interaction.guild!.members.me;
  if (me && me.roles.highest.comparePositionTo(role) <= 0) {
    throw new CommandError('Bot 的角色階層不足以指派此角色。');
  }
}

async function rebuildButtonRows(
  channel: TextBasedChannel,
  messageId: string,
  menu: MenuWithMappings,
  rolesById: Map<string, Role>,
): Promise<void> {
  const message = await channel.messages.fetch(messageId);
  if (message.author.id !== message.client.user!.id) {
    throw new CommandError('只能在 bot 自己發送的訊息上新增 button。');
  }
  const buttons = menu.mappings
    .filter((m) => m.buttonId)
    .map((m) =>
      new ButtonBuilder()
        .setCustomId(m.buttonId!)
        .setStyle(ButtonStyle.Secondary)
        .setLabel(rolesById.get(m.roleId)?.name ?? m.roleId),
    );
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let i = 0; i < buttons.length; i += 5) {
    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(i, i + 5)));
  }
  await message.edit({ components: rows });
}

const data = new SlashCommandBuilder()
  .setName('reaction-role')
  .setDescription('管理 reaction / button role')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addSubcommand((s) =>
    s
      .setName('create-button-menu')
      .setDescription('Bot 在指定頻道發送一則 button role menu 訊息')
      .addChannelOption((o) =>
        o
          .setName('channel')
          .setDescription('要發送訊息的頻道')
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
      )
      .addStringOption((o) =>
        o.setName('content').setDescription('訊息內容').setRequired(true).setMaxLength(1500),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName('add-reaction')
      .setDescription('將 emoji 對應到角色 (任意訊息)')
      .addStringOption((o) => o.setName('message').setDescription('訊息連結').setRequired(true))
      .addStringOption((o) => o.setName('emoji').setDescription('emoji').setRequired(true))
      .addRoleOption((o) => o.setName('role').setDescription('要指派的角色').setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName('add-button')
      .setDescription('在 bot 訊息上新增 button (用 create-button-menu 建立)')
      .addStringOption((o) => o.setName('message').setDescription('訊息連結').setRequired(true))
      .addRoleOption((o) => o.setName('role').setDescription('要指派的角色').setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName('remove-mapping')
      .setDescription('依 mapping id 移除單一對應 (見 list)')
      .addStringOption((o) =>
        o.setName('mapping-id').setDescription('mapping id').setRequired(true),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName('delete')
      .setDescription('刪除整個 menu')
      .addStringOption((o) => o.setName('message').setDescription('訊息連結').setRequired(true)),
  )
  .addSubcommand((s) => s.setName('list').setDescription('列出本 guild 所有 menu'));

const reactionRoleCommand: Command = {
  category: 'reaction-role',
  data,
  permissions: { adminOnly: true },
  async execute({ interaction }) {
    const guildId = interaction.guildId;
    if (!guildId || !interaction.guild) throw new CommandError('此指令僅限在伺服器內使用。');

    const sub = interaction.options.getSubcommand(true);

    if (sub === 'create-button-menu') {
      const channel = interaction.options.getChannel('channel', true);
      const content = interaction.options.getString('content', true);
      const ch = await interaction.guild.channels.fetch(channel.id);
      if (!ch || !ch.isTextBased() || !ch.isSendable())
        throw new CommandError('無法在該頻道發送訊息。');
      const msg = await ch.send({ content });
      const menu = await getOrCreateMenu({
        guildId,
        channelId: ch.id,
        messageId: msg.id,
      });
      await recordAudit({
        guildId,
        actorId: interaction.user.id,
        action: 'reaction_role.menu.create',
        targetType: 'reaction_role_menu',
        targetId: menu.id,
        payload: { channelId: ch.id, messageId: msg.id, mode: 'button' },
      });
      await interaction.reply({
        content: `✅ Menu 已建立: ${msg.url}\n用 \`/reaction-role add-button\` 加 button。`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (sub === 'add-reaction') {
      const url = interaction.options.getString('message', true);
      const emojiInput = interaction.options.getString('emoji', true);
      const role = interaction.options.getRole('role', true) as Role;
      ensureRoleAssignable(role, interaction);

      const message = await fetchMessageByUrl(interaction, url);
      const key = parseUserEmoji(emojiInput);
      if (!key) throw new CommandError('emoji 無法解析。');

      const menu = await getOrCreateMenu({
        guildId,
        channelId: message.channel.id,
        messageId: message.id,
      });

      // Try react first; if it fails, surface the error early.
      try {
        await message.react(emojiInput);
      } catch {
        throw new CommandError('Bot 無法對該訊息加上此 emoji (權限或 emoji 不存在)。');
      }

      const mapping = await addReactionMapping({
        menuId: menu.id,
        emoji: key,
        roleId: role.id,
      }).catch(() => null);
      if (!mapping) throw new CommandError('此 emoji 已對應角色。');

      await recordAudit({
        guildId,
        actorId: interaction.user.id,
        action: 'reaction_role.mapping.add',
        targetType: 'reaction_role_mapping',
        targetId: mapping.id,
        payload: { menuId: menu.id, kind: 'reaction', emoji: key, roleId: role.id },
      });
      await interaction.reply({
        content: `✅ 已新增 ${formatEmojiKey(key)} → <@&${role.id}>`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (sub === 'add-button') {
      const url = interaction.options.getString('message', true);
      const role = interaction.options.getRole('role', true) as Role;
      ensureRoleAssignable(role, interaction);

      const message = await fetchMessageByUrl(interaction, url);
      if (message.author.id !== interaction.client.user.id)
        throw new CommandError('只能在 bot 自己發送的訊息上新增 button (用 create-button-menu)。');

      const menu = await getOrCreateMenu({
        guildId,
        channelId: message.channel.id,
        messageId: message.id,
      });

      const buttonCount = menu.mappings.filter((m) => m.buttonId).length;
      if (buttonCount >= 25) throw new CommandError('button 數量已達 Discord 上限 (25)。');

      const buttonId = makeButtonId(menu.id, role.id);
      const mapping = await addButtonMapping({
        menuId: menu.id,
        buttonId,
        roleId: role.id,
      }).catch(() => null);
      if (!mapping) throw new CommandError('此角色已對應 button。');

      // Refresh menu for rebuild
      const refreshed = await findMenuByMessage(guildId, message.id);
      if (!refreshed) throw new CommandError('menu 載入失敗。');

      const rolesById = new Map<string, Role>();
      for (const m of refreshed.mappings) {
        const r = await interaction.guild.roles.fetch(m.roleId).catch(() => null);
        if (r) rolesById.set(m.roleId, r);
      }
      await rebuildButtonRows(message.channel, message.id, refreshed, rolesById);

      await recordAudit({
        guildId,
        actorId: interaction.user.id,
        action: 'reaction_role.mapping.add',
        targetType: 'reaction_role_mapping',
        targetId: mapping.id,
        payload: { menuId: menu.id, kind: 'button', roleId: role.id },
      });
      await interaction.reply({
        content: `✅ 已新增 button → <@&${role.id}>`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (sub === 'remove-mapping') {
      const id = interaction.options.getString('mapping-id', true);
      // We need to find the menu first to ensure it belongs to this guild.
      const menus = await listMenus(guildId);
      const menu = menus.find((m) => m.mappings.some((x) => x.id === id));
      if (!menu) throw new CommandError('找不到 mapping。');
      const mapping = menu.mappings.find((x) => x.id === id)!;
      const ok = await removeMappingById(menu.id, id);
      if (!ok) throw new CommandError('移除失敗。');

      // If button mapping: rebuild buttons on the message
      if (mapping.buttonId) {
        const ch = await interaction.guild.channels.fetch(menu.channelId).catch(() => null);
        if (ch && ch.isTextBased()) {
          const refreshed = await findMenuByMessage(guildId, menu.messageId);
          if (refreshed) {
            const rolesById = new Map<string, Role>();
            for (const m of refreshed.mappings) {
              const r = await interaction.guild.roles.fetch(m.roleId).catch(() => null);
              if (r) rolesById.set(m.roleId, r);
            }
            await rebuildButtonRows(ch, menu.messageId, refreshed, rolesById).catch(() => null);
          }
        }
      }

      await recordAudit({
        guildId,
        actorId: interaction.user.id,
        action: 'reaction_role.mapping.remove',
        targetType: 'reaction_role_mapping',
        targetId: id,
        payload: { menuId: menu.id },
      });
      await interaction.reply({ content: `🗑️ mapping 已移除。`, flags: MessageFlags.Ephemeral });
      return;
    }

    if (sub === 'delete') {
      const url = interaction.options.getString('message', true);
      const parsed = parseMessageUrl(url);
      if (!parsed) throw new CommandError('訊息連結格式錯誤。');
      const ok = await deleteMenu(guildId, parsed.messageId);
      if (!ok) throw new CommandError('找不到 menu。');
      await recordAudit({
        guildId,
        actorId: interaction.user.id,
        action: 'reaction_role.menu.delete',
        targetType: 'reaction_role_menu',
        targetId: parsed.messageId,
      });
      await interaction.reply({ content: `🗑️ menu 已刪除。`, flags: MessageFlags.Ephemeral });
      return;
    }

    if (sub === 'list') {
      const menus = await listMenus(guildId);
      if (menus.length === 0) {
        await interaction.reply({ content: '_(無)_', flags: MessageFlags.Ephemeral });
        return;
      }
      const lines: string[] = [];
      for (const m of menus) {
        lines.push(`📌 <#${m.channelId}> · message \`${m.messageId}\``);
        for (const map of m.mappings) {
          const label = map.emoji ? formatEmojiKey(map.emoji) : `button \`${map.buttonId}\``;
          lines.push(`   • \`${map.id}\` ${label} → <@&${map.roleId}>`);
        }
      }
      const content = lines.join('\n');
      await interaction.reply({
        content: content.length > 1900 ? content.slice(0, 1899) + '…' : content,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    throw new CommandError('未支援的子指令。');
  },
};

export const reactionRoleCommands: readonly Command[] = [reactionRoleCommand];
