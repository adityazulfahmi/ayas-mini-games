import Phaser from 'phaser';
import { drawBg, primaryBtn } from '@shared/phaserUtils';
import { C, T, F } from '@shared/theme';
import { getCtx } from '@shared/audio';
import { BOXES, SHAPES, type ShapeDef } from '../data';
import { drawHole, drawPiece, drawShade, say } from './shapes';
import { BOX, drawBoxBody, drawBoxGlass, holeLayout, windowSlot } from './box';

const BOX_SCALE = 0.6;

export class TitleScene extends Phaser.Scene {
  private boxC!: Phaser.GameObjects.Container;
  private windowLayer!: Phaser.GameObjects.Container;
  private demo: { shape: ShapeDef; lx: number; ly: number; size: number; g: Phaser.GameObjects.Graphics }[] = [];
  private minis: Phaser.GameObjects.Container[] = [];

  constructor() { super('TitleScene'); }

  create(): void {
    const { width: W, height: H } = this.scale;
    this.demo = [];
    this.minis = [];
    drawBg(this);

    this.add.text(W / 2, 84, 'Shape Sorter', {
      fontFamily: F.head, fontSize: '44px', color: T.main,
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);
    this.add.text(W / 2, 136, 'Every shape has a home.\nCan you pop it in? 🏠', {
      fontFamily: F.body, fontSize: '15px', color: T.sub, fontStyle: 'bold', align: 'center', lineSpacing: 4,
    }).setOrigin(0.5);

    // A mini toy sorter that plays by itself.
    const color = BOXES[0].color;
    this.boxC = this.add.container(W / 2, 182).setScale(BOX_SCALE);
    const body = this.add.graphics();
    drawBoxBody(body, color);
    this.boxC.add(body);
    const layout = holeLayout(3);
    const kinds = ['circle', 'star', 'heart'];
    kinds.forEach((k, i) => {
      const shape = SHAPES.find(s => s.kind === k)!;
      const { x, y } = layout.spots[i];
      const g = this.add.graphics().setPosition(x, y);
      drawHole(g, shape.kind, shape.color, layout.size);
      this.boxC.add(g);
      this.demo.push({ shape, lx: x, ly: y, size: layout.size, g });
    });
    this.windowLayer = this.add.container(0, 0);
    const glass = this.add.graphics();
    drawBoxGlass(glass, color);
    this.boxC.add([this.windowLayer, glass]);
    this.time.delayedCall(500, () => this.demoStep(0));

    // Friendly pieces in two rows — tap one to hear its name.
    const size = 58, gap = 18;
    const rows = [SHAPES.slice(0, 4), SHAPES.slice(4)];
    rows.forEach((row, r) => {
      const totalW = row.length * size + (row.length - 1) * gap;
      const startX = W / 2 - totalW / 2 + size / 2;
      row.forEach((s, i) => {
        const g = this.add.graphics();
        drawPiece(g, s.kind, s.color, size);
        const y = 468 + r * 74;
        const c = this.add.container(startX + i * (size + gap), y, [g]);
        c.setSize(size + 16, size + 16).setInteractive({ cursor: 'pointer' });
        c.on('pointerdown', () => {
          say(s.name);
          drawPiece(g, s.kind, s.color, size, true);
          this.tweens.add({ targets: c, angle: { from: -14, to: 14 }, scale: 1.2, yoyo: true, repeat: 1, duration: 100,
            onComplete: () => { c.setAngle(0).setScale(1); drawPiece(g, s.kind, s.color, size); } });
        });
        this.tweens.add({ targets: c, y: y - 7, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.InOut', delay: (r * 4 + i) * 160 });
      });
    });

    const chipY = 608, chipW = 250, chipH = 30;
    const chip = this.add.graphics();
    chip.fillStyle(C.white, 0.85);
    chip.fillRoundedRect(W / 2 - chipW / 2, chipY - chipH / 2, chipW, chipH, chipH / 2);
    chip.lineStyle(1.5, C.lavender, 0.5);
    chip.strokeRoundedRect(W / 2 - chipW / 2, chipY - chipH / 2, chipW, chipH, chipH / 2);
    this.add.text(W / 2, chipY, `${SHAPES.length} shapes · ${BOXES.length} boxes · no timer`, {
      fontFamily: F.body, fontSize: '13px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);

    primaryBtn(this, W / 2, H - 98, 340, 70, "Let's Sort!", () => {
      // Unlock audio + speech inside the tap so phones allow them later.
      try { void getCtx().resume(); } catch { /* ignore */ }
      say("Let's sort!");
      this.scene.start('GameScene');
    });
  }

  /** Demo: piece i floats in, sinks into its hole and lands in the window. */
  private demoStep(i: number): void {
    if (i >= this.demo.length) {
      // Everyone hops, then the box empties and it starts over.
      this.tweens.add({ targets: this.boxC, y: this.boxC.y - 10, yoyo: true, repeat: 1, duration: 160, ease: 'Sine.Out' });
      this.time.delayedCall(1400, () => {
        this.tweens.add({
          targets: this.minis, alpha: 0, duration: 300,
          onComplete: () => {
            this.minis.forEach(m => m.destroy());
            this.minis = [];
            this.time.delayedCall(400, () => this.demoStep(0));
          },
        });
      });
      return;
    }
    const d = this.demo[i];
    const hx = this.boxC.x + d.lx * BOX_SCALE, hy = this.boxC.y + d.ly * BOX_SCALE;
    const size = d.size * BOX_SCALE * 0.94;
    const g = this.add.graphics();
    drawPiece(g, d.shape.kind, d.shape.color, size);
    const shade = this.add.graphics().setAlpha(0);
    drawShade(shade, d.shape.kind, size);
    const fromX = hx + (i === 2 ? -70 : 70);
    const p = this.add.container(fromX, hy - 110, [g, shade]).setAlpha(0).setScale(1.15).setDepth(5);
    this.tweens.chain({
      targets: p,
      tweens: [
        { alpha: 1, duration: 200 },
        { x: hx, y: hy - 12, scale: 1.04, duration: 560, ease: 'Sine.InOut' },
        { y: hy, scale: 1, duration: 120, ease: 'Quad.In' },
        { y: hy + 3, scale: 0.5, alpha: 0, duration: 280, ease: 'Quad.In',
          onStart: () => { this.tweens.add({ targets: shade, alpha: 0.95, duration: 180 }); } },
      ],
      onComplete: () => {
        p.destroy();
        this.tweens.add({ targets: d.g, scale: { from: 1.15, to: 1 }, duration: 260, ease: 'Back.Out' });
        const slot = windowSlot(i, this.demo.length);
        const mg = this.add.graphics();
        drawPiece(mg, d.shape.kind, d.shape.color, 50);
        const m = this.add.container(slot.x, BOX.win.y + 16, [mg]).setAngle(Phaser.Math.Between(-25, 25));
        this.windowLayer.add(m);
        this.minis.push(m);
        this.tweens.add({ targets: m, y: slot.y, angle: Phaser.Math.Between(-8, 8), duration: 520, ease: 'Bounce.Out' });
        this.time.delayedCall(650, () => this.demoStep(i + 1));
      },
    });
  }
}
