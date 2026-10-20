import Phaser from 'phaser';
import { FLOOR_NAMES } from '../../core/enemies';
import type { Run } from '../../core/run';
import { log, saveResult, updateBagPanel } from '../bridge';
import { C, W, background, button, fadeIn, go, panel, txt } from '../theme';

export class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  create(): void {
    const r = this.registry.get('run') as Run;
    background(this, r.result === 'win' ? 0x1f1c10 : 0x1a1016);
    fadeIn(this);
    updateBagPanel(r);
    const best = saveResult(r);
    const win = r.result === 'win';
    log(win ? '踏破！' : `${r.floor}F で力尽きた（${r.killedBy ?? ''}）`);

    txt(this, W / 2, 180, win ? '踏破！' : '力尽きた', 88, win ? '#ffe066' : '#ff8a8a', {
      stroke: '#0b0910',
      strokeThickness: 14,
    });
    txt(
      this,
      W / 2,
      280,
      win ? '最深部の主を討ち果たした' : `第${r.floor}層 ${FLOOR_NAMES[r.floor] ?? ''}　${r.killedBy ?? ''}に敗北`,
      26,
      C.sub,
      { fontStyle: '500' },
    );

    panel(this, W / 2, 560, 600, 400, C.panel, 24);
    const s = r.stats;
    const rows: [string, string][] = [
      ['倒した敵', `${s.battles}`],
      ['手数', `${s.turns}`],
      ['与えたダメージ', `${s.damage}`],
      ['最大連鎖', `${s.maxCombo}`],
      ['稼いだゴールド', `${s.goldEarned}`],
      ['袋の枚数', `${r.bagSize()}`],
      ['シード', `${r.seed}`],
    ];
    rows.forEach(([k, v], i) => {
      const y = 400 + i * 52;
      txt(this, 120, y, k, 26, C.sub, { fontStyle: '500' }).setOrigin(0, 0.5);
      txt(this, 600, y, v, 28, C.text).setOrigin(1, 0.5);
    });

    txt(
      this,
      W / 2,
      820,
      `通算　踏破 ${best.wins} / ${best.runs} 回　最高 ${best.bestFloor > 3 ? '踏破' : `第${best.bestFloor}層`}`,
      22,
      C.sub,
      { fontStyle: '500' },
    );

    button(this, W / 2, 960, 420, 100, 'もう一度', () => go(this, 'Title'), { size: 36 });
  }
}
