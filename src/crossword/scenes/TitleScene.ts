import Phaser from 'phaser';
import { drawBg, primaryBtn } from '@shared/phaserUtils';
import { C, T, F } from '@shared/theme';

const W = 480, H = 820;

export class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }

  create(): void {
    drawBg(this);

    this.add.text(W / 2, 110, "🧩 Aya's\nCrossword", {
      fontFamily: F.head, fontSize: '46px', color: T.main,
      align: 'center',
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);

    this.add.text(W / 2, 226, 'Petunjuk Bahasa → Jawaban English 🌈', {
      fontFamily: F.body, fontSize: '15px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);

    this.drawPreview(W / 2, 370);

    const steps = [
      { emoji: '📖', label: 'Baca' },
      { emoji: '👆', label: 'Tap' },
      { emoji: '🌟', label: 'Selesai!' },
    ];
    const stepY = 580;
    const stepGap = 110;
    const stepStartX = W / 2 - ((steps.length - 1) * stepGap) / 2;
    steps.forEach((s, i) => {
      const cx = stepStartX + i * stepGap;
      const circle = this.add.graphics();
      circle.fillStyle(C.white, 1);
      circle.fillCircle(cx, stepY, 28);
      this.add.text(cx, stepY, s.emoji, { fontSize: '26px' }).setOrigin(0.5);
      this.add.text(cx, stepY + 46, s.label, {
        fontFamily: F.head, fontSize: '14px', color: T.main,
      }).setOrigin(0.5);
      if (i < steps.length - 1) {
        this.add.text(cx + stepGap / 2, stepY, '›', {
          fontFamily: F.head, fontSize: '26px', color: T.sub,
        }).setOrigin(0.5);
      }
    });

    primaryBtn(this, W / 2, H - 96, 380, 64, 'Yuk Main! 🎉', () => {
      this.scene.start('GameScene');
    });
  }

  /** Decorative preview: CAT across, CAR down, sharing C. */
  private drawPreview(cx: number, cy: number): void {
    const cell = 50;
    const layout: Array<{ r: number; c: number; ch: string; shared?: boolean; filled?: boolean }> = [
      { r: 0, c: 0, ch: 'C', shared: true, filled: true },
      { r: 0, c: 1, ch: 'A', filled: true },
      { r: 0, c: 2, ch: 'T', filled: true },
      { r: 1, c: 0, ch: 'A', filled: true },
      { r: 2, c: 0, ch: 'R', filled: true },
    ];
    for (const it of layout) {
      const x = cx + (it.c - 1) * cell;
      const y = cy + (it.r - 0.6) * cell;
      const g = this.add.graphics();
      g.fillStyle(it.shared ? C.bg1 : C.cream, 1);
      g.lineStyle(2, it.shared ? C.pink : C.lavender, 1);
      g.fillRoundedRect(x - cell / 2 + 3, y - cell / 2 + 3, cell - 6, cell - 6, 10);
      g.strokeRoundedRect(x - cell / 2 + 3, y - cell / 2 + 3, cell - 6, cell - 6, 10);
      this.add.text(x, y, it.ch, {
        fontFamily: F.head, fontSize: '24px', color: T.main,
      }).setOrigin(0.5);
    }
    // Hint chip under the preview
    const chipY = cy + 2 * cell + 20;
    const chipW = 200, chipH = 36;
    const chip = this.add.graphics();
    chip.fillStyle(C.white, 1);
    chip.fillRoundedRect(cx - chipW / 2, chipY - chipH / 2, chipW, chipH, 14);
    chip.lineStyle(2, C.lavender, 0.7);
    chip.strokeRoundedRect(cx - chipW / 2, chipY - chipH / 2, chipW, chipH, 14);
    this.add.text(cx, chipY, '🐱 kucing → CAT', {
      fontFamily: F.head, fontSize: '16px', color: T.main,
    }).setOrigin(0.5);
  }
}
