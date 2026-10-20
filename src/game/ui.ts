import Phaser from 'phaser';
import { PIECES, PLAYER_KINDS, type Kind } from '../core/pieces';
import type { Run } from '../core/run';
import { C, H, W, button, panel, txt } from './theme';

/** 画面全体を覆うモーダル。背面のタップを吸収する */
export function modal(scene: Phaser.Scene, depth = 1000): Phaser.GameObjects.Container {
  const cont = scene.add.container(0, 0).setDepth(depth);
  const dim = scene.add.rectangle(W / 2, H / 2, W, H, 0x07060b, 0.78).setInteractive();
  cont.add(dim);
  cont.setAlpha(0);
  scene.tweens.add({ targets: cont, alpha: 1, duration: 120 });
  return cont;
}

export function closeModal(scene: Phaser.Scene, cont: Phaser.GameObjects.Container): void {
  scene.tweens.add({ targets: cont, alpha: 0, duration: 100, onComplete: () => cont.destroy() });
}

/** 長押しで出す説明ボックス */
export function infoBox(scene: Phaser.Scene, title: string, body: string, y = 560, accent = C.gold): Phaser.GameObjects.Container {
  const cont = scene.add.container(W / 2, y).setDepth(900);
  const t = txt(scene, 0, 0, title, 30, '#ffffff');
  const b = txt(scene, 0, 0, body, 22, '#e4ddef', {
    fontStyle: '500',
    wordWrap: { width: 600, useAdvancedWrap: true },
    align: 'left',
    lineSpacing: 6,
  });
  const h = t.height + b.height + 52;
  const g = scene.add.graphics();
  g.fillStyle(0x0d0b14, 0.96);
  g.fillRoundedRect(-320, -h / 2, 640, h, 18);
  g.lineStyle(3, accent, 1);
  g.strokeRoundedRect(-320, -h / 2, 640, h, 18);
  t.setPosition(0, -h / 2 + 22 + t.height / 2);
  b.setOrigin(0.5, 0).setPosition(0, -h / 2 + 34 + t.height);
  cont.add([g, t, b]);
  // 画面外にはみ出さない
  const top = y - h / 2;
  if (top < 10) cont.y += 10 - top;
  if (y + h / 2 > H - 10) cont.y -= y + h / 2 - (H - 10);
  cont.setScale(0.96).setAlpha(0);
  scene.tweens.add({ targets: cont, scale: 1, alpha: 1, duration: 100 });
  return cont;
}

export function pieceIcon(scene: Phaser.Scene, x: number, y: number, kind: Kind, size = 64): Phaser.GameObjects.Image {
  return scene.add.image(x, y, `piece_${kind}`).setDisplaySize(size, size);
}

/** 袋の中身一覧 */
export function bagOverlay(scene: Phaser.Scene, run: Run, tempCurses = 0): void {
  const m = modal(scene);
  const rowH = 118;
  const kinds = PLAYER_KINDS;
  const h = 150 + kinds.length * rowH + (tempCurses ? 60 : 0) + 110;
  const top = H / 2 - h / 2;
  m.add(panel(scene, W / 2, H / 2, 660, h, C.panel, 24));
  m.add(txt(scene, W / 2, top + 50, `袋の中身　${run.bagSize()} 個`, 34));
  m.add(
    txt(scene, W / 2, top + 92, '数が多い種類ほど盤面に出やすい', 20, C.sub, { fontStyle: '500' }),
  );
  kinds.forEach((k, i) => {
    const y = top + 150 + i * rowH + rowH / 2 - 10;
    const n = run.bag[k];
    const alpha = n ? 1 : 0.35;
    m.add(pieceIcon(scene, 90, y, k, 76).setAlpha(alpha));
    const lv = run.level[k] ? `  Lv${run.level[k] + 1}` : '';
    m.add(txt(scene, 140, y - 22, `${PIECES[k].name}${lv}`, 28, C.text).setOrigin(0, 0.5).setAlpha(alpha));
    m.add(
      txt(scene, 140, y + 18, PIECES[k].desc(run.power(k)), 19, C.sub, {
        fontStyle: '500',
        wordWrap: { width: 420, useAdvancedWrap: true },
      })
        .setOrigin(0, 0.5)
        .setAlpha(alpha),
    );
    m.add(txt(scene, 630, y, `×${n}`, 36, n ? '#ffc857' : C.dim).setOrigin(1, 0.5));
  });
  if (tempCurses) {
    const y = top + 150 + kinds.length * rowH + 20;
    m.add(pieceIcon(scene, 90, y, 'curse', 56));
    m.add(
      txt(scene, 140, y, `呪い ×${tempCurses}（この戦闘中だけ。引いたら消える）`, 22, '#ff8af0').setOrigin(0, 0.5),
    );
  }
  m.add(button(scene, W / 2, top + h - 64, 280, 76, '閉じる', () => closeModal(scene, m)));
}

/** 取り除く種類を選ぶ */
export function kindPicker(
  scene: Phaser.Scene,
  run: Run,
  title: string,
  onPick: (k: Kind) => void,
): void {
  const m = modal(scene);
  const kinds = run.kindsInBag();
  const h = 200 + kinds.length * 100 + 100;
  const top = H / 2 - h / 2;
  m.add(panel(scene, W / 2, H / 2, 620, h, C.panel, 24));
  m.add(txt(scene, W / 2, top + 56, title, 32));
  kinds.forEach((k, i) => {
    const y = top + 150 + i * 100;
    const ok = run.canRemove(k);
    const b = button(
      scene,
      W / 2 + 40,
      y,
      420,
      80,
      `${PIECES[k].name}　${run.bag[k]} → ${run.bag[k] - 1}`,
      () => {
        closeModal(scene, m);
        onPick(k);
      },
      { color: 0xd9d2e9, disabled: !ok, size: 26 },
    );
    m.add(pieceIcon(scene, 130, y, k, 70).setAlpha(ok ? 1 : 0.4));
    m.add(b);
  });
  m.add(
    button(scene, W / 2, top + h - 60, 260, 72, 'やめる', () => closeModal(scene, m), { color: 0x6f6884, textColor: '#ffffff' }),
  );
}

/** 画面中央の大きな文字 */
export function banner(scene: Phaser.Scene, text: string, color = '#ffffff', y = H / 2, hold = 700): Promise<void> {
  return new Promise((res) => {
    const band = scene.add.rectangle(W / 2, y, W, 130, 0x07060b, 0.85).setDepth(950).setScale(1, 0);
    const t = txt(scene, W / 2, y, text, 64, color).setDepth(951).setAlpha(0).setScale(1.4);
    scene.tweens.add({ targets: band, scaleY: 1, duration: 140 });
    scene.tweens.add({
      targets: t,
      alpha: 1,
      scale: 1,
      duration: 220,
      ease: 'Back.easeOut',
      onComplete: () => {
        scene.time.delayedCall(hold, () => {
          scene.tweens.add({
            targets: [t, band],
            alpha: 0,
            duration: 200,
            onComplete: () => {
              t.destroy();
              band.destroy();
              res();
            },
          });
        });
      },
    });
  });
}
