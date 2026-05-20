/**
 * Parse a user-typed color into a canonical 6-digit lowercase hex like "ff66cc".
 * Accepted forms:
 *   - "#ff66cc" / "ff66cc" / "#f6c" / "f6c"
 *   - "rgb(255, 102, 204)"
 *   - "255 102 204" (or comma-separated)
 *   - CSS-style names: "pink", "rebeccapurple", ...
 * Returns null when the input cannot be parsed or values are out of range.
 */
export function parseColor(raw: string): string | null {
  const input = raw.trim().toLowerCase();
  if (!input) return null;

  const hex6 = input.match(/^#?([0-9a-f]{6})$/);
  if (hex6) return hex6[1]!;

  const hex3 = input.match(/^#?([0-9a-f])([0-9a-f])([0-9a-f])$/);
  if (hex3) {
    return `${hex3[1]}${hex3[1]}${hex3[2]}${hex3[2]}${hex3[3]}${hex3[3]}`;
  }

  const rgbFn = input.match(/^rgb\s*\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*\)$/);
  if (rgbFn) return rgbTriple(Number(rgbFn[1]), Number(rgbFn[2]), Number(rgbFn[3]));

  const triple = input.match(/^(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})$/);
  if (triple) return rgbTriple(Number(triple[1]), Number(triple[2]), Number(triple[3]));

  const named = CSS_NAMED_COLORS[input];
  if (named) return named;

  return null;
}

function rgbTriple(r: number, g: number, b: number): string | null {
  if (![r, g, b].every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) return null;
  return [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
}

/** Convert canonical hex string to integer for Discord role color. */
export function hexToInt(hex: string): number {
  return parseInt(hex, 16);
}

/** "#ff66cc" form for display. */
export function formatHex(hex: string): string {
  return `#${hex}`;
}

// Trimmed CSS color names (covers common requests; extend as needed).
const CSS_NAMED_COLORS: Record<string, string> = {
  black: '000000',
  white: 'ffffff',
  red: 'ff0000',
  green: '008000',
  blue: '0000ff',
  yellow: 'ffff00',
  cyan: '00ffff',
  magenta: 'ff00ff',
  gray: '808080',
  grey: '808080',
  silver: 'c0c0c0',
  maroon: '800000',
  olive: '808000',
  lime: '00ff00',
  aqua: '00ffff',
  teal: '008080',
  navy: '000080',
  fuchsia: 'ff00ff',
  purple: '800080',
  orange: 'ffa500',
  pink: 'ffc0cb',
  hotpink: 'ff69b4',
  deeppink: 'ff1493',
  gold: 'ffd700',
  brown: 'a52a2a',
  tan: 'd2b48c',
  coral: 'ff7f50',
  salmon: 'fa8072',
  tomato: 'ff6347',
  crimson: 'dc143c',
  indigo: '4b0082',
  violet: 'ee82ee',
  lavender: 'e6e6fa',
  turquoise: '40e0d0',
  skyblue: '87ceeb',
  royalblue: '4169e1',
  steelblue: '4682b4',
  forestgreen: '228b22',
  seagreen: '2e8b57',
  khaki: 'f0e68c',
  beige: 'f5f5dc',
  ivory: 'fffff0',
  mint: '98ff98',
  peach: 'ffe5b4',
  cream: 'fffdd0',
  rebeccapurple: '663399',
};
