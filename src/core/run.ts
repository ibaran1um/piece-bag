import { ENEMIES, type EnemyDef } from './enemies';
import { PIECES, PLAYER_KINDS, type Kind } from './pieces';
import { Rng } from './rng';

export type NodeType = 'battle' | 'camp' | 'boss';

/** 1層の流れ：戦闘 → 戦闘 → 野営地（ショップ or 休憩）→ 戦闘 → ボス */
export const FLOOR_PLAN: readonly NodeType[] = ['battle', 'battle', 'camp', 'battle', 'boss'];
export const MAX_FLOOR = 3;
/** 袋の最小枚数 */
export const MIN_BAG = 10;
export const MAX_LEVEL = 5;

export type Reward =
  | { type: 'add'; kind: Kind; n: number }
  | { type: 'upgrade'; kind: Kind }
  | { type: 'remove'; kind: Kind }
  | { type: 'maxhp'; n: number }
  | { type: 'heal'; n: number };

export interface ShopItem {
  reward: Reward | { type: 'removeAny' };
  price: number;
  sold: boolean;
}

export interface RunStats {
  battles: number;
  turns: number;
  damage: number;
  maxCombo: number;
  goldEarned: number;
}

const START_BAG: Record<Kind, number> = {
  sword: 5,
  fire: 4,
  shield: 4,
  coin: 3,
  heal: 0,
  poison: 0,
  curse: 0,
};

export class Run {
  readonly seed: number;
  readonly rng: Rng;
  hp = 70;
  maxHp = 70;
  gold = 0;
  bag: Record<Kind, number> = { ...START_BAG };
  level: Record<Kind, number> = { sword: 0, fire: 0, shield: 0, coin: 0, heal: 0, poison: 0, curse: 0 };
  floor = 1;
  step = 0;
  removals = 0;
  seen = new Set<string>();
  stats: RunStats = { battles: 0, turns: 0, damage: 0, maxCombo: 0, goldEarned: 0 };
  result: null | 'win' | 'lose' = null;
  killedBy: string | null = null;
  shop: ShopItem[] | null = null;

  constructor(seed: number) {
    this.seed = seed >>> 0;
    this.rng = new Rng(this.seed ^ 0x5bd1e995);
  }

  power(k: Kind): number {
    return PIECES[k].base + this.level[k];
  }

  bagSize(): number {
    return PLAYER_KINDS.reduce((s, k) => s + this.bag[k], 0);
  }

  kindsInBag(): Kind[] {
    return PLAYER_KINDS.filter((k) => this.bag[k] > 0);
  }

  /** 袋が細りすぎて詰まないように制限する */
  canRemove(k: Kind): boolean {
    if (this.bag[k] <= 0) return false;
    if (this.bagSize() <= MIN_BAG) return false;
    if (this.bag[k] === 1 && this.kindsInBag().length <= 3) return false;
    return true;
  }

  node(): NodeType {
    return FLOOR_PLAN[this.step];
  }

  /** 戦闘ごとの盤面乱数。選択に関係なく同じシードなら同じ盤面系列になる */
  battleSeed(): number {
    return (this.seed ^ Math.imul(this.floor * 31 + this.step + 1, 0x9e3779b1)) >>> 0;
  }

  pickEnemy(): EnemyDef {
    if (this.node() === 'boss') {
      return ENEMIES.find((e) => e.floor === this.floor && e.boss)!;
    }
    let pool = ENEMIES.filter((e) => e.floor === this.floor && !e.boss && !this.seen.has(e.id));
    if (pool.length === 0) pool = ENEMIES.filter((e) => e.floor === this.floor && !e.boss);
    const def = this.rng.pick(pool);
    this.seen.add(def.id);
    return def;
  }

  /** 次のマスへ。最終層のボスを越えたらクリア */
  advance(): void {
    this.step++;
    if (this.step >= FLOOR_PLAN.length) {
      this.floor++;
      this.step = 0;
      this.shop = null;
      if (this.floor > MAX_FLOOR) this.result = 'win';
    }
  }

