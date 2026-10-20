import Phaser from 'phaser';

export const W = 720;
export const H = 1280;

export const FONT =
  '"M PLUS Rounded 1c", "Noto Sans JP", "Noto Sans CJK JP", "Hiragino Maru Gothic ProN", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", Meiryo, sans-serif';

export const C = {
  bg: 0x14121c,
  bg2: 0x1b1826,
  panel: 0x231f31,
  panel2: 0x2e2942,
  line: 0x3b3452,
  gold: 0xffc857,
  red: 0xe5484d,
  blue: 0x3b82f6,
  green: 0x22c55e,
  text: '#f4efe6',
  sub: '#a59fb5',
  dim: '#6f6884',
};

export function txt(
  scene: Phaser.Scene,
  x: number,
  y: number,
  s: string,
  size = 28,
  color: string = C.text,
  opts: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {},
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, s, {
      fontFamily: FONT,
      fontSize: `${size}px`,
      color,
      fontStyle: '800',
      resolution: 2,
      ...opts,
    })
    .setOrigin(0.5);
}

export function panel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  color = C.panel,
  radius = 18,
  alpha = 1,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(color, alpha);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, radius);
  return g;
}

export interface ButtonOpts {
  color?: number;
  size?: number;
  textColor?: string;
  disabled?: boolean;
  sub?: string;
}

export type Button = Phaser.GameObjects.Container & { setDisabled: (d: boolean) => void };

export function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  onClick: () => void,
  opts: ButtonOpts = {},
): Button {
  const color = opts.color ?? C.gold;
  const cont = scene.add.container(x, y) as Button;
  const g = scene.add.graphics();
  const draw = (pressed: boolean, disabled: boolean) => {
    g.clear();
    const base = disabled ? 0x3a3548 : color;
    g.fillStyle(Phaser.Display.Color.ValueToColor(base).darken(30).color, 1);
    g.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, 18);
    g.fillStyle(base, 1);
    g.fillRoundedRect(-w / 2, -h / 2 + (pressed ? 5 : 0), w, h, 18);
    g.fillStyle(0xffffff, disabled ? 0.04 : 0.16);
    g.fillRoundedRect(-w / 2 + 6, -h / 2 + 5 + (pressed ? 5 : 0), w - 12, h * 0.38, 12);
  };
  let disabled = !!opts.disabled;
  draw(false, disabled);
  const t = txt(scene, 0, opts.sub ? -10 : 0, label, opts.size ?? 30, opts.textColor ?? '#2a1d05');
  cont.add([g, t]);
  let s: Phaser.GameObjects.Text | null = null;
  if (opts.sub) {
    s = txt(scene, 0, 20, opts.sub, 18, opts.textColor ?? '#2a1d05', { fontStyle: '500' });
    cont.add(s);
  }
  const applyText = () => {
    t.setColor(disabled ? C.dim : (opts.textColor ?? '#2a1d05'));
    s?.setColor(disabled ? C.dim : (opts.textColor ?? '#2a1d05'));
  };
  applyText();
  cont.setSize(w, h);
  cont.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h + 6), Phaser.Geom.Rectangle.Contains);
  if (cont.input) cont.input.cursor = 'pointer';
  cont.on('pointerdown', () => {
    if (disabled) return;
    draw(true, false);
    t.y += 5;
    if (s) s.y += 5;
  });
  const release = (fire: boolean) => {
    if (disabled) return;
    draw(false, false);
    t.y = opts.sub ? -10 : 0;
    if (s) s.y = 20;
    if (fire) onClick();
  };
  cont.on('pointerup', () => release(true));
  cont.on('pointerout', () => release(false));
  cont.setDisabled = (d: boolean) => {
    disabled = d;
    draw(false, d);
    applyText();
  };
  return cont;
}

export function wait(scene: Phaser.Scene, ms: number): Promise<void> {
  return new Promise((res) => scene.time.delayedCall(ms, () => res()));
}

export function tweenP(scene: Phaser.Scene, cfg: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
  return new Promise((res) => {
    scene.tweens.add({ ...cfg, onComplete: () => res() });
  });
}

/** シーン切り替え時のフェード */
export function go(scene: Phaser.Scene, key: string, data?: object): void {
  scene.cameras.main.fadeOut(160, 20, 18, 28);
  scene.cameras.main.once('camerafadeoutcomplete', () => scene.scene.start(key, data));
}

export function fadeIn(scene: Phaser.Scene): void {
  scene.cameras.main.fadeIn(180, 20, 18, 28);
}

export function background(scene: Phaser.Scene, tint = C.bg): void {
  const g = scene.add.graphics();
  g.fillGradientStyle(tint, tint, 0x0c0a12, 0x0c0a12, 1);
  g.fillRect(0, 0, W, H);
  // うっすら石畳
  g.lineStyle(2, 0xffffff, 0.025);
  for (let y = 0; y < H; y += 64) {
    g.lineBetween(0, y, W, y);
    for (let x = (y / 64) % 2 ? 0 : 48; x < W; x += 96) g.lineBetween(x, y, x, y + 64);
  }
}
