import Phaser from 'phaser';
import { mix } from './shapes';

/**
 * Geometry of the toy sorter box, in the box container's local space.
 * x = 0 is the middle; y = 0 is the back edge of the lid.
 *
 *   ┌──────────────┐  ← lid top face (slight trapezoid = seen from above)
 *  /   ○    ☆    ♥  \
 * └──────────────────┘ ← lid lip
 *  │ ┌──────────────┐ │ ← coloured front with a window: pieces that drop
 *  │ │  ●  ■  ▲     │ │   through a hole land here, so you see them inside
 *  │ └──────────────┘ │
 *  └──────────────────┘
 */
export const BOX = {
  backHalf: 160,
  frontHalf: 186,
  topH: 236,
  lip: 12,
  frontH: 132,
  /** Window (inside the front face). */
  win: { x: -146, y: 266, w: 292, h: 100 },
} as const;

export const BOX_H = BOX.topH + BOX.lip + BOX.frontH;

function roundedQuad(verts: number[][], r: number): Phaser.Math.Vector2[] {
  const out: Phaser.Math.Vector2[] = [];
  verts.forEach(([vx, vy], i) => {
    const prev = verts[(i + 3) % 4], next = verts[(i + 1) % 4];
    const toward = (o: number[]) => {
      const dx = o[0] - vx, dy = o[1] - vy, len = Math.hypot(dx, dy);
      return [vx + (dx / len) * r, vy + (dy / len) * r];
    };
    const a = toward(prev), b = toward(next);
    for (let t = 0; t <= 1.0001; t += 0.125) {
      out.push(new Phaser.Math.Vector2(
        (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * vx + t * t * b[0],
        (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * vy + t * t * b[1],
      ));
    }
  });
  return out;
}

/** Everything behind the holes: shadow, lid, lip, coloured front and the window's dark inside. */
export function drawBoxBody(g: Phaser.GameObjects.Graphics, color: number): void {
  g.clear();
  const { backHalf: bh, frontHalf: fh, topH, lip, frontH, win } = BOX;
  const bottom = topH + lip + frontH;

  // Soft floor shadow.
  g.fillStyle(0x9c4dcc, 0.14);
  g.fillEllipse(0, bottom + 6, fh * 2 + 20, 34);

  // Coloured front.
  const front = color, frontDark = mix(color, 0x4a148c, 0.18);
  g.fillStyle(frontDark, 1);
  g.fillRoundedRect(-fh, topH, fh * 2, lip + frontH + 6, { tl: 0, tr: 0, bl: 30, br: 30 });
  g.fillStyle(front, 1);
  g.fillRoundedRect(-fh, topH, fh * 2, lip + frontH - 2, { tl: 0, tr: 0, bl: 28, br: 28 });

  // Window: dark inside of the box.
  const inside = mix(color, 0x2d1b3d, 0.5);
  g.fillStyle(mix(color, 0xffffff, 0.55), 1);
  g.fillRoundedRect(win.x - 7, win.y - 7, win.w + 14, win.h + 14, 24);
  g.fillStyle(inside, 1);
  g.fillRoundedRect(win.x, win.y, win.w, win.h, 18);
  g.fillStyle(0x000000, 0.18);
  g.fillRoundedRect(win.x, win.y, win.w, 16, { tl: 18, tr: 18, bl: 0, br: 0 });

  // Lid: lip first (gives it thickness), then the top face.
  g.fillStyle(mix(color, 0xffffff, 0.35), 1);
  g.fillPoints(roundedQuad([[-bh, 0 + lip], [bh, 0 + lip], [fh, topH + lip], [-fh, topH + lip]], 26), true);
  const top = roundedQuad([[-bh, 0], [bh, 0], [fh, topH], [-fh, topH]], 26);
  g.fillStyle(0xfffafd, 1);
  g.fillPoints(top, true);
  g.lineStyle(3, mix(color, 0xffffff, 0.2), 1);
  g.strokePoints(top, true, true);
  // A faint inner bevel line, like moulded plastic.
  const inner = roundedQuad([[-bh + 14, 12], [bh - 14, 12], [fh - 16, topH - 12], [-fh + 16, topH - 12]], 18);
  g.lineStyle(2, mix(color, 0xffffff, 0.6), 0.7);
  g.strokePoints(inner, true, true);
}

/** Glass sheen drawn above the pieces that sit inside the window. */
export function drawBoxGlass(g: Phaser.GameObjects.Graphics, color: number): void {
  g.clear();
  const { win } = BOX;
  g.fillStyle(0xffffff, 0.16);
  g.fillPoints([
    new Phaser.Math.Vector2(win.x + 26, win.y),
    new Phaser.Math.Vector2(win.x + 76, win.y),
    new Phaser.Math.Vector2(win.x + 36, win.y + win.h),
    new Phaser.Math.Vector2(win.x - 14 + 14, win.y + win.h),
  ], true);
  g.fillStyle(0xffffff, 0.1);
  g.fillPoints([
    new Phaser.Math.Vector2(win.x + 92, win.y),
    new Phaser.Math.Vector2(win.x + 108, win.y),
    new Phaser.Math.Vector2(win.x + 68, win.y + win.h),
    new Phaser.Math.Vector2(win.x + 52, win.y + win.h),
  ], true);
  g.lineStyle(3, mix(color, 0xffffff, 0.75), 0.9);
  g.strokeRoundedRect(win.x, win.y, win.w, win.h, 18);
}

/** Hole centres (local) and size for a box with `n` holes. */
export function holeLayout(n: number): { size: number; spots: { x: number; y: number }[] } {
  const cy = BOX.topH / 2;
  if (n === 2) return { size: 106, spots: [{ x: -88, y: cy }, { x: 88, y: cy }] };
  if (n === 3) return { size: 86, spots: [{ x: -110, y: cy + 4 }, { x: 0, y: cy + 4 }, { x: 110, y: cy + 4 }] };
  return {
    size: 80,
    spots: [{ x: -72, y: cy - 54 }, { x: 72, y: cy - 54 }, { x: -78, y: cy + 56 }, { x: 78, y: cy + 56 }],
  };
}

/** Where the i-th of n pieces comes to rest inside the window. */
export function windowSlot(i: number, n: number): { x: number; y: number } {
  const { win } = BOX;
  const step = Math.min(70, (win.w - 60) / Math.max(1, n - 1));
  return { x: -((n - 1) / 2) * step + i * step, y: win.y + win.h - 32 };
}
