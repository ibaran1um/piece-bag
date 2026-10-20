/**
 * バランス確認用シミュレーター。
 *   npm run sim -- 500
 * 貪欲AIで N 回ランを回し、到達階層・死因・戦闘ごとの手数を集計する。
 */
declare const process: { argv: string[] };
import { bestMove, pickReward, shopAI } from '../src/core/ai';
import { Battle } from '../src/core/battle';
import { Run } from '../src/core/run';

const N = Number(process.argv[2] ?? 300);

let wins = 0;
const reached: Record<string, number> = {};
const killers: Record<string, number> = {};
const perEnemy: Record<string, { n: number; turns: number; hpLoss: number; deaths: number; hpIn: number }> = {};
let totalTurns = 0;

for (let seed = 1; seed <= N; seed++) {
  const run = new Run(seed * 7919);
  let guard = 0;
  while (!run.result && guard++ < 100) {
    const node = run.node();
    if (node === 'camp') {
      if (run.hp < run.maxHp * 0.6) run.heal(run.restAmount());
      else shopAI(run, run.makeShop());
      run.advance();
      continue;
    }
    const def = run.pickEnemy();
    const bt = new Battle(run, def);
    const hp0 = run.hp;
    let t = 0;
    while (!bt.outcome && t++ < 400) {
      const mv = bestMove(bt);
      if (!mv) throw new Error(`no move: ${def.id}`);
      const f = bt.trySwap(mv[0], mv[1]);
      if (!f) throw new Error('invalid move from AI');
    }
    if (!bt.outcome) throw new Error(`battle did not end: ${def.id}`);
    const pe = (perEnemy[def.id] ??= { n: 0, turns: 0, hpLoss: 0, deaths: 0, hpIn: 0 });
    pe.n++;
    pe.hpIn += hp0;
    pe.turns += bt.turn;
    pe.hpLoss += hp0 - Math.max(0, run.hp);
    if (bt.outcome === 'lose') {
      pe.deaths++;
      killers[def.name] = (killers[def.name] ?? 0) + 1;
      break;
    }
    if (node === 'boss') run.heal(run.bossHealAmount());
    const r = pickReward(run, run.rewardOptions());
    if (r) run.applyReward(r);
    run.advance();
  }
  totalTurns += run.stats.turns;
  if (run.result === 'win') wins++;
  const key = run.result === 'win' ? 'クリア' : `${run.floor}F-${run.step + 1}`;
  reached[key] = (reached[key] ?? 0) + 1;
}

console.log(`runs=${N}  win=${((wins / N) * 100).toFixed(1)}%  avgTurns/run=${(totalTurns / N).toFixed(0)}`);
console.log('到達（死亡地点）:', Object.entries(reached).sort().map(([k, v]) => `${k}:${v}`).join('  '));
console.log('死因:', Object.entries(killers).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join('  '));
console.log('\n敵ごと: 戦闘数 / 平均手数 / 平均被ダメ / 敗北 / 戦闘前HP');
for (const [id, s] of Object.entries(perEnemy)) {
  console.log(
    `  ${id.padEnd(14)} ${String(s.n).padStart(4)}  ${(s.turns / s.n).toFixed(1).padStart(5)}  ${(s.hpLoss / s.n).toFixed(1).padStart(5)}  ${String(s.deaths).padStart(4)}  ${(s.hpIn / s.n).toFixed(0).padStart(4)}`,
  );
}
