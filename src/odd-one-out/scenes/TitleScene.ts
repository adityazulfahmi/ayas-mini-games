import Phaser from 'phaser';
import { drawBg, primaryBtn, bounceLoop } from '@shared/phaserUtils';
import { C, T, F } from '@shared/theme';

export class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }

  create(): void {
    const { width: W, height: H } = this.scale;
    drawBg(this);

    this.add.text(W / 2, 110, '🤔 Which One\nDoesn\'t Belong?', {
      fontFamily: F.head, fontSize: '42px', color: T.main,
      align: 'center',
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);

    this.add.text(W / 2, 200, "Find the one that doesn't fit! 🌟", {
      fontFamily: F.body, fontSize: '18px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);

    // 2×2 preview grid (3 animals + 1 odd)
    const previewEmojis = ['🐱', '🐶', '🐸', '🚗'];
    const gridCX = W / 2, gridCY = 330;
    const cellSize = 90, gap = 12;

    const items: Phaser.GameObjects.Container[] = previewEmojis.map((e, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = gridCX - cellSize / 2 - gap / 2 + col * (cellSize + gap);
      const y = gridCY - cellSize / 2 - gap / 2 + row * (cellSize + gap);

      const bg = this.add.graphics();
      bg.fillStyle(C.white, 1);
      bg.fillRoundedRect(-cellSize / 2, -cellSize / 2, cellSize, cellSize, 16);
      if (i === 3) {
        bg.lineStyle(3, C.pink, 1);
        bg.strokeRoundedRect(-cellSize / 2, -cellSize / 2, cellSize, cellSize, 16);
      }
      const txt = this.add.text(0, 0, e, { fontSize: '38px' }).setOrigin(0.5);
      return this.add.container(x, y, [bg, txt]);
    });
    bounceLoop(this, items);

    primaryBtn(this, W / 2, H - 90, 340, 62, "Let's Play! 🎉", () => {
      this.scene.start('GameScene');
    });
  }
}
