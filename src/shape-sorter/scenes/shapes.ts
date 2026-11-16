import Phaser from 'phaser';
import type { ShapeKind } from '../data';

type V = Phaser.Math.Vector2;
const vec = (x: number, y: number): V => new Phaser.Math.Vector2(x, y);

/** Polygon with softly rounded corners (quadratic curve through each vertex). */
function roundPoly(verts: number[][], c: number, out: V[]): void {
  verts.forEach(([vx, vy], i) => {
    const prev = verts[(i + verts.length - 1) % verts.length];
    const next = verts[(i + 1) % verts.length];
    const toward = (o: number[]) => {
      const dx = o[0] - vx, dy = o[1] - vy, len = Math.hypot(dx, dy);
      return [vx + (dx / len) * c, vy + (dy / len) * c];
    };
    const a = toward(prev), b = toward(next);
    for (let t = 0; t <= 1.0001; t += 0.2) {
      out.push(vec(
        (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * vx + t * t * b[0],
        (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * vy + t * t * b[1],
      ));
    }
  });
}

/**
 * A fat, friendly crescent centred on its bounding box. `grow` pushes the
 * outline out (or in, if negative) evenly: the outer circle grows and the
 * bite shrinks, so grown/shrunk copies nest like a real inset.
 */
function moonRaw(r: number, grow: number): number[][] {
  const cx = r * 0.52, cy = -r * 0.34;
  const ro = r + grow, ri = r * 0.74 - grow;
  const inside = (x: number, y: number) => (x - cx) ** 2 + (y - cy) ** 2 < ri * ri;
  const away = Math.atan2(-cy, -cx);
  let s = 0;
  while (s < Math.PI && !inside(Math.cos(away + s) * ro, Math.sin(away + s) * ro)) s += 0.004;
  const pts: number[][] = [];
  const N = 44;
  for (let i = 0; i <= N; i++) {
    const a = away - s + (2 * s * i) / N;
    pts.push([Math.cos(a) * ro, Math.sin(a) * ro]);
  }
  // Back along the bite circle, the side that lies inside the outer circle.
  const [ex, ey] = pts[pts.length - 1], [sx, sy] = pts[0];
  const aE = Math.atan2(ey - cy, ex - cx), aS = Math.atan2(sy - cy, sx - cx);
  let d = aS - aE;
  while (d <= 0) d += Math.PI * 2;
  const mid = aE + d / 2;
  if (Math.hypot(cx + Math.cos(mid) * ri, cy + Math.sin(mid) * ri) > ro) d -= Math.PI * 2;
  for (let i = 1; i < 26; i++) {
    const a = aE + (d * i) / 26;
    pts.push([cx + Math.cos(a) * ri, cy + Math.sin(a) * ri]);
  }
  return pts;
}

function moonPoints(r: number, grow: number, out: V[]): void {
  // Centre on the un-grown moon so every inset copy shares one centre.
  const base = moonRaw(r, 0);
  const xs = base.map(p => p[0]), ys = base.map(p => p[1]);
  const ox = (Math.min(...xs) + Math.max(...xs)) / 2, oy = (Math.min(...ys) + Math.max(...ys)) / 2;
  moonRaw(r, grow).forEach(([x, y]) => out.push(vec(x - ox, y - oy)));
}

/** Outline of a shape centred on (0, 0), roughly `size` wide. */
/** `grow` (moon only) offsets the outline evenly instead of scaling it. */
export function shapePoints(kind: ShapeKind, size: number, grow = 0): V[] {
  const r = size / 2;
  const pts: V[] = [];
  switch (kind) {
    case 'circle':
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        pts.push(vec(Math.cos(a) * r, Math.sin(a) * r));
      }
      break;
    case 'square': {
      // Rounded square: four quarter-circle corners.
      const s = r * 0.86, c = r * 0.22;
      const corners = [[s - c, s - c, 0], [-s + c, s - c, 90], [-s + c, -s + c, 180], [s - c, -s + c, 270]];
      for (const [cx, cy, start] of corners) {
        for (let i = 0; i <= 6; i++) {
          const a = ((start + i * 15) * Math.PI) / 180;
          pts.push(vec(cx + Math.cos(a) * c, cy + Math.sin(a) * c));
        }
      }
      break;
    }
    case 'triangle': {
      const h = r * 1.85;
      roundPoly([[0, -h / 2], [r, h / 2], [-r, h / 2]], r * 0.32, pts);
      break;
    }
    case 'diamond':
      roundPoly([[0, -r * 1.02], [r * 0.78, 0], [0, r * 1.02], [-r * 0.78, 0]], r * 0.22, pts);
      break;
    case 'star':
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 ? r * 0.48 : r * 1.02;
        pts.push(vec(Math.cos(a) * rr, Math.sin(a) * rr + r * 0.06));
      }
      break;
    case 'heart':
      for (let i = 0; i < 60; i++) {
        const t = (i / 60) * Math.PI * 2;
        const x = 16 * Math.sin(t) ** 3;
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        pts.push(vec((x / 17) * r, (y / 17) * r + r * 0.08));
      }
      break;
    case 'moon':
      moonPoints(r * 1.06, grow, pts);
      break;
  }
  return pts;
}

