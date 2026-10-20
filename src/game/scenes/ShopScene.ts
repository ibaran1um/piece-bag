import Phaser from 'phaser';
import { PIECES } from '../../core/pieces';
import type { Run, ShopItem } from '../../core/run';
import { log, updateBagPanel } from '../bridge';
import { C, W, background, button, fadeIn, go, panel, txt } from '../theme';
import { bagOverlay, kindPicker, pieceIcon } from '../ui';

export class ShopScene extends Phaser.Scene {
  private run!: Run;

  constructor() {
    super('Shop');
  }

  create(): void {
    this.run = this.registry.get('run') as Run;
    const r = this.run;
    background(this, 0x1c1a14);
    fadeIn(this);
    updateBagPanel(r);

    txt(this, W / 2, 100, 'ショップ', 56, '#ffe8b0');
    txt(this, W / 2, 168, `所持 ${r.gold} G　／　HP ${r.hp} / ${r.maxHp}`, 26, '#ffd84d');

    const items = r.makeShop();
    items.forEach((it, i) => this.row(it, 290 + i * 150));

    button(this, W / 2 - 150, 1180, 260, 80, '立ち去る', () => {
      r.advance();
      go(this, 'Map');
    }, { color: 0x6f6884, textColor: '#ffffff', size: 28 });
    button(this, W / 2 + 150, 1180, 260, 80, '袋を見る', () => bagOverlay(this, r), { color: 0xd9d2e9, size: 26 });
  }

  private row(it: ShopItem, y: number): void {
    const r = this.run;
    const d = r.describe(it.reward);
    panel(this, W / 2, y, 660, 132, it.sold ? 0x1a1722 : C.panel, 20);
    const alpha = it.sold ? 0.35 : 1;
    if (d.kind) pieceIcon(this, 100, y, d.kind, 84).setAlpha(alpha);
    else if (it.reward.type === 'heal') txt(this, 100, y, '♥', 60, '#7ee2a0').setAlpha(alpha);
    else txt(this, 100, y, '✂', 56, '#ff8a8a').setAlpha(alpha);
    txt(this, 160, y - 24, d.title, 28).setOrigin(0, 0.5).setAlpha(alpha);
    txt(this, 160, y + 22, d.desc, 19, C.sub, { fontStyle: '500', wordWrap: { width: 330, useAdvancedWrap: true } })
      .setOrigin(0, 0.5)
      .setAlpha(alpha);

    const can = !it.sold && r.gold >= it.price;
    button(
      this,
      590,
      y,
      150,
      84,
      it.sold ? '購入済' : `${it.price} G`,
      () => {
        if (it.reward.type === 'removeAny') {
          kindPicker(this, r, '袋から抜く種類を選ぶ', (k) => {
            if (r.buy(it, k)) {
              log(`ショップ：${PIECES[k].name}を1個抜いた（-${it.price}G）`);
              this.scene.restart();
            }
          });
          return;
        }
        if (r.buy(it)) {
          log(`ショップ：${d.title}（-${it.price}G）`);
          this.scene.restart();
        }
      },
      { disabled: !can, size: 28 },
    );
  }
}
