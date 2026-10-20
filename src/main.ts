import Phaser from 'phaser';
import { BattleScene } from './game/scenes/BattleScene';
import { BootScene } from './game/scenes/BootScene';
import { MapScene } from './game/scenes/MapScene';
import { ResultScene } from './game/scenes/ResultScene';
import { RewardScene } from './game/scenes/RewardScene';
import { ShopScene } from './game/scenes/ShopScene';
import { TitleScene } from './game/scenes/TitleScene';
import { H, W } from './game/theme';

async function waitFonts(): Promise<void> {
  // Webフォントが読めなくてもシステムフォントで続行する
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('800 32px "M PLUS Rounded 1c"'),
        document.fonts.load('500 24px "M PLUS Rounded 1c"'),
      ]),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
  } catch {
    /* noop */
  }
}

await waitFonts();

// ?renderer=canvas で Canvas 描画に切り替え（古い端末や検証用）
const renderer = new URLSearchParams(location.search).get('renderer') === 'canvas' ? Phaser.CANVAS : Phaser.AUTO;

const game = new Phaser.Game({
  type: renderer,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#14121c',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 2 },
  render: { antialias: true },
  scene: [BootScene, TitleScene, MapScene, BattleScene, RewardScene, ShopScene, ResultScene],
});

// テスト・デバッグ用に参照できるようにしておく
(window as unknown as { __game: Phaser.Game }).__game = game;
