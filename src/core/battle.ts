import { Board, COLS, DIRS, ROWS, isMovable } from './board';
import { actionDamage, actionLabel, type Action, type EnemyDef } from './enemies';
import { PIECES, PLAYER_KINDS, type Cell, type Kind, type Pos } from './pieces';
import { Rng } from './rng';
import type { Run } from './run';

export interface Hud {
  hp: number;
  maxHp: number;
  block: number;
  playerPoison: number;
  gold: number;
  enemyHp: number;
  enemyMax: number;
  armor: number;
  enemyPoison: number;
  enraged: boolean;
  intent: string;
  intentDamage: number;
  timer: number;
  pileLeft: number;
  tempCurses: number;
  turn: number;
}

export interface Popup {
  text: string;
  at: 'enemy' | 'player' | 'cell';
  color: string;
  r?: number;
  c?: number;
  big?: boolean;
}

export type FrameType = 'cascade' | 'status' | 'enemy' | 'shuffle' | 'end';

export interface Frame {
  type: FrameType;
  board: (Cell | null)[][];
  /** 消えたピース（揃った＋壊れた呪い） */
  cleared: number[];
  popups: Popup[];
  hud: Hud;
  /** 0 始まりの連鎖段数 */
  combo: number;
  shake?: 'enemy' | 'player';
  logs: string[];
  outcome?: 'win' | 'lose';
}

interface EnemyState {
  hp: number;
  maxHp: number;
  armor: number;
  poison: number;
  idx: number;
  timer: number;
  revived: boolean;
  enraged: boolean;
}

const EFFECT_ORDER: Kind[] = ['sword', 'fire', 'poison', 'shield', 'heal', 'coin'];

export class Battle {
  readonly board = new Board();
  readonly rng: Rng;
  readonly enemy: EnemyState;
  pile: Kind[] = [];
  tempCurses = 0;
  block = 0;
  playerPoison = 0;
  turn = 0;
  outcome: null | 'win' | 'lose' = null;
  rewardGold = 0;
  goldGained = 0;
  private nextId = 1;

  constructor(
    readonly run: Run,
    readonly def: EnemyDef,
  ) {
    this.rng = new Rng(run.battleSeed());
    this.enemy = {
      hp: def.hp,
      maxHp: def.hp,
      armor: def.armor ?? 0,
      poison: 0,
      idx: 0,
      timer: def.actions[0].cd,
      revived: false,
      enraged: false,
    };
    this.fillInitial();
  }

  get atkMult(): number {
    return this.enemy.enraged ? 1.5 : 1;
  }

  currentAction(): Action {
    return this.def.actions[this.enemy.idx];
  }

  hud(): Hud {
    const a = this.currentAction();
    return {
      hp: Math.max(0, this.run.hp),
      maxHp: this.run.maxHp,
      block: this.block,
      playerPoison: this.playerPoison,
      gold: this.run.gold,
      enemyHp: Math.max(0, this.enemy.hp),
      enemyMax: this.enemy.maxHp,
      armor: this.enemy.armor,
      enemyPoison: this.enemy.poison,
      enraged: this.enemy.enraged,
      intent: actionLabel(a, this.atkMult),
      intentDamage: actionDamage(a, this.atkMult),
      timer: this.enemy.timer,
      pileLeft: this.pile.length,
      tempCurses: this.tempCurses,
      turn: this.turn,
    };
  }

  // ───────── 袋 ─────────

  private newCell(kind: Kind): Cell {
    return { id: this.nextId++, kind, stone: false, frozen: 0 };
  }

  private refillPile(): void {
    const p: Kind[] = [];
    for (const k of PLAYER_KINDS) for (let i = 0; i < this.run.bag[k]; i++) p.push(k);
    // 袋の呪いは一度引いたら消える。まだ引かれていない分だけ混ぜ直す
    for (let i = 0; i < this.tempCurses; i++) p.push('curse');
    this.pile = this.rng.shuffle(p);
  }

  private draw(): Kind {
    if (this.pile.length === 0) this.refillPile();
    const k = this.pile.pop() ?? 'sword';
    if (k === 'curse') this.tempCurses = Math.max(0, this.tempCurses - 1);
    return k;
  }

