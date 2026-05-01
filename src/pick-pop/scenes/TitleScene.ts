import Phaser from 'phaser';
import { drawBg, primaryBtn } from '@shared/phaserUtils';
import { C, T, F } from '@shared/theme';
import { TARGETS, TOTAL_ROUNDS } from '../data';

export class TitleScene extends Phaser.Scene {
  private hintTxt!: Phaser.GameObjects.Text;
  private hintChip!: Phaser.GameObjects.Graphics;

  constructor() { super('TitleScene'); }

  create(): void {
    const { width: W, height: H } = this.scale;
    drawBg(this);
    this.decorateBg(W, H);

    this.add.text(W / 2, 96, '🎯 Pick & Pop!', {
      fontFamily: F.head, fontSize: '34px', color: T.main, align: 'center',
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);

    this.add.text(W / 2, 144, 'Find the right one in the mix!', {
      fontFamily: F.body, fontSize: '14px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);

    // Hero preview — a 2×2 row of one item from each target category, with
    // a sparkly "🎯" hovering over one. Communicates the game in one glance:
    // "you'll be picking a category from a mixed grid".
    this.buildHero(W, 282);

    // The four category emoji at chunky size — bigger than text labels and
    // much easier to scan on a 420 canvas. Reads as "these are the categories
    // you'll be asked about".
    this.add.text(W / 2, 462, `${TARGETS.fruit.emoji}  ${TARGETS.vegetable.emoji}  ${TARGETS.vehicle.emoji}  ${TARGETS.animal.emoji}`, {
      fontFamily: F.body, fontSize: '34px',
    }).setOrigin(0.5);

    this.hintChip = this.add.graphics();
    this.hintTxt = this.add.text(W / 2, 524, '', {
      fontFamily: F.body, fontSize: '13px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);
    this.drawHintChip(`${TOTAL_ROUNDS} rounds · tap the matching one 🫧`);

    primaryBtn(this, W / 2, H - 90, 340, 62, "Let's Pop! 🫧", () => {
      this.scene.start('GameScene');
    });
  }

  // ─── Hero preview ──────────────────────────────────────────────────────

  private buildHero(W: number, cy: number): void {
    // 4 cards in a 2x2 grid showing one item from each target category.
    // The "fruit" card has a sparkly target circle on it — the implied
    // round prompt is "🍎 Find the FRUIT!" — so the user reads it as a
    // worked example.
    const previews: { emoji: string; isTarget: boolean }[] = [
      { emoji: TARGETS.fruit.emoji,     isTarget: true  },
      { emoji: TARGETS.vehicle.emoji,   isTarget: false },
      { emoji: TARGETS.animal.emoji,    isTarget: false },
      { emoji: TARGETS.vegetable.emoji, isTarget: false },
    ];
    const cardW = 64, cardH = 64, gap = 14;
    const totalW = cardW * 2 + gap;
    const totalH = cardH * 2 + gap;
    const startX = W / 2 - totalW / 2 + cardW / 2;
    const startY = cy - totalH / 2 + cardH / 2;

    previews.forEach((p, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);
      const bg = this.add.graphics();
      bg.fillStyle(C.shadow, 0.14);
      bg.fillRoundedRect(x - cardW / 2 + 2, y - cardH / 2 + 6, cardW, cardH, 14);
      if (p.isTarget) {
        bg.fillStyle(C.mintBg, 1);
        bg.fillRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 14);
        bg.lineStyle(3, C.mint, 1);
        bg.strokeRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 14);
      } else {
        bg.fillStyle(C.white, 1);
        bg.fillRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 14);
        bg.lineStyle(2, C.lavender, 0.6);
        bg.strokeRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 14);
      }
      const txt = this.add.text(x, y, p.emoji, {
        fontFamily: F.body, fontSize: '36px',
      }).setOrigin(0.5);
      if (p.isTarget) {
        // Bouncy idle pulse on the "correct" preview card so the demo reads
        // as "this is the one to tap"
        this.tweens.add({
          targets: txt,
          scale: 1.1, yoyo: true, repeat: -1,
          duration: 850, ease: 'Sine.InOut',
        });
      }
    });
  }

  // ─── Decoration ────────────────────────────────────────────────────────

  private decorateBg(W: number, H: number): void {
    // Scattered 🎯 + 🫧 marks echo the "pop the right bubble" motif.
    const marks = [
      { x: 38,      y: 188, c: '🎯', s: 22, r: -10, a: 0.10 },
      { x: W - 38,  y: 168, c: '🫧', s: 24, r: 8,   a: 0.20 },
      { x: 30,      y: 360, c: '🫧', s: 18, r: 0,   a: 0.18 },
      { x: W - 30,  y: 380, c: '✨', s: 22, r: 0,   a: 0.18 },
      { x: 44,      y: H - 218, c: '🫧', s: 20, r: 6, a: 0.16 },
      { x: W - 40,  y: H - 200, c: '🎯', s: 22, r: 0, a: 0.12 },
    ];
    marks.forEach(m => {
      this.add.text(m.x, m.y, m.c, {
        fontFamily: F.body, fontSize: `${m.s}px`,
      }).setOrigin(0.5).setAlpha(m.a).setRotation(m.r * Math.PI / 180);
    });
  }

  private drawHintChip(text: string): void {
    this.hintTxt.setText(text);
    const chipPadX = 14, chipH = 28;
    const w = this.hintTxt.width + chipPadX * 2;
    const cx = this.hintTxt.x, cy = this.hintTxt.y;
    this.hintChip.clear();
    this.hintChip.fillStyle(C.white, 0.7);
    this.hintChip.fillRoundedRect(cx - w / 2, cy - chipH / 2, w, chipH, chipH / 2);
    this.hintChip.lineStyle(1.5, C.lavender, 0.5);
    this.hintChip.strokeRoundedRect(cx - w / 2, cy - chipH / 2, w, chipH, chipH / 2);
  }
}
