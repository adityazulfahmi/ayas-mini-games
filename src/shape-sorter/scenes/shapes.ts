import Phaser from 'phaser';
import type { ShapeKind } from '../data';

/** Outline of a shape centred on (0, 0), roughly `size` wide. */
export function shapePoints(kind: ShapeKind, size: number): Phaser.Math.Vector2[] {
  const r = size / 2;
  const pts: Phaser.Math.Vector2[] = [];
  const P = (x: number, y: number) => pts.push(new Phaser.Math.Vector2(x, y));
  switch (kind) {
    case 'circle':
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        P(Math.cos(a) * r, Math.sin(a) * r);
      }
      break;
    case 'square': {
      // Rounded square: four quarter-circle corners.
      const s = r * 0.86, c = r * 0.22;
      const corners = [[s - c, s - c, 0], [-s + c, s - c, 90], [-s + c, -s + c, 180], [s - c, -s + c, 270]];
      for (const [cx, cy, start] of corners) {
        for (let i = 0; i <= 6; i++) {
          const a = ((start + i * 15) * Math.PI) / 180;
          P(cx + Math.cos(a) * c, cy + Math.sin(a) * c);
        }
      }
      break;
    }
    case 'triangle': {
      // Rounded equilateral triangle, centred on its bounding box.
      const c = r * 0.16;
      const h = r * 1.85;
      const verts = [[0, -h / 2], [r, h / 2], [-r, h / 2]];
      verts.forEach(([vx, vy], i) => {
        const prev = verts[(i + 2) % 3];
        const next = verts[(i + 1) % 3];
        const toward = (o: number[], d: number) => {
          const dx = o[0] - vx, dy = o[1] - vy, len = Math.hypot(dx, dy);
          return [vx + (dx / len) * d, vy + (dy / len) * d];
        };
        const a = toward(prev, c * 2), b = toward(next, c * 2);
        for (let t = 0; t <= 1.0001; t += 0.2) {
          // Quadratic curve through the vertex for a soft corner.
          const x = (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * vx + t * t * b[0];
          const y = (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * vy + t * t * b[1];
          P(x, y);
        }
      });
      break;
    }
    case 'star':
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 ? r * 0.48 : r * 1.02;
        P(Math.cos(a) * rr, Math.sin(a) * rr + r * 0.06);
      }
      break;
    case 'heart':
      for (let i = 0; i < 60; i++) {
        const t = (i / 60) * Math.PI * 2;
        const x = 16 * Math.sin(t) ** 3;
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        P((x / 17) * r, (y / 17) * r + r * 0.08);
      }
      break;
  }
  return pts;
}

/** Where to put the face so it sits in the visual middle of each shape. */
const FACE_Y: Record<ShapeKind, number> = { circle: 0, square: 0, triangle: 0.2, star: 0.08, heart: -0.02 };

/**
 * A chunky toy piece: drop shadow, coloured body, glossy highlight and a
 * friendly face. Drawn at (0, 0) so it can live inside a container.
 */
export function drawPiece(g: Phaser.GameObjects.Graphics, kind: ShapeKind, color: number, size: number): void {
  g.clear();
  const body = shapePoints(kind, size);
  const darker = Phaser.Display.Color.ValueToColor(color).darken(18).color;

  g.fillStyle(0x4a148c, 0.16);
  g.fillPoints(body.map(p => new Phaser.Math.Vector2(p.x, p.y + 7)), true);
  // Darker rim gives the piece thickness.
  g.fillStyle(darker, 1);
  g.fillPoints(body.map(p => new Phaser.Math.Vector2(p.x, p.y + 4)), true);
  g.fillStyle(color, 1);
  g.fillPoints(body, true);
  // Glossy highlight.
  g.fillStyle(0xffffff, 0.35);
  g.fillEllipse(-size * 0.16, -size * 0.2 + (kind === 'triangle' ? size * 0.12 : 0), size * 0.22, size * 0.12);

  const fy = FACE_Y[kind] * size;
  const s = kind === 'star' || kind === 'triangle' ? 0.8 : 1;
  g.fillStyle(0x3a1060, 1);
  g.fillCircle(-size * 0.12 * s, fy - size * 0.03, size * 0.045 * s);
  g.fillCircle(size * 0.12 * s, fy - size * 0.03, size * 0.045 * s);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(-size * 0.11 * s, fy - size * 0.045, size * 0.015 * s);
  g.fillCircle(size * 0.13 * s, fy - size * 0.045, size * 0.015 * s);
  g.lineStyle(size * 0.03 * s, 0x3a1060, 1);
  g.beginPath();
  g.arc(0, fy + size * 0.04, size * 0.08 * s, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160));
  g.strokePath();
  g.fillStyle(0xff8a80, 0.55);
  g.fillCircle(-size * 0.22 * s, fy + size * 0.06, size * 0.045 * s);
  g.fillCircle(size * 0.22 * s, fy + size * 0.06, size * 0.045 * s);
}

/** A recessed hole in the sorter lid, with a soft colour ring as a hint. */
export function drawHole(g: Phaser.GameObjects.Graphics, kind: ShapeKind, color: number, size: number, glow = false): void {
  g.clear();
  const outer = shapePoints(kind, size * 1.16);
  const hole = shapePoints(kind, size * 1.04);
  g.fillStyle(color, glow ? 0.8 : 0.45);
  g.fillPoints(outer, true);
  g.fillStyle(0x4a2c6e, 1);
  g.fillPoints(hole, true);
  // Inner shadow at the top edge so it reads as a hole, not a sticker.
  g.fillStyle(0x24123a, 0.7);
  g.fillPoints(shapePoints(kind, size * 0.98).map(p => new Phaser.Math.Vector2(p.x, p.y - size * 0.04)), true);
  g.fillStyle(0x4a2c6e, 1);
  g.fillPoints(shapePoints(kind, size * 0.9).map(p => new Phaser.Math.Vector2(p.x, p.y + size * 0.03)), true);
}

/** Say a word out loud (friendly, slow, high-pitched). Silent if unsupported. */
export function say(text: string): void {
  try {
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.85;
    u.pitch = 1.3;
    u.lang = 'en-US';
    synth.speak(u);
  } catch { /* no speech on this device */ }
}
