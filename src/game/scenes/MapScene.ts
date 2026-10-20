import Phaser from 'phaser';
import { ENEMIES, FLOOR_NAMES } from '../../core/enemies';
import { PLAYER_KINDS } from '../../core/pieces';
import { FLOOR_PLAN, MAX_FLOOR, type NodeType, type Run } from '../../core/run';
import { log, updateBagPanel } from '../bridge';
import { C, W, background, button, fadeIn, go, panel, txt } from '../theme';
import { bagOverlay, banner, pieceIcon } from '../ui';

const NODE_LABEL: Record<NodeType, [string, string]> = {
  battle: ['戦', '戦闘'],
  camp: ['営', '野営地（ショップ or 休憩）'],
  boss: ['主', 'ボス'],
};

export class MapScene extends Phaser.Scene {
  private run!: Run;

  constructor() {
    super('Map');
  }

  create(): void {
    this.run = this.registry.get('run') as Run;
    const r = this.run;
    background(this);
    fadeIn(this);
    updateBagPanel(r);

    // 階層の見出し
    txt(this, W / 2, 70, `第${r.floor}層`, 30, C.sub);
    txt(this, W / 2, 120, FLOOR_NAMES[r.floor], 48, '#ffe8b0');
    for (let f = 1; f <= MAX_FLOOR; f++) {
      const g = this.add.graphics();
      g.fillStyle(f < r.floor ? C.gold : f === r.floor ? 0xffffff : C.line, 1);
      g.fillCircle(W / 2 - 40 + (f - 1) * 40, 170, f === r.floor ? 9 : 7);
    }

    // ステータス
    panel(this, W / 2, 250, W - 60, 100, C.panel, 20);
    txt(this, 70, 232, `HP ${r.hp} / ${r.maxHp}`, 28, r.hp < r.maxHp * 0.3 ? '#f59e0b' : '#7ee2a0').setOrigin(0, 0.5);
    txt(this, 70, 272, `${r.gold} G`, 26, '#ffd84d').setOrigin(0, 0.5);
    PLAYER_KINDS.filter((k) => r.bag[k] > 0).forEach((k, i) => {
      const x = 330 + i * 62;
      pieceIcon(this, x, 236, k, 46);
      txt(this, x, 276, `${r.bag[k]}`, 20, C.text);
    });

    // 道のり
    const top = 380;
    const step = 128;
    const line = this.add.graphics();
    line.lineStyle(6, C.line, 1);
    line.lineBetween(150, top, 150, top + step * (FLOOR_PLAN.length - 1));
    FLOOR_PLAN.forEach((n, i) => {
      const y = top + i * step;
      const done = i < r.step;
      const cur = i === r.step;
      const g = this.add.graphics();
      const col = n === 'boss' ? 0xb3262e : n === 'camp' ? 0x2f7a4f : 0x4a4068;
      g.fillStyle(done ? 0x2a2538 : col, 1);
      g.fillCircle(150, y, cur ? 48 : 40);
      if (cur) {
        const ring = this.add.circle(150, y, 56).setStrokeStyle(5, C.gold, 1);
        this.tweens.add({ targets: ring, scale: 1.12, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });
      }
      txt(this, 150, y, done ? '済' : NODE_LABEL[n][0], 34, done ? C.dim : '#ffffff');
      let label = NODE_LABEL[n][1];
      if (n === 'boss') {
        const boss = ENEMIES.find((e) => e.floor === r.floor && e.boss);
        if (boss) label = `ボス：${boss.name}`;
      }
      txt(this, 230, y, label, cur ? 30 : 26, done ? C.dim : cur ? '#ffffff' : C.sub).setOrigin(0, 0.5);
    });

    // 行動
    const node = r.node();
    const by = 1080;
    if (node === 'camp') {
      const heal = r.restAmount();
      button(this, W / 2 - 160, by, 290, 110, 'ショップ', () => go(this, 'Shop'), {
        color: C.gold,
        sub: `所持 ${r.gold} G`,
        size: 34,
      });
      button(
        this,
        W / 2 + 160,
        by,
        290,
        110,
        '休憩',
        () => {
          const h = r.heal(heal);
          log(`休憩して ${h} 回復`);
          r.advance();
          this.scene.restart();
        },
        { color: 0x7ee2a0, sub: `HP +${Math.min(heal, r.maxHp - r.hp)}`, size: 34 },
      );
    } else {
      button(this, W / 2, by, 440, 110, node === 'boss' ? 'ボスに挑む' : '戦闘へ', () => go(this, 'Battle'), {
        color: node === 'boss' ? 0xff7a7a : C.gold,
        size: 38,
      });
    }
    button(this, W / 2, 1200, 240, 64, '袋を見る', () => bagOverlay(this, r), { color: 0xd9d2e9, size: 24 });

    if (r.step === 0 && r.floor > 1 && !this.registry.get(`floorShown${r.floor}`)) {
      this.registry.set(`floorShown${r.floor}`, true);
      void banner(this, `第${r.floor}層　${FLOOR_NAMES[r.floor]}`, '#ffe8b0', 640, 700);
    }
  }
}
