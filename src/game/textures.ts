import Phaser from 'phaser';
import { ENEMIES, type Shape } from '../core/enemies';
import { PIECES, type Kind } from '../core/pieces';

export const PIECE_TEX = 96;
export const ENEMY_TEX = 260;

type G = Phaser.GameObjects.Graphics;
type P = [number, number][];

const V = (pts: P) => pts.map(([x, y]) => new Phaser.Math.Vector2(x, y));
const poly = (g: G, pts: P) => g.fillPoints(V(pts), true);
const mirror = (pts: P, cx: number): P => pts.map(([x, y]) => [2 * cx - x, y]);

function shade(color: number, amt: number): number {
  const c = Phaser.Display.Color.ValueToColor(color);
  return (amt < 0 ? c.darken(-amt) : c.lighten(amt)).color;
}

function gfx(scene: Phaser.Scene): G {
  return scene.make.graphics({ x: 0, y: 0 }, false);
}

// ───────── ピース ─────────

function tile(g: G, color: number) {
  g.fillStyle(shade(color, -35), 1);
  g.fillRoundedRect(4, 8, 88, 84, 20);
  g.fillStyle(color, 1);
  g.fillRoundedRect(4, 4, 88, 84, 20);
  g.fillStyle(0xffffff, 0.2);
  g.fillRoundedRect(10, 8, 76, 30, 14);
}

const ICONS: Record<Kind, (g: G, color: number) => void> = {
  sword: (g) => {
    g.fillStyle(0xffffff, 1);
    poly(g, [
      [48, 14],
      [57, 25],
      [57, 56],
      [39, 56],
      [39, 25],
    ]);
    g.fillRoundedRect(26, 55, 44, 9, 4);
    g.fillStyle(0x5a1d1f, 1);
    g.fillRect(44, 64, 8, 14);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(48, 80, 6);
    g.fillStyle(0xe5484d, 0.35);
    g.fillRect(46, 26, 4, 28);
  },
  shield: (g, color) => {
    g.fillStyle(0xffffff, 1);
    poly(g, [
      [24, 18],
      [72, 18],
      [72, 46],
      [66, 62],
      [48, 78],
      [30, 62],
      [24, 46],
    ]);
    g.fillStyle(shade(color, -10), 1);
    poly(g, [
      [33, 26],
      [63, 26],
      [63, 45],
      [59, 56],
      [48, 67],
      [37, 56],
      [33, 45],
    ]);
    g.fillStyle(0xffffff, 0.9);
    g.fillRect(45, 28, 6, 36);
    g.fillRect(36, 38, 24, 6);
  },
  fire: (g) => {
    g.fillStyle(0xffffff, 1);
    poly(g, [
      [48, 12],
      [58, 28],
      [68, 44],
      [68, 62],
      [58, 76],
      [38, 76],
      [28, 62],
      [28, 46],
      [36, 34],
      [40, 44],
      [44, 30],
    ]);
    g.fillStyle(0xffd166, 1);
    poly(g, [
      [48, 40],
      [57, 54],
      [57, 66],
      [50, 72],
      [42, 70],
      [38, 60],
      [42, 52],
    ]);
  },
  coin: (g, color) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(48, 47, 27);
    g.fillStyle(shade(color, -15), 1);
    g.fillCircle(48, 47, 20);
    g.fillStyle(0xfff3c4, 1);
    g.fillRoundedRect(44, 33, 8, 28, 3);
    g.fillRoundedRect(38, 37, 20, 5, 2);
    g.fillRoundedRect(38, 53, 20, 5, 2);
  },
  heal: (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(39, 20, 18, 54, 6);
    g.fillRoundedRect(21, 38, 54, 18, 6);
  },
  poison: (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(42, 56, 17);
    g.fillCircle(63, 38, 11);
    g.fillCircle(64, 66, 7);
    g.fillCircle(34, 26, 6);
    g.fillStyle(0xa855f7, 0.5);
    g.fillCircle(37, 51, 5);
    g.fillCircle(60, 35, 3);
  },
  curse: (g) => {
    g.lineStyle(4, 0xff2bd6, 0.9);
    g.strokeRoundedRect(7, 7, 82, 78, 18);
    g.fillStyle(0xff2bd6, 1);
    poly(g, [
      [18, 47],
      [33, 35],
      [48, 31],
      [63, 35],
      [78, 47],
      [63, 59],
      [48, 63],
      [33, 59],
    ]);
    g.fillStyle(0x16031c, 1);
    g.fillEllipse(48, 47, 12, 26);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(52, 41, 3);
  },
};

