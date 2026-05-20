/** Parse "https://discord.com/channels/<g>/<c>/<m>" → { guildId, channelId, messageId }. */
export function parseMessageUrl(
  input: string,
): { guildId: string; channelId: string; messageId: string } | null {
  const m = input.trim().match(/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/);
  if (!m) return null;
  return { guildId: m[1]!, channelId: m[2]!, messageId: m[3]! };
}
