export type Effect =
  | { t: 'attack'; v: number; hits?: number }
  | { t: 'stone'; n: number }
  | { t: 'freeze'; n: number; turns: number }
  | { t: 'curseBoard'; n: number }
  | { t: 'curseBag'; n: number }
  | { t: 'poison'; n: number }
  | { t: 'steal'; n: number }
  | { t: 'heal'; n: number }
  | { t: 'armor'; n: number }
  | { t: 'shuffle' };

export interface Action {
  /** 何ターン後に実行するか */
  cd: number;
  fx: Effect[];
}

export type Shape =
  | 'blob'
  | 'bat'
  | 'goblin'
  | 'doll'
  | 'king'
  | 'mage'
  | 'knight'
  | 'mushroom'
  | 'wisp'
  | 'witch'
  | 'skeleton'
  | 'shadow'
  | 'chest'
  | 'book'
  | 'gargoyle'
  | 'dragon';

export interface EnemyDef {
  id: string;
  name: string;
  floor: 1 | 2 | 3;
  boss?: boolean;
  hp: number;
  armor?: number;
  gold: [number, number];
  color: number;
  shape: Shape;
  desc: string;
  actions: Action[];
  /** 一度だけ HP 割合で復活 */
  revive?: number;
  /** HP がこの割合を下回ると攻撃1.5倍 */
  enrage?: number;
}

