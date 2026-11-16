import Phaser from 'phaser';
import { drawBg, primaryBtn } from '@shared/phaserUtils';
import { C, T, F } from '@shared/theme';
import { getCtx, playTone } from '@shared/audio';
import { COLOURS, LEVELS, loadSave, storeSave, type BinDef, type ItemArt, type Save } from '../data';
import { makeBin } from './bins';
import { makeArt } from './toys';
import { say } from '../speech';

const TILE_W = 180, TILE_H = 168, GAP = 16;

interface MiniBin { def: Pick<BinDef, 'color' | 'badge' | 'w' | 'bodyH'>; art: ItemArt; size: number }

const R = COLOURS.red.hex, B = COLOURS.blue.hex, Y = COLOURS.yellow.hex;
const STRAW = 0xf6c177;

/** The picture on each level tile: little baskets with the right toy peeking out. */
const TILE_ART: { scale: number; bins: MiniBin[] }[] = [
  { scale: 0.5, bins: [
    { def: { color: R, badge: { type: 'splash', color: R }, w: 116, bodyH: 92 }, art: { type: 'toy', kind: 'ball', color: R }, size: 84 },
    { def: { color: B, badge: { type: 'splash', color: B }, w: 116, bodyH: 92 }, art: { type: 'toy', kind: 'ball', color: B }, size: 84 },
  ] },
  { scale: 0.5, bins: [
    { def: { color: STRAW, badge: { type: 'toy', kind: 'star', scale: 1 }, w: 150, bodyH: 100 }, art: { type: 'toy', kind: 'star', color: Y }, size: 118 },
    { def: { color: STRAW, badge: { type: 'toy', kind: 'star', scale: 0.45 }, w: 92, bodyH: 62 }, art: { type: 'toy', kind: 'star', color: Y }, size: 54 },
  ] },
  { scale: 0.5, bins: [
    { def: { color: 0x9ccc65, badge: { type: 'emoji', char: '🐶' }, w: 116, bodyH: 92 }, art: { type: 'emoji', char: '🐱' }, size: 96 },
    { def: { color: 0xffb74d, badge: { type: 'emoji', char: '🍎' }, w: 116, bodyH: 92 }, art: { type: 'emoji', char: '🍌' }, size: 96 },
  ] },
  { scale: 0.42, bins: [
    { def: { color: R, badge: { type: 'splash', color: R }, w: 96, bodyH: 92 }, art: { type: 'toy', kind: 'heart', color: R }, size: 80 },
    { def: { color: Y, badge: { type: 'splash', color: Y }, w: 96, bodyH: 92 }, art: { type: 'toy', kind: 'star', color: Y }, size: 80 },
    { def: { color: B, badge: { type: 'splash', color: B }, w: 96, bodyH: 92 }, art: { type: 'toy', kind: 'block', color: B }, size: 80 },
  ] },
];

interface Tile {
  c: Phaser.GameObjects.Container;
  card: Phaser.GameObjects.Graphics;
  tick: Phaser.GameObjects.Container;
  toys: Phaser.GameObjects.Container[];
}

export class TitleScene extends Phaser.Scene {
  private tiles: Tile[] = [];
  private save!: Save;

  constructor() { super('TitleScene'); }

