import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import type { SKRSContext2D } from '@napi-rs/canvas';
import type { MineGame } from './types.js';

(GlobalFonts as unknown as { loadSystemFonts(): void }).loadSystemFonts();

const CELL = 40;
const GAP = 2;
const PAD = 12;
const LABEL_W = 28;
const LABEL_H = 20;

const BG = '#2b2d31';
const CELL_HIDDEN = '#404249';
const CELL_OPEN = '#1e1f22';
const CELL_HIT = '#7d1a20';
const CELL_MINE_BG = '#2a1f1f';
const LABEL_COLOR = '#9b9ba0';
const FLAG_COLOR = '#f04747';

const NUM_COLORS: Record<number, string> = {
  1: '#5b9bd5',
  2: '#57a857',
  3: '#e05252',
  4: '#8b5cf6',
  5: '#f59e0b',
  6: '#06b6d4',
  7: '#ec4899',
  8: '#9ca3af',
};

function roundedRect(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawFlag(ctx: SKRSContext2D, cx: number, cy: number): void {
  const s = CELL * 0.35;
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.3, cy + s * 0.8);
  ctx.lineTo(cx - s * 0.3, cy - s * 0.8);
  ctx.stroke();
  ctx.fillStyle = FLAG_COLOR;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.3, cy - s * 0.8);
  ctx.lineTo(cx + s * 0.8, cy - s * 0.2);
  ctx.lineTo(cx - s * 0.3, cy + s * 0.2);
  ctx.closePath();
  ctx.fill();
}

function drawMine(ctx: SKRSContext2D, cx: number, cy: number, hit: boolean): void {
  const r = CELL * 0.28;
  ctx.strokeStyle = hit ? '#ff6666' : '#888888';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * r * 0.7, cy + Math.sin(angle) * r * 0.7);
    ctx.lineTo(cx + Math.cos(angle) * r * 1.4, cy + Math.sin(angle) * r * 1.4);
    ctx.stroke();
  }
  ctx.fillStyle = hit ? '#cc2222' : '#555555';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.arc(cx - r * 0.25, cy - r * 0.25, r * 0.25, 0, Math.PI * 2);
  ctx.fill();
}

export async function renderBoardImage(game: MineGame): Promise<Buffer> {
  const { cols, rows, cells } = game;
  const W = PAD + LABEL_W + GAP + cols * (CELL + GAP) - GAP + PAD;
  const H = PAD + LABEL_H + GAP + rows * (CELL + GAP) - GAP + PAD;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  const gridX = PAD + LABEL_W + GAP;
  const gridY = PAD + LABEL_H + GAP;

  ctx.fillStyle = LABEL_COLOR;
  ctx.font = 'bold 15px FreeMono';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let c = 0; c < cols; c++) {
    ctx.fillText(
      String.fromCharCode(65 + c),
      gridX + c * (CELL + GAP) + CELL / 2,
      PAD + LABEL_H / 2,
    );
  }

  ctx.textAlign = 'right';
  for (let r = 0; r < rows; r++) {
    ctx.fillText(String(r + 1), PAD + LABEL_W - 5, gridY + r * (CELL + GAP) + CELL / 2);
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = cells[r * cols + c]!;
      const x = gridX + c * (CELL + GAP);
      const y = gridY + r * (CELL + GAP);
      const cx = x + CELL / 2;
      const cy = y + CELL / 2;

      if (cell === 'hidden') {
        ctx.fillStyle = CELL_HIDDEN;
        roundedRect(ctx, x, y, CELL, CELL, 4);
        ctx.fill();
      } else if (cell === 'flagged') {
        ctx.fillStyle = CELL_HIDDEN;
        roundedRect(ctx, x, y, CELL, CELL, 4);
        ctx.fill();
        drawFlag(ctx, cx, cy);
      } else if (cell === 'mine-hit') {
        ctx.fillStyle = CELL_HIT;
        roundedRect(ctx, x, y, CELL, CELL, 4);
        ctx.fill();
        drawMine(ctx, cx, cy, true);
      } else if (cell === 'mine') {
        ctx.fillStyle = CELL_MINE_BG;
        roundedRect(ctx, x, y, CELL, CELL, 4);
        ctx.fill();
        drawMine(ctx, cx, cy, false);
      } else {
        ctx.fillStyle = CELL_OPEN;
        roundedRect(ctx, x, y, CELL, CELL, 4);
        ctx.fill();
        if (cell > 0) {
          ctx.fillStyle = NUM_COLORS[cell] ?? '#ffffff';
          ctx.font = 'bold 22px FreeMono';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(cell), cx, cy);
          ctx.font = 'bold 15px FreeMono';
        }
      }
    }
  }

  return canvas.encode('png');
}
