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

    this.add.text(W / 2, 96, '🌸 Aya\'s Flip\n& Matching', {
      fontFamily: F.head, fontSize: '44px', color: T.main,
      align: 'center',
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);

    this.add.text(W / 2, 188, 'Flip the cards, find the pairs! 🎀', {
      fontFamily: F.body, fontSize: '16px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);

    // Preview cards — one pair shown "matched" to hint at the goal.
    const previewEmojis = ['🍓', '🐱', '🦋', '🍊'];
    const matchedSet = new Set([0, 2]);
    const startX = W / 2 - (previewEmojis.length - 1) * 38;
    const previews: Phaser.GameObjects.Container[] = previewEmojis.map((e, i) => {
      const matched = matchedSet.has(i);
      const bg = this.add.graphics();
      if (matched) {
        bg.fillStyle(C.mintBg, 1);
        bg.fillRoundedRect(-27, -27, 54, 54, 12);
        bg.lineStyle(2.5, C.mint, 1);
        bg.strokeRoundedRect(-27, -27, 54, 54, 12);
      } else {
        bg.fillStyle(C.lavender, 1);
        bg.fillRoundedRect(-27, -27, 54, 54, 12);
      }
      const txt = this.add.text(0, 0, e, { fontSize: '28px' }).setOrigin(0.5);
      return this.add.container(startX + i * 76, 262, [bg, txt]);
    });
    bounceLoop(this, previews);

    // Size selector label
    this.add.text(W / 2, 326, 'CHOOSE GRID SIZE', {
      fontFamily: F.body, fontSize: '13px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);

    this.buildSizeButtons();

    // How-to-play row: simple tap-flip-match steps
    const steps = [
      { emoji: '👆', label: 'Tap' },
      { emoji: '🔄', label: 'Flip' },
      { emoji: '💖', label: 'Match' },
    ];
    const stepY = 540;
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
        const arrowX = cx + stepGap / 2;
        this.add.text(arrowX, stepY, '›', {
          fontFamily: F.head, fontSize: '26px', color: T.sub,
        }).setOrigin(0.5);
      }
    });

    primaryBtn(this, W / 2, H - 96, 380, 64, "Let's Play! 🎉", () => {
      this.scene.start('GameScene', { size: this.selectedSize });
    });
  }

  private buildSizeButtons(): void {
    const btnW = 96, btnH = 60, gap = 10;
    const totalW = GRID_SIZES.length * btnW + (GRID_SIZES.length - 1) * gap;
    const startX = W / 2 - totalW / 2 + btnW / 2;

    const bgs: Phaser.GameObjects.Graphics[] = [];
    const labels: Phaser.GameObjects.Text[] = [];
    const subs: Phaser.GameObjects.Text[] = [];

    GRID_SIZES.forEach((size, i) => {
      const x = startX + i * (btnW + gap);
      const y = 395;

      const bg = this.add.graphics().setPosition(x, y);
      bgs.push(bg);
      this.drawSizeBtn(bg, btnW, btnH, i === 0);

      const lbl = this.add.text(x, y - 10, size.label, {
        fontFamily: F.head, fontSize: '19px', color: i === 0 ? T.white : T.main,
      }).setOrigin(0.5);

      const sub = this.add.text(x, y + 13, size.sub, {
        fontFamily: F.body, fontSize: '11px', color: i === 0 ? 'rgba(255,255,255,0.9)' : T.sub, fontStyle: 'bold',
      }).setOrigin(0.5);

      labels.push(lbl);
      subs.push(sub);

      const zone = this.add.zone(x, y, btnW, btnH).setInteractive({ cursor: 'pointer' });
      zone.on('pointerdown', () => {
        this.selectedSize = size;
        bgs.forEach((b, j) => {
          this.drawSizeBtn(b, btnW, btnH, j === i);
          labels[j].setColor(j === i ? T.white : T.main);
          subs[j].setColor(j === i ? 'rgba(255,255,255,0.9)' : T.sub);
        });
      });
    });
  }

  private drawSizeBtn(g: Phaser.GameObjects.Graphics, w: number, h: number, active: boolean): void {
    g.clear();
    if (active) {
      g.fillStyle(C.shadow, 0.25);
      g.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 14);
      g.fillStyle(C.pink, 1);
    } else {
      g.lineStyle(2.5, C.lavender, 1);
      g.fillStyle(C.white, 1);
    }
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    if (!active) g.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
  }
}