function makePieces(scene: Phaser.Scene) {
  for (const k of Object.keys(PIECES) as Kind[]) {
    const g = gfx(scene);
    tile(g, PIECES[k].color);
    ICONS[k](g, PIECES[k].color);
    g.generateTexture(`piece_${k}`, PIECE_TEX, PIECE_TEX);
    g.destroy();
  }

  // 石化
  let g = gfx(scene);
  g.fillStyle(0x5b5a63, 0.94);
  g.fillRoundedRect(4, 4, 88, 88, 20);
  g.fillStyle(0xffffff, 0.12);
  g.fillRoundedRect(10, 8, 76, 26, 12);
  g.lineStyle(4, 0x2f2e35, 1);
  g.lineBetween(30, 20, 44, 44);
  g.lineBetween(44, 44, 36, 70);
  g.lineBetween(44, 44, 70, 52);
  g.lineBetween(70, 52, 78, 74);
  g.fillStyle(0x76747f, 1);
  g.fillCircle(66, 26, 7);
  g.fillCircle(24, 72, 5);
  g.generateTexture('ov_stone', PIECE_TEX, PIECE_TEX);
  g.destroy();

  // 凍結
  g = gfx(scene);
  g.fillStyle(0xbfeaff, 0.5);
  g.fillRoundedRect(4, 4, 88, 88, 20);
  g.lineStyle(5, 0xeafaff, 1);
  g.strokeRoundedRect(6, 6, 84, 84, 18);
  g.lineStyle(3, 0xffffff, 0.85);
  g.lineBetween(18, 34, 34, 18);
  g.lineBetween(18, 50, 50, 18);
  g.lineBetween(60, 82, 82, 60);
  g.generateTexture('ov_ice', PIECE_TEX, PIECE_TEX);
  g.destroy();

  // 選択枠
  g = gfx(scene);
  g.lineStyle(7, 0xffffff, 1);
  g.strokeRoundedRect(4, 4, 88, 88, 22);
  g.generateTexture('sel', PIECE_TEX, PIECE_TEX);
  g.destroy();

  // 粒子
  g = gfx(scene);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(8, 8, 8);
  g.generateTexture('dot', 16, 16);
  g.destroy();
}

// ───────── 敵 ─────────

function eyes(g: G, x1: number, x2: number, y: number, r: number, iris = 0x1a1424, white = 0xffffff) {
  g.fillStyle(white, 1);
  g.fillCircle(x1, y, r);
  g.fillCircle(x2, y, r);
  g.fillStyle(iris, 1);
  g.fillCircle(x1 + r * 0.2, y + r * 0.15, r * 0.55);
  g.fillCircle(x2 - r * 0.2, y + r * 0.15, r * 0.55);
  g.fillStyle(0xffffff, 0.9);
  g.fillCircle(x1 + r * 0.35, y - r * 0.15, r * 0.18);
  g.fillCircle(x2 - r * 0.05, y - r * 0.15, r * 0.18);
}

function glowEyes(g: G, x1: number, x2: number, y: number, r: number, color: number) {
  g.fillStyle(color, 0.25);
  g.fillCircle(x1, y, r * 2);
  g.fillCircle(x2, y, r * 2);
  g.fillStyle(color, 1);
  g.fillEllipse(x1, y, r * 2.2, r * 1.3);
  g.fillEllipse(x2, y, r * 2.2, r * 1.3);
}

