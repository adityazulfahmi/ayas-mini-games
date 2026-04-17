import Phaser from 'phaser';
import { drawBg, primaryBtn, bounceLoop } from '@shared/phaserUtils';
import { C, T, F } from '@shared/theme';

const PREVIEW_COLOURS = [0xe53935, 0xfb8c00, 0xfdd835, 0x43a047, 0x1e88e5, 0xec407a];

export class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }

  create(): void {
    const { width: W, height: H } = this.scale;
    drawBg(this);

    this.add.text(W / 2, 120, '🎨 Colour Hunt', {
      fontFamily: F.head, fontSize: '44px', color: T.main,
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);

    this.add.text(W / 2, 190, 'Tap the thing that matches\nthe colour! 🌈', {
      fontFamily: F.body, fontSize: '16px', color: T.sub,
      fontStyle: 'bold', align: 'center',
    }).setOrigin(0.5);

    // Bouncing row of colour dots
    const dotR = 24, gap = 14;
    const totalW = PREVIEW_COLOURS.length * (dotR * 2) + (PREVIEW_COLOURS.length - 1) * gap;
    const startX = W / 2 - totalW / 2 + dotR;
    const dots = PREVIEW_COLOURS.map((hex, i) => {
      const shadow = this.add.graphics();
      shadow.fillStyle(0x4a148c, 0.18);
      shadow.fillCircle(0, 4, dotR);
      const fill = this.add.arc(0, 0, dotR, 0, 360, false, hex, 1);
      const rim = this.add.graphics();
      rim.lineStyle(2, C.white, 1);
      rim.strokeCircle(0, 0, dotR);
      return this.add.container(startX + i * (dotR * 2 + gap), 320, [shadow, fill, rim]);
    });
    bounceLoop(this, dots);

    this.add.text(W / 2, 410, '30 seconds · Match as many as you can!', {
      fontFamily: F.body, fontSize: '13px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);

    primaryBtn(this, W / 2, H - 100, 340, 62, "Let's Hunt! 🎉", () => {
      this.scene.start('GameScene');
    });
  }
}
