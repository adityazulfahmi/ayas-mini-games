import Phaser from 'phaser';
import { drawBg, primaryBtn, bounceLoop } from '@shared/phaserUtils';
import { C, T, F } from '@shared/theme';

const PREVIEW_COLORS = [0xf06292, 0x29b6f6, 0xffb300, 0x66bb6a];

export class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }

  create(): void {
    const { width: W, height: H } = this.scale;
    drawBg(this);

    this.add.text(W / 2, 130, '🎨 Colour Match', {
      fontFamily: F.head, fontSize: '48px', color: T.main,
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);

    this.add.text(W / 2, 200, 'Can you name all the colours? 🌈', {
      fontFamily: F.body, fontSize: '18px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);

    // Bouncing colour dots (ring + fill grouped so they move together)
    const startX = W / 2 - (PREVIEW_COLORS.length - 1) * 38;
    const dots: Phaser.GameObjects.Container[] = PREVIEW_COLORS.map((hex, i) => {
      const ring = this.add.graphics();
      ring.lineStyle(3, C.shadow, 0.18);
      ring.strokeCircle(0, 0, 27);
      const fill = this.add.arc(0, 0, 27, 0, 360, false, hex, 1);
      return this.add.container(startX + i * 76, 320, [ring, fill]);
    });
    bounceLoop(this, dots);

    primaryBtn(this, W / 2, H - 140, 340, 62, "Let's Play! 🎉", () => {
      this.scene.start('GameScene');
    });
  }
}
