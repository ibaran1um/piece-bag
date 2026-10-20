import type { Battle } from './battle';
import type { Pos } from './pieces';
import type { Reward, Run, ShopItem } from './run';

/**
 * 1手先だけを見る貪欲AI。バランス確認用のシミュレーターと、
 * 将来の「ヒント」機能に使う想定。
 */
export function scoreMove(bt: Battle, a: Pos, b: Pos): number {
  const board = bt.board;
  board.swap(a, b);
  const m = board.findMatches();
  const counts: Record<string, number> = {};
  for (const p of m) {
    const k = board.at(p.r, p.c)!.kind;
    counts[k] = (counts[k] ?? 0) + 1;
  }
  // 隣接の呪い・石化
  let bonus = 0;
  const seen = new Set<number>();
  for (const p of m) {
    for (const [dr, dc] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const n = board.at(p.r + dr, p.c + dc);
      if (!n || seen.has(n.id)) continue;
      seen.add(n.id);
      if (n.stone) bonus += 1;
      else if (n.kind === 'curse') bonus += 3;
    }
  }
  board.swap(a, b);

  const run = bt.run;
  const h = bt.hud();
  const n = (k: string) => counts[k] ?? 0;
  let s = bonus + m.length * 0.1;
  s += Math.max(0, n('sword') * run.power('sword') - h.armor);
  s += n('fire') * run.power('fire');
  const pv = n('poison') * run.power('poison');
  s += pv * 2.2;
  const incoming = h.timer <= 2 ? Math.max(0, h.intentDamage - h.block) : 0;
  const sv = n('shield') * run.power('shield');
  s += Math.min(sv, incoming) * 1.1 + sv * 0.15;
  const missing = run.maxHp - run.hp;
  s += Math.min(missing, n('heal') * run.power('heal')) * 0.9;
  s += n('coin') * run.power('coin') * 0.6;
  return s;
}

export function bestMove(bt: Battle): [Pos, Pos] | null {
  let best: [Pos, Pos] | null = null;
  let bs = -Infinity;
  for (const mv of bt.board.validMoves()) {
    const s = scoreMove(bt, mv[0], mv[1]) + bt.rng.next() * 0.01;
    if (s > bs) {
      bs = s;
      best = mv;
    }
  }
  return best;
}

export function pickReward(run: Run, opts: Reward[]): Reward | null {
  const score = (r: Reward): number => {
    switch (r.type) {
      case 'upgrade':
        return r.kind === 'sword' || r.kind === 'fire' ? 5 : r.kind === 'shield' ? 3 : 2;
      case 'remove':
        return r.kind === 'coin' ? 4 : r.kind === 'heal' || r.kind === 'poison' ? 1 : 2.5;
      case 'add':
        if (r.kind === 'sword' || r.kind === 'fire') return 3;
        if (r.kind === 'heal') return run.hp < run.maxHp * 0.5 ? 3 : 1;
        if (r.kind === 'shield') return 1.5;
        return 1;
      case 'maxhp':
        return 2;
      case 'heal':
        return 1;
    }
  };
  let best: Reward | null = null;
  let bs = 0;
  for (const o of opts) {
    const s = score(o);
    if (s > bs) {
      bs = s;
      best = o;
    }
  }
  return best;
}

export function shopAI(run: Run, items: ShopItem[]): void {
  for (const it of items) {
    const r = it.reward;
    if (r.type === 'heal' && run.hp < run.maxHp * 0.75) run.buy(it);
    else if (r.type === 'upgrade') run.buy(it);
    else if (r.type === 'removeAny' && run.canRemove('coin')) run.buy(it, 'coin');
  }
}
