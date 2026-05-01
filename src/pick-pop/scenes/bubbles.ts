import Phaser from 'phaser';
import { C } from '@shared/theme';

/**
 * Atmospheric backdrop for Pick & Pop: translucent bubbles drift slowly
 * upward from below the canvas and fade as they rise. Looks alive without
 * pulling focus from the game cards. Cheap to run — small fixed pool, no
 * pointer/physics, pure tween.
 */
export function spawnBubbleField(
  scene: Phaser.Scene,
  width: number,
  height: number,
  count = 14,
): void {
  for (let i = 0; i < count; i++) {
    spawnOne(scene, width, height, /* immediate */ true);
  }
}

function spawnOne(
  scene: Phaser.Scene,
  W: number,
  H: number,
  immediate: boolean,
): void {
  const r = 14 + Math.random() * 26; // 14..40
  const x = Math.random() * W;
  const startY = immediate ? Math.random() * H : H + r + 10;
  const endY = -r - 20;
  const drift = (Math.random() - 0.5) * 60; // gentle horizontal sway
  const opacity = 0.10 + Math.random() * 0.18;
  const duration = 9000 + Math.random() * 7000;

  // Default depth — bubbles render right after drawBg() (since they're
  // added later) but before all UI (since UI is added later still).
  const g = scene.add.graphics();

  // Bubble outline + soft fill
  g.fillStyle(C.white, opacity);
  g.fillCircle(0, 0, r);
  g.lineStyle(1.5, C.lavender, opacity * 0.9);
  g.strokeCircle(0, 0, r);
  // Tiny gloss highlight (top-left)
  g.fillStyle(C.white, Math.min(0.85, opacity * 3));
  g.fillCircle(-r * 0.35, -r * 0.4, r * 0.18);

  g.setPosition(x, startY);

  scene.tweens.add({
    targets: g,
    y: endY,
    x: x + drift,
    duration,
    ease: 'Sine.InOut',
    onComplete: () => {
      g.destroy();
      // Respawn from the bottom in a continuous stream so the field never thins
      spawnOne(scene, W, H, false);
    },
  });
}

/**
 * Draw a "bubble" — a soft inflated rounded shape with a glossy highlight.
 * Used as the answer-card and CTA visual. Returns the underlying Graphics
 * so the caller can clear() and redraw on state changes.
 */
export interface BubbleStyle {
  fill: number;
  fillAlpha: number;
  stroke: number;
  strokeAlpha: number;
  glow?: number;
  glowAlpha?: number;
  shadow?: boolean;
  /** glossAlpha 0 disables the highlight (e.g. for a wrong/dim state) */
  glossAlpha?: number;
}

export const BUBBLE_STYLES: Record<string, BubbleStyle> = {
  idle: {
    fill: C.white, fillAlpha: 1,
    stroke: C.lavender, strokeAlpha: 0.85,
    shadow: true,
    glossAlpha: 0.85,
  },
  correct: {
    fill: C.mintBg, fillAlpha: 1,
    stroke: C.mint, strokeAlpha: 1,
    shadow: true,
    glow: C.mint, glowAlpha: 0.32,
    glossAlpha: 0.9,
  },
  wrong: {
    fill: C.white, fillAlpha: 0.55,
    stroke: C.lavender, strokeAlpha: 0.4,
    shadow: false,
    glossAlpha: 0,
  },
  question: {
    // For "?" placeholder bubbles (used in title hero target slot)
    fill: C.bg2, fillAlpha: 1,
    stroke: C.lavender, strokeAlpha: 0.85,
    shadow: true,
    glossAlpha: 0.6,
  },
};

export function drawBubble(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  w: number, h: number,
  radius: number,
  style: BubbleStyle,
): void {
  g.clear();
  const x = cx - w / 2;
  const y = cy - h / 2;

  // Soft outer glow (under everything else)
  if (style.glow !== undefined && style.glowAlpha) {
    for (let i = 6; i >= 1; i--) {
      g.fillStyle(style.glow, (style.glowAlpha * i) / 24);
      g.fillRoundedRect(x - i * 1.5, y - i * 1.5, w + i * 3, h + i * 3, radius + i * 1.5);
    }
  }

  // Drop shadow
  if (style.shadow) {
    g.fillStyle(C.shadow, 0.18);
    g.fillRoundedRect(x + 2, y + 10, w, h, radius);
  }

  // Body fill
  g.fillStyle(style.fill, style.fillAlpha);
  g.fillRoundedRect(x, y, w, h, radius);

  // Stroke
  g.lineStyle(2.5, style.stroke, style.strokeAlpha);
  g.strokeRoundedRect(x, y, w, h, radius);

  // Top-left gloss highlight — the thing that makes it read as a bubble
  // rather than a card. Two stacked ellipses: one larger and softer, one
  // tighter and brighter.
  if (style.glossAlpha) {
    const gx = x + w * 0.30;
    const gy = y + h * 0.22;
    g.fillStyle(C.white, style.glossAlpha * 0.55);
    g.fillEllipse(gx, gy, w * 0.46, h * 0.22);
    g.fillStyle(C.white, style.glossAlpha);
    g.fillEllipse(gx - w * 0.06, gy - h * 0.04, w * 0.18, h * 0.10);
  }
}

/**
 * Expanding ring shockwave on a successful "pop". Spawns a Graphics ring
 * that scales out and fades. Pairs with the existing sparkle burst.
 */
export function popShockwave(
  scene: Phaser.Scene,
  cx: number, cy: number,
  startR: number,
  endR: number,
  color = C.mint,
): void {
  const ring = scene.add.graphics();
  ring.setPosition(cx, cy);
  ring.lineStyle(4, color, 0.9);
  ring.strokeCircle(0, 0, startR);
  ring.setScale(1).setAlpha(1);
  scene.tweens.add({
    targets: ring,
    scale: endR / startR,
    alpha: 0,
    duration: 520,
    ease: 'Cubic.Out',
    onComplete: () => ring.destroy(),
  });
}
