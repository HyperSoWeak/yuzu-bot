# Mine Board Image Render — Design Spec

Date: 2026-05-23

## Motivation

The current text-based board uses emoji that wrap on mobile Discord and have
rendering issues (regional indicator letters combine into country flags). Switching
to a PNG image attachment removes the width constraint entirely, enabling larger
board sizes and consistent cross-platform display.

---

## Decisions

| Question | Decision |
|---|---|
| Library | `@napi-rs/canvas` — has prebuilt Alpine/musl binary, no Dockerfile changes |
| Style | Dark Discord-themed (see Colours below) |
| Error handling | Fallback to existing `renderBoard()` text output on any render error |
| New difficulty | Add `expert` 16×16 with 51 mines, 20 moves/player |

---

## Visual Design

### Layout constants

```
CELL_SIZE = 40px
GAP       = 2px
PADDING   = 12px
LABEL_W   = 28px   (row label column width)
LABEL_H   = 20px   (column header row height)
```

Total canvas size for an N×M board:
- width  = PADDING + LABEL_W + GAP + N×(CELL+GAP) − GAP + PADDING
- height = PADDING + LABEL_H + GAP + M×(CELL+GAP) − GAP + PADDING

Examples: 10×10 → ~472×464px, 16×16 → ~724×716px.

### Colours

| Element | Hex |
|---|---|
| Canvas background | `#2b2d31` |
| Hidden cell | `#404249` |
| Opened cell (0 or N) | `#1e1f22` |
| Mine-hit cell | `#7d1a20` |
| Mine-revealed cell | `#2a1f1f` |
| Label text | `#9b9ba0` |
| Number 1 | `#5b9bd5` |
| Number 2 | `#57a857` |
| Number 3 | `#e05252` |
| Number 4 | `#8b5cf6` |
| Number 5 | `#f59e0b` |
| Number 6 | `#06b6d4` |
| Number 7 | `#ec4899` |
| Number 8 | `#9ca3af` |
| Flag | `#f04747` |

### Typography

- Column/row labels: `bold 15px monospace`, colour `#9b9ba0`
- Row labels right-aligned, inset 5px from grid edge
- Cell numbers: `bold 22px monospace`, centred in cell

### Cell drawing

All cells have 4px border-radius rounded rect.

| Cell state | Background | Content |
|---|---|---|
| `hidden` | `#404249` | — |
| `flagged` | `#404249` | Geometric flag: red filled triangle + vertical pole |
| number > 0 | `#1e1f22` | Number in accent colour |
| 0 (blank) | `#1e1f22` | — |
| `mine` | `#2a1f1f` | Dark circle with 8 spikes |
| `mine-hit` | `#7d1a20` | Red circle with 8 spikes + shine dot |

Flags and mines are drawn as geometric paths — no emoji font dependency.

---

## Architecture

### New file: `src/features/mine/render.ts`

```ts
export async function renderBoardImage(game: MineGame): Promise<Buffer>
```

- Creates a canvas sized to the board
- Draws background, column labels, row labels, then each cell
- Returns a PNG buffer via `canvas.toBuffer('image/png')`
- Pure function — no side effects, no Discord imports

### Modified: `src/commands/mine/index.ts`

Extract a shared helper `replyWithBoard(interaction, game, logger)`:

```ts
async function replyWithBoard(interaction, game, logger) {
  try {
    const buf = await renderBoardImage(game);
    await interaction.reply({
      content: renderStatusText(game),
      files: [{ attachment: buf, name: 'board.png' }],
    });
  } catch (err) {
    logger.warn({ err }, 'image render failed, falling back to text');
    await interaction.reply({ content: renderBoard(game) });
  }
}
```

All four subcommands (`start`, `board`, `open`, `flag`) call this helper instead of
`interaction.reply({ content: renderBoard(game) })` directly.

The image contains only the grid. Status text (title, 已開 count, last action,
timeout reminder) is sent as the `content` field alongside the attachment, produced
by a new `renderStatusText(game): string` function extracted from `renderBoard()`.
On text fallback, `renderBoard()` is used as-is (grid + status in one message).

### Modified: `src/features/mine/display.ts`

- `renderBoard()` kept intact as the text fallback (grid + status in one string)
- Add `renderStatusText(game): string` — extracts just the non-grid lines (title,
  已開 count, last action, timeout/end message) for use alongside the image
- Add `expert` entry to `DIFF_LABELS`:

```ts
expert: 'Expert 16×16'
```

### Modified: `src/features/mine/types.ts`

Add `expert` to `DIFFICULTIES`:

```ts
expert: { cols: 16, rows: 16, mines: 51, maxMovesPerPlayer: 20 }
```

### Modified: `src/commands/mine/index.ts` *(continued)*

Add `expert` choice to the `difficulty` option:

```ts
{ name: 'Expert  16×16  51 地雷', value: 'expert' }
```

---

## Dependencies

```
pnpm add @napi-rs/canvas
```

No Dockerfile changes required — `@napi-rs/canvas` publishes an
`@napi-rs/canvas-linux-x64-musl` optional peer that pnpm selects automatically
on Alpine.

---

## Tests

New file `tests/mine-render.test.ts`:

- `renderBoardImage` returns a non-empty Buffer for a fresh game (all hidden)
- Returns a Buffer for a mid-game state (some cells opened, some flagged)
- Returns a Buffer for `status: 'lost'` (mines revealed)
- Returns a Buffer for `status: 'won'`
- Returns a Buffer for `expert` difficulty (16×16)

No pixel-level assertions — just smoke tests that the function resolves without
throwing and returns a valid PNG header (`\x89PNG`).

---

## Out of scope

- Title / status bar drawn onto the image (game info stays as text above the attachment, or in the message body alongside the image)
- Custom bundled font (Skia default font is sufficient; can be improved later)
- Animated GIF or video output
