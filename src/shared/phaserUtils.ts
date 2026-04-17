import Phaser from 'phaser';
import { C, T, F } from './theme';

export function drawBg(scene: Phaser.Scene): void {
  const { width: W, height: H } = scene.scale;
  const g = scene.add.graphics();
  g.fillGradientStyle(C.bg1, C.bg1, C.bg2, C.bg2, 1);
  g.fillRect(0, 0, W, H);
}

export function panel(
  scene: Phaser.Scene,
  x: number, y: number, w: number, h: number,
  radius = 24,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(C.white, 1);
  g.fillRoundedRect(x, y, w, h, radius);
  return g;
}

/** Pink primary button, centered at (x, y) */
export function primaryBtn(
  scene: Phaser.Scene,
  x: number, y: number, w: number, h: number,
  label: string,
  onClick: () => void,
): Phaser.GameObjects.Container {
  const bg = scene.add.graphics();
  bg.fillStyle(C.pink, 1);
  bg.fillRoundedRect(-w / 2, -h / 2, w, h, 20);

  const txt = scene.add.text(0, 0, label, {
    fontFamily: F.head,
    fontSize: `${Math.round(h * 0.42)}px`,
    color: T.white,
  }).setOrigin(0.5);

  const c = scene.add.container(x, y, [bg, txt]);
  c.setSize(w, h).setInteractive({ cursor: 'pointer' });
  c.on('pointerdown', onClick);
  c.on('pointerover', () => scene.tweens.add({ targets: c, y: y - 3, duration: 100 }));
  c.on('pointerout',  () => scene.tweens.add({ targets: c, y,     duration: 100 }));
  return c;
}

/** Outlined secondary button, centered at (x, y) */
export function outlineBtn(
  scene: Phaser.Scene,
  x: number, y: number, w: number, h: number,
  label: string,
  onClick: () => void,
): Phaser.GameObjects.Container {
  const bg = scene.add.graphics();
  bg.lineStyle(2, C.lavender, 1);
  bg.fillStyle(C.white, 1);
  bg.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
  bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);

  const txt = scene.add.text(0, 0, label, {
    fontFamily: F.head,
    fontSize: `${Math.round(h * 0.36)}px`,
    color: T.main,
  }).setOrigin(0.5);

  const c = scene.add.container(x, y, [bg, txt]);
  c.setSize(w, h).setInteractive({ cursor: 'pointer' });
  c.on('pointerdown', onClick);
  c.on('pointerover', () => scene.tweens.add({ targets: c, y: y - 2, duration: 100 }));
  c.on('pointerout',  () => scene.tweens.add({ targets: c, y,     duration: 100 }));
  return c;
}

/** White stat box with icon+value, centered at (x, y). Returns the value text so caller can update it. */
export function statBox(
  scene: Phaser.Scene,
  x: number, y: number,
  label: string,
): { container: Phaser.GameObjects.Container; txt: Phaser.GameObjects.Text } {
  const W = 118, H = 44;
  const bg = scene.add.graphics();
  bg.fillStyle(C.white, 1);
  bg.fillRoundedRect(-W / 2, -H / 2, W, H, 14);

  const txt = scene.add.text(0, 0, label, {
    fontFamily: F.head,
    fontSize: '21px',
    color: T.main,
  }).setOrigin(0.5);

  const container = scene.add.container(x, y, [bg, txt]);
  return { container, txt };
}

/** Emoji confetti burst (DOM-based, same as original) */
export function launchConfetti(scene: Phaser.Scene, emojis: string[]): void {
  // Inject keyframe once
  if (!document.getElementById('aya-fall-style')) {
    const style = document.createElement('style');
    style.id = 'aya-fall-style';
    style.textContent = `@keyframes ayaFall {
      from { transform: translateY(-20px) rotate(0deg); opacity: 1; }
      to   { transform: translateY(110vh)  rotate(720deg); opacity: 0; }
    }`;
    document.head.appendChild(style);
  }
  for (let i = 0; i < 28; i++) {
    scene.time.delayedCall(i * 80, () => {
      const el = document.createElement('div');
      const dur = 2.5 + Math.random() * 2;
      el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      el.style.cssText = `position:fixed;pointer-events:none;z-index:999;
        font-size:${1 + Math.random() * 1.2}rem;
        left:${Math.random() * 100}vw;top:-20px;
        animation:ayaFall ${dur}s linear forwards;`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), (dur + 0.1) * 1000);
    });
  }
}

/** Bounce tween on an array of game objects */
export function bounceLoop(scene: Phaser.Scene, targets: Phaser.GameObjects.GameObject[]): void {
  targets.forEach((t, i) => {
    scene.tweens.add({
      targets: t,
      y: (t as Phaser.GameObjects.Container).y - 8,
      yoyo: true,
      repeat: -1,
      duration: 900,
      ease: 'Sine.InOut',
      delay: i * 200,
    });
  });
}