  create(): void {
    const { width: W, height: H } = this.scale;
    this.tiles = [];
    this.save = loadSave();
    drawBg(this);

    this.add.text(W / 2, 76, 'Tidy Up!', {
      fontFamily: F.head, fontSize: '46px', color: T.main,
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);
    this.add.text(W / 2, 132, 'Every toy has a basket.\nCan you put them away? 🧺', {
      fontFamily: F.body, fontSize: '15px', color: T.sub, fontStyle: 'bold', align: 'center', lineSpacing: 4,
    }).setOrigin(0.5);

    const x0 = W / 2 - (TILE_W + GAP) / 2, y0 = 182 + TILE_H / 2;
    LEVELS.forEach((_, i) => {
      const x = x0 + (i % 2) * (TILE_W + GAP);
      const y = y0 + Math.floor(i / 2) * (TILE_H + GAP);
      this.tiles.push(this.buildTile(i, x, y));
    });
    this.paint();

    const chipY = 574, chipW = 296, chipH = 30;
    const chip = this.add.graphics();
    chip.fillStyle(C.white, 0.85);
    chip.fillRoundedRect(W / 2 - chipW / 2, chipY - chipH / 2, chipW, chipH, chipH / 2);
    chip.lineStyle(1.5, C.lavender, 0.5);
    chip.strokeRoundedRect(W / 2 - chipW / 2, chipY - chipH / 2, chipW, chipH, chipH / 2);
    this.add.text(W / 2, chipY, 'Pick a picture · drag or tap · no timer', {
      fontFamily: F.body, fontSize: '13px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);

    primaryBtn(this, W / 2, H - 104, 340, 70, "Let's Tidy!", () => this.play());
  }

  private play(): void {
    // Unlock audio + speech inside the tap so phones allow them later.
    try { void getCtx().resume(); } catch { /* ignore */ }
    say("Let's tidy up!");
    this.scene.start('GameScene', { level: this.save.level });
  }

  private buildTile(i: number, x: number, y: number): Tile {
    const shadow = this.add.graphics();
    shadow.fillStyle(C.shadow, 0.16);
    shadow.fillRoundedRect(-TILE_W / 2 + 2, -TILE_H / 2 + 7, TILE_W, TILE_H, 26);
    const card = this.add.graphics();

    const art = TILE_ART[i];
    const toys: Phaser.GameObjects.Container[] = [];
    const total = art.bins.reduce((a, b) => a + b.def.w, 0) + (art.bins.length - 1) * 40;
    let cursor = -total / 2;
    const pic = this.add.container(0, 46).setScale(art.scale);
    art.bins.forEach(b => {
      const def: BinDef = { ...b.def, key: '', mini: 0, rule: '', here: '' };
      const bin = makeBin(this, def, cursor + def.w / 2, 0);
      cursor += def.w + 40;
      const toy = this.add.container(0, -def.bodyH - b.size * 0.42, [makeArt(this, b.art, b.size).node]);
      bin.items.add(toy);
      toys.push(toy);
      pic.add(bin.c);
    });

    const label = this.add.text(0, TILE_H / 2 - 21, LEVELS[i].name, {
      fontFamily: F.head, fontSize: '16px', color: T.main,
    }).setOrigin(0.5);

    // Level number as dots (1–4), so the order is clear without reading.
    const dots = this.add.graphics();
    for (let d = 0; d <= i; d++) {
      dots.fillStyle(C.lavender, 0.9);
      dots.fillCircle(-TILE_W / 2 + 20 + d * 11, -TILE_H / 2 + 20, 3.6);
    }

    const parts: Phaser.GameObjects.GameObject[] = [shadow, card, pic, label, dots];
    if (this.save.plays[i] > 0) {
      parts.push(this.add.text(TILE_W / 2 - 24, -TILE_H / 2 + 23, '⭐', { fontSize: '22px' }).setOrigin(0.5));
    }

    const tg = this.add.graphics();
    tg.fillStyle(C.pink, 1); tg.fillCircle(0, 0, 15);
    tg.lineStyle(3, C.white, 1); tg.strokeCircle(0, 0, 15);
    tg.lineStyle(4, C.white, 1);
    tg.beginPath(); tg.moveTo(-6, 0); tg.lineTo(-2, 5); tg.lineTo(7, -5); tg.strokePath();
    const tick = this.add.container(TILE_W / 2 - 10, TILE_H / 2 - 10, [tg]);
    parts.push(tick);

    const c = this.add.container(x, y, parts);
    c.setSize(TILE_W, TILE_H).setInteractive({ cursor: 'pointer' });
    c.on('pointerdown', () => this.choose(i));
    return { c, card, tick, toys };
  }

  /** Tapping the picture picks it; tapping the picked one again starts the game. */
  private choose(i: number): void {
    try { void getCtx().resume(); } catch { /* ignore */ }
    if (i === this.save.level) { this.play(); return; }
    this.save.level = i;
    storeSave(this.save);
    playTone(660, 0.1, 'sine', 0.1);
    say(LEVELS[i].spoken);
    this.paint();
    const tile = this.tiles[i];
    this.tweens.add({ targets: tile.c, scale: { from: 0.94, to: 1.03 }, duration: 240, ease: 'Back.Out' });
  }

  private paint(): void {
    this.tiles.forEach((tile, i) => {
      const on = i === this.save.level;
      const g = tile.card;
      g.clear();
      g.fillStyle(on ? 0xfff5fa : C.white, on ? 1 : 0.88);
      g.fillRoundedRect(-TILE_W / 2, -TILE_H / 2, TILE_W, TILE_H, 26);
      g.lineStyle(on ? 5 : 2, on ? C.pink : C.lavender, on ? 1 : 0.35);
      g.strokeRoundedRect(-TILE_W / 2, -TILE_H / 2, TILE_W, TILE_H, 26);
      this.tweens.killTweensOf(tile.c);
      tile.c.setScale(on ? 1.03 : 1);
      tile.tick.setVisible(on);
      tile.toys.forEach((toy, k) => {
        this.tweens.killTweensOf(toy);
        const baseY = toy.getData('y') ?? toy.y;
        toy.setData('y', baseY);
        toy.setY(baseY).setAngle(0);
        if (on) {
          this.tweens.add({ targets: toy, y: baseY - 16, angle: k % 2 ? 6 : -6, yoyo: true, repeat: -1, duration: 520, ease: 'Sine.InOut', delay: k * 180 });
        }
      });
    });
  }
}