  heal(n: number): number {
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + n);
    return this.hp - before;
  }

  restAmount(): number {
    return Math.round(this.maxHp * 0.35);
  }

  /** ボス撃破後の回復 */
  bossHealAmount(): number {
    return Math.round(this.maxHp * 0.4);
  }

  addCount(k: Kind): number {
    return this.bag[k] > 0 ? 2 : 3;
  }

  rewardOptions(): Reward[] {
    const inBag = this.kindsInBag();
    const opts: Reward[] = [];

    const addKind = this.rng.pick(PLAYER_KINDS);
    opts.push({ type: 'add', kind: addKind, n: this.addCount(addKind) });

    const up = inBag.filter((k) => this.level[k] < MAX_LEVEL);
    if (up.length) opts.push({ type: 'upgrade', kind: this.rng.pick(up) });

    const rem = inBag.filter((k) => this.canRemove(k));
    if (rem.length && this.rng.next() < 0.75) {
      opts.push({ type: 'remove', kind: this.rng.pick(rem) });
    } else {
      opts.push({ type: 'maxhp', n: 6 });
    }

    // 3つに満たないときの穴埋め
    while (opts.length < 3) {
      const k = this.rng.pick(PLAYER_KINDS.filter((x) => x !== addKind));
      opts.push({ type: 'add', kind: k, n: this.addCount(k) });
    }
    return this.rng.shuffle(opts);
  }

  applyReward(r: Reward): void {
    switch (r.type) {
      case 'add':
        this.bag[r.kind] += r.n;
        break;
      case 'upgrade':
        this.level[r.kind] = Math.min(MAX_LEVEL, this.level[r.kind] + 1);
        break;
      case 'remove':
        if (this.canRemove(r.kind)) {
          this.bag[r.kind]--;
          this.removals++;
        }
        break;
      case 'maxhp':
        this.maxHp += r.n;
        this.hp += r.n;
        break;
      case 'heal':
        this.heal(r.n);
        break;
    }
  }

  removePrice(): number {
    return 10 + this.removals * 5;
  }

  makeShop(): ShopItem[] {
    if (this.shop) return this.shop;
    const kinds = this.rng.sample(PLAYER_KINDS, 2);
    const up = this.kindsInBag().filter((k) => this.level[k] < MAX_LEVEL);
    const items: ShopItem[] = kinds.map((k) => ({
      reward: { type: 'add', kind: k, n: this.addCount(k) },
      price: 7,
      sold: false,
    }));
    if (up.length) {
      const k = this.rng.pick(up);
      items.push({ reward: { type: 'upgrade', kind: k }, price: 16 + this.level[k] * 4, sold: false });
    }
    items.push({ reward: { type: 'removeAny' }, price: this.removePrice(), sold: false });
    items.push({ reward: { type: 'heal', n: 15 }, price: 8, sold: false });
    this.shop = items;
    return items;
  }

  buy(item: ShopItem, kind?: Kind): boolean {
    if (item.sold || this.gold < item.price) return false;
    if (item.reward.type === 'removeAny') {
      if (!kind || !this.canRemove(kind)) return false;
      this.applyReward({ type: 'remove', kind });
    } else {
      this.applyReward(item.reward);
    }
    this.gold -= item.price;
    item.sold = true;
    return true;
  }

  describe(r: Reward | { type: 'removeAny' }): { title: string; desc: string; kind?: Kind } {
    switch (r.type) {
      case 'add':
        return {
          title: `${PIECES[r.kind].name} を ${r.n} 個追加`,
          desc: `袋：${this.bag[r.kind]} → ${this.bag[r.kind] + r.n}　${PIECES[r.kind].desc(this.power(r.kind))}`,
          kind: r.kind,
        };
      case 'upgrade':
        return {
          title: `${PIECES[r.kind].name} を強化`,
          desc: `威力 ${this.power(r.kind)} → ${this.power(r.kind) + 1}`,
          kind: r.kind,
        };
      case 'remove':
        return {
          title: `${PIECES[r.kind].name} を 1 個抜く`,
          desc: `袋：${this.bag[r.kind]} → ${this.bag[r.kind] - 1}　他の種類が揃いやすくなる`,
          kind: r.kind,
        };
      case 'removeAny':
        return { title: 'ピースを 1 個抜く', desc: '好きな種類を袋から 1 個取り除く' };
      case 'maxhp':
        return { title: `最大HP +${r.n}`, desc: `最大HP ${this.maxHp} → ${this.maxHp + r.n}` };
      case 'heal':
        return { title: `HP を ${r.n} 回復`, desc: `HP ${this.hp} → ${Math.min(this.maxHp, this.hp + r.n)}` };
    }
  }
}
