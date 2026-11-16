import Phaser from 'phaser';
import { drawBg, primaryBtn, bounceLoop } from '@shared/phaserUtils';
import { C, T, F } from '@shared/theme';
import { BOXES, SHAPES } from '../data';
import { drawHole, drawPiece, say } from './shapes';

export class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }

  create(): void {
    const { width: W, height: H } = this.scale;
    drawBg(this);

    this.add.text(W / 2, 112, 'Shape Sorter', {
      fontFamily: F.head, fontSize: '42px', color: T.main,
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);
    this.add.text(W / 2, 166, 'Every shape has a home.\nCan you put it there? 🏠', {
      fontFamily: F.body, fontSize: '15px', color: T.sub, fontStyle: 'bold', align: 'center', lineSpacing: 4,
    }).setOrigin(0.5);

    // Mini sorter lid with a star dropping into its hole.
    const lidY = 330;
    const lid = this.add.graphics();
    lid.fillStyle(C.shadow, 0.14);
    lid.fillRoundedRect(W / 2 - 150, lidY - 66 + 8, 300, 132, 30);
    lid.fillStyle(0xffffff, 1);
    lid.fillRoundedRect(W / 2 - 150, lidY - 66, 300, 132, 30);
    lid.lineStyle(3, C.lavender, 0.9);
    lid.strokeRoundedRect(W / 2 - 150, lidY - 66, 300, 132, 30);
    const holes = [SHAPES[0], SHAPES[3], SHAPES[2]];
    holes.forEach((s, i) => drawHole(this.add.graphics().setPosition(W / 2 - 92 + i * 92, lidY), s.kind, s.color, 62));

    const star = this.add.graphics();
    drawPiece(star, 'star', SHAPES[3].color, 62);
    const drop = this.add.container(W / 2, lidY - 100, [star]);
    this.tweens.add({
      targets: drop, y: lidY, scale: { from: 1, to: 0.92 },
      duration: 900, ease: 'Bounce.Out', hold: 700, repeat: -1, repeatDelay: 500,
    });

    // Row of friendly pieces — tap one to hear its name.
    const size = 58, gap = 12;
    const totalW = SHAPES.length * size + (SHAPES.length - 1) * gap;
    const startX = W / 2 - totalW / 2 + size / 2;
    const pieces = SHAPES.map((s, i) => {
      const g = this.add.graphics();
      drawPiece(g, s.kind, s.color, size);
      const c = this.add.container(startX + i * (size + gap), 486, [g]);
      c.setSize(size + 8, size + 8).setInteractive({ cursor: 'pointer' });
      c.on('pointerdown', () => {
        say(s.name);
        this.tweens.add({ targets: c, angle: { from: -12, to: 12 }, yoyo: true, repeat: 1, duration: 90,
          onComplete: () => c.setAngle(0) });
      });
      return c;
    });
    bounceLoop(this, pieces);

    const chipY = 560, chipW = 236, chipH = 30;
    const chip = this.add.graphics();
    chip.fillStyle(C.white, 0.85);
    chip.fillRoundedRect(W / 2 - chipW / 2, chipY - chipH / 2, chipW, chipH, chipH / 2);
    chip.lineStyle(1.5, C.lavender, 0.5);
    chip.strokeRoundedRect(W / 2 - chipW / 2, chipY - chipH / 2, chipW, chipH, chipH / 2);
    this.add.text(W / 2, chipY, `${SHAPES.length} shapes · ${BOXES.length} boxes · no timer`, {
      fontFamily: F.body, fontSize: '13px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);

    primaryBtn(this, W / 2, H - 110, 340, 66, "Let's Sort! 🧩", () => this.scene.start('GameScene'));
  }
}
