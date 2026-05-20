import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { Command } from '@/core/command/types.js';
import { CommandError } from '@/core/command/errors.js';
import { recordAudit } from '@/core/audit-log.js';
import { getSettings } from '@/features/settings/service.js';
import {
  assignColorRole,
  clearColorRole,
  ensureBotCanManageRoles,
  getCurrentColor,
  getOrCreateColorRole,
} from '@/features/color-role/service.js';
import { formatHex, hexToInt, parseColor } from '@/features/color-role/parser.js';

const data = new SlashCommandBuilder()
  .setName('color')
  .setDescription('自選顏色身份組')
  .setDMPermission(false)
  .addSubcommand((s) =>
    s
      .setName('set')
      .setDescription('設定 / 切換自己的顏色')
      .addStringOption((o) =>
        o
          .setName('color')
          .setDescription('hex / rgb / 顏色名稱，例如 #ff66cc、rgb(255,102,204)、pink')
          .setRequired(true),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName('show')
      .setDescription('查看顏色')
      .addUserOption((o) => o.setName('user').setDescription('預設為自己')),
  )
  .addSubcommand((s) => s.setName('clear').setDescription('清除自己的顏色'));

const colorRoleCommand: Command = {
  category: 'color-role',
  data,
  async execute({ interaction }) {
    const guildId = interaction.guildId;
    if (!guildId || !interaction.guild) throw new CommandError('此指令僅限在伺服器內使用。');

    const settings = await getSettings(guildId);
    if (!settings.colorRoleEnabled) throw new CommandError('本伺服器尚未啟用 self color role。');

    const sub = interaction.options.getSubcommand(true);

    if (sub === 'show') {
      const target = interaction.options.getUser('user') ?? interaction.user;
      const row = await getCurrentColor(guildId, target.id);
      if (!row) {
        await interaction.reply({
          content: `${target.tag} 尚未設定顏色。`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      const embed = new EmbedBuilder()
        .setTitle(`${target.tag} 的顏色`)
        .setColor(hexToInt(row.hexColor))
        .setDescription(`${formatHex(row.hexColor)} · <@&${row.roleId}>`);
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);

    if (sub === 'clear') {
      const did = await clearColorRole(member);
      if (!did) throw new CommandError('你目前沒有顏色身份組。');
      await recordAudit({
        guildId,
        actorId: interaction.user.id,
        action: 'color_role.clear',
        targetType: 'user',
        targetId: interaction.user.id,
      });
      await interaction.reply({
        content: '✅ 已清除你的顏色身份組。',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (sub === 'set') {
      const raw = interaction.options.getString('color', true);
      const hex = parseColor(raw);
      if (!hex) throw new CommandError('無法解析顏色 (可用 hex、rgb、或顏色名稱)。');

      try {
        ensureBotCanManageRoles(interaction.guild);
      } catch (err) {
        throw new CommandError((err as Error).message);
      }

      try {
        const role = await getOrCreateColorRole(interaction.guild, hex);
        await assignColorRole(member, role, hex);
        await recordAudit({
          guildId,
          actorId: interaction.user.id,
          action: 'color_role.set',
          targetType: 'user',
          targetId: interaction.user.id,
          payload: { hex, roleId: role.id },
        });
        const embed = new EmbedBuilder()
          .setTitle('已套用顏色')
          .setColor(hexToInt(hex))
          .setDescription(`${formatHex(hex)} · <@&${role.id}>`);
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      } catch (err) {
        throw new CommandError(`套用失敗：${(err as Error).message}`);
      }
      return;
    }

    throw new CommandError('未支援的子指令。');
  },
};

export const colorRoleCommands: readonly Command[] = [colorRoleCommand];
