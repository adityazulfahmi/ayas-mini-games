import Phaser from 'phaser';
import { drawBg, primaryBtn } from '@shared/phaserUtils';
import { C, T, F } from '@shared/theme';
import { PAIRS } from '../data';

export class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }

  create(): void {
    const { width: W, height: H } = this.scale;
    drawBg(this);

    this.add.text(W / 2, 112, '🔗 Connect the Match', {
      fontFamily: F.head, fontSize: '30px', color: T.main,
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);

    this.add.text(W / 2, 168, 'Tap one on the left,\nthen its friend on the right! 💞', {
      fontFamily: F.body, fontSize: '15px', color: T.sub,
      align: 'center', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Preview row: a couple of sample pairs with a pink connector so the
    // player sees the core mechanic before starting.
    this.buildPreview(W, 300);
    this.buildPreview(W, 400, 1);

    this.add.text(W / 2, 500, '30 seconds of matching fun 🎉', {
      fontFamily: F.body, fontSize: '13px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);

    primaryBtn(this, W / 2, H - 100, 340, 62, "Let's Match! 💕", () => {
      this.scene.start('GameScene');
    });
  }

  private buildPreview(W: number, cy: number, pairIdx = 0): void {
    const pair = PAIRS[pairIdx % PAIRS.length];
    const leftX = W / 2 - 90;
    const rightX = W / 2 + 90;

    // Soft pink line between the two emoji
    const line = this.add.graphics();
    line.lineStyle(6, C.pink, 0.85);
    line.beginPath();
    line.moveTo(leftX + 34, cy);
    line.lineTo(rightX - 34, cy);
    line.strokePath();

    // Dots at the ends for a connected look
    const dotL = this.add.circle(leftX + 34, cy, 6, C.pink);
    const dotR = this.add.circle(rightX - 34, cy, 6, C.pink);
    void dotL; void dotR;

    this.makePreviewCard(leftX, cy, pair.left);
    this.makePreviewCard(rightX, cy, pair.right);
  }

  private makePreviewCard(cx: number, cy: number, emoji: string): void {
    const s = 64;
    const bg = this.add.graphics();
    bg.fillStyle(C.white, 1);
    bg.lineStyle(2.5, C.lavender, 1);
    bg.fillRoundedRect(cx - s / 2, cy - s / 2, s, s, 14);
    bg.strokeRoundedRect(cx - s / 2, cy - s / 2, s, s, 14);
    this.add.text(cx, cy, emoji, {
      fontFamily: F.body, fontSize: '38px',
    }).setOrigin(0.5);
  }
}
