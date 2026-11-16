import Phaser from 'phaser';
import type { ItemArt, ToyKind } from '../data';

type G = Phaser.GameObjects.Graphics;
type V = Phaser.Math.Vector2;
const vec = (x: number, y: number): V => new Phaser.Math.Vector2(x, y);

const INK = 0x3b2140;

/** Blend colour `a` towards `b` by `t` (0..1). */
export function mix(a: number, b: number, t: number): number {
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
export const darker = (c: number, t = 0.25): number => mix(c, 0x4a1030, t);
export const lighter = (c: number, t = 0.35): number => mix(c, 0xffffff, t);

/** Polygon with softly rounded corners (quadratic curve through each vertex). */
export function roundPoly(verts: number[][], radius: number | number[]): V[] {
  const out: V[] = [];
  verts.forEach(([vx, vy], i) => {
    const c = Array.isArray(radius) ? radius[i] : radius;
    const prev = verts[(i + verts.length - 1) % verts.length];
    const next = verts[(i + 1) % verts.length];
    const toward = (o: number[]) => {
      const dx = o[0] - vx, dy = o[1] - vy, len = Math.hypot(dx, dy);
      const d = Math.min(c, len / 2);
      return [vx + (dx / len) * d, vy + (dy / len) * d];
    };
    const a = toward(prev), b = toward(next);
    for (let t = 0; t <= 1.0001; t += 0.125) {
      out.push(vec(
        (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * vx + t * t * b[0],
        (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * vy + t * t * b[1],
      ));
    }
  });
  return out;
}

const shift = (pts: V[], dx: number, dy: number): V[] => pts.map(p => vec(p.x + dx, p.y + dy));

/** Dot eyes, a smile and a little blush. `s` is the size of the toy it sits on. */
function face(g: G, cx: number, cy: number, s: number, happy = false): void {
  const ex = s * 0.135, er = s * 0.047;
  g.fillStyle(0xff5d8f, 0.32);
  g.fillEllipse(cx - s * 0.24, cy + s * 0.075, s * 0.12, s * 0.075);
  g.fillEllipse(cx + s * 0.24, cy + s * 0.075, s * 0.12, s * 0.075);
  g.fillStyle(INK, 1);
  g.fillCircle(cx - ex, cy - s * 0.02, er);
  g.fillCircle(cx + ex, cy - s * 0.02, er);
  g.fillStyle(0xffffff, 0.95);
  g.fillCircle(cx - ex + er * 0.35, cy - s * 0.02 - er * 0.4, er * 0.36);
  g.fillCircle(cx + ex + er * 0.35, cy - s * 0.02 - er * 0.4, er * 0.36);
  g.lineStyle(Math.max(1.6, s * 0.032), INK, 1);
  g.beginPath();
  const r = s * (happy ? 0.105 : 0.085);
  g.arc(cx, cy + s * 0.035, r, Math.PI * 0.14, Math.PI * 0.86);
  g.strokePath();
}

function starPts(r: number): V[] {
  const verts: number[][] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.56 : r * 1.04;
    verts.push([Math.cos(a) * rr, Math.sin(a) * rr + r * 0.05]);
  }
  return roundPoly(verts, verts.map((_, i) => (i % 2 ? r * 0.06 : r * 0.2)));
}

function heartPts(r: number): V[] {
  const pts: V[] = [];
  for (let i = 0; i < 60; i++) {
    const t = (i / 60) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    pts.push(vec((x / 17) * r, (y / 17) * r + r * 0.1));
  }
  return pts;
}

/**
 * A chunky toy centred on (0, 0), roughly `size` wide. The whole toy is one
 * colour (plus a darker underside and a soft shine) so its colour is never
 * in doubt.
 */
export function drawToy(g: G, kind: ToyKind, color: number, size: number, happy = false): void {
  g.clear();
  const r = size / 2;
  const dark = darker(color), lite = lighter(color);
  const lift = size * 0.055;

  switch (kind) {
    case 'ball': {
      g.fillStyle(dark, 1); g.fillCircle(0, lift, r * 0.96);
      g.fillStyle(color, 1); g.fillCircle(0, 0, r * 0.96);
      g.fillStyle(lite, 0.55); g.fillEllipse(-r * 0.4, -r * 0.5, r * 0.5, r * 0.3);
      face(g, 0, r * 0.06, size, happy);
      break;
    }
    case 'block': {
      const s = r * 0.9, c = r * 0.3;
      g.fillStyle(dark, 1); g.fillRoundedRect(-s, -s + lift, s * 2, s * 2, c);
      g.fillStyle(color, 1); g.fillRoundedRect(-s, -s, s * 2, s * 2, c);
      g.lineStyle(Math.max(2, size * 0.035), lite, 0.55);
      g.strokeRoundedRect(-s * 0.78, -s * 0.78, s * 1.56, s * 1.56, c * 0.7);
      face(g, 0, r * 0.04, size, happy);
      break;
    }
    case 'star': {
      const pts = starPts(r);
      g.fillStyle(dark, 1); g.fillPoints(shift(pts, 0, lift), true);
      g.fillStyle(color, 1); g.fillPoints(pts, true);
      g.fillStyle(lite, 0.5); g.fillEllipse(-r * 0.1, -r * 0.52, r * 0.2, r * 0.3);
      face(g, 0, r * 0.12, size * 0.82, happy);
      break;
    }
    case 'heart': {
      const pts = heartPts(r);
      g.fillStyle(dark, 1); g.fillPoints(shift(pts, 0, lift), true);
      g.fillStyle(color, 1); g.fillPoints(pts, true);
      g.fillStyle(lite, 0.55); g.fillEllipse(-r * 0.5, -r * 0.42, r * 0.36, r * 0.24);
      face(g, 0, -r * 0.02, size * 0.95, happy);
      break;
    }
    case 'flower': {
      const pr = r * 0.4, d = r * 0.58;
      for (const [col, dy] of [[dark, lift], [color, 0]] as [number, number][]) {
        g.fillStyle(col, 1);
        for (let i = 0; i < 6; i++) {
          const a = -Math.PI / 2 + (i * Math.PI) / 3;
          g.fillCircle(Math.cos(a) * d, Math.sin(a) * d + dy, pr);
        }
        g.fillCircle(0, dy, d);
      }
      g.fillStyle(lite, 0.5); g.fillEllipse(-r * 0.1, -r * 0.7, r * 0.3, r * 0.16);
      g.fillStyle(lighter(color, 0.72), 1); g.fillCircle(0, 0, r * 0.47);
      face(g, 0, r * 0.01, size * 0.66, happy);
      break;
    }
    case 'fish': {
      // Swims to the left; the tail is on the right.
      const bw = r * 1.5, bh = r * 1.12, bx = -r * 0.22;
      const tail = roundPoly([[r * 0.34, 0], [r * 0.98, -r * 0.56], [r * 0.82, 0], [r * 0.98, r * 0.56]], r * 0.14);
      const fin = roundPoly([[bx - r * 0.1, -bh * 0.42], [bx + r * 0.42, -bh * 0.86], [bx + r * 0.5, -bh * 0.3]], r * 0.1);
      g.fillStyle(dark, 1);
      g.fillPoints(shift(tail, 0, lift), true);
      g.fillEllipse(bx, lift, bw, bh);
      g.fillStyle(color, 1);
      g.fillPoints(fin, true);
      g.fillPoints(tail, true);
      g.fillEllipse(bx, 0, bw, bh);
      g.fillStyle(lite, 0.5); g.fillEllipse(bx - r * 0.1, -bh * 0.3, r * 0.6, r * 0.18);
      g.fillStyle(dark, 0.55);
      g.fillPoints(roundPoly([[bx + r * 0.12, r * 0.02], [bx + r * 0.46, r * 0.14], [bx + r * 0.14, r * 0.3]], r * 0.07), true);
      const ex = bx - r * 0.36, ey = -r * 0.1;
      g.fillStyle(0xffffff, 1); g.fillCircle(ex, ey, r * 0.17);
      g.fillStyle(INK, 1); g.fillCircle(ex - r * 0.03, ey, r * 0.095);
      g.fillStyle(0xffffff, 1); g.fillCircle(ex, ey - r * 0.04, r * 0.035);
      g.lineStyle(Math.max(1.6, size * 0.028), INK, 1);
      g.beginPath();
      g.arc(bx - r * 0.5, r * 0.12, r * 0.14, Math.PI * 0.2, Math.PI * 0.8);
      g.strokePath();
      break;
    }
    case 'car': {
      const bw = r * 1.92, bh = r * 0.62, by = r * 0.02;
      const cab = roundPoly([[-r * 0.52, by + 2], [-r * 0.36, -r * 0.62], [r * 0.34, -r * 0.62], [r * 0.6, by + 2]], r * 0.16);
      g.fillStyle(dark, 1);
      g.fillRoundedRect(-bw / 2, by + lift, bw, bh, bh * 0.42);
      g.fillStyle(color, 1);
      g.fillPoints(cab, true);
      g.fillRoundedRect(-bw / 2, by, bw, bh, bh * 0.42);
      // Windows
      g.fillStyle(0xf3fbff, 1);
      g.fillPoints(roundPoly([[-r * 0.36, by - r * 0.02], [-r * 0.26, -r * 0.48], [-r * 0.04, -r * 0.48], [-r * 0.04, by - r * 0.02]], r * 0.06), true);
      g.fillPoints(roundPoly([[r * 0.06, by - r * 0.02], [r * 0.06, -r * 0.48], [r * 0.27, -r * 0.48], [r * 0.42, by - r * 0.02]], r * 0.06), true);
      g.fillStyle(lite, 0.5); g.fillRoundedRect(-bw / 2 + r * 0.14, by + r * 0.09, bw * 0.5, r * 0.09, r * 0.045);
      g.fillStyle(0xfff59d, 1); g.fillCircle(bw / 2 - r * 0.12, by + bh * 0.4, r * 0.085);
      // Wheels
      for (const wx of [-r * 0.5, r * 0.5]) {
        g.fillStyle(INK, 1); g.fillCircle(wx, by + bh, r * 0.25);
        g.fillStyle(0xffffff, 0.9); g.fillCircle(wx, by + bh, r * 0.1);
      }
      break;
    }
  }
}

/** A soft paint splash: the sign on the colour baskets. */
export function drawSplash(g: G, color: number, r: number): void {
  g.fillStyle(color, 1);
  g.fillCircle(0, 0, r * 0.62);
  const lumps = [[0.2, 0.3], [1.25, 0.24], [2.3, 0.33], [3.3, 0.25], [4.3, 0.31], [5.35, 0.26]];
  for (const [a, lr] of lumps) g.fillCircle(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6, r * lr);
  g.fillCircle(r * 0.92, -r * 0.5, r * 0.1);
  g.fillCircle(-r * 0.86, r * 0.62, r * 0.12);
  g.fillStyle(lighter(color, 0.5), 0.7);
  g.fillEllipse(-r * 0.22, -r * 0.3, r * 0.34, r * 0.2);
}

/** Build the picture for an item: a drawn toy or a big emoji. Centred on (0, 0). */
export function makeArt(
  scene: Phaser.Scene, art: ItemArt, size: number,
): { node: Phaser.GameObjects.GameObject; cheer: (on: boolean) => void } {
  if (art.type === 'toy') {
    const g = scene.add.graphics();
    drawToy(g, art.kind, art.color, size);
    return { node: g, cheer: on => drawToy(g, art.kind, art.color, size, on) };
  }
  // No letterSpacing here: it would split the emoji (see brief).
  const txt = scene.add.text(0, 0, art.char, { fontSize: `${Math.round(size * 0.84)}px`, padding: { top: 8, bottom: 8 } }).setOrigin(0.5);
  return { node: txt, cheer: () => { /* emoji already smile */ } };
}
