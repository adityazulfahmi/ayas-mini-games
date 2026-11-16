import Phaser from 'phaser';

export type Mood = 'smile' | 'happy' | 'oops';

/** Darken a 0xRRGGBB colour by `f` (0..1 keeps that fraction of each channel). */
export function shade(hex: number, f: number): number {
  const r = Math.round(((hex >> 16) & 0xff) * f);
  const g = Math.round(((hex >> 8) & 0xff) * f);
  const b = Math.round((hex & 0xff) * f);
  return (r << 16) | (g << 8) | b;
}

/**
 * A "colour buddy": a glossy rounded paint blob with a little face,
 * centred on (0, 0) and `size` wide. The face is identical on every buddy
 * so it never hints at the answer; only the colour differs.
 */
export function drawBuddy(
  g: Phaser.GameObjects.Graphics,
  size: number,
  fill: number,
  mood: Mood = 'smile',
  glow = false,
): void {
  g.clear();
  const s = size, h = s / 2, r = s * 0.3;

  if (glow) {
    g.fillStyle(0xffffff, 0.95);
    g.fillRoundedRect(-h - 9, -h - 9, s + 18, s + 18, r + 9);
    g.lineStyle(4, 0x80cbc4, 1);
    g.strokeRoundedRect(-h - 9, -h - 9, s + 18, s + 18, r + 9);
  }
  // Soft drop shadow, then a darker "base" so the blob looks chunky like a toy.
  g.fillStyle(0x4a148c, 0.14);
  g.fillRoundedRect(-h + 3, -h + 10, s, s, r);
  g.fillStyle(shade(fill, 0.78), 1);
  g.fillRoundedRect(-h, -h + 6, s, s, r);
  g.fillStyle(fill, 1);
  g.fillRoundedRect(-h, -h, s, s, r);
  // Gloss highlights.
  g.fillStyle(0xffffff, 0.32);
  g.fillEllipse(-s * 0.2, -s * 0.31, s * 0.36, s * 0.13);
  g.fillStyle(0xffffff, 0.5);
  g.fillCircle(s * 0.06, -s * 0.33, s * 0.035);

  // Face
  const ink = 0x2d1b3d;
  const ex = s * 0.16, ey = -s * 0.02, er = s * 0.062;
  g.fillStyle(ink, 1);
  if (mood === 'happy') {
    // Happy closed eyes: little upside-down arcs.
    g.lineStyle(s * 0.04, ink, 1);
    for (const x of [-ex, ex]) {
      g.beginPath();
      g.arc(x, ey + er * 0.6, er * 1.1, Math.PI * 1.1, Math.PI * 1.9);
      g.strokePath();
    }
  } else {
    g.fillCircle(-ex, ey, er);
    g.fillCircle(ex, ey, er);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(-ex + er * 0.35, ey - er * 0.4, er * 0.38);
    g.fillCircle(ex + er * 0.35, ey - er * 0.4, er * 0.38);
  }
  // Cheeks
  g.fillStyle(0xff8fb1, 0.45);
  g.fillEllipse(-s * 0.29, s * 0.1, s * 0.13, s * 0.08);
  g.fillEllipse(s * 0.29, s * 0.1, s * 0.13, s * 0.08);
  // Mouth
  const my = s * 0.1;
  if (mood === 'happy') {
    g.fillStyle(ink, 1);
    g.beginPath();
    g.arc(0, my, s * 0.12, 0, Math.PI, false);
    g.closePath();
    g.fillPath();
    g.fillStyle(0xff7a9c, 1);
    g.fillEllipse(0, my + s * 0.075, s * 0.11, s * 0.05);
  } else if (mood === 'oops') {
    g.fillStyle(ink, 1);
    g.fillEllipse(0, my + s * 0.03, s * 0.07, s * 0.085);
  } else {
    g.lineStyle(s * 0.035, ink, 1);
    g.beginPath();
    g.arc(0, my - s * 0.02, s * 0.09, Math.PI * 0.15, Math.PI * 0.85, false);
    g.strokePath();
  }
}
