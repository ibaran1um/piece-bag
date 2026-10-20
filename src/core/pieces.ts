export type Kind = 'sword' | 'fire' | 'shield' | 'coin' | 'heal' | 'poison' | 'curse';

/** プレイヤーが袋に入れられる種類（呪いは敵が混ぜてくる） */
export const PLAYER_KINDS: readonly Kind[] = ['sword', 'fire', 'shield', 'coin', 'heal', 'poison'];

export interface Cell {
  id: number;
  kind: Kind;
  /** 石化：動かせない・揃わない。隣で消すと解ける */
  stone: boolean;
  /** 凍結：残りターン数。動かせないが揃えれば消える */
  frozen: number;
}

export interface Pos {
  r: number;
  c: number;
}

export interface PieceDef {
  name: string;
  color: number;
  css: string;
  base: number;
  desc: (power: number) => string;
}

export const PIECES: Record<Kind, PieceDef> = {
  sword: {
    name: '剣',
    color: 0xe5484d,
    css: '#e5484d',
    base: 3,
    desc: (p) => `1個につき ${p} ダメージ。敵の装甲で軽減される`,
  },
  fire: {
    name: '炎',
    color: 0xf97316,
    css: '#f97316',
    base: 2,
    desc: (p) => `1個につき ${p} ダメージ。装甲を無視する`,
  },
  shield: {
    name: '盾',
    color: 0x3b82f6,
    css: '#3b82f6',
    base: 1,
    desc: (p) => `1個につき 防御 ${p}。敵が行動するまで残る`,
  },
  coin: {
    name: '金貨',
    color: 0xeab308,
    css: '#eab308',
    base: 1,
    desc: (p) => `1個につき ${p} ゴールド`,
  },
  heal: {
    name: '薬草',
    color: 0x22c55e,
    css: '#22c55e',
    base: 1,
    desc: (p) => `1個につき HP を ${p} 回復`,
  },
  poison: {
    name: '毒',
    color: 0xa855f7,
    css: '#a855f7',
    base: 1,
    desc: (p) => `1個につき 毒 ${p} を付与。毎ターン毒の数だけダメージ、1ずつ減る`,
  },
  curse: {
    name: '呪い',
    color: 0x3b0a45,
    css: '#7a2a8c',
    base: 0,
    desc: () => '盤面にある間、毎ターン1ダメージ。隣のピースを消すと壊れる',
  },
};
