import Phaser from 'phaser';
import { drawBg, primaryBtn, bounceLoop } from '@shared/phaserUtils';
import { C, T, F } from '@shared/theme';
import { GRID_SIZES, type GridSize } from '../data';

const W = 480, H = 820;

export class TitleScene extends Phaser.Scene {
  private selectedSize: GridSize = GRID_SIZES[0];

  constructor() { super('TitleScene'); }

  create(): void {
    drawBg(this);

    this.add.text(W / 2, 100, '🌸 Aya\'s Flip\n& Matching', {
      fontFamily: F.head, fontSize: '44px', color: T.main,
      align: 'center',
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);

    this.add.text(W / 2, 192, 'Flip the cards and find the matching pairs! 🎀', {
      fontFamily: F.body, fontSize: '17px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);

    // Preview cards
    const previewEmojis = ['🍓', '🐱', '🦋', '🍊'];
    const startX = W / 2 - (previewEmojis.length - 1) * 38;
    const previews: Phaser.GameObjects.Container[] = previewEmojis.map((e, i) => {
      const bg = this.add.graphics();
      bg.fillStyle(C.lavender, 1);
      bg.fillRoundedRect(-27, -27, 54, 54, 12);
      const txt = this.add.text(0, 0, e, { fontSize: '28px' }).setOrigin(0.5);
      return this.add.container(startX + i * 76, 270, [bg, txt]);
    });
    bounceLoop(this, previews);

    // Size selector label
    this.add.text(W / 2, 330, 'CHOOSE GRID SIZE', {
      fontFamily: F.body, fontSize: '13px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);

    this.buildSizeButtons();

    this.add.text(W / 2, 510, 'Tap to flip, find the matching pair!', {
      fontFamily: F.body, fontSize: '14px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);

    primaryBtn(this, W / 2, H - 110, 380, 62, "Let's Play! 🎉", () => {
      this.scene.start('GameScene', { size: this.selectedSize });
    });
  }

  private buildSizeButtons(): void {
    const btnW = 96, btnH = 56, gap = 10;
    const totalW = GRID_SIZES.length * btnW + (GRID_SIZES.length - 1) * gap;
    const startX = W / 2 - totalW / 2 + btnW / 2;

    const bgs: Phaser.GameObjects.Graphics[] = [];
    const labels: Phaser.GameObjects.Text[] = [];

    GRID_SIZES.forEach((size, i) => {
      const x = startX + i * (btnW + gap);
      const y = 395;

      const bg = this.add.graphics().setPosition(x, y);
      bgs.push(bg);
      this.drawSizeBtn(bg, btnW, btnH, i === 0);

      const lbl = this.add.text(x, y - 8, size.label, {
        fontFamily: F.head, fontSize: '18px', color: i === 0 ? T.white : T.main,
      }).setOrigin(0.5);

      const sub = this.add.text(x, y + 12, size.sub, {
        fontFamily: F.body, fontSize: '10px', color: i === 0 ? 'rgba(255,255,255,0.8)' : T.sub, fontStyle: 'bold',
      }).setOrigin(0.5);

      labels.push(lbl);

      const zone = this.add.zone(x, y, btnW, btnH).setInteractive({ cursor: 'pointer' });
      zone.on('pointerdown', () => {
        this.selectedSize = size;
        bgs.forEach((b, j) => {
          this.drawSizeBtn(b, btnW, btnH, j === i);
          labels[j].setColor(j === i ? T.white : T.main);
          sub;
        });
      });
    });
  }

  private drawSizeBtn(g: Phaser.GameObjects.Graphics, w: number, h: number, active: boolean): void {
    g.clear();
    if (active) {
      g.fillStyle(C.pink, 1);
    } else {
      g.lineStyle(2.5, C.lavender, 1);
      g.fillStyle(C.white, 1);
    }
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    if (!active) g.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
  }
}
