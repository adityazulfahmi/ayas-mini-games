import Phaser from 'phaser';
import { drawBg, primaryBtn, bounceLoop } from '@shared/phaserUtils';
import { C, T, F } from '@shared/theme';
import { ANIMALS } from '../data';

export class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }

  create(): void {
    const { width: W, height: H } = this.scale;
    drawBg(this);

    this.add.text(W / 2, 110, '🔊 Who Makes', {
      fontFamily: F.head, fontSize: '34px', color: T.main,
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);
    this.add.text(W / 2, 154, 'This Sound?', {
      fontFamily: F.head, fontSize: '34px', color: T.main,
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);

    this.add.text(W / 2, 212, 'Listen to the sound,\nthen tap the animal! 🎧', {
      fontFamily: F.body, fontSize: '15px', color: T.sub,
      align: 'center', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Bouncing row of preview animals
    const preview = ['🐮', '🐶', '🐱', '🦆', '🐑'];
    const size = 56, gap = 10;
    const totalW = preview.length * size + (preview.length - 1) * gap;
    const startX = W / 2 - totalW / 2 + size / 2;
    const animals = preview.map((emoji, i) => {
      const shadow = this.add.graphics();
      shadow.fillStyle(0x4a148c, 0.15);
      shadow.fillCircle(0, 4, size / 2);
      const bg = this.add.circle(0, 0, size / 2, 0xffffff, 1);
      bg.setStrokeStyle(2.5, C.lavender);
      const txt = this.add.text(0, 0, emoji, {
        fontFamily: F.body, fontSize: '34px',
      }).setOrigin(0.5);
      return this.add.container(startX + i * (size + gap), 320, [shadow, bg, txt]);
    });
    bounceLoop(this, animals);

    this.add.text(W / 2, 412, `${ANIMALS.length} friendly animals to meet 🐾`, {
      fontFamily: F.body, fontSize: '13px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);

    primaryBtn(this, W / 2, H - 100, 340, 62, "Let's Listen! 🎶", () => {
      // Tapping primes the speech synth — some browsers (iOS Safari) require a
      // user gesture before any utterance will be spoken, so doing nothing here
      // but starting the next scene is enough; the first real utterance fires
      // inside GameScene on the first speaker tap.
      this.scene.start('GameScene');
    });
  }
}
