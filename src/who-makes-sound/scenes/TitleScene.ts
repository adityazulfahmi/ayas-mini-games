import Phaser from 'phaser';
import { drawBg, primaryBtn, bounceLoop } from '@shared/phaserUtils';
import { C, T, F } from '@shared/theme';
import { ANIMALS } from '../data';

export class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }

  create(): void {
    const { width: W, height: H } = this.scale;
    drawBg(this);

    this.add.text(W / 2, 106, '🔊 Who Makes', {
      fontFamily: F.head, fontSize: '34px', color: T.main,
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);
    this.add.text(W / 2, 150, 'This Sound?', {
      fontFamily: F.head, fontSize: '34px', color: T.main,
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);

    this.add.text(W / 2, 208, 'Listen to the sound,\nthen tap the animal! 🎧', {
      fontFamily: F.body, fontSize: '15px', color: T.sub,
      align: 'center', fontStyle: 'bold',
    }).setOrigin(0.5);

    // A pink speaker bubble illustrates the "tap to hear" mechanic. A gentle
    // pulse makes it feel alive so toddlers scan it as the primary affordance.
    const speaker = this.add.container(W / 2, 332);
    const halo = this.add.graphics();
    halo.fillStyle(C.lavender, 0.25);
    halo.fillCircle(0, 0, 74);
    const dot = this.add.graphics();
    dot.fillStyle(C.pink, 1);
    dot.fillCircle(0, 0, 60);
    dot.lineStyle(3, C.white, 1);
    dot.strokeCircle(0, 0, 60);
    const icon = this.add.text(0, 0, '🔊', { fontFamily: F.body, fontSize: '60px' }).setOrigin(0.5);
    speaker.add([halo, dot, icon]);
    this.tweens.add({
      targets: speaker, scale: { from: 1, to: 1.06 },
      yoyo: true, repeat: -1, duration: 900, ease: 'Sine.InOut',
    });

    // Bouncing row of preview animals — closer to the speaker so the pair
    // reads as a single "hear + match" illustration.
    const preview = ['🐮', '🐶', '🐱', '🦆', '🐑'];
    const size = 52, gap = 10;
    const totalW = preview.length * size + (preview.length - 1) * gap;
    const startX = W / 2 - totalW / 2 + size / 2;
    const animals = preview.map((emoji, i) => {
      const shadow = this.add.graphics();
      shadow.fillStyle(0x4a148c, 0.15);
      shadow.fillCircle(0, 4, size / 2);
      const bg = this.add.circle(0, 0, size / 2, 0xffffff, 1);
      bg.setStrokeStyle(2.5, C.lavender);
      const txt = this.add.text(0, 0, emoji, {
        fontFamily: F.body, fontSize: '32px',
      }).setOrigin(0.5);
      return this.add.container(startX + i * (size + gap), 452, [shadow, bg, txt]);
    });
    bounceLoop(this, animals);

    this.add.text(W / 2, 524, `${ANIMALS.length} friendly animals · 5 rounds 🐾`, {
      fontFamily: F.body, fontSize: '13px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);

    primaryBtn(this, W / 2, H - 110, 340, 66, "Let's Listen! 🎶", () => {
      // Tapping primes the speech synth — some browsers (iOS Safari) require a
      // user gesture before any utterance will be spoken, so doing nothing here
      // but starting the next scene is enough; the first real utterance fires
      // inside GameScene on the first speaker tap.
      this.scene.start('GameScene');
    });
  }
}