function shadowFoot(g: G, w = 170) {
  g.fillStyle(0x000000, 0.35);
  g.fillEllipse(130, 238, w, 26);
}

const SHAPES: Record<Shape, (g: G, c: number) => void> = {
  blob: (g, c) => {
    shadowFoot(g);
    g.fillStyle(shade(c, -25), 1);
    g.fillEllipse(130, 178, 196, 128);
    g.fillStyle(c, 1);
    g.fillEllipse(130, 170, 190, 124);
    g.fillCircle(130, 130, 62);
    g.fillStyle(0xffffff, 0.3);
    g.fillEllipse(96, 118, 40, 26);
    eyes(g, 104, 156, 160, 15);
    g.fillStyle(shade(c, -45), 1);
    g.fillEllipse(130, 196, 34, 14);
  },
  bat: (g, c) => {
    shadowFoot(g, 120);
    const wing: P = [
      [100, 118],
      [40, 70],
      [14, 98],
      [30, 128],
      [10, 156],
      [52, 150],
      [70, 176],
      [104, 150],
    ];
    g.fillStyle(shade(c, -30), 1);
    poly(g, wing);
    poly(g, mirror(wing, 130));
    g.fillStyle(c, 1);
    poly(g, [
      [96, 96],
      [104, 60],
      [118, 92],
    ]);
    poly(g, mirror([
      [96, 96],
      [104, 60],
      [118, 92],
    ], 130));
    g.fillCircle(130, 135, 48);
    g.fillStyle(shade(c, 25), 1);
    g.fillEllipse(130, 158, 46, 30);
    glowEyes(g, 112, 148, 126, 9, 0xffe066);
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(118, 152, 124, 152, 121, 164);
    g.fillTriangle(136, 152, 142, 152, 139, 164);
  },
  goblin: (g, c) => {
    shadowFoot(g, 140);
    g.fillStyle(shade(c, -30), 1);
    g.fillRoundedRect(84, 160, 92, 76, 22);
    g.fillStyle(0x6b4a2b, 1);
    g.fillRoundedRect(84, 196, 92, 20, 6);
    g.fillStyle(c, 1);
    const ear: P = [
      [84, 110],
      [26, 82],
      [80, 138],
    ];
    poly(g, ear);
    poly(g, mirror(ear, 130));
    g.fillCircle(130, 118, 56);
    g.fillStyle(shade(c, -20), 1);
    g.fillEllipse(130, 150, 60, 22);
    eyes(g, 108, 152, 110, 14, 0x2a1d05, 0xffe9a8);
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(116, 150, 124, 150, 120, 162);
    g.fillTriangle(136, 150, 144, 150, 140, 162);
  },
  doll: (g, c) => {
    shadowFoot(g, 130);
    g.fillStyle(c, 1);
    poly(g, [
      [130, 130],
      [60, 236],
      [200, 236],
    ]);
    g.fillStyle(shade(c, -25), 1);
    g.fillRect(60, 220, 140, 16);
    g.fillStyle(0x3a2030, 1);
    g.fillEllipse(130, 86, 120, 90);
    g.fillStyle(0xf3e1d4, 1);
    g.fillCircle(130, 104, 46);
    g.lineStyle(5, 0x2a1020, 1);
    g.lineBetween(104, 92, 120, 108);
    g.lineBetween(120, 92, 104, 108);
    g.lineBetween(140, 92, 156, 108);
    g.lineBetween(156, 92, 140, 108);
    g.lineStyle(3, 0x2a1020, 1);
    g.lineBetween(116, 128, 144, 128);
    for (let x = 120; x <= 140; x += 6) g.lineBetween(x, 124, x, 132);
  },
  king: (g, c) => {
    SHAPES.goblin(g, c);
    g.fillStyle(0xb51f3a, 1);
    g.fillRoundedRect(76, 160, 108, 30, 10);
    g.fillStyle(0xffd23f, 1);
    poly(g, [
      [84, 76],
      [92, 30],
      [110, 58],
      [130, 18],
      [150, 58],
      [168, 30],
      [176, 76],
    ]);
    g.fillStyle(0xe5484d, 1);
    g.fillCircle(130, 58, 7);
  },
  mage: (g, c) => {
    shadowFoot(g, 150);
    g.fillStyle(shade(c, -30), 1);
    poly(g, [
      [130, 22],
      [50, 236],
      [210, 236],
    ]);
    g.fillStyle(c, 1);
    poly(g, [
      [130, 22],
      [62, 200],
      [198, 200],
    ]);
    g.fillStyle(0x120c1c, 1);
    g.fillEllipse(130, 124, 76, 70);
    glowEyes(g, 114, 146, 120, 7, 0xff7af5);
    g.fillStyle(0xffd23f, 1);
    g.fillCircle(130, 210, 10);
  },
  knight: (g, c) => {
    shadowFoot(g, 170);
    g.fillStyle(shade(c, -30), 1);
    g.fillRoundedRect(60, 160, 140, 78, 26);
    g.fillStyle(c, 1);
    g.fillRoundedRect(80, 46, 100, 124, 40);
    g.fillStyle(0xb5462f, 1);
    poly(g, [
      [124, 50],
      [150, 10],
      [168, 26],
      [138, 54],
    ]);
    g.fillStyle(0x15121c, 1);
    g.fillRoundedRect(92, 98, 76, 16, 6);
    glowEyes(g, 112, 148, 106, 5, 0xffa23f);
    g.fillStyle(0xffffff, 0.2);
    g.fillRoundedRect(92, 56, 22, 34, 10);
    g.fillStyle(shade(c, -15), 1);
    for (let x = 98; x <= 162; x += 16) g.fillRect(x, 130, 6, 26);
    g.fillStyle(0x8a4b2c, 0.6);
    g.fillCircle(170, 150, 8);
    g.fillCircle(88, 70, 6);
  },
  mushroom: (g, c) => {
    shadowFoot(g, 140);
    g.fillStyle(0xf1e3c8, 1);
    g.fillRoundedRect(96, 112, 68, 120, 28);
    g.fillStyle(c, 1);
    g.fillEllipse(130, 104, 220, 140);
    g.fillStyle(shade(c, -30), 1);
    g.fillRect(20, 112, 220, 24);
    g.fillStyle(c, 1);
    g.fillEllipse(130, 100, 220, 130);
    g.fillStyle(0xfff6e0, 1);
    g.fillCircle(88, 78, 14);
    g.fillCircle(150, 60, 18);
    g.fillCircle(190, 100, 11);
    g.fillCircle(114, 112, 9);
    eyes(g, 116, 146, 168, 9);
    g.fillStyle(0x9b7cff, 0.5);
    g.fillCircle(48, 170, 8);
    g.fillCircle(214, 150, 10);
    g.fillCircle(200, 200, 6);
  },
  wisp: (g, c) => {
    g.fillStyle(c, 0.18);
    g.fillCircle(130, 140, 108);
    g.fillStyle(c, 0.35);
    g.fillCircle(130, 140, 84);
    g.fillStyle(c, 1);
    poly(g, [
      [130, 30],
      [162, 80],
      [186, 120],
      [182, 170],
      [154, 206],
      [106, 206],
      [78, 170],
      [74, 120],
      [98, 80],
    ]);
    g.fillStyle(0xffffff, 0.75);
    poly(g, [
      [130, 70],
      [152, 110],
      [154, 150],
      [130, 176],
      [106, 150],
      [108, 110],
    ]);
    eyes(g, 112, 148, 142, 10, 0x1a4a6b);
    g.fillStyle(0xffffff, 1);
    for (const [x, y] of [
      [56, 70],
      [210, 90],
      [44, 190],
      [214, 200],
    ])
      g.fillCircle(x, y, 4);
  },
  witch: (g, c) => {
    shadowFoot(g, 170);
    g.fillStyle(shade(c, -35), 1);
    poly(g, [
      [130, 140],
      [56, 240],
      [204, 240],
    ]);
    g.fillStyle(c, 1);
    poly(g, [
      [130, 150],
      [70, 236],
      [190, 236],
    ]);
    g.fillStyle(0xe8f4ff, 1);
    g.fillCircle(130, 130, 40);
    g.fillStyle(0xcfe9ff, 1);
    poly(g, [
      [92, 120],
      [70, 210],
      [104, 160],
    ]);
    poly(g, mirror([
      [92, 120],
      [70, 210],
      [104, 160],
    ], 130));
    g.fillStyle(shade(c, -45), 1);
    poly(g, [
      [138, 0],
      [92, 96],
      [176, 96],
    ]);
    g.fillEllipse(130, 98, 190, 30);
    g.fillStyle(0x9be7ff, 1);
    g.fillRect(96, 84, 68, 8);
    glowEyes(g, 116, 144, 132, 6, 0x5ad2ff);
    g.fillStyle(0xbfeaff, 0.9);
    poly(g, [
      [214, 60],
      [222, 140],
      [206, 140],
    ]);
  },
  skeleton: (g, c) => {
    shadowFoot(g, 140);
    g.fillStyle(c, 1);
    g.fillRoundedRect(124, 150, 12, 80, 6);
    for (let i = 0; i < 4; i++) g.fillRoundedRect(92 + i * 2, 158 + i * 18, 76 - i * 4, 9, 4);
    g.fillCircle(130, 98, 56);
    g.fillRoundedRect(102, 120, 56, 40, 12);
    g.fillStyle(0x1a1424, 1);
    g.fillEllipse(108, 96, 30, 34);
    g.fillEllipse(152, 96, 30, 34);
    poly(g, [
      [130, 112],
      [122, 128],
      [138, 128],
    ]);
    for (let x = 110; x <= 146; x += 9) g.fillRect(x, 140, 5, 14);
    glowEyes(g, 108, 152, 98, 5, 0x7af5ff);
  },
  shadow: (g, c) => {
    g.fillStyle(c, 0.35);
    for (const [x, y, r] of [
      [70, 190, 40],
      [190, 196, 44],
      [130, 210, 50],
      [96, 120, 50],
      [166, 120, 48],
    ])
      g.fillCircle(x, y, r);
    g.fillStyle(c, 0.9);
    g.fillEllipse(130, 150, 150, 170);
    g.fillStyle(shade(c, -40), 1);
    g.fillEllipse(130, 150, 110, 130);
    glowEyes(g, 110, 150, 134, 9, 0xf4efe6);
    g.fillStyle(0xf4efe6, 0.9);
    poly(g, [
      [104, 176],
      [130, 168],
      [156, 176],
      [130, 186],
    ]);
  },
  chest: (g, c) => {
    shadowFoot(g, 180);
    g.fillStyle(shade(c, -20), 1);
    g.fillRoundedRect(46, 130, 168, 104, 14);
    g.fillStyle(0x7a2c3a, 1);
    g.fillRect(56, 120, 148, 30);
    g.fillStyle(0xe5484d, 1);
    g.fillEllipse(130, 146, 70, 24);
    g.fillStyle(0xffffff, 1);
    for (let x = 62; x < 200; x += 18) {
      g.fillTriangle(x, 116, x + 14, 116, x + 7, 134);
      g.fillTriangle(x, 152, x + 14, 152, x + 7, 136);
    }
    g.fillStyle(c, 1);
    g.fillRoundedRect(46, 56, 168, 64, { tl: 40, tr: 40, bl: 6, br: 6 });
    g.fillStyle(0xd9a441, 1);
    g.fillRect(46, 106, 168, 10);
    g.fillRect(122, 56, 16, 64);
    g.fillRect(122, 150, 16, 84);
    glowEyes(g, 98, 162, 84, 8, 0xffd23f);
  },
  book: (g, c) => {
    shadowFoot(g, 160);
    g.fillStyle(0xf3e8d0, 1);
    g.fillRoundedRect(66, 58, 140, 170, 10);
    g.fillStyle(c, 1);
    g.fillRoundedRect(54, 48, 140, 170, 12);
    g.fillStyle(shade(c, -30), 1);
    g.fillRect(54, 48, 18, 170);
    g.fillStyle(0xd9a441, 1);
    g.fillRoundedRect(90, 74, 84, 118, 8);
    g.fillStyle(c, 1);
    g.fillRoundedRect(96, 80, 72, 106, 6);
    g.fillStyle(0xffffff, 1);
    g.fillEllipse(132, 132, 60, 34);
    g.fillStyle(0xff2bd6, 1);
    g.fillCircle(132, 132, 13);
    g.fillStyle(0x16031c, 1);
    g.fillEllipse(132, 132, 6, 20);
    g.lineStyle(5, 0x9aa3ad, 1);
    g.lineBetween(30, 70, 220, 200);
    g.lineBetween(30, 200, 220, 70);
  },
  gargoyle: (g, c) => {
    shadowFoot(g, 190);
    const wing: P = [
      [96, 120],
      [20, 50],
      [30, 110],
      [8, 150],
      [60, 140],
      [92, 176],
    ];
    g.fillStyle(shade(c, -30), 1);
    poly(g, wing);
    poly(g, mirror(wing, 130));
    g.fillStyle(c, 1);
    g.fillRoundedRect(86, 140, 88, 96, 24);
    g.fillCircle(130, 112, 50);
    poly(g, [
      [92, 86],
      [74, 36],
      [108, 74],
    ]);
    poly(g, mirror([
      [92, 86],
      [74, 36],
      [108, 74],
    ], 130));
    g.fillStyle(shade(c, -35), 1);
    g.fillRoundedRect(104, 136, 52, 18, 8);
    glowEyes(g, 112, 148, 108, 7, 0xff5c3a);
    g.lineStyle(3, shade(c, -45), 1);
    g.lineBetween(150, 170, 160, 200);
    g.lineBetween(160, 200, 150, 220);
  },
  dragon: (g, c) => {
    shadowFoot(g, 220);
    const wing: P = [
      [90, 120],
      [10, 30],
      [26, 100],
      [0, 130],
      [40, 150],
      [20, 190],
      [86, 170],
    ];
    g.fillStyle(shade(c, -30), 1);
    poly(g, wing);
    poly(g, mirror(wing, 130));
    g.fillStyle(c, 1);
    g.fillRoundedRect(76, 150, 108, 90, 34);
    g.fillEllipse(130, 118, 140, 116);
    g.fillStyle(0xe8dccb, 1);
    const horn: P = [
      [80, 90],
      [54, 24],
      [98, 74],
    ];
    poly(g, horn);
    poly(g, mirror(horn, 130));
    g.fillStyle(shade(c, 20), 1);
    g.fillEllipse(130, 152, 96, 52);
    g.fillStyle(0x0b0612, 1);
    g.fillEllipse(116, 160, 10, 6);
    g.fillEllipse(144, 160, 10, 6);
    glowEyes(g, 100, 160, 108, 10, 0xff2bd6);
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(100, 172, 110, 172, 105, 190);
    g.fillTriangle(150, 172, 160, 172, 155, 190);
    g.fillStyle(0xff2bd6, 0.5);
    for (let i = 0; i < 4; i++) g.fillTriangle(116 + i * 8, 186 + i * 10, 144 - i * 8, 186 + i * 10, 130, 196 + i * 10);
  },
};

function makeEnemies(scene: Phaser.Scene) {
  for (const e of ENEMIES) {
    const g = gfx(scene);
    SHAPES[e.shape](g, e.color);
    g.generateTexture(`enemy_${e.id}`, ENEMY_TEX, ENEMY_TEX);
    g.destroy();
  }
}

export function makeTextures(scene: Phaser.Scene): void {
  makePieces(scene);
  makeEnemies(scene);
}
