import Phaser from 'phaser';
import { Battle, type Frame, type Hud, type Popup } from '../../core/battle';
import { COLS, ROWS, adjacent } from '../../core/board';
import { actionLabel, FLOOR_NAMES } from '../../core/enemies';
import { PIECES, type Cell, type Kind, type Pos } from '../../core/pieces';
import { FLOOR_PLAN, MAX_FLOOR, type Run } from '../../core/run';
import { log, updateBagPanel } from '../bridge';
import { C, W, background, button, fadeIn, go, panel, tweenP, txt, wait } from '../theme';
import { bagOverlay, banner, infoBox } from '../ui';

const CS = 92;
const BX = (W - CS * COLS) / 2;
const BY = 604;
const PIECE = CS - 6;
const ENEMY_Y = 300;

const cx = (c: number) => BX + c * CS + CS / 2;
const cy = (r: number) => BY + r * CS + CS / 2;

interface CellView {
  cont: Phaser.GameObjects.Container;
  img: Phaser.GameObjects.Image;
  stone: Phaser.GameObjects.Image;
  ice: Phaser.GameObjects.Image;
  iceTxt: Phaser.GameObjects.Text;
  kind: Kind;
}

interface DragState {
  start: Pos;
  x: number;
  y: number;
  moved: boolean;
  longPressed: boolean;
  timer?: Phaser.Time.TimerEvent;
}

export class BattleScene extends Phaser.Scene {
  private run!: Run;
  private bt!: Battle;
  private views = new Map<number, CellView>();
  private layer!: Phaser.GameObjects.Container;
  private busy = false;
  private selected: Pos | null = null;
  private selImg!: Phaser.GameObjects.Image;
  private drag: DragState | null = null;
  private info: Phaser.GameObjects.Container | null = null;
  private emitters = new Map<Kind, Phaser.GameObjects.Particles.ParticleEmitter>();

  // HUD
  private enemyImg!: Phaser.GameObjects.Image;
  private enemyHpG!: Phaser.GameObjects.Graphics;
  private enemyHpT!: Phaser.GameObjects.Text;
  private enemyChips!: Phaser.GameObjects.Text;
  private intentG!: Phaser.GameObjects.Graphics;
  private intentTimer!: Phaser.GameObjects.Text;
  private intentTimerSub!: Phaser.GameObjects.Text;
  private intentLabel!: Phaser.GameObjects.Text;
  private intentSub!: Phaser.GameObjects.Text;
  private hpG!: Phaser.GameObjects.Graphics;
  private hpT!: Phaser.GameObjects.Text;
  private blockT!: Phaser.GameObjects.Text;
  private statusT!: Phaser.GameObjects.Text;
  private goldT!: Phaser.GameObjects.Text;

  constructor() {
    super('Battle');
  }

  create(): void {
    this.run = this.registry.get('run') as Run;
    const def = this.run.pickEnemy();
    this.bt = new Battle(this.run, def);
    this.views.clear();
    this.busy = false;
    this.selected = null;
    this.drag = null;
    this.info = null;

    background(this, def.boss ? 0x24131e : C.bg);
    fadeIn(this);
    this.buildTopBar();
    this.buildEnemy();
    this.buildPlayerBar();
    this.buildBoard();
    this.buildEmitters();

    this.syncBoard(this.bt.board.snapshot(), false);
    this.updateHud(this.bt.hud());
    this.bindInput();

    log(`── ${this.run.floor}F ${def.name} ──`);
    updateBagPanel(this.run);
    if (def.boss) banner(this, `BOSS　${def.name}`, '#ff8a8a', 900, 600);
  }

  // ───────── 構築 ─────────

  private buildTopBar(): void {
    const r = this.run;
    panel(this, W / 2, 40, W - 24, 64, C.panel, 16);
    txt(this, 34, 40, `${r.floor}F ${FLOOR_NAMES[r.floor]}　${r.step + 1}/${FLOOR_PLAN.length}`, 22, C.sub).setOrigin(0, 0.5);
    this.goldT = txt(this, 520, 40, '', 26, '#ffd84d').setOrigin(1, 0.5);
    button(this, 624, 38, 150, 50, '袋を見る', () => bagOverlay(this, this.run, this.bt.tempCurses), {
      size: 22,
      color: 0xd9d2e9,
    });
  }

