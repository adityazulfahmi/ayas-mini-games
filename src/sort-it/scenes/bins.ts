import Phaser from 'phaser';
import type { BinDef } from '../data';
import { darker, drawSplash, drawToy, lighter, roundPoly } from './toys';

/**
 * A toy basket. The container's origin is the middle of the basket's floor,
 * so squashing it (scaleY) keeps it standing on the ground. Sorted toys live
 * in `items`, between the dark opening and the front wall, so they look like
 * they sit inside and pile up over the rim.
 */
export interface BinView {
  c: Phaser.GameObjects.Container;
  items: Phaser.GameObjects.Container;
  glow: Phaser.GameObjects.Graphics;
}

export function makeBin(scene: Phaser.Scene, def: BinDef, x: number, y: number): BinView {
  const { w, bodyH, color } = def;
  const dark = darker(color, 0.32), lite = lighter(color, 0.38);
  const taper = w * 0.07;

  const glow = scene.add.graphics().setAlpha(0);
  glow.fillStyle(0xffffff, 0.62);
  glow.fillRoundedRect(-w / 2 - 18, -bodyH - 30, w + 36, bodyH + 44, 30);
  glow.lineStyle(3, lite, 0.9);
  glow.strokeRoundedRect(-w / 2 - 18, -bodyH - 30, w + 36, bodyH + 44, 30);

  const back = scene.add.graphics();
  back.fillStyle(0x6a1b9a, 0.14);
  back.fillEllipse(0, 3, w * 0.98, 20);
  // Handles peek out behind the rim.
  const hr = w < 130 ? 12 : 16;
  back.lineStyle(w < 130 ? 7 : 8, dark, 1);
  for (const s of [-1, 1]) {
    back.beginPath();
    back.arc(s * (w / 2 - 3), -bodyH + 16 + hr, hr, s > 0 ? -Math.PI / 2 : Math.PI / 2, s > 0 ? Math.PI / 2 : Math.PI * 1.5);
    back.strokePath();
  }
  // The dark inside of the basket.
  back.fillStyle(darker(color, 0.55), 1);
  back.fillEllipse(0, -bodyH, w + 4, 34);

  const items = scene.add.container(0, 0);

  const front = scene.add.graphics();
  const body = roundPoly(
    [[-w / 2, -bodyH], [w / 2, -bodyH], [w / 2 - taper, 0], [-w / 2 + taper, 0]],
    [4, 4, 24, 24],
  );
  front.fillStyle(color, 1);
  front.fillPoints(body, true);
  // Woven bands
  for (const f of [0.34, 0.58, 0.82]) {
    const yy = -bodyH + bodyH * f;
    const half = w / 2 - taper * f - 10;
    front.fillStyle(f > 0.7 ? dark : lite, f > 0.7 ? 0.16 : 0.3);
    front.fillRoundedRect(-half, yy - 4, half * 2, 8, 4);
  }
  // Soft light on the left side
  front.fillStyle(0xffffff, 0.16);
  front.fillPoints(roundPoly(
    [[-w / 2 + 8, -bodyH + 14], [-w / 2 + 26, -bodyH + 14], [-w / 2 + taper + 24, -14], [-w / 2 + taper + 12, -14]], 6), true);
  // Rim
  front.fillStyle(dark, 0.35);
  front.fillRoundedRect(-w / 2 - 8, -bodyH - 8, w + 16, 26, 13);
  front.fillStyle(lite, 1);
  front.fillRoundedRect(-w / 2 - 8, -bodyH - 12, w + 16, 26, 13);
  front.fillStyle(0xffffff, 0.55);
  front.fillRoundedRect(-w / 2 + 4, -bodyH - 8, w - 8, 6, 3);

  // The sign: what belongs in here.
  const br = Math.min(34, bodyH * 0.3, w * 0.3);
  const by = -bodyH / 2 + 10;
  front.fillStyle(dark, 0.3);
  front.fillCircle(0, by + 3, br + 3);
  front.fillStyle(0xffffff, 1);
  front.fillCircle(0, by, br + 3);

  const parts: Phaser.GameObjects.GameObject[] = [glow, back, items, front];
  const badge = def.badge;
  if (badge.type === 'emoji') {
    parts.push(scene.add.text(0, by + 1, badge.char, { fontSize: `${Math.round(br * 1.25)}px`, padding: { top: 6, bottom: 6 } }).setOrigin(0.5));
  } else {
    const bg = scene.add.graphics().setPosition(0, by);
    if (badge.type === 'splash') drawSplash(bg, badge.color, br * 0.9);
    else drawToy(bg, badge.kind, 0xba68c8, br * 1.62 * badge.scale);
    parts.push(bg);
  }

  const c = scene.add.container(x, y, parts);
  return { c, items, glow };
}

/** Where the i-th sorted toy sits (basket-local). Two per row, piling up over the rim. */
export function binSlot(def: BinDef, i: number, total: number): { x: number; y: number } {
  const m = def.mini;
  const row = Math.floor(i / 2), col = i % 2;
  const alone = i === total - 1 && total % 2 === 1;
  const spread = Math.min(m * 0.6, def.w / 2 - m * 0.5);
  return {
    x: alone ? 0 : (col ? 1 : -1) * spread * (row % 2 ? 0.9 : 1),
    y: -def.bodyH - m * 0.44 - row * m * 0.8,
  };
}

/** How far the pile of `count` sorted toys reaches above the basket's floor. */
export function pileTop(def: BinDef, count: number): number {
  const rows = Math.ceil(count / 2);
  return def.bodyH + (rows ? def.mini * (0.94 + (rows - 1) * 0.8) : 12);
}
