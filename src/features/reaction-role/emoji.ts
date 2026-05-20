import type { GuildEmoji, ReactionEmoji } from 'discord.js';

/**
 * Canonical string form used to store an emoji in DB and compare against reactions.
 * - Unicode: the unicode character itself (e.g. "🍎")
 * - Custom: "name:id" (e.g. "myemoji:1234567890")
 */
export function emojiToKey(
  emoji: ReactionEmoji | GuildEmoji | { id: string | null; name: string | null },
): string | null {
  if (emoji.id) return `${emoji.name ?? ''}:${emoji.id}`;
  return emoji.name ?? null;
}

/** Parse a user-typed emoji string into a canonical key. */
export function parseUserEmoji(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Custom emoji like <:name:id> or <a:name:id>
  const m = trimmed.match(/^<a?:([\w~]+):(\d+)>$/);
  if (m) return `${m[1]}:${m[2]}`;
  // Otherwise treat as unicode emoji (any single grapheme-ish string).
  return trimmed;
}

/** Render a stored key for human display. */
export function formatEmojiKey(key: string): string {
  if (!key.includes(':')) return key;
  const [name, id] = key.split(':');
  return `<:${name}:${id}>`;
}
