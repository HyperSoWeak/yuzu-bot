import { DIFFICULTIES, type CellValue, type MineGame } from './types.js';

const COL_EMOJIS = ['🇦', '🇧', '🇨', '🇩', '🇪', '🇫', '🇬', '🇭', '🇮', '🇯', '🇰', '🇱', '🇲', '🇳', '🇴', '🇵'];
const ROW_LABELS = [
  '1️⃣',
  '2️⃣',
  '3️⃣',
  '4️⃣',
  '5️⃣',
  '6️⃣',
  '7️⃣',
  '8️⃣',
  '9️⃣',
  '🔟',
  '⑪',
  '⑫',
  '⑬',
  '⑭',
  '⑮',
  '⑯',
];
const NUM_EMOJIS = ['⬜', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];

const DIFF_LABELS: Record<string, string> = {
  easy: 'Easy 8×8',
  medium: 'Medium 10×10',
  hard: 'Hard 12×12',
  expert: 'Expert 16×16',
};

function cellEmoji(value: CellValue): string {
  if (value === 'hidden') return '🟦';
  if (value === 'flagged') return '🚩';
  if (value === 'mine') return '💣';
  if (value === 'mine-hit') return '💥';
  return NUM_EMOJIS[value as number] ?? '⬜';
}

export function renderBoard(game: MineGame): string {
  const {
    cols,
    rows,
    cells,
    status,
    safeOpened,
    totalSafe,
    playerRecords,
    lastActionDesc,
    difficulty,
  } = game;
  const { mines: mineCount } = DIFFICULTIES[difficulty];

  const lines: string[] = [];

  lines.push(`💣 **合作踩地雷** ｜ ${DIFF_LABELS[difficulty]} ｜ 地雷：${mineCount}`);
  lines.push('');
  lines.push('\u3000' + COL_EMOJIS.slice(0, cols).join('\u200c'));

  for (let r = 0; r < rows; r++) {
    const label = ROW_LABELS[r] ?? `${r + 1}`;
    const row = cells
      .slice(r * cols, (r + 1) * cols)
      .map(cellEmoji)
      .join('');
    lines.push(label + row);
  }

  lines.push('');

  const flagCount = cells.filter((c) => c === 'flagged').length;
  lines.push(`✅ 已開：${safeOpened}／${totalSafe}\u3000🚩 旗子：${flagCount}`);

  if (lastActionDesc) {
    lines.push(`👣 上一步：${lastActionDesc}`);
  }

  if (status === 'playing') {
    lines.push('⏳ 24 小時無操作自動結束');
    return lines.join('\n');
  }

  lines.push('');
  lines.push(status === 'won' ? '🎉 **全員勝利！清掉所有格子！**' : '💥 **遊戲結束！**');

  if (Object.keys(playerRecords).length > 0) {
    lines.push('');
    lines.push('📊 **本局統計：**');
    for (const [userId, record] of Object.entries(playerRecords)) {
      const tag = record.hitMine ? '\u3000（💀 終結者）' : '';
      lines.push(`<@${userId}>\u3000${record.moves} 步\u3000${record.flagsPlaced} 旗${tag}`);
    }
  }

  return lines.join('\n');
}

export function renderStatusText(game: MineGame): string {
  const { cells, status, safeOpened, totalSafe, playerRecords, lastActionDesc, difficulty } = game;
  const { mines: mineCount } = DIFFICULTIES[difficulty];

  const lines: string[] = [];

  lines.push(`💣 **合作踩地雷** ｜ ${DIFF_LABELS[difficulty]} ｜ 地雷：${mineCount}`);

  const flagCount = cells.filter((c) => c === 'flagged').length;
  lines.push(`✅ 已開：${safeOpened}／${totalSafe} 🚩 旗子：${flagCount}`);

  if (lastActionDesc) {
    lines.push(`👣 上一步：${lastActionDesc}`);
  }

  if (status === 'playing') {
    lines.push('⏳ 24 小時無操作自動結束');
    return lines.join('\n');
  }

  lines.push('');
  lines.push(status === 'won' ? '🎉 **全員勝利！清掉所有格子！**' : '💥 **遊戲結束！**');

  if (Object.keys(playerRecords).length > 0) {
    lines.push('');
    lines.push('📊 **本局統計：**');
    for (const [userId, record] of Object.entries(playerRecords)) {
      const tag = record.hitMine ? ' (💀 終結者)' : '';
      lines.push(`<@${userId}> ${record.moves} 步 ${record.flagsPlaced} 旗${tag}`);
    }
  }

  return lines.join('\n');
}
