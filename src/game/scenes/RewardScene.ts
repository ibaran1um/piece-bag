import Phaser from 'phaser';
import type { Reward, Run } from '../../core/run';
import { log, updateBagPanel } from '../bridge';
import { C, W, background, button, fadeIn, go, txt } from '../theme';
import { bagOverlay, pieceIcon } from '../ui';

interface Data {
  gold: number;
  healed: number;
  boss: boolean;
  name: string;
}

export class RewardScene extends Phaser.Scene {
  private run!: Run;
  private picked = false;

  constructor() {
    super('Reward');
  }

  create(data: Data): void {
    this.run = this.registry.get('run') as Run;
    this.picked = false;
    const r = this.run;
    background(this);
    fadeIn(this);

    txt(this, W / 2, 120, '勝利！', 72, '#ffe066', { stroke: '#3a2205', strokeThickness: 12 });
    txt(this, W / 2, 200, `${data.name}を倒した`, 26, C.sub, { fontStyle: '500' });
    const lines = [`ゴールド +${data.gold}（所持 ${r.gold} G）`];
    if (data.healed > 0) lines.push(`階層突破：HP +${data.healed}`);
    lines.push(`HP ${r.hp} / ${r.maxHp}`);
    txt(this, W / 2, 270, lines.join('\n'), 26, C.text, { align: 'center', lineSpacing: 8 });

    txt(this, W / 2, 400, '報酬を1つ選ぶ', 34);

    const opts = r.rewardOptions();
    opts.forEach((o, i) => this.card(o, 540 + i * 190));

    button(this, W / 2 - 150, 1150, 260, 76, 'スキップ', () => this.next(), { color: 0x6f6884, textColor: '#ffffff', size: 26 });
    button(this, W / 2 + 150, 1150, 260, 76, '袋を見る', () => bagOverlay(this, r), { color: 0xd9d2e9, size: 26 });
  }

  private card(o: Reward, y: number): void {
    const d = this.run.describe(o);
    const w = 640;
    const h = 160;
    const cont = this.add.container(W / 2, y);
    const g = this.add.graphics();
    const accent = o.type === 'remove' ? 0xff8a8a : o.type === 'upgrade' ? C.gold : o.type === 'maxhp' ? 0x7ee2a0 : 0x7cb3ff;
    const draw = (hover: boolean) => {
      g.clear();
      g.fillStyle(hover ? C.panel2 : C.panel, 1);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 22);
      g.lineStyle(4, accent, hover ? 1 : 0.6);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, 22);
    };
    draw(false);
    cont.add(g);
    const tag = { add: '追加', upgrade: '強化', remove: '削除', maxhp: '体力', heal: '回復' }[o.type];
    if (d.kind) cont.add(pieceIcon(this, -w / 2 + 80, 0, d.kind, 100));
    else cont.add(txt(this, -w / 2 + 80, 0, '♥', 64, '#7ee2a0'));
    cont.add(txt(this, -w / 2 + 80, 58, tag, 18, '#ffffff', { backgroundColor: '#00000088', padding: { x: 8, y: 2 } }));
    cont.add(txt(this, -w / 2 + 160, -28, d.title, 32).setOrigin(0, 0.5));
    cont.add(
      txt(this, -w / 2 + 160, 24, d.desc, 20, C.sub, {
        fontStyle: '500',
        wordWrap: { width: 440, useAdvancedWrap: true },
      }).setOrigin(0, 0.5),
    );
    cont.setSize(w, h);
    // コンテナの当たり判定は左上(0,0)基準のローカル座標で計算される
    cont.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
    if (cont.input) cont.input.cursor = 'pointer';
    cont.on('pointerover', () => draw(true));
    cont.on('pointerout', () => draw(false));
    cont.on('pointerup', () => {
      if (this.picked) return;
      this.picked = true;
      this.run.applyReward(o);
      log(`報酬：${d.title}`);
      updateBagPanel(this.run);
      this.tweens.add({ targets: cont, scale: 1.06, duration: 120, yoyo: true, onComplete: () => this.next() });
    });
  }

  private next(): void {
    this.picked = true;
    this.run.advance();
    go(this, this.run.result === 'win' ? 'Result' : 'Map');
  }
}