/** Where the face (or tick) sits so it is in the visual middle of each shape, plus its scale. */
const FACE: Record<ShapeKind, { x: number; y: number; s: number }> = {
  circle:   { x: 0,     y: 0,    s: 1 },
  square:   { x: 0,     y: 0,    s: 1 },
  triangle: { x: 0,     y: 0.2,  s: 0.8 },
  star:     { x: 0,     y: 0.08, s: 0.8 },
  heart:    { x: 0,     y: -0.02, s: 1 },
  moon:     { x: -0.17, y: 0.13, s: 0.72 },
  diamond:  { x: 0,     y: 0.02, s: 0.85 },
};

const HIGHLIGHT: Record<ShapeKind, { x: number; y: number }> = {
  circle: { x: -0.16, y: -0.2 }, square: { x: -0.16, y: -0.2 }, triangle: { x: -0.06, y: -0.1 },
  star: { x: -0.1, y: -0.12 }, heart: { x: -0.18, y: -0.2 }, moon: { x: -0.3, y: -0.08 }, diamond: { x: -0.1, y: -0.22 },
};

export function mix(a: number, b: number, t: number): number {
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(
    Phaser.Display.Color.ValueToColor(a), Phaser.Display.Color.ValueToColor(b), 100, t * 100);
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
}

/**
 * A chunky toy piece: drop shadow, coloured body, glossy highlight and a
 * friendly face. Drawn at (0, 0) so it can live inside a container.
 */
export function drawPiece(g: Phaser.GameObjects.Graphics, kind: ShapeKind, color: number, size: number, happy = false): void {
  g.clear();
  const body = shapePoints(kind, size);
  const darker = Phaser.Display.Color.ValueToColor(color).darken(18).color;
  const depth = Math.max(3, size * 0.035);

  g.fillStyle(0x4a148c, 0.16);
  g.fillPoints(body.map(p => vec(p.x, p.y + depth * 1.8)), true);
  // Darker rim gives the piece thickness.
  g.fillStyle(darker, 1);
  g.fillPoints(body.map(p => vec(p.x, p.y + depth)), true);
  g.fillStyle(color, 1);
  g.fillPoints(body, true);
  // Glossy highlight.
  const hl = HIGHLIGHT[kind];
  g.fillStyle(0xffffff, 0.35);
  g.fillEllipse(hl.x * size, hl.y * size, size * 0.22, size * 0.12);

  const f = FACE[kind];
  const fx = f.x * size, fy = f.y * size, s = f.s;
  const eye = (dx: number) => {
    if (happy) {
      // Closed, smiling eyes: ^ ^
      g.lineStyle(size * 0.03 * s, 0x3a1060, 1);
      g.beginPath();
      g.arc(fx + dx, fy - size * 0.015, size * 0.04 * s, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340));
      g.strokePath();
    } else {
      g.fillStyle(0x3a1060, 1);
      g.fillCircle(fx + dx, fy - size * 0.03, size * 0.045 * s);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(fx + dx + size * 0.012 * s, fy - size * 0.045, size * 0.015 * s);
    }
  };
  eye(-size * 0.12 * s);
  eye(size * 0.12 * s);
  g.lineStyle(size * 0.03 * s, 0x3a1060, 1);
  g.beginPath();
  g.arc(fx, fy + size * 0.04, size * (happy ? 0.1 : 0.08) * s, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160));
  g.strokePath();
  g.fillStyle(0xff8a80, 0.55);
  g.fillCircle(fx - size * 0.22 * s, fy + size * 0.06, size * 0.045 * s);
  g.fillCircle(fx + size * 0.22 * s, fy + size * 0.06, size * 0.045 * s);
}