const RAW: EnemyDef[] = [
  // ───── 第1層 ─────
  {
    id: 'slime',
    name: 'スライム',
    floor: 1,
    hp: 24,
    gold: [3, 5],
    color: 0x5ec27a,
    shape: 'blob',
    desc: 'ぷるぷるしている。素直に体当たりしてくる。',
    actions: [{ cd: 2, fx: [{ t: 'attack', v: 5 }] }],
  },
  {
    id: 'bat',
    name: '洞窟コウモリ',
    floor: 1,
    hp: 16,
    gold: [2, 4],
    color: 0x8a6fb0,
    shape: 'bat',
    desc: '素早い。毎ターン小さく噛みついてくる。',
    actions: [{ cd: 1, fx: [{ t: 'attack', v: 2 }] }],
  },
  {
    id: 'thief',
    name: 'ゴブリン盗賊',
    floor: 1,
    hp: 26,
    gold: [6, 9],
    color: 0x8fae3c,
    shape: 'goblin',
    desc: '金貨を狙っている。殴るついでに財布を漁る。',
    actions: [
      { cd: 2, fx: [{ t: 'attack', v: 4 }] },
      { cd: 2, fx: [{ t: 'attack', v: 3 }, { t: 'steal', n: 4 }] },
    ],
  },
  {
    id: 'kobold',
    name: '石投げコボルト',
    floor: 1,
    hp: 28,
    gold: [3, 6],
    color: 0xb08850,
    shape: 'goblin',
    desc: '盤面に石を投げ込んでピースを固める。',
    actions: [
      { cd: 2, fx: [{ t: 'stone', n: 2 }] },
      { cd: 2, fx: [{ t: 'attack', v: 6 }] },
    ],
  },
  {
    id: 'doll',
    name: '呪いの人形',
    floor: 1,
    hp: 22,
    gold: [3, 5],
    color: 0xd98bb5,
    shape: 'doll',
    desc: '盤面のピースを呪いに変える。呪いは隣で消すと壊れる。',
    actions: [
      { cd: 2, fx: [{ t: 'curseBoard', n: 2 }] },
      { cd: 2, fx: [{ t: 'attack', v: 4 }] },
    ],
  },
  {
    id: 'goblin_king',
    name: 'ゴブリンキング',
    floor: 1,
    boss: true,
    hp: 95,
    armor: 1,
    gold: [18, 24],
    color: 0x6f9a2e,
    shape: 'king',
    desc: '第1層の主。石と呪いで盤面を荒らし、溜めて大振りする。装甲1。',
    actions: [
      { cd: 2, fx: [{ t: 'attack', v: 7 }] },
      { cd: 2, fx: [{ t: 'stone', n: 2 }, { t: 'curseBoard', n: 2 }] },
      { cd: 3, fx: [{ t: 'attack', v: 14 }] },
    ],
  },

  // ───── 第2層 ─────
  {
    id: 'hexer',
    name: '呪術師',
    floor: 2,
    hp: 42,
    gold: [5, 8],
    color: 0x7c4dbb,
    shape: 'mage',
    desc: '盤面にも袋にも呪いを仕込む。袋の呪いはこの戦闘中だけ。',
    actions: [
      { cd: 2, fx: [{ t: 'curseBoard', n: 3 }] },
      { cd: 2, fx: [{ t: 'attack', v: 7 }] },
      { cd: 2, fx: [{ t: 'curseBag', n: 3 }] },
    ],
  },
  {
    id: 'knight',
    name: '錆びた鎧騎士',
    floor: 2,
    hp: 46,
    armor: 3,
    gold: [5, 8],
    color: 0x9aa3ad,
    shape: 'knight',
    desc: '装甲3。剣は通りにくいが炎と毒は素通しする。',
    actions: [
      { cd: 3, fx: [{ t: 'attack', v: 12 }] },
      { cd: 2, fx: [{ t: 'armor', n: 1 }, { t: 'attack', v: 5 }] },
    ],
  },
  {
    id: 'mushroom',
    name: '毒キノコ',
    floor: 2,
    hp: 38,
    gold: [4, 7],
    color: 0xc0504d,
    shape: 'mushroom',
    desc: '胞子でこちらを毒状態にする。毒は毎ターン減りながらダメージ。',
    actions: [
      { cd: 2, fx: [{ t: 'poison', n: 4 }] },
      { cd: 2, fx: [{ t: 'attack', v: 5 }] },
    ],
  },
  {
    id: 'frost',
    name: '氷の精',
    floor: 2,
    hp: 40,
    gold: [4, 7],
    color: 0x7fd3ef,
    shape: 'wisp',
    desc: 'ピースを凍らせて動かせなくする。凍ったピースも揃えれば消える。',
    actions: [
      { cd: 2, fx: [{ t: 'freeze', n: 5, turns: 3 }] },
      { cd: 2, fx: [{ t: 'attack', v: 8 }] },
    ],
  },
  {
    id: 'vampbat',
    name: '吸血コウモリ',
    floor: 2,
    hp: 34,
    gold: [4, 7],
    color: 0x9b2c4a,
    shape: 'bat',
    desc: '噛みつきと吸血。長引くほど回復される。',
    actions: [
      { cd: 1, fx: [{ t: 'attack', v: 3 }] },
      { cd: 2, fx: [{ t: 'attack', v: 4 }, { t: 'heal', n: 6 }] },
    ],
  },
  {
    id: 'ice_witch',
    name: '氷の魔女',
    floor: 2,
    boss: true,
    hp: 165,
    gold: [24, 30],
    color: 0x5aa9d6,
    shape: 'witch',
    desc: '第2層の主。凍結と呪いで手を縛り、氷の槍で貫く。',
    actions: [
      { cd: 2, fx: [{ t: 'freeze', n: 6, turns: 3 }] },
      { cd: 2, fx: [{ t: 'curseBag', n: 3 }, { t: 'attack', v: 5 }] },
      { cd: 2, fx: [{ t: 'attack', v: 10 }] },
      { cd: 3, fx: [{ t: 'heal', n: 8 }, { t: 'armor', n: 1 }] },
    ],
  },

  // ───── 第3層 ─────
  {
    id: 'skeleton',
    name: '骸骨兵',
    floor: 3,
    hp: 48,
    gold: [6, 9],
    color: 0xe8e0c8,
    shape: 'skeleton',
    desc: '一度倒しても半分の体力で起き上がる。',
    revive: 0.5,
    actions: [
      { cd: 2, fx: [{ t: 'attack', v: 9 }] },
      { cd: 2, fx: [{ t: 'attack', v: 3, hits: 3 }] },
    ],
  },
  {
    id: 'shadow',
    name: '這い寄る影',
    floor: 3,
    hp: 54,
    gold: [6, 9],
    color: 0x3d3a5c,
    shape: 'shadow',
    desc: '盤面をかき混ぜてくる。狙っていた並びも崩される。',
    actions: [
      { cd: 2, fx: [{ t: 'shuffle' }, { t: 'attack', v: 6 }] },
      { cd: 2, fx: [{ t: 'attack', v: 11 }] },
    ],
  },
  {
    id: 'mimic',
    name: 'ミミック',
    floor: 3,
    hp: 78,
    gold: [26, 36],
    color: 0xb07a3a,
    shape: 'chest',
    desc: '硬くて痛いが、倒せばたっぷり金貨を落とす。',
    actions: [
      { cd: 3, fx: [{ t: 'attack', v: 14 }] },
      { cd: 2, fx: [{ t: 'steal', n: 6 }, { t: 'attack', v: 6 }] },
    ],
  },
  {
    id: 'grimoire',
    name: '禁書',
    floor: 3,
    hp: 56,
    gold: [6, 9],
    color: 0x6b3b8f,
    shape: 'book',
    desc: '袋に呪いを書き込み、盤面を石に変える。',
    actions: [
      { cd: 2, fx: [{ t: 'curseBag', n: 2 }, { t: 'stone', n: 2 }] },
      { cd: 2, fx: [{ t: 'attack', v: 11 }] },
    ],
  },
  {
    id: 'gargoyle',
    name: 'ガーゴイル',
    floor: 3,
    hp: 58,
    armor: 4,
    gold: [6, 9],
    color: 0x7d8590,
    shape: 'gargoyle',
    desc: '装甲4。石化を撒きつつ、重い一撃を溜める。',
    actions: [
      { cd: 2, fx: [{ t: 'stone', n: 3 }] },
      { cd: 3, fx: [{ t: 'attack', v: 15 }] },
    ],
  },
  {
    id: 'abyss_dragon',
    name: '深淵の竜',
    floor: 3,
    boss: true,
    hp: 270,
    armor: 2,
    gold: [0, 0],
    color: 0x2f1f4f,
    shape: 'dragon',
    desc: '最深部の主。体力が半分を切ると激昂し、攻撃が1.5倍になる。装甲2。',
    enrage: 0.5,
    actions: [
      { cd: 2, fx: [{ t: 'attack', v: 11 }] },
      { cd: 1, fx: [{ t: 'stone', n: 3 }] },
      { cd: 2, fx: [{ t: 'curseBoard', n: 3 }, { t: 'poison', n: 3 }] },
      { cd: 3, fx: [{ t: 'attack', v: 22 }] },
    ],
  },
];

