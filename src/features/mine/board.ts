export function placeMines(
  cols: number,
  rows: number,
  count: number,
  safeCell: number,
): Set<number> {
  const sr = Math.floor(safeCell / cols);
  const sc = safeCell % cols;

  const pool: number[] = [];
  for (let i = 0; i < cols * rows; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    if (Math.abs(r - sr) > 1 || Math.abs(c - sc) > 1) {
      pool.push(i);
    }
  }

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = pool[i]!;
    pool[i] = pool[j]!;
    pool[j] = tmp;
  }

  return new Set(pool.slice(0, count));
}

export function computeAdjacency(cols: number, rows: number, mines: Set<number>): number[] {
  const adj = new Array<number>(cols * rows).fill(0);

  for (const mine of mines) {
    const mr = Math.floor(mine / cols);
    const mc = mine % cols;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = mr + dr;
        const nc = mc + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          adj[nr * cols + nc]!++;
        }
      }
    }
  }

  return adj;
}
