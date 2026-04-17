import Phaser from 'phaser';
import { drawBg, primaryBtn } from '@shared/phaserUtils';
import { T, F } from '@shared/theme';
import { CHARACTERS } from '../data';

export class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }

  preload(): void {
    CHARACTERS.forEach(c => this.load.image(c.key, c.url));
  }

  create(): void {
    const { width: W, height: H } = this.scale;
    drawBg(this);

    this.add.text(W / 2, 120, "🐰 Who's That, Aya?", {
      fontFamily: F.head, fontSize: '36px', color: T.main,
      align: 'center',
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);

    this.add.text(W / 2, 180, 'Can you guess the Bing character\nfrom the shadow? 🌟', {
      fontFamily: F.body, fontSize: '16px', color: T.sub,
      align: 'center', fontStyle: 'bold',
    }).setOrigin(0.5);

    const silhouette = this.add.image(W / 2, H / 2, 'bing')
      .setDisplaySize(150, 190);
    silhouette.setTintFill(0x2d1b3d);

    this.tweens.add({
      targets: silhouette,
      scale: { from: silhouette.scaleX, to: silhouette.scaleX * 1.06 },
      yoyo: true, repeat: -1, duration: 1250, ease: 'Sine.InOut',
    });

    primaryBtn(this, W / 2, H - 110, 340, 62, "Let's Guess! 🎉", () => {
      this.scene.start('GameScene');
    });
  }
}