/**
 * バランス調整用の倍率。定義は「読みやすい小さい数」で書き、ここで実際の値に拡大する。
 * 1手あたりの平均ダメージは約20（連鎖込み）なので、HPはそれに合わせて大きめ。
 */
export const BALANCE = {
  hp: { 1: 4.2, 2: 4.8, 3: 6.5 } as Record<number, number>,
  atk: { 1: 2.0, 2: 2.2, 3: 2.6 } as Record<number, number>,
  /** ボスだけ追加でかける HP 倍率 */
  bossHp: { 1: 0.75, 2: 0.68, 3: 0.95 } as Record<number, number>,
};

function scale(d: EnemyDef): EnemyDef {
  const H = BALANCE.hp[d.floor] * (d.boss ? BALANCE.bossHp[d.floor] : 1);
  const A = BALANCE.atk[d.floor];
  return {
    ...d,
    hp: Math.round((d.hp * H) / 5) * 5,
    actions: d.actions.map((a) => ({
      cd: a.cd,
      fx: a.fx.map((e) => {
        if (e.t === 'attack') return { ...e, v: Math.round(e.v * A) };
        if (e.t === 'heal') return { ...e, n: Math.round((e.n * H) / 5) * 5 };
        if (e.t === 'poison') return { ...e, n: Math.round(e.n * 1.5) };
        return e;
      }),
    })),
  };
}

export const ENEMIES: EnemyDef[] = RAW.map(scale);

export const FLOOR_NAMES: Record<number, string> = {
  1: '苔むした坑道',
  2: '凍える書庫',
  3: '深淵の竜巣',
};

export function effectLabel(e: Effect, atkMult = 1): string {
  switch (e.t) {
    case 'attack': {
      const v = Math.round(e.v * atkMult);
      return e.hits && e.hits > 1 ? `攻撃 ${v}×${e.hits}` : `攻撃 ${v}`;
    }
    case 'stone':
      return `石化 ${e.n}`;
    case 'freeze':
      return `凍結 ${e.n}`;
    case 'curseBoard':
      return `呪い ${e.n}`;
    case 'curseBag':
      return `袋に呪い ${e.n}`;
    case 'poison':
      return `毒 ${e.n}`;
    case 'steal':
      return `盗み ${e.n}G`;
    case 'heal':
      return `回復 ${e.n}`;
    case 'armor':
      return `装甲+${e.n}`;
    case 'shuffle':
      return 'かき混ぜ';
  }
}

export function actionLabel(a: Action, atkMult = 1): string {
  return a.fx.map((e) => effectLabel(e, atkMult)).join(' ＋ ');
}

export function actionDamage(a: Action, atkMult = 1): number {
  let d = 0;
  for (const e of a.fx) if (e.t === 'attack') d += Math.round(e.v * atkMult) * (e.hits ?? 1);
  return d;
}

export function enemyById(id: string): EnemyDef {
  const d = ENEMIES.find((e) => e.id === id);
  if (!d) throw new Error(`unknown enemy ${id}`);
  return d;
}