  private buildEnemy(): void {
    const def = this.bt.def;
    // 予告
    // 予告は敵の絵より手前に出す
    this.intentG = this.add.graphics().setDepth(5);
    this.intentTimer = txt(this, 112, 116, '', 44, '#ffffff').setDepth(6);
    this.intentTimerSub = txt(this, 112, 150, '', 16, C.sub, { fontStyle: '500' }).setDepth(6);
    this.intentLabel = txt(this, 176, 106, '', 30, '#ffffff').setOrigin(0, 0.5).setDepth(6);
    this.intentSub = txt(this, 176, 142, '', 19, C.sub, { fontStyle: '500' }).setOrigin(0, 0.5).setDepth(6);

    const scale = def.boss ? 1.15 : 1.0;
    this.enemyImg = this.add.image(W / 2, ENEMY_Y, `enemy_${def.id}`).setScale(scale);
    this.tweens.add({
      targets: this.enemyImg,
      y: ENEMY_Y - 8,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    txt(this, W / 2, 448, def.name, 30);
    this.enemyHpG = this.add.graphics();
    this.enemyHpT = txt(this, W / 2, 484, '', 20, '#ffffff');
    this.enemyChips = txt(this, W / 2, 518, '', 20, C.sub, { fontStyle: '500' });
  }

  private buildPlayerBar(): void {
    this.hpG = this.add.graphics();
    this.hpT = txt(this, 200, 562, '', 20, '#ffffff');
    this.blockT = txt(this, 452, 562, '', 22, '#7cb3ff').setOrigin(0, 0.5);
    this.statusT = txt(this, 600, 562, '', 20, '#c08bff').setOrigin(0, 0.5);
  }

  private buildBoard(): void {
    const g = this.add.graphics();
    g.fillStyle(0x0b0910, 0.9);
    g.fillRoundedRect(BX - 10, BY - 10, CS * COLS + 20, CS * ROWS + 20, 22);
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        g.fillStyle((r + c) % 2 ? 0x1a1724 : 0x1f1b2b, 1);
        g.fillRoundedRect(BX + c * CS + 2, BY + r * CS + 2, CS - 4, CS - 4, 12);
      }
    this.layer = this.add.container(0, 0);
    const mask = this.make.graphics({ x: 0, y: 0 }, false);
    mask.fillStyle(0xffffff);
    mask.fillRect(BX - 6, BY - 6, CS * COLS + 12, CS * ROWS + 12);
    this.layer.setMask(mask.createGeometryMask());
    this.selImg = this.add.image(0, 0, 'sel').setDisplaySize(PIECE + 6, PIECE + 6).setVisible(false).setDepth(10);
    this.tweens.add({ targets: this.selImg, alpha: 0.45, duration: 380, yoyo: true, repeat: -1 });
  }

  private buildEmitters(): void {
    for (const k of Object.keys(PIECES) as Kind[]) {
      const e = this.add.particles(0, 0, 'dot', {
        speed: { min: 90, max: 260 },
        lifespan: 380,
        scale: { start: 0.9, end: 0 },
        tint: PIECES[k].color === 0x3b0a45 ? 0xff2bd6 : PIECES[k].color,
        emitting: false,
      });
      e.setDepth(20);
      this.emitters.set(k, e);
    }
  }

  // ───────── 盤面の描画 ─────────

  private makeView(cell: Cell, x: number, y: number): CellView {
    const cont = this.add.container(x, y);
    const img = this.add.image(0, 0, `piece_${cell.kind}`).setDisplaySize(PIECE, PIECE);
    const stone = this.add.image(0, 0, 'ov_stone').setDisplaySize(PIECE, PIECE).setVisible(cell.stone);
    const ice = this.add.image(0, 0, 'ov_ice').setDisplaySize(PIECE, PIECE).setVisible(cell.frozen > 0);
    const iceTxt = txt(this, 28, 28, String(cell.frozen), 22, '#0b3b5c').setVisible(cell.frozen > 0);
    cont.add([img, stone, ice, iceTxt]);
    this.layer.add(cont);
    const v = { cont, img, stone, ice, iceTxt, kind: cell.kind };
    this.views.set(cell.id, v);
    return v;
  }

  private updateLook(v: CellView, cell: Cell, animate: boolean): void {
    let changed = false;
    if (v.kind !== cell.kind) {
      v.kind = cell.kind;
      v.img.setTexture(`piece_${cell.kind}`).setDisplaySize(PIECE, PIECE);
      changed = true;
    }
    if (v.stone.visible !== cell.stone) {
      v.stone.setVisible(cell.stone);
      changed = true;
    }
    const fr = cell.frozen > 0;
    if (v.ice.visible !== fr) changed = true;
    v.ice.setVisible(fr);
    v.iceTxt.setVisible(fr).setText(String(cell.frozen));
    if (changed && animate) {
      v.cont.setScale(1.25);
      this.tweens.add({ targets: v.cont, scale: 1, duration: 260, ease: 'Back.easeOut' });
    }
  }

  private async syncBoard(snap: (Cell | null)[][], animate: boolean, ease = 'Quad.easeIn'): Promise<void> {
    const spawnPerCol = Array(COLS).fill(0) as number[];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const cell = snap[r][c];
        if (cell && !this.views.has(cell.id)) spawnPerCol[c]++;
      }
    const seen = new Set<number>();
    let maxDur = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = snap[r][c];
        if (!cell) continue;
        seen.add(cell.id);
        const tx = cx(c);
        const ty = cy(r);
        let v = this.views.get(cell.id);
        if (!v) {
          v = this.makeView(cell, tx, animate ? cy(r - spawnPerCol[c]) : ty);
        } else {
          this.updateLook(v, cell, animate);
        }
        if (v.cont.x !== tx || v.cont.y !== ty) {
          if (animate) {
            const dist = (Math.abs(ty - v.cont.y) + Math.abs(tx - v.cont.x)) / CS;
            const dur = Math.min(440, 120 + 60 * dist);
            maxDur = Math.max(maxDur, dur);
            this.tweens.add({ targets: v.cont, x: tx, y: ty, duration: dur, ease });
          } else {
            v.cont.setPosition(tx, ty);
          }
        }
      }
    }
    for (const [id, v] of this.views) {
      if (!seen.has(id)) {
        v.cont.destroy();
        this.views.delete(id);
      }
    }
    if (animate && maxDur > 0) await wait(this, maxDur + 30);
  }

  private async clearAnim(ids: number[]): Promise<void> {
    for (const id of ids) {
      const v = this.views.get(id);
      if (!v) continue;
      this.emitters.get(v.kind)?.explode(7, v.cont.x, v.cont.y);
      this.tweens.add({ targets: v.cont, scale: 1.3, alpha: 0, duration: 170, ease: 'Quad.easeOut' });
    }
    await wait(this, 180);
    for (const id of ids) {
      const v = this.views.get(id);
      if (v) {
        v.cont.destroy();
        this.views.delete(id);
      }
    }
  }

  // ───────── HUD ─────────

  private updateHud(h: Hud): void {
    this.goldT.setText(`${h.gold} G`);

    // 敵HP
    const bw = 440;
    const bx = W / 2 - bw / 2;
    const g = this.enemyHpG;
    g.clear();
    g.fillStyle(0x0b0910, 1);
    g.fillRoundedRect(bx - 4, 470, bw + 8, 30, 10);
    g.fillStyle(0x4a1d24, 1);
    g.fillRoundedRect(bx, 474, bw, 22, 8);
    const ratio = Math.max(0, h.enemyHp / h.enemyMax);
    if (ratio > 0) {
      g.fillStyle(h.enraged ? 0xff3355 : 0xe5484d, 1);
      g.fillRoundedRect(bx, 474, Math.max(16, bw * ratio), 22, 8);
    }
    if (h.enemyPoison > 0 && ratio > 0) {
      const pw = Math.min(bw * ratio, (bw * h.enemyPoison) / h.enemyMax);
      g.fillStyle(0xa855f7, 0.75);
      g.fillRect(bx + bw * ratio - pw, 474, pw, 22);
    }
    this.enemyHpT.setText(`${h.enemyHp} / ${h.enemyMax}`);
    const chips: string[] = [];
    if (h.armor) chips.push(`装甲 ${h.armor}`);
    if (h.enemyPoison) chips.push(`毒 ${h.enemyPoison}`);
    if (h.enraged) chips.push('激昂');
    this.enemyChips.setText(chips.join('　'));
    this.enemyImg.setTint(h.enraged ? 0xffa0a0 : 0xffffff);

    // 予告
    const soon = h.timer <= 1;
    const ig = this.intentG;
    ig.clear();
    ig.fillStyle(0x0d0b14, 0.92);
    ig.fillRoundedRect(56, 74, W - 112, 96, 20);
    ig.lineStyle(3, soon ? 0xff5c5c : C.line, 1);
    ig.strokeRoundedRect(56, 74, W - 112, 96, 20);
    ig.fillStyle(soon ? 0xb3262e : C.panel2, 1);
    ig.fillCircle(112, 122, 38);
    this.intentTimer.setText(String(h.timer));
    this.intentTimerSub.setText(soon ? '次' : 'ターン');
    this.intentLabel.setText(h.intent).setColor(h.intentDamage > 0 ? '#ffb3b3' : '#e8dcff');
    let sub = soon ? '次のターンに行動！' : `あと ${h.timer} ターンで行動`;
    if (h.intentDamage > 0) {
      const after = Math.max(0, h.intentDamage - h.block);
      sub += h.block > 0 ? `　防御込みで ${after} ダメージ` : '　盾で防げる';
    }
    this.intentSub.setText(sub);

    // 自分
    const pg = this.hpG;
    pg.clear();
    const px = 40;
    const pw = 380;
    pg.fillStyle(0x0b0910, 1);
    pg.fillRoundedRect(px - 4, 547, pw + 8, 30, 10);
    pg.fillStyle(0x1d3a26, 1);
    pg.fillRoundedRect(px, 551, pw, 22, 8);
    const pr = Math.max(0, h.hp / h.maxHp);
    if (pr > 0) {
      pg.fillStyle(pr < 0.3 ? 0xf59e0b : 0x22c55e, 1);
      pg.fillRoundedRect(px, 551, Math.max(16, pw * pr), 22, 8);
    }
    this.hpT.setText(`HP ${h.hp} / ${h.maxHp}`).setX(px + pw / 2);
    this.blockT.setText(h.block ? `防御 ${h.block}` : '');
    const st: string[] = [];
    if (h.playerPoison) st.push(`毒 ${h.playerPoison}`);
    this.statusT.setText(st.join(' ')).setX(this.blockT.text ? 452 + this.blockT.width + 16 : 452);
  }

  private popups(ps: Popup[]): void {
    let ei = 0;
    let pi = 0;
    for (const p of ps) {
      let x = W / 2;
      let y = ENEMY_Y;
      if (p.at === 'enemy') {
        x = W / 2 + (ei % 2 ? 110 : -110) + Phaser.Math.Between(-20, 20);
        y = ENEMY_Y - 40 + ei * 34;
        ei++;
      } else if (p.at === 'player') {
        x = 230 + pi * 120;
        y = 520;
        pi++;
      } else if (p.r !== undefined && p.c !== undefined) {
        x = cx(p.c);
        y = cy(p.r);
      }
      const t = txt(this, x, y, p.text, p.big ? 52 : 30, p.color, {
        stroke: '#0b0910',
        strokeThickness: 8,
      }).setDepth(800);
      t.setScale(0.6);
      this.tweens.add({ targets: t, scale: 1, duration: 140, ease: 'Back.easeOut' });
      this.tweens.add({
        targets: t,
        y: y - 60,
        alpha: 0,
        delay: p.big ? 520 : 380,
        duration: 420,
        onComplete: () => t.destroy(),
      });
    }
  }

  private comboText(combo: number): void {
    const mult = (1 + 0.25 * combo).toFixed(2).replace(/0$/, '');
    const t = txt(this, W / 2, BY + 30, `${combo + 1}連鎖！ ×${mult}`, 46, '#ffe066', {
      stroke: '#3a2205',
      strokeThickness: 10,
    }).setDepth(810);
    t.setScale(0.5);
    this.tweens.add({ targets: t, scale: 1 + Math.min(combo, 6) * 0.06, duration: 160, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, y: BY - 10, delay: 450, duration: 300, onComplete: () => t.destroy() });
  }

  private shake(who: 'enemy' | 'player'): void {
    if (who === 'enemy') {
      this.enemyImg.setTintFill(0xffffff);
      this.time.delayedCall(70, () => this.enemyImg.setTint(this.bt.enemy.enraged ? 0xffa0a0 : 0xffffff));
      this.tweens.add({ targets: this.enemyImg, x: W / 2 + 12, duration: 45, yoyo: true, repeat: 2, onComplete: () => this.enemyImg.setX(W / 2) });
    } else {
      this.cameras.main.shake(160, 0.008);
      this.cameras.main.flash(120, 120, 20, 30);
    }
  }

  // ───────── 入力 ─────────

  private cellAt(x: number, y: number): Pos | null {
    const c = Math.floor((x - BX) / CS);
    const r = Math.floor((y - BY) / CS);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
    return { r, c };
  }

  private bindInput(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.hideInfo();
      if (this.busy) return;
      const pos = this.cellAt(p.x, p.y);
      if (!pos) {
        // 敵をタップ・長押しで説明
        if (p.y > 180 && p.y < 460) this.showEnemyInfo();
        return;
      }
      const d: DragState = { start: pos, x: p.x, y: p.y, moved: false, longPressed: false };
      d.timer = this.time.delayedCall(420, () => {
        if (this.drag === d && !d.moved) {
          d.longPressed = true;
          this.showCellInfo(pos);
        }
      });
      this.drag = d;
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const d = this.drag;
      if (!d || d.moved || d.longPressed || this.busy) return;
      const dx = p.x - d.x;
      const dy = p.y - d.y;
      if (Math.hypot(dx, dy) < 26) return;
      d.moved = true;
      d.timer?.remove();
      const target =
        Math.abs(dx) > Math.abs(dy)
          ? { r: d.start.r, c: d.start.c + Math.sign(dx) }
          : { r: d.start.r + Math.sign(dy), c: d.start.c };
      this.setSelected(null);
      void this.attemptSwap(d.start, target);
    });

    const up = (p: Phaser.Input.Pointer) => {
      const d = this.drag;
      this.drag = null;
      if (!d) return;
      d.timer?.remove();
      if (d.longPressed) {
        this.hideInfo();
        return;
      }
      if (d.moved || this.busy) return;
      const pos = this.cellAt(p.x, p.y);
      if (!pos) return;
      const s = this.selected;
      if (s && adjacent(s, pos)) {
        this.setSelected(null);
        void this.attemptSwap(s, pos);
      } else if (s && s.r === pos.r && s.c === pos.c) {
        this.setSelected(null);
      } else {
        this.setSelected(pos);
      }
    };
    this.input.on('pointerup', up);
    this.input.on('pointerupoutside', up);
  }

  private setSelected(p: Pos | null): void {
    this.selected = p;
    if (p) {
      const cell = this.bt.board.at(p.r, p.c);
      if (!cell || cell.stone || cell.frozen > 0) {
        this.selected = null;
        this.selImg.setVisible(false);
        this.nudge(p);
        return;
      }
      this.selImg.setPosition(cx(p.c), cy(p.r)).setVisible(true);
    } else {
      this.selImg.setVisible(false);
    }
  }

  private viewAt(p: Pos): CellView | undefined {
    const cell = this.bt.board.at(p.r, p.c);
    return cell ? this.views.get(cell.id) : undefined;
  }

  private nudge(p: Pos): void {
    const v = this.viewAt(p);
    if (!v) return;
    this.tweens.add({ targets: v.cont, x: cx(p.c) + 7, duration: 40, yoyo: true, repeat: 2, onComplete: () => v.cont.setX(cx(p.c)) });
  }

  private async attemptSwap(a: Pos, b: Pos): Promise<void> {
    if (this.busy || this.bt.outcome) return;
    if (!this.bt.board.inBounds(b)) return;
    const va = this.viewAt(a);
    const vb = this.viewAt(b);
    if (!va || !vb) return;
    if (!this.bt.canSwap(a, b)) {
      this.nudge(this.bt.board.at(a.r, a.c)?.stone || (this.bt.board.at(a.r, a.c)?.frozen ?? 0) > 0 ? a : b);
      return;
    }
    this.busy = true;
    const frames = this.bt.trySwap(a, b);
    if (!frames) {
      // 揃わない：行って戻る
      await Promise.all([
        tweenP(this, { targets: va.cont, x: cx(b.c), y: cy(b.r), duration: 110, yoyo: true, ease: 'Sine.easeInOut' }),
        tweenP(this, { targets: vb.cont, x: cx(a.c), y: cy(a.r), duration: 110, yoyo: true, ease: 'Sine.easeInOut' }),
      ]);
      this.busy = false;
      return;
    }
    await Promise.all([
      tweenP(this, { targets: va.cont, x: cx(b.c), y: cy(b.r), duration: 130, ease: 'Sine.easeInOut' }),
      tweenP(this, { targets: vb.cont, x: cx(a.c), y: cy(a.r), duration: 130, ease: 'Sine.easeInOut' }),
    ]);
    await this.playFrames(frames);
    updateBagPanel(this.run);
    if (!this.bt.outcome) this.busy = false;
  }

  private async playFrames(frames: Frame[]): Promise<void> {
    for (const f of frames) {
      for (const l of f.logs) log(l);
      if (f.type === 'enemy') {
        await tweenP(this, { targets: this.enemyImg, scale: this.enemyImg.scale * 1.12, duration: 110, yoyo: true, ease: 'Quad.easeOut' });
      }
      if (f.cleared.length) await this.clearAnim(f.cleared);
      if (f.type === 'cascade' && f.combo >= 1) this.comboText(f.combo);
      this.popups(f.popups);
      if (f.shake) this.shake(f.shake);
      this.updateHud(f.hud);
      if (f.type === 'shuffle') await banner(this, '手詰まり！ シャッフル', '#ffffff', BY + CS * 3.5, 300);
      await this.syncBoard(f.board, true, f.type === 'cascade' ? 'Quad.easeIn' : 'Sine.easeInOut');
      if (f.type === 'status' && f.popups.length) await wait(this, 220);
      if (f.type === 'enemy') await wait(this, 260);
      if (f.outcome) await this.finish(f.outcome);
    }
  }

  private async finish(outcome: 'win' | 'lose'): Promise<void> {
    this.busy = true;
    if (outcome === 'win') {
      this.tweens.killTweensOf(this.enemyImg);
      this.tweens.add({ targets: this.enemyImg, alpha: 0, scale: this.enemyImg.scale * 0.6, angle: 12, duration: 500 });
      await banner(this, '撃破！', '#ffe066', 860, 500);
      // 最深部の主を倒したら報酬は出さずにそのままクリア画面へ
      if (this.bt.def.boss && this.run.floor === MAX_FLOOR) {
        this.run.advance();
        updateBagPanel(this.run);
        go(this, 'Result');
        return;
      }
      let healed = 0;
      if (this.bt.def.boss) healed = this.run.heal(this.run.bossHealAmount());
      updateBagPanel(this.run);
      go(this, 'Reward', { gold: this.bt.rewardGold + this.bt.goldGained, healed, boss: !!this.bt.def.boss, name: this.bt.def.name });
    } else {
      await banner(this, '力尽きた……', '#ff8a8a', 860, 900);
      go(this, 'Result');
    }
  }

  // ───────── 説明 ─────────

  private hideInfo(): void {
    if (this.info) {
      this.info.destroy();
      this.info = null;
    }
  }

  private showCellInfo(p: Pos): void {
    const cell = this.bt.board.at(p.r, p.c);
    if (!cell) return;
    const k = cell.kind;
    let body = PIECES[k].desc(this.run.power(k));
    if (cell.stone) body += '\n【石化】動かせず揃わない。隣のピースを消すと解ける';
    if (cell.frozen > 0) body += `\n【凍結】あと ${cell.frozen} ターン動かせない。揃えれば消える`;
    const lv = this.run.level[k] ? `  Lv${this.run.level[k] + 1}` : '';
    this.info = infoBox(this, `${PIECES[k].name}${lv}`, body, p.r < 3 ? 1000 : 560, PIECES[k].color);
  }

  private showEnemyInfo(): void {
    const d = this.bt.def;
    const acts = d.actions.map((a, i) => `${i === this.bt.enemy.idx ? '▶' : '・'} ${a.cd}ターン後：${actionLabel(a, this.bt.atkMult)}`).join('\n');
    let extra = '';
    if (this.bt.enemy.armor) extra += `\n装甲 ${this.bt.enemy.armor}：剣のダメージを減らす（炎・毒は無視）`;
    if (d.revive) extra += '\n一度だけ復活する';
    if (d.enrage) extra += '\nHPが半分を切ると激昂する';
    const box = infoBox(this, d.name, `${d.desc}${extra}\n\n行動パターン（くり返し）\n${acts}`, 640, C.red);
    this.info = box;
    this.time.delayedCall(3200, () => {
      if (this.info === box) this.hideInfo();
    });
  }
}