/** Dark silhouette laid over a piece while it sinks into a hole. */
export function drawShade(g: Phaser.GameObjects.Graphics, kind: ShapeKind, size: number): void {
  g.clear();
  g.fillStyle(0x24123a, 1);
  g.fillPoints(shapePoints(kind, size * 1.01), true);
}

export type HoleState = 'idle' | 'glow' | 'done';

/** A recessed hole in the sorter lid, with a colour ring as a hint. */
export function drawHole(g: Phaser.GameObjects.Graphics, kind: ShapeKind, color: number, size: number, state: HoleState = 'idle'): void {
  g.clear();
  // Each layer is the outline scaled about the shape's visual centre, so the
  // layers nest neatly even for concave shapes like the moon.
  const f = FACE[kind];
  const layer = (k: number, dy = 0) => (kind === 'moon'
    ? shapePoints(kind, size, Math.min(((k - 1) * size) / 2, size * 0.13)).map(p => vec(p.x, p.y + dy * size))
    : shapePoints(kind, size * k).map(p => vec(p.x + f.x * size * (1 - k), p.y + f.y * size * (1 - k) + dy * size)));
  if (state === 'glow') {
    g.fillStyle(color, 0.28);
    g.fillPoints(layer(1.42), true);
  }
  const rimA = state === 'idle' ? 0.65 : 1;
  g.fillStyle(color, rimA);
  g.fillPoints(layer(1.18), true);
  g.fillStyle(0xffffff, 0.5);
  g.fillPoints(layer(1.18, 0.02), true);
  g.fillStyle(color, rimA);
  g.fillPoints(layer(1.12, 0.02), true);

  const inside = state === 'done'
    ? Phaser.Display.Color.ValueToColor(color).darken(14).color
    : mix(0x3a1f5c, color, 0.14);
  g.fillStyle(inside, 1);
  g.fillPoints(layer(1.02), true);
  // Inner shadow at the top edge so it reads as a hole, not a sticker.
  g.fillStyle(0x1c0d2e, state === 'done' ? 0.25 : 0.6);
  g.fillPoints(layer(0.98, -0.04), true);
  g.fillStyle(inside, 1);
  g.fillPoints(layer(0.9, 0.03), true);

  if (state === 'done') {
    const cx = f.x * size, cy = f.y * size + size * 0.02, s = size * f.s;
    g.lineStyle(s * 0.09, 0xffffff, 0.95);
    g.beginPath();
    g.moveTo(cx - s * 0.17, cy);
    g.lineTo(cx - s * 0.05, cy + s * 0.12);
    g.lineTo(cx + s * 0.18, cy - s * 0.12);
    g.strokePath();
  }
}

/**
 * Say a word out loud (friendly, slow, high-pitched). Silent if unsupported.
 * `interrupt` cuts off whatever is being said; otherwise the line is queued.
 */
export function say(text: string, interrupt = true): void {
  try {
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return;
    if (interrupt) synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.85;
    u.pitch = 1.3;
    u.lang = 'en-US';
    synth.speak(u);
  } catch { /* no speech on this device */ }
}
