/** シード固定の乱数（mulberry32）。同じシードなら同じ展開になる。 */
export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0;
  }

  next(): number {
    this.s = (this.s + 0x6d2b79f5) | 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** 0 以上 n 未満の整数 */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  /** a 以上 b 以下の整数 */
  range(a: number, b: number): number {
    return a + this.int(b - a + 1);
  }

  pick<T>(arr: readonly T[]): T {
    return arr[this.int(arr.length)];
  }

  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /** 重複なしで n 個選ぶ */
  sample<T>(arr: readonly T[], n: number): T[] {
    return this.shuffle([...arr]).slice(0, n);
  }
}

export function randomSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}
