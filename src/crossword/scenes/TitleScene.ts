import Phaser from 'phaser';
import { drawBg, primaryBtn } from '@shared/phaserUtils';
import { C, T, F } from '@shared/theme';
import { say } from '../speech';

const W = 420, H = 780;

export class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }

  create(): void {
    drawBg(this);

    const puzzle = this.add.text(W / 2, 66, '🧩', { fontSize: '54px' }).setOrigin(0.5);
    this.tweens.add({ targets: puzzle, angle: { from: -8, to: 8 }, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    this.add.text(W / 2, 140, "Aya's Crossword", {
      fontFamily: F.head, fontSize: '42px', color: T.main,
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);

    this.add.text(W / 2, 186, 'Teka-teki silang  ·  Bahasa ➜ English', {
      fontFamily: F.body, fontSize: '16px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);

    this.drawPreview(W / 2, 222);

    const steps = [
      { emoji: '🔊', label: 'Dengar' },
      { emoji: '👆', label: 'Pilih huruf' },
      { emoji: '🌟', label: 'Hore!' },
    ];
    const stepY = 568;
    const stepGap = 124;
    const stepStartX = W / 2 - ((steps.length - 1) * stepGap) / 2;
    steps.forEach((s, i) => {
      const cx = stepStartX + i * stepGap;
      const circle = this.add.graphics();
      circle.fillStyle(C.shadow, 0.12);
      circle.fillCircle(cx, stepY + 3, 30);
      circle.fillStyle(C.white, 1);
      circle.fillCircle(cx, stepY, 30);
      this.add.text(cx, stepY + 1, s.emoji, { fontSize: '28px' }).setOrigin(0.5);
      this.add.text(cx, stepY + 48, s.label, {
        fontFamily: F.head, fontSize: '15px', color: T.main,
      }).setOrigin(0.5);
      if (i < steps.length - 1) {
        this.add.text(cx + stepGap / 2, stepY, '›', {
          fontFamily: F.head, fontSize: '28px', color: T.sub,
        }).setOrigin(0.5);
      }
    });

    primaryBtn(this, W / 2, 680, 340, 70, 'Yuk Main! 🎉', () => {
      this.scene.start('GameScene');
    });

    this.add.text(W / 2, 744, 'Untuk Aya yang sudah mulai membaca 📖', {
      fontFamily: F.body, fontSize: '13px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.85);
  }

  /** Decorative preview: hint card + CAT across (active) crossing CAR down. */
  private drawPreview(cx: number, top: number): void {
    const cardW = 356, cardH = 272;
    const x0 = cx - cardW / 2;
    const g = this.add.graphics();
    g.fillStyle(C.shadow, 0.14);
    g.fillRoundedRect(x0 + 2, top + 8, cardW, cardH, 28);
    g.fillStyle(C.white, 0.9);
    g.fillRoundedRect(x0, top, cardW, cardH, 28);

    // Mini hint pill
    const pillW = 220, pillH = 50, pillY = top + 22;
    g.fillStyle(C.bg1, 1);
    g.fillRoundedRect(cx - pillW / 2, pillY, pillW, pillH, 25);
    g.lineStyle(2.5, C.pink, 1);
    g.strokeRoundedRect(cx - pillW / 2, pillY, pillW, pillH, 25);
    this.add.text(cx - pillW / 2 + 32, pillY + pillH / 2 + 1, '🐱', { fontSize: '30px' }).setOrigin(0.5);
    this.add.text(cx - pillW / 2 + 60, pillY + pillH / 2, 'kucing', {
      fontFamily: F.head, fontSize: '24px', color: T.main,
    }).setOrigin(0, 0.5);
    this.add.text(cx + pillW / 2 - 28, pillY + pillH / 2 + 1, '🔊', { fontSize: '22px' }).setOrigin(0.5);
    const pillZone = this.add.zone(cx, pillY + pillH / 2, pillW, pillH).setInteractive({ cursor: 'pointer' });
    pillZone.on('pointerdown', () => {
      say('kucing', 'id-ID');
      say('cat', 'en-US', { interrupt: false });
    });

    // Mini grid: CAT across (active band) and CAR down sharing C.
    const cell = 44, gap = 5, step = cell + gap;
    const gx = cx - 156;
    const gy = top + 96;
    const band = this.add.graphics();
    band.fillStyle(C.pink, 0.22);
    band.fillRoundedRect(gx - 6, gy - 6, 3 * cell + 2 * gap + 12, cell + 12, 16);
    band.lineStyle(2, C.pink, 0.55);
    band.strokeRoundedRect(gx - 6, gy - 6, 3 * cell + 2 * gap + 12, cell + 12, 16);

    const layout: Array<{ r: number; c: number; ch: string; mode: 'active' | 'next' | 'idle' }> = [
      { r: 0, c: 0, ch: 'C', mode: 'active' },
      { r: 0, c: 1, ch: 'A', mode: 'active' },
      { r: 0, c: 2, ch: '',  mode: 'next' },
      { r: 1, c: 0, ch: '',  mode: 'idle' },
      { r: 2, c: 0, ch: '',  mode: 'idle' },
    ];
    for (const it of layout) {
      const x = gx + it.c * step, y = gy + it.r * step;
      const cg = this.add.graphics();
      cg.fillStyle(it.mode === 'idle' ? C.cream : C.white, 1);
      cg.fillRoundedRect(x, y, cell, cell, 11);
      cg.lineStyle(it.mode === 'next' ? 4 : it.mode === 'active' ? 3 : 2, it.mode === 'idle' ? C.lavender : C.pink, 1);
      cg.strokeRoundedRect(x, y, cell, cell, 11);
      if (it.ch) {
        this.add.text(x + cell / 2, y + cell / 2 + 2, it.ch, {
          fontFamily: F.head, fontSize: '25px', color: T.main,
        }).setOrigin(0.5);
      }
      if (it.mode === 'next') {
        const caret = this.add.graphics();
        caret.fillStyle(C.pink, 1);
        caret.fillRoundedRect(x + cell / 2 - 10, y + cell - 12, 20, 4, 2);
        this.tweens.add({ targets: caret, alpha: 0.25, duration: 520, yoyo: true, repeat: -1 });
      }
    }
    this.add.text(gx + 5, gy + 3, '1', { fontFamily: F.head, fontSize: '11px', color: '#f06292' });

    // Mini tiles with the right one glowing.
    const tiles = ['T', 'R', 'S'];
    const tw = 44, th = 54, tg = 8;
    const ty = gy + step + (cell + step) / 2;
    const tx0 = gx + 3 * cell + 2 * gap + 26 + tw / 2;
    tiles.forEach((ch, i) => {
      const tx = tx0 + i * (tw + tg);
      const tgx = this.add.graphics();
      if (i === 0) {
        tgx.fillStyle(0xffd54f, 0.6);
        tgx.fillRoundedRect(-tw / 2 - 5, -th / 2 - 5, tw + 10, th + 10, 18);
      }
      tgx.fillStyle(C.pink, 1);
      tgx.fillRoundedRect(-tw / 2, -th / 2, tw, th, 14);
      tgx.fillStyle(C.lavender, 0.35);
      tgx.fillRoundedRect(-tw / 2, -th / 2, tw, th * 0.48, { tl: 14, tr: 14, bl: 0, br: 0 });
      const t = this.add.text(0, 2, ch, { fontFamily: F.head, fontSize: '28px', color: T.white }).setOrigin(0.5);
      const c = this.add.container(tx, ty, [tgx, t]);
      if (i === 0) {
        this.tweens.add({ targets: c, y: ty - 6, scale: 1.08, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      }
    });
    const hand = this.add.text(tx0 + 14, ty + 46, '👆', { fontSize: '30px' }).setOrigin(0.5);
    this.tweens.add({ targets: hand, y: ty + 40, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }
}
