import type { Cell, Pos } from './pieces';

export const ROWS = 7;
export const COLS = 7;

export const DIRS: readonly Pos[] = [
  { r: -1, c: 0 },
  { r: 1, c: 0 },
  { r: 0, c: -1 },
  { r: 0, c: 1 },
];

export function isMovable(c: Cell | null): c is Cell {
  return !!c && !c.stone && c.frozen <= 0;
}

export function isMatchable(c: Cell | null): c is Cell {
  return !!c && !c.stone && c.kind !== 'curse';
}

export function adjacent(a: Pos, b: Pos): boolean {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
}

export class Board {
  grid: (Cell | null)[][];

  constructor() {
    this.grid = Array.from({ length: ROWS }, () => Array<Cell | null>(COLS).fill(null));
  }

  inBounds(p: Pos): boolean {
    return p.r >= 0 && p.r < ROWS && p.c >= 0 && p.c < COLS;
  }

  at(r: number, c: number): Cell | null {
    return this.grid[r]?.[c] ?? null;
  }

  set(r: number, c: number, cell: Cell | null): void {
    this.grid[r][c] = cell;
  }

  swap(a: Pos, b: Pos): void {
    const t = this.grid[a.r][a.c];
    this.grid[a.r][a.c] = this.grid[b.r][b.c];
    this.grid[b.r][b.c] = t;
  }

  /** 揃っているマスの一覧（重複なし） */
  findMatches(): Pos[] {
    const mark = new Set<number>();
    // 横
    for (let r = 0; r < ROWS; r++) {
      let c = 0;
      while (c < COLS) {
        const cell = this.at(r, c);
        if (!isMatchable(cell)) {
          c++;
          continue;
        }
        let e = c + 1;
        while (e < COLS) {
          const n = this.at(r, e);
          if (!isMatchable(n) || n.kind !== cell.kind) break;
          e++;
        }
        if (e - c >= 3) for (let k = c; k < e; k++) mark.add(r * COLS + k);
        c = e;
      }
    }
    // 縦
    for (let c = 0; c < COLS; c++) {
      let r = 0;
      while (r < ROWS) {
        const cell = this.at(r, c);
        if (!isMatchable(cell)) {
          r++;
          continue;
        }
        let e = r + 1;
        while (e < ROWS) {
          const n = this.at(e, c);
          if (!isMatchable(n) || n.kind !== cell.kind) break;
          e++;
        }
        if (e - r >= 3) for (let k = r; k < e; k++) mark.add(k * COLS + c);
        r = e;
      }
    }
    return [...mark].map((i) => ({ r: Math.floor(i / COLS), c: i % COLS }));
  }

  canSwap(a: Pos, b: Pos): boolean {
    return (
      this.inBounds(a) &&
      this.inBounds(b) &&
      adjacent(a, b) &&
      isMovable(this.at(a.r, a.c)) &&
      isMovable(this.at(b.r, b.c))
    );
  }

  /** 入れ替えたら揃うか（盤面は元に戻す） */
  wouldMatch(a: Pos, b: Pos): boolean {
    if (!this.canSwap(a, b)) return false;
    const ka = this.at(a.r, a.c)!.kind;
    const kb = this.at(b.r, b.c)!.kind;
    if (ka === kb) return false;
    this.swap(a, b);
    const ok = this.lineAt(a) || this.lineAt(b);
    this.swap(a, b);
    return ok;
  }

  /** p を含む3つ以上の並びがあるか（局所判定） */
  private lineAt(p: Pos): boolean {
    const cell = this.at(p.r, p.c);
    if (!isMatchable(cell)) return false;
    const same = (r: number, c: number) => {
      const n = this.at(r, c);
      return isMatchable(n) && n.kind === cell.kind;
    };
    let h = 1;
    for (let c = p.c - 1; c >= 0 && same(p.r, c); c--) h++;
    for (let c = p.c + 1; c < COLS && same(p.r, c); c++) h++;
    if (h >= 3) return true;
    let v = 1;
    for (let r = p.r - 1; r >= 0 && same(r, p.c); r--) v++;
    for (let r = p.r + 1; r < ROWS && same(r, p.c); r++) v++;
    return v >= 3;
  }

  validMoves(): [Pos, Pos][] {
    const out: [Pos, Pos][] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const a = { r, c };
        const right = { r, c: c + 1 };
        const down = { r: r + 1, c };
        if (this.wouldMatch(a, right)) out.push([a, right]);
        if (this.wouldMatch(a, down)) out.push([a, down]);
      }
    }
    return out;
  }

  hasAnyMove(): boolean {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.wouldMatch({ r, c }, { r, c: c + 1 })) return true;
        if (this.wouldMatch({ r, c }, { r: r + 1, c })) return true;
      }
    }
    return false;
  }

  /** 下に詰める */
  applyGravity(): void {
    for (let c = 0; c < COLS; c++) {
      const stack: Cell[] = [];
      for (let r = ROWS - 1; r >= 0; r--) {
        const cell = this.grid[r][c];
        if (cell) stack.push(cell);
      }
      for (let r = ROWS - 1, i = 0; r >= 0; r--, i++) {
        this.grid[r][c] = stack[i] ?? null;
      }
    }
  }

  emptyCells(): Pos[] {
    const out: Pos[] = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (!this.grid[r][c]) out.push({ r, c });
    return out;
  }

  cells(): { cell: Cell; r: number; c: number }[] {
    const out: { cell: Cell; r: number; c: number }[] = [];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const cell = this.grid[r][c];
        if (cell) out.push({ cell, r, c });
      }
    return out;
  }

  count(pred: (c: Cell) => boolean): number {
    return this.cells().filter((x) => pred(x.cell)).length;
  }

  snapshot(): (Cell | null)[][] {
    return this.grid.map((row) => row.map((c) => (c ? { ...c } : null)));
  }
}
