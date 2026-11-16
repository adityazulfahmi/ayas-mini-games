import Phaser from 'phaser';
import { C } from '@shared/theme';
import { shuffle } from '@shared/utils';
import { ITEMS, type Item } from './data';

const BACK_TOP = 0xd1a3e6;   // soft lilac
const BACK_DOT = 0xffffff;
const STAR = 0xffd54f;
const STAR_EDGE = 0xffb300;
const FACE = 0x4a2c6e;
const CHEEK = 0xff8a80;

export function radiusFor(w: number, h: number): number {
  return Math.round(Math.min(w, h) * 0.14);
}

function starPoints(cx: number, cy: number, outer: number, inner: number): Phaser.Math.Vector2[] {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
  }
  return pts;
}

/** The little smiling star that lives on every card back. */
export function drawStarBuddy(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, wink = false): void {
  g.fillStyle(STAR_EDGE, 1);
  g.fillPoints(starPoints(cx, cy + r * 0.04, r * 1.06, r * 0.56), true);
  g.fillStyle(STAR, 1);
  g.fillPoints(starPoints(cx, cy, r, r * 0.52), true);
  // shine
  g.fillStyle(0xffffff, 0.55);
  g.fillEllipse(cx - r * 0.26, cy - r * 0.28, r * 0.2, r * 0.12);
  // eyes
  const ey = cy + r * 0.02;
  g.fillStyle(FACE, 1);
  if (wink) {
    g.lineStyle(Math.max(1.5, r * 0.07), FACE, 1);
    g.beginPath();
    g.arc(-r * 0.17 + cx, ey + r * 0.03, r * 0.08, Math.PI * 1.1, Math.PI * 1.9);
    g.strokePath();
  } else {
    g.fillCircle(cx - r * 0.17, ey, r * 0.075);
  }
  g.fillCircle(cx + r * 0.17, ey, r * 0.075);
  g.fillStyle(0xffffff, 1);
  if (!wink) g.fillCircle(cx - r * 0.15, ey - r * 0.03, r * 0.025);
  g.fillCircle(cx + r * 0.19, ey - r * 0.03, r * 0.025);
  // smile
  g.lineStyle(Math.max(1.5, r * 0.06), FACE, 1);
  g.beginPath();
  g.arc(cx, ey + r * 0.1, r * 0.11, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160));
  g.strokePath();
  // cheeks
  g.fillStyle(CHEEK, 0.6);
  g.fillCircle(cx - r * 0.3, ey + r * 0.14, r * 0.065);
  g.fillCircle(cx + r * 0.3, ey + r * 0.14, r * 0.065);
}

/** Card back: lilac card, polka dots, white stitched frame and a smiling star. */
export function drawCardBack(g: Phaser.GameObjects.Graphics, w: number, h: number, hover = false): void {
  g.clear();
  const r = radiusFor(w, h);
  // drop shadow
  g.fillStyle(C.shadow, 0.22);
  g.fillRoundedRect(-w / 2, -h / 2 + Math.max(3, h * 0.03), w, h, r);
  // body: two-tone (pink lower half shows through as a soft band)
  g.fillStyle(hover ? C.pink : C.lavender2, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
  g.fillStyle(hover ? 0xf48fb1 : BACK_TOP, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h - Math.max(4, h * 0.045), r);

  // polka dots, staggered, kept inside the frame
  const inset = Math.max(6, Math.min(w, h) * 0.07);
  const step = Math.max(14, Math.min(w, h) * 0.17);
  const dotR = Math.max(1.6, step * 0.12);
  g.fillStyle(BACK_DOT, 0.28);
  let row = 0;
  for (let y = -h / 2 + inset + step * 0.5; y < h / 2 - inset - dotR; y += step * 0.8, row++) {
    const off = row % 2 ? step / 2 : 0;
    for (let x = -w / 2 + inset + step * 0.35 + off; x < w / 2 - inset - dotR; x += step) {
      g.fillCircle(x, y, dotR);
    }
  }

  // white frame
  g.lineStyle(Math.max(2, Math.min(w, h) * 0.022), 0xffffff, 0.85);
  g.strokeRoundedRect(-w / 2 + inset, -h / 2 + inset, w - inset * 2, h - inset * 2 - Math.max(4, h * 0.045) * 0.5, Math.max(4, r - inset * 0.6));

  // centre badge + star buddy
  const s = Math.min(w, h);
  g.fillStyle(0xffffff, 0.92);
  g.fillCircle(0, 0, s * 0.3);
  g.lineStyle(Math.max(2, s * 0.02), C.lavender, 0.6);
  g.strokeCircle(0, 0, s * 0.3);
  drawStarBuddy(g, 0, s * 0.01, s * 0.24);
}

/** Card front: cream face (or mint once matched). */
export function drawCardFront(g: Phaser.GameObjects.Graphics, w: number, h: number, matched: boolean): void {
  g.clear();
  const r = radiusFor(w, h);
  g.fillStyle(matched ? C.mint : C.shadow, matched ? 0.45 : 0.18);
  g.fillRoundedRect(-w / 2, -h / 2 + Math.max(3, h * 0.03), w, h, r);
  g.fillStyle(matched ? C.mintBg : C.cream, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
  const lw = Math.max(2.5, Math.min(w, h) * 0.03);
  g.lineStyle(lw, matched ? C.mint : C.lavender, matched ? 1 : 0.7);
  g.strokeRoundedRect(-w / 2 + lw / 2, -h / 2 + lw / 2, w - lw, h - lw, r);
  // soft glossy highlight
  g.fillStyle(0xffffff, matched ? 0.6 : 0.9);
  g.fillEllipse(-w * 0.18, -h / 2 + h * 0.09, w * 0.3, h * 0.045);
}

/** Pick `n` items, never two from the same look-alike group. */
export function pickItems(n: number): Item[] {
  const seen = new Set<string>();
  const out: Item[] = [];
  for (const it of shuffle(ITEMS)) {
    if (seen.has(it.look)) continue;
    seen.add(it.look);
    out.push(it);
    if (out.length === n) break;
  }
  return out;
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