  private putBack(k: Kind): void {
    if (k === 'curse') this.tempCurses++;
    this.pile.splice(this.rng.int(this.pile.length + 1), 0, k);
  }

  private refill(): void {
    for (const p of this.board.emptyCells()) this.board.set(p.r, p.c, this.newCell(this.draw()));
  }

  // ───────── 盤面準備 ─────────

  private makesLine(r: number, c: number, k: Kind): boolean {
    if (k === 'curse') return false;
    const b = this.board;
    const same = (rr: number, cc: number) => {
      const x = b.at(rr, cc);
      return !!x && x.kind === k;
    };
    return (same(r, c - 1) && same(r, c - 2)) || (same(r - 1, c) && same(r - 2, c));
  }

  private fillInitial(): void {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const rejected: Kind[] = [];
        let chosen: Kind | null = null;
        for (let t = 0; t < 8; t++) {
          const k = this.draw();
          if (!this.makesLine(r, c, k)) {
            chosen = k;
            break;
          }
          rejected.push(k);
        }
        if (chosen === null) chosen = rejected.pop()!;
        for (const k of rejected) this.putBack(k);
        this.board.set(r, c, this.newCell(chosen));
      }
    }
    this.settleSilently();
    if (!this.board.hasAnyMove()) this.shuffleBoard();
  }

  private settleSilently(): void {
    for (let i = 0; i < 20; i++) {
      const m = this.board.findMatches();
      if (m.length === 0) return;
      for (const p of m) this.board.set(p.r, p.c, null);
      this.board.applyGravity();
      this.refill();
    }
  }

  /** 動かせるピースだけ並べ替える。揃っておらず手がある配置を探す */
  shuffleBoard(): void {
    const slots: Pos[] = [];
    const cells: Cell[] = [];
    for (const { cell, r, c } of this.board.cells()) {
      if (isMovable(cell)) {
        slots.push({ r, c });
        cells.push(cell);
      }
    }
    for (let t = 0; t < 80; t++) {
      this.rng.shuffle(cells);
      slots.forEach((p, i) => this.board.set(p.r, p.c, cells[i]));
      if (this.board.findMatches().length === 0 && this.board.hasAnyMove()) return;
    }
    // どうしても見つからないときは種類を引き直す
    const kinds = this.run.kindsInBag();
    for (let t = 0; t < 10 && !this.board.hasAnyMove(); t++) {
      for (const p of slots) {
        const cell = this.board.at(p.r, p.c);
        if (cell && cell.kind !== 'curse') cell.kind = this.rng.pick(kinds);
      }
      this.settleSilently();
    }
  }

  // ───────── プレイヤーの手 ─────────

  canSwap(a: Pos, b: Pos): boolean {
    return this.board.canSwap(a, b);
  }

  /** 入れ替えを実行してフレーム列を返す。揃わない手なら null */
  trySwap(a: Pos, b: Pos): Frame[] | null {
    if (this.outcome) return null;
    if (!this.board.wouldMatch(a, b)) return null;
    this.board.swap(a, b);
    this.turn++;
    this.run.stats.turns++;

    const frames: Frame[] = [];
    let combo = 0;
    for (; combo < 40; combo++) {
      const matched = this.board.findMatches();
      if (matched.length === 0) break;
      frames.push(this.resolveStep(matched, combo));
      if (this.outcome) break;
    }
    this.run.stats.maxCombo = Math.max(this.run.stats.maxCombo, combo);

    if (this.outcome === 'win') {
      frames.push(this.winFrame());
      return frames;
    }
    frames.push(...this.endOfTurn());
    return frames;
  }

  private resolveStep(matched: Pos[], combo: number): Frame {
    const b = this.board;
    const mult = 1 + 0.25 * combo;
    const key = (p: Pos) => p.r * COLS + p.c;
    const inMatch = new Set(matched.map(key));
    const cleared: number[] = [];
    const groups = new Map<Kind, Pos[]>();
    const popups: Popup[] = [];
    const logs: string[] = [];

    for (const p of matched) {
      const cell = b.at(p.r, p.c)!;
      cleared.push(cell.id);
      if (!groups.has(cell.kind)) groups.set(cell.kind, []);
      groups.get(cell.kind)!.push(p);
    }

    // 隣接：呪いを壊し、石化と凍結を解く
    const broken = new Map<number, Pos>();
    let unstoned = 0;
    for (const p of matched) {
      for (const d of DIRS) {
        const q = { r: p.r + d.r, c: p.c + d.c };
        if (!b.inBounds(q) || inMatch.has(key(q))) continue;
        const n = b.at(q.r, q.c);
        if (!n) continue;
        if (n.stone) {
          n.stone = false;
          unstoned++;
          continue;
        }
        if (n.kind === 'curse') broken.set(key(q), q);
        else if (n.frozen > 0) n.frozen = 0;
      }
    }

    for (const p of matched) b.set(p.r, p.c, null);
    for (const q of broken.values()) {
      cleared.push(b.at(q.r, q.c)!.id);
      b.set(q.r, q.c, null);
      popups.push({ text: '破壊', at: 'cell', r: q.r, c: q.c, color: '#ff8af0' });
    }
    if (broken.size) logs.push(`呪いを ${broken.size} 個壊した`);
    if (unstoned) logs.push(`石化を ${unstoned} 個解いた`);

    // 効果
    for (const kind of EFFECT_ORDER) {
      const ps = groups.get(kind);
      if (!ps) continue;
      const n = ps.length;
      const v = Math.round(n * this.run.power(kind) * mult);
      const r = ps.reduce((s, p) => s + p.r, 0) / n;
      const c = ps.reduce((s, p) => s + p.c, 0) / n;
      const css = PIECES[kind].css;
      switch (kind) {
        case 'sword': {
          const d = this.dealEnemy(v, false);
          popups.push({ text: `-${d}`, at: 'enemy', color: '#ff6b6b', big: true });
          popups.push({ text: `剣 ${v}`, at: 'cell', r, c, color: css });
          logs.push(d < v ? `剣×${n}：${d} ダメージ（装甲で -${v - d}）` : `剣×${n}：${d} ダメージ`);
          break;
        }
        case 'fire': {
          const d = this.dealEnemy(v, true);
          popups.push({ text: `-${d}`, at: 'enemy', color: '#ffa94d', big: true });
          popups.push({ text: `炎 ${v}`, at: 'cell', r, c, color: css });
          logs.push(`炎×${n}：${d} ダメージ`);
          break;
        }
        case 'poison':
          this.enemy.poison += v;
          popups.push({ text: `毒+${v}`, at: 'enemy', color: '#c08bff' });
          popups.push({ text: `毒 ${v}`, at: 'cell', r, c, color: css });
          logs.push(`毒×${n}：毒 ${v} を付与`);
          break;
        case 'shield':
          this.block += v;
          popups.push({ text: `防御+${v}`, at: 'player', color: '#7cb3ff' });
          popups.push({ text: `盾 ${v}`, at: 'cell', r, c, color: css });
          logs.push(`盾×${n}：防御 ${v}`);
          break;
        case 'heal': {
          const h = this.run.heal(v);
          popups.push({ text: `+${h}`, at: 'player', color: '#5ee08a' });
          popups.push({ text: `回復 ${v}`, at: 'cell', r, c, color: css });
          logs.push(`薬草×${n}：${h} 回復`);
          break;
        }
        case 'coin':
          this.run.gold += v;
          this.goldGained += v;
          this.run.stats.goldEarned += v;
          popups.push({ text: `+${v}G`, at: 'cell', r, c, color: '#ffd84d' });
          logs.push(`金貨×${n}：${v} ゴールド`);
          break;
        default:
          break;
      }
    }

    this.checkEnemyDeath(popups, logs);

    b.applyGravity();
    this.refill();

    return {
      type: 'cascade',
      board: b.snapshot(),
      cleared,
      popups,
      hud: this.hud(),
      combo,
      shake: popups.some((p) => p.at === 'enemy' && p.big) ? 'enemy' : undefined,
      logs,
    };
  }

  private dealEnemy(amount: number, pierce: boolean): number {
    const d = pierce ? amount : Math.max(0, amount - this.enemy.armor);
    this.enemy.hp -= d;
    this.run.stats.damage += d;
    return d;
  }

  private checkEnemyDeath(popups: Popup[], logs: string[]): void {
    const e = this.enemy;
    if (e.hp <= 0) {
      if (this.def.revive && !e.revived) {
        e.revived = true;
        e.hp = Math.round(e.maxHp * this.def.revive);
        e.poison = 0;
        popups.push({ text: '復活！', at: 'enemy', color: '#ffe08a', big: true });
        logs.push(`${this.def.name}は起き上がった！`);
        return;
      }
      this.outcome = 'win';
      return;
    }
    if (this.def.enrage && !e.enraged && e.hp < e.maxHp * this.def.enrage) {
      e.enraged = true;
      popups.push({ text: '激昂！', at: 'enemy', color: '#ff4d4d', big: true });
      logs.push(`${this.def.name}が激昂した！ 攻撃が1.5倍になる`);
    }
  }

  private winFrame(): Frame {
    this.rewardGold = this.rng.range(this.def.gold[0], this.def.gold[1]);
    this.run.gold += this.rewardGold;
    this.run.stats.goldEarned += this.rewardGold;
    this.run.stats.battles++;
    return {
      type: 'end',
      board: this.board.snapshot(),
      cleared: [],
      popups: [],
      hud: this.hud(),
      combo: 0,
      logs: [`${this.def.name}を倒した！`],
      outcome: 'win',
    };
  }

  private loseFrame(): Frame {
    this.outcome = 'lose';
    this.run.result = 'lose';
    this.run.killedBy = this.def.name;
    return {
      type: 'end',
      board: this.board.snapshot(),
      cleared: [],
      popups: [],
      hud: this.hud(),
      combo: 0,
      logs: ['力尽きた……'],
      outcome: 'lose',
    };
  }

  // ───────── 敵ターン ─────────

  private endOfTurn(): Frame[] {
    const frames: Frame[] = [];
    const popups: Popup[] = [];
    const logs: string[] = [];

    // 敵の毒
    if (this.enemy.poison > 0) {
      const d = this.enemy.poison;
      this.enemy.hp -= d;
      this.run.stats.damage += d;
      this.enemy.poison--;
      popups.push({ text: `毒 -${d}`, at: 'enemy', color: '#c08bff' });
      logs.push(`毒で ${this.def.name} に ${d} ダメージ`);
      this.checkEnemyDeath(popups, logs);
    }
    if (this.outcome === 'win') {
      frames.push(this.statusFrame(popups, logs));
      frames.push(this.winFrame());
      return frames;
    }

    // 盤面の呪い
    const curses = this.board.count((c) => c.kind === 'curse');
    if (curses > 0) {
      this.run.hp -= curses;
      popups.push({ text: `呪い -${curses}`, at: 'player', color: '#ff8af0' });
      logs.push(`呪いで ${curses} ダメージ`);
    }
    // 自分の毒
    if (this.playerPoison > 0) {
      const d = this.playerPoison;
      this.run.hp -= d;
      this.playerPoison--;
      popups.push({ text: `毒 -${d}`, at: 'player', color: '#c08bff' });
      logs.push(`毒で ${d} ダメージ`);
    }
    // 凍結のカウントダウン
    for (const { cell } of this.board.cells()) if (cell.frozen > 0) cell.frozen--;

    if (popups.length) frames.push(this.statusFrame(popups, logs, popups.some((p) => p.at === 'player') ? 'player' : undefined));
    if (this.run.hp <= 0) {
      frames.push(this.loseFrame());
      return frames;
    }

    this.enemy.timer--;
    if (this.enemy.timer <= 0) {
      frames.push(this.enemyAct());
      if (this.run.hp <= 0) {
        frames.push(this.loseFrame());
        return frames;
      }
    }

    if (!this.board.hasAnyMove()) {
      this.shuffleBoard();
      frames.push({
        type: 'shuffle',
        board: this.board.snapshot(),
        cleared: [],
        popups: [],
        hud: this.hud(),
        combo: 0,
        logs: ['手詰まり：盤面をシャッフル'],
      });
    }

    // HUD（タイマー表示）を必ず更新する
    if (frames.length === 0) frames.push(this.statusFrame([], []));
    else frames[frames.length - 1].hud = this.hud();
    return frames;
  }

  private statusFrame(popups: Popup[], logs: string[], shake?: 'enemy' | 'player'): Frame {
    return {
      type: 'status',
      board: this.board.snapshot(),
      cleared: [],
      popups,
      hud: this.hud(),
      combo: 0,
      shake,
      logs,
    };
  }

  private enemyAct(): Frame {
    const a = this.currentAction();
    const popups: Popup[] = [];
    const logs: string[] = [`${this.def.name}：${actionLabel(a, this.atkMult)}`];
    let shake: 'player' | undefined;
    const pickCells = (n: number, pred: (c: Cell) => boolean) =>
      this.rng.sample(
        this.board.cells().filter((x) => pred(x.cell)),
        n,
      );

    for (const e of a.fx) {
      switch (e.t) {
        case 'attack': {
          const hits = e.hits ?? 1;
          const v = Math.round(e.v * this.atkMult);
          for (let i = 0; i < hits; i++) {
            const absorbed = Math.min(this.block, v);
            this.block -= absorbed;
            const d = v - absorbed;
            this.run.hp -= d;
            popups.push(
              d > 0
                ? { text: `-${d}`, at: 'player', color: '#ff6b6b', big: true }
                : { text: 'ガード', at: 'player', color: '#7cb3ff', big: true },
            );
            if (absorbed > 0 && d > 0) logs.push(`防御で ${absorbed} 軽減、${d} ダメージ`);
            else if (d > 0) logs.push(`${d} ダメージを受けた`);
            else logs.push('攻撃を防ぎきった');
            if (d > 0) shake = 'player';
          }
          break;
        }
        case 'stone':
          for (const x of pickCells(e.n, (c) => !c.stone && c.kind !== 'curse')) {
            x.cell.stone = true;
            x.cell.frozen = 0;
          }
          break;
        case 'freeze':
          for (const x of pickCells(e.n, (c) => !c.stone && c.frozen <= 0 && c.kind !== 'curse')) {
            x.cell.frozen = e.turns;
          }
          break;
        case 'curseBoard':
          for (const x of pickCells(e.n, (c) => !c.stone && c.kind !== 'curse')) {
            x.cell.kind = 'curse';
            x.cell.frozen = 0;
          }
          break;
        case 'curseBag':
          for (let i = 0; i < e.n; i++) this.putBack('curse');
          logs.push(`袋に呪いが ${e.n} 個混ざった（引いたら消える）`);
          break;
        case 'poison':
          this.playerPoison += e.n;
          popups.push({ text: `毒+${e.n}`, at: 'player', color: '#c08bff' });
          break;
        case 'steal': {
          const s = Math.min(this.run.gold, e.n);
          this.run.gold -= s;
          popups.push({ text: `-${s}G`, at: 'player', color: '#ffd84d' });
          if (s > 0) logs.push(`${s} ゴールド盗まれた`);
          break;
        }
        case 'heal': {
          const before = this.enemy.hp;
          this.enemy.hp = Math.min(this.enemy.maxHp, this.enemy.hp + e.n);
          popups.push({ text: `+${this.enemy.hp - before}`, at: 'enemy', color: '#5ee08a' });
          break;
        }
        case 'armor':
          this.enemy.armor += e.n;
          popups.push({ text: `装甲+${e.n}`, at: 'enemy', color: '#c9d1d9' });
          break;
        case 'shuffle':
          this.shuffleBoard();
          break;
      }
    }

    this.block = 0;
    this.enemy.idx = (this.enemy.idx + 1) % this.def.actions.length;
    this.enemy.timer = this.currentAction().cd;

    return {
      type: 'enemy',
      board: this.board.snapshot(),
      cleared: [],
      popups,
      hud: this.hud(),
      combo: 0,
      shake,
      logs,
    };
  }
}
