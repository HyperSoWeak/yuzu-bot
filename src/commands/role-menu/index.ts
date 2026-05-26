import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import type {
  ChatInputCommandInteraction,
  Guild,
  Message,
  Role,
  TextBasedChannel,
} from 'discord.js';
import type { Command } from '@/core/command/types.js';
import { CommandError } from '@/core/command/errors.js';
import { recordAudit } from '@/core/audit-log.js';
import {
  addRoleButton,
  deleteMenu,
  findMenuByMessage,
  getOrCreateMenu,
  listMenus,
  removeMappingByRole,
  type MenuWithMappings,
} from '@/features/role-menu/service.js';
import { makeButtonId } from '@/features/role-menu/listeners.js';

function ensureRoleAssignable(role: Role, interaction: ChatInputCommandInteraction): void {
  if (role.managed) throw new CommandError('受管理的角色 (bot / integration) 不能指派。');
  if (role.id === interaction.guild!.roles.everyone.id)
    throw new CommandError('不能指派 @everyone。');
  const me = interaction.guild!.members.me;
  if (me && me.roles.highest.comparePositionTo(role) <= 0)
    throw new CommandError('Bot 的角色階層不足以指派此角色。');
}

async function resolveMenuMessage(
  interaction: ChatInputCommandInteraction,
  messageId: string,
  menu: MenuWithMappings,
): Promise<{ ch: TextBasedChannel; msg: Message }> {
  const ch = await interaction.guild!.channels.fetch(menu.channelId).catch(() => null);
  if (!ch || !ch.isTextBased()) throw new CommandError('找不到 menu 所在的頻道。');
  const msg = await ch.messages.fetch(messageId).catch(() => null);
  if (!msg) throw new CommandError('找不到 menu 訊息。');
  if (msg.author.id !== interaction.client.user.id)
    throw new CommandError('此訊息不是 bot 發送的。');
  return { ch, msg };
}

async function rebuildButtons(
  ch: TextBasedChannel,
  messageId: string,
  menu: MenuWithMappings,
  guild: Guild,
): Promise<void> {
  const msg = await ch.messages.fetch(messageId);
  const buttons = await Promise.all(
    menu.mappings.map(async (m) => {
      const role = await guild.roles.fetch(m.roleId).catch(() => null);
      const label = m.label ?? role?.name ?? m.roleId;
      return new ButtonBuilder()
        .setCustomId(makeButtonId(menu.id, m.roleId))
        .setStyle(ButtonStyle.Secondary)
        .setLabel(label);
    }),
  );
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let i = 0; i < buttons.length; i += 5) {
    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(i, i + 5)));
  }
  await msg.edit({ components: rows });
}

