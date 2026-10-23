import Phaser from 'phaser';
import { PLAYER_KINDS } from '../../core/pieces';
import { randomSeed } from '../../core/rng';
import { Run } from '../../core/run';
import { clearLog, loadBest, log, updateBagPanel } from '../bridge';
import { C, H, W, background, button, fadeIn, go, panel, txt } from '../theme';
import { closeModal, modal } from '../ui';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    background(this);
    fadeIn(this);
    updateBagPanel(null);

    // 背景でゆっくり落ちるピース
    for (let i = 0; i < 16; i++) {
      const k = PLAYER_KINDS[i % PLAYER_KINDS.length];
      const img = this.add
        .image(Phaser.Math.Between(40, W - 40), Phaser.Math.Between(-H, H), `piece_${k}`)
        .setDisplaySize(72, 72)
        .setAlpha(0.14)
        .setAngle(Phaser.Math.Between(-20, 20));
      this.tweens.add({
        targets: img,
        y: H + 100,
        duration: Phaser.Math.Between(9000, 16000),
        repeat: -1,
        onRepeat: () => {
          img.y = -100;
          img.x = Phaser.Math.Between(40, W - 40);
        },
      });
    }

    // ロゴ
    const bagY = 400;
    const g = this.add.graphics();
    g.fillStyle(0x6b4a2b, 1);
    g.fillRoundedRect(W / 2 - 120, bagY - 70, 240, 200, { tl: 40, tr: 40, bl: 90, br: 90 });
    g.fillStyle(0x8a6239, 1);
    g.fillRoundedRect(W / 2 - 110, bagY - 64, 220, 180, { tl: 36, tr: 36, bl: 84, br: 84 });
    g.fillStyle(0x5a3c21, 1);
    g.fillRoundedRect(W / 2 - 80, bagY - 92, 160, 34, 14);
    g.lineStyle(6, 0xffc857, 1);
    g.lineBetween(W / 2 - 70, bagY - 60, W / 2 + 70, bagY - 60);
    const pk = ['sword', 'fire', 'shield', 'coin'] as const;
    pk.forEach((k, i) => {
      const img = this.add.image(W / 2 - 75 + i * 50, bagY - 110 - (i % 2) * 24, `piece_${k}`).setDisplaySize(64, 64);
      this.tweens.add({ targets: img, y: img.y - 10, duration: 900 + i * 120, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    txt(this, W / 2, 620, 'ピースバッグ', 96, '#ffe8b0', { stroke: '#3a2205', strokeThickness: 14 });
    txt(this, W / 2, 700, '（仮題）', 24, C.sub, { fontStyle: '500' });
    txt(this, W / 2, 760, '袋を組んで、揃えて、潜る。', 30, C.text, { fontStyle: '500' });

    button(this, W / 2, 900, 420, 104, 'はじめる', () => this.start(), { size: 40 });
    button(this, W / 2, 1030, 300, 80, '遊び方', () => this.howTo(), { color: 0xd9d2e9, size: 28 });

    const b = loadBest();
    const best =
      b.runs === 0
        ? 'まだ記録はありません'
        : `最高到達：${b.bestFloor > 3 ? '踏破' : `第${b.bestFloor}層`}　踏破 ${b.wins} / ${b.runs} 回`;
    txt(this, W / 2, 1140, best, 22, C.sub, { fontStyle: '500' });
    txt(this, W / 2, H - 40, 'v0.1.2 プロトタイプ', 18, C.dim, { fontStyle: '500' });
  }

  private start(): void {
    const q = new URLSearchParams(location.search).get('seed');
    const seed = q !== null && /^\d+$/.test(q) ? Number(q) >>> 0 : randomSeed();
    const run = new Run(seed);
    this.registry.set('floorShown2', false);
    this.registry.set('floorShown3', false);
    this.registry.set('run', run);
    clearLog();
    log(`ラン開始（seed ${seed}）`);
    updateBagPanel(run);
    go(this, 'Map');
  }

  private howTo(): void {
    const m = modal(this);
    m.add(panel(this, W / 2, H / 2, 660, 1080, C.panel, 24));
    m.add(txt(this, W / 2, H / 2 - 460, '遊び方', 40));
    const body = [
      '■ 隣のピースと入れ替えて、3つ以上そろえる',
      '　そろったピースが消えて効果が出る',
      '　剣・炎＝攻撃　盾＝防御　金貨＝お金',
      '　連鎖するほど効果が上がる（2連鎖 ×1.25 …）',
      '',
      '■ 1手ごとに敵の予告が1つ進む',
      '　0になると行動。盾の防御は敵が動くまで残る',
      '',
      '■ 消えた分は「袋」から補充される',
      '　勝つと報酬で袋をいじれる（追加・強化・抜く）',
      '　袋が薄いほど、狙った種類がそろいやすい',
      '',
      '■ 敵の邪魔',
      '　石化：動かせない。隣で消すと解ける',
      '　凍結：数ターン動かせない。揃えれば消える',
      '　呪い：盤面にある間ダメージ。隣で消すと壊れる',
      '',
      '■ 3層を越えて最深部の主を倒せば踏破',
      '',
      '操作：ドラッグ or 2回タップで入れ替え',
      '　　　長押しで説明、敵タップで行動パターン',
    ].join('\n');
    m.add(
      txt(this, W / 2 - 290, H / 2 - 390, body, 22, C.text, {
        fontStyle: '500',
        lineSpacing: 10,
      }).setOrigin(0, 0),
    );
    m.add(button(this, W / 2, H / 2 + 460, 280, 80, '閉じる', () => closeModal(this, m)));
  }
}
