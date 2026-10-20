/**
 * PC の横長画面で表示する左右パネル（HTML）との橋渡し。
 * スマホでは CSS で非表示になり、ゲーム内の「袋」ボタンから同じ情報を見る。
 */
import { PIECES, PLAYER_KINDS } from '../core/pieces';
import type { Run } from '../core/run';

const MAX_LOG = 60;

export function updateBagPanel(run: Run | null): void {
  const el = document.getElementById('bag-list');
  if (!el) return;
  if (!run) {
    el.innerHTML = '<p class="hint">ランを始めると表示されます。</p>';
    return;
  }
  const rows = PLAYER_KINDS.map((k) => {
    const n = run.bag[k];
    const p = PIECES[k];
    const lv = run.level[k] ? ` <span style="color:#ffc857">Lv${run.level[k] + 1}</span>` : '';
    return `<div class="row" style="opacity:${n ? 1 : 0.4}">
      <span class="chip" style="background:${p.css}"></span>
      <span>${p.name}${lv}</span>
      <span class="num">${n}</span>
      <span class="desc">${p.desc(run.power(k))}</span>
    </div>`;
  }).join('');
  el.innerHTML = `${rows}<p class="hint">合計 ${run.bagSize()} 個 ／ HP ${Math.max(0, run.hp)}/${run.maxHp} ／ ${run.gold}G</p>`;
}

export function log(msg: string): void {
  const el = document.getElementById('log');
  if (!el) return;
  const li = document.createElement('li');
  li.textContent = msg;
  el.prepend(li);
  while (el.children.length > MAX_LOG) el.lastElementChild?.remove();
}

export function clearLog(): void {
  const el = document.getElementById('log');
  if (el) el.innerHTML = '';
}

// ───────── 記録（localStorage） ─────────

export interface Best {
  runs: number;
  wins: number;
  bestFloor: number;
  bestStep: number;
}

const KEY = 'piecebag.best.v1';

export function loadBest(): Best {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { runs: 0, wins: 0, bestFloor: 0, bestStep: 0, ...JSON.parse(raw) };
  } catch {
    /* プライベートブラウズ等では使えないことがある */
  }
  return { runs: 0, wins: 0, bestFloor: 0, bestStep: 0 };
}

export function saveResult(run: Run): Best {
  const b = loadBest();
  b.runs++;
  if (run.result === 'win') b.wins++;
  const floor = run.result === 'win' ? 4 : run.floor;
  if (floor > b.bestFloor || (floor === b.bestFloor && run.step > b.bestStep)) {
    b.bestFloor = floor;
    b.bestStep = run.step;
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(b));
  } catch {
    /* 保存できなくても遊べる */
  }
  return b;
}
