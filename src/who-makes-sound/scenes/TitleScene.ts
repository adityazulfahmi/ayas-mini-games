import Phaser from 'phaser';
import { drawBg, primaryBtn, bounceLoop } from '@shared/phaserUtils';
import { C, T, F } from '@shared/theme';
import { ANIMALS } from '../data';
import { drawSpeaker } from './speaker';

export class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }

  create(): void {
    const { width: W, height: H } = this.scale;
    drawBg(this);

    // Soft floating music-note decorations add atmosphere without competing
    // with the speaker — low alpha so they read as background texture.
    this.decorateBg(W, H);

    this.add.text(W / 2, 108, 'Who Makes', {
      fontFamily: F.head, fontSize: '36px', color: T.main,
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);
    this.add.text(W / 2, 152, 'This Sound?', {
      fontFamily: F.head, fontSize: '36px', color: T.main,
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);

    this.add.text(W / 2, 208, 'Listen with your ears,\nthen tap the right animal! 🎧', {
      fontFamily: F.body, fontSize: '14px', color: T.sub,
      align: 'center', fontStyle: 'bold',
      lineSpacing: 4,
    }).setOrigin(0.5);

    // Custom-drawn speaker avoids the heavy dark 🔊 emoji — the rounded pastel
    // shapes read as soft and toy-like instead of industrial.
    const speaker = this.add.container(W / 2, 336);
    const halo2 = this.add.graphics();
    halo2.fillStyle(C.lavender, 0.18);
    halo2.fillCircle(0, 0, 92);
    const halo1 = this.add.graphics();
    halo1.fillStyle(C.lavender, 0.32);
    halo1.fillCircle(0, 0, 78);
    const bubble = this.add.graphics();
    bubble.fillStyle(C.pink, 1);
    bubble.fillCircle(0, 0, 62);
    bubble.lineStyle(4, C.white, 1);
    bubble.strokeCircle(0, 0, 62);
    const icon = drawSpeaker(this, 0, 0, 1);
    speaker.add([halo2, halo1, bubble, icon]);
    this.tweens.add({
      targets: speaker, scale: { from: 1, to: 1.06 },
      yoyo: true, repeat: -1, duration: 900, ease: 'Sine.InOut',
    });
    // Outer halo pulses on its own, slightly slower, for a "sound radiating" feel.
    this.tweens.add({
      targets: halo2, alpha: { from: 0.18, to: 0.05 }, scale: { from: 1, to: 1.2 },
      yoyo: true, repeat: -1, duration: 1400, ease: 'Sine.InOut',
    });

    // Bouncing row of preview animals closer to speaker so the pair reads as
    // a single "hear + match" illustration.
    const preview = ['🐮', '🐶', '🐱', '🦆', '🐑'];
    const size = 54, gap = 10;
    const totalW = preview.length * size + (preview.length - 1) * gap;
    const startX = W / 2 - totalW / 2 + size / 2;
    const animals = preview.map((emoji, i) => {
      const shadow = this.add.graphics();
      shadow.fillStyle(0x4a148c, 0.15);
      shadow.fillCircle(0, 5, size / 2);
      const bg = this.add.circle(0, 0, size / 2, 0xffffff, 1);
      bg.setStrokeStyle(2.5, C.lavender);
      const txt = this.add.text(0, 0, emoji, {
        fontFamily: F.body, fontSize: '32px',
      }).setOrigin(0.5);
      return this.add.container(startX + i * (size + gap), 462, [shadow, bg, txt]);
    });
    bounceLoop(this, animals);

    // Small pill-shaped tagline chip — feels more polished than plain text.
    const chipY = 540;
    const chipW = 220, chipH = 30;
    const chip = this.add.graphics();
    chip.fillStyle(C.white, 0.85);
    chip.fillRoundedRect(W / 2 - chipW / 2, chipY - chipH / 2, chipW, chipH, chipH / 2);
    chip.lineStyle(1.5, C.lavender, 0.5);
    chip.strokeRoundedRect(W / 2 - chipW / 2, chipY - chipH / 2, chipW, chipH, chipH / 2);
    this.add.text(W / 2, chipY, `${ANIMALS.length} animals · 5 rounds · 🐾`, {
      fontFamily: F.body, fontSize: '13px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);

    primaryBtn(this, W / 2, H - 110, 340, 66, "Let's Listen! 🎶", () => {
      // Tapping primes the speech synth — iOS Safari needs a user gesture
      // before any utterance will be spoken. The first real cue fires inside
      // GameScene on the first speaker tap.
      this.scene.start('GameScene');
    });
  }

  private decorateBg(W: number, H: number): void {
    // Scattered faint notes sit behind the main content to add atmosphere
    // without pulling focus.
    const notes = [
      { x: 48,      y: 84,       c: '♪', s: 38, r: -12, a: 0.10 },
      { x: W - 52,  y: 96,       c: '♫', s: 30, r: 14,  a: 0.10 },
      { x: 34,      y: 290,      c: '♩', s: 26, r: -8,  a: 0.09 },
      { x: W - 36,  y: 262,      c: '♪', s: 34, r: 10,  a: 0.10 },
      { x: 56,      y: H - 220,  c: '♫', s: 28, r: -6,  a: 0.09 },
      { x: W - 58,  y: H - 240,  c: '♩', s: 32, r: 8,   a: 0.10 },
    ];
    notes.forEach(n => {
      this.add.text(n.x, n.y, n.c, {
        fontFamily: F.head, fontSize: `${n.s}px`, color: T.main,
      }).setOrigin(0.5).setAlpha(n.a).setRotation(n.r * Math.PI / 180);
    });
  }
}