const data = new SlashCommandBuilder()
  .setName('role-menu')
  .setDescription('管理 button role menu')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addSubcommand((s) =>
    s
      .setName('create')
      .setDescription('Bot 在指定頻道發送一則 role menu 訊息')
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
      .setName('add')
      .setDescription('在 menu 上加最多 5 個 button')
      .addStringOption((o) => o.setName('message').setDescription('訊息 ID').setRequired(true))
      .addRoleOption((o) => o.setName('role1').setDescription('角色 1').setRequired(true))
      .addStringOption((o) => o.setName('label1').setDescription('按鈕文字 1（選填）'))
      .addRoleOption((o) => o.setName('role2').setDescription('角色 2'))
      .addStringOption((o) => o.setName('label2').setDescription('按鈕文字 2（選填）'))
      .addRoleOption((o) => o.setName('role3').setDescription('角色 3'))
      .addStringOption((o) => o.setName('label3').setDescription('按鈕文字 3（選填）'))
      .addRoleOption((o) => o.setName('role4').setDescription('角色 4'))
      .addStringOption((o) => o.setName('label4').setDescription('按鈕文字 4（選填）'))
      .addRoleOption((o) => o.setName('role5').setDescription('角色 5'))
      .addStringOption((o) => o.setName('label5').setDescription('按鈕文字 5（選填）')),
  )
  .addSubcommand((s) =>
    s
      .setName('remove')
      .setDescription('移除 menu 上的某個 button')
      .addStringOption((o) => o.setName('message').setDescription('訊息 ID').setRequired(true))
      .addRoleOption((o) => o.setName('role').setDescription('要移除的角色').setRequired(true)),
  )
  .addSubcommand((s) =>
    s
      .setName('edit')
      .setDescription('修改 menu 訊息的文字內容')
      .addStringOption((o) => o.setName('message').setDescription('訊息 ID').setRequired(true))
      .addStringOption((o) =>
        o.setName('content').setDescription('新訊息內容').setRequired(true).setMaxLength(1500),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName('delete')
      .setDescription('刪除整個 menu（Discord 訊息需自行刪除）')
      .addStringOption((o) => o.setName('message').setDescription('訊息 ID').setRequired(true)),
  )
  .addSubcommand((s) => s.setName('list').setDescription('列出本 guild 所有 menu'));

const roleMenuCommand: Command = {
  category: 'role-menu',
  data,
  permissions: { adminOnly: true },
  async execute({ interaction }) {
    const guildId = interaction.guildId;
    if (!guildId || !interaction.guild) throw new CommandError('此指令僅限在伺服器內使用。');

    const sub = interaction.options.getSubcommand(true);

    if (sub === 'create') {
      const channel = interaction.options.getChannel('channel', true);
      const content = interaction.options.getString('content', true);
      const ch = await interaction.guild.channels.fetch(channel.id);
      if (!ch || !ch.isTextBased() || !ch.isSendable())
        throw new CommandError('無法在該頻道發送訊息。');
      const msg = await ch.send({ content });
      const menu = await getOrCreateMenu({ guildId, channelId: ch.id, messageId: msg.id });
      await recordAudit({
        guildId,
        actorId: interaction.user.id,
        action: 'role_menu.create',
        targetType: 'reaction_role_menu',
        targetId: menu.id,
        payload: { channelId: ch.id, messageId: msg.id },
      });
      await interaction.reply({
        content: `✅ Menu 已建立\n訊息 ID: \`${msg.id}\`\n${msg.url}\n\n用 \`/role-menu add\` 加 button。`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (sub === 'add') {
      const messageId = interaction.options.getString('message', true);
      const menu = await findMenuByMessage(guildId, messageId);
      if (!menu) throw new CommandError('找不到 menu，請先用 /role-menu create 建立。');
      const { ch } = await resolveMenuMessage(interaction, messageId, menu);

      const pairs: Array<{ role: Role; label?: string }> = [];
      for (let i = 1; i <= 5; i++) {
        const role = interaction.options.getRole(`role${i}`) as Role | null;
        if (!role) break;
        ensureRoleAssignable(role, interaction);
        const label = interaction.options.getString(`label${i}`) ?? undefined;
        pairs.push({ role, label });
      }

      if (menu.mappings.length + pairs.length > 25)
        throw new CommandError('button 數量將超過 Discord 上限（25）。');

      const lines: string[] = [];
      for (const { role, label } of pairs) {
        const mapping = await addRoleButton({ menuId: menu.id, roleId: role.id, label }).catch(
          () => null,
        );
        if (!mapping) {
          lines.push(`⚠️ <@&${role.id}> 已存在，跳過`);
          continue;
        }
        lines.push(`✅ <@&${role.id}>${label ? ` (${label})` : ''}`);
      }

      const refreshed = await findMenuByMessage(guildId, messageId);
      if (refreshed) await rebuildButtons(ch, messageId, refreshed, interaction.guild);

      await recordAudit({
        guildId,
        actorId: interaction.user.id,
        action: 'role_menu.button.add',
        targetType: 'reaction_role_menu',
        targetId: menu.id,
        payload: { roleIds: pairs.map((p) => p.role.id) },
      });
      await interaction.reply({ content: lines.join('\n'), flags: MessageFlags.Ephemeral });
      return;
    }

    if (sub === 'remove') {
      const messageId = interaction.options.getString('message', true);
      const role = interaction.options.getRole('role', true) as Role;
      const menu = await findMenuByMessage(guildId, messageId);
      if (!menu) throw new CommandError('找不到 menu。');

      const ok = await removeMappingByRole(menu.id, role.id);
      if (!ok) throw new CommandError('此角色沒有對應的 button。');

      const { ch } = await resolveMenuMessage(interaction, messageId, menu);
      const refreshed = await findMenuByMessage(guildId, messageId);
      if (refreshed) await rebuildButtons(ch, messageId, refreshed, interaction.guild);

      await recordAudit({
        guildId,
        actorId: interaction.user.id,
        action: 'role_menu.button.remove',
        targetType: 'reaction_role_menu',
        targetId: menu.id,
        payload: { roleId: role.id },
      });
      await interaction.reply({
        content: `🗑️ 已移除 <@&${role.id}> 的 button。`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (sub === 'edit') {
      const messageId = interaction.options.getString('message', true);
      const content = interaction.options.getString('content', true);
      const menu = await findMenuByMessage(guildId, messageId);
      if (!menu) throw new CommandError('找不到 menu。');
      const { msg } = await resolveMenuMessage(interaction, messageId, menu);
      await msg.edit({ content });
      await recordAudit({
        guildId,
        actorId: interaction.user.id,
        action: 'role_menu.edit',
        targetType: 'reaction_role_menu',
        targetId: menu.id,
        payload: { messageId },
      });
      await interaction.reply({ content: '✅ 訊息已更新。', flags: MessageFlags.Ephemeral });
      return;
    }

    if (sub === 'delete') {
      const messageId = interaction.options.getString('message', true);
      const ok = await deleteMenu(guildId, messageId);
      if (!ok) throw new CommandError('找不到 menu。');
      await recordAudit({
        guildId,
        actorId: interaction.user.id,
        action: 'role_menu.delete',
        targetType: 'reaction_role_menu',
        targetId: messageId,
      });
      await interaction.reply({
        content: '🗑️ menu 已刪除（Discord 訊息需自行刪除）。',
        flags: MessageFlags.Ephemeral,
      });
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
        lines.push(`📌 <#${m.channelId}>  ·  \`${m.messageId}\``);
        lines.push(`   https://discord.com/channels/${guildId}/${m.channelId}/${m.messageId}`);
        for (const map of m.mappings) {
          const labelPart = map.label ? ` [${map.label}]` : '';
          lines.push(`   • <@&${map.roleId}>${labelPart}`);
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

export const roleMenuCommands: readonly Command[] = [roleMenuCommand];
