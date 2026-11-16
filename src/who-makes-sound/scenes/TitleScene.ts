import Phaser from 'phaser';
import { drawBg, bounceLoop } from '@shared/phaserUtils';
import { C, T, F } from '@shared/theme';
import { ANIMALS, MODES, type Mode } from '../data';
import { drawSpeaker } from './speaker';
import { preloadSounds, unlockAudio } from '../sound';
import { unlockSpeech } from '../speech';

export class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }

  create(): void {
    const { width: W, height: H } = this.scale;
    drawBg(this);
    // Fetch + decode every sound while the title is showing, so the first cue is instant.
    preloadSounds(ANIMALS);

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

    this.add.text(W / 2, 208, 'Listen to the animal,\nthen tap who made the sound! 🎧', {
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

    // Two modes: Little Ears (2 big cards) is the toddler default and comes
    // first; Big Ears is the classic 4-card game.
    MODES.forEach((m, i) => this.modeButton(W / 2, 588 + i * 100, m, i === 0));
  }

  private modeButton(cx: number, cy: number, mode: Mode, primary: boolean): void {
    const w = 340, h = 86, r = 26;
    const shadow = this.add.graphics();
    shadow.fillStyle(C.shadow, 0.16);
    shadow.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, r);
    const bg = this.add.graphics();
    if (primary) {
      bg.fillStyle(C.pink, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    } else {
      bg.fillStyle(C.white, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, r);
      bg.lineStyle(3, C.lavender, 1);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    }
    const badge = this.add.graphics();
    badge.fillStyle(primary ? C.white : C.mintBg, primary ? 0.95 : 1);
    badge.fillCircle(-w / 2 + 50, 0, 31);
    const emoji = this.add.text(-w / 2 + 50, 2, mode.emoji, {
      fontFamily: F.body, fontSize: '38px',
    }).setOrigin(0.5);
    const label = this.add.text(-w / 2 + 98, -12, mode.label, {
      fontFamily: F.head, fontSize: '26px', color: primary ? T.white : T.main,
    }).setOrigin(0, 0.5);
    const blurb = this.add.text(-w / 2 + 99, 18, mode.blurb, {
      fontFamily: F.body, fontSize: '14px', fontStyle: 'bold', color: primary ? '#fff0f6' : T.sub,
    }).setOrigin(0, 0.5);
    // Little preview of how many cards this mode shows.
    const dots = this.add.graphics();
    const n = mode.choices, ds = 13, dg = 5, rows = n / 2;
    const gx = w / 2 - 30 - (2 * ds + dg) / 2;
    const gy = -(rows * ds + (rows - 1) * dg) / 2;
    dots.fillStyle(primary ? C.white : C.lavender, primary ? 0.9 : 0.8);
    for (let k = 0; k < n; k++) {
      dots.fillRoundedRect(gx + (k % 2) * (ds + dg), gy + Math.floor(k / 2) * (ds + dg), ds, ds, 4);
    }

    const c = this.add.container(cx, cy, [shadow, bg, badge, emoji, label, blurb, dots]);
    c.setSize(w, h).setInteractive({ cursor: 'pointer' });
    c.on('pointerover', () => this.tweens.add({ targets: c, scale: 1.03, duration: 100 }));
    c.on('pointerout',  () => this.tweens.add({ targets: c, scale: 1, duration: 100 }));
    c.on('pointerdown', () => {
      // iOS only starts audio/speech after a user gesture: unlock both on this
      // tap so the first animal plays straight away when the game opens.
      unlockAudio();
      unlockSpeech();
      c.disableInteractive();
      this.tweens.killTweensOf(c);
      this.tweens.add({
        targets: c, scale: 0.95, yoyo: true, duration: 90,
        onComplete: () => this.scene.start('GameScene', { choices: mode.choices }),
      });
    });
    if (primary) {
      this.tweens.add({ targets: c, scale: { from: 1, to: 1.03 }, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.InOut' });
    }
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
