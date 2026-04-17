import Phaser from 'phaser';
import { drawBg, primaryBtn, bounceLoop } from '@shared/phaserUtils';
import { C, T, F } from '@shared/theme';
import type { Difficulty } from '../data';

const PREVIEW_COLOURS = [0xe53935, 0xfdd835, 0x43a047, 0x1e88e5, 0xec407a, 0x5e35b1];

export class TitleScene extends Phaser.Scene {
  private difficulty: Difficulty = 'easy';
  private easyBtn!: Phaser.GameObjects.Container;
  private hardBtn!: Phaser.GameObjects.Container;

  constructor() { super('TitleScene'); }

  create(): void {
    const { width: W, height: H } = this.scale;
    drawBg(this);

    this.add.text(W / 2, 120, '🎨 Colour Match', {
      fontFamily: F.head, fontSize: '44px', color: T.main,
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);

    this.add.text(W / 2, 188, 'Tap the swatch that matches\nthe target colour! 🌈', {
      fontFamily: F.body, fontSize: '16px', color: T.sub,
      fontStyle: 'bold', align: 'center',
    }).setOrigin(0.5);

    // Bouncing colour dot row
    const dotR = 24, gap = 14;
    const totalW = PREVIEW_COLOURS.length * (dotR * 2) + (PREVIEW_COLOURS.length - 1) * gap;
    const startX = W / 2 - totalW / 2 + dotR;
    const dots = PREVIEW_COLOURS.map((hex, i) => {
      const shadow = this.add.graphics();
      shadow.fillStyle(0x4a148c, 0.18);
      shadow.fillCircle(0, 4, dotR);
      const fill = this.add.arc(0, 0, dotR, 0, 360, false, hex, 1);
      const rim = this.add.graphics();
      rim.lineStyle(2, C.white, 1);
      rim.strokeCircle(0, 0, dotR);
      return this.add.container(startX + i * (dotR * 2 + gap), 310, [shadow, fill, rim]);
    });
    bounceLoop(this, dots);

    // Difficulty picker
    this.add.text(W / 2, 410, 'CHOOSE DIFFICULTY', {
      fontFamily: F.body, fontSize: '12px', color: T.sub,
      fontStyle: 'bold', letterSpacing: 1.5,
    }).setOrigin(0.5);

    const btnW = 150, btnH = 68, gap2 = 16;
    this.easyBtn = this.buildDifficultyBtn(
      W / 2 - btnW / 2 - gap2 / 2, 468, btnW, btnH,
      'Easy', 'Distinct colours',
      () => this.select('easy'),
    );
    this.hardBtn = this.buildDifficultyBtn(
      W / 2 + btnW / 2 + gap2 / 2, 468, btnW, btnH,
      'Hard', 'Shades get closer',
      () => this.select('hard'),
    );
    this.select('easy');

    primaryBtn(this, W / 2, H - 110, 340, 62, "Let's Play! 🎉", () => {
      this.scene.start('GameScene', { difficulty: this.difficulty });
    });
  }

  private buildDifficultyBtn(
    cx: number, cy: number, w: number, h: number,
    title: string, subtitle: string,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const bg = this.add.graphics();
    const titleTxt = this.add.text(0, -8, title, {
      fontFamily: F.head, fontSize: '20px', color: T.main,
    }).setOrigin(0.5);
    const subTxt = this.add.text(0, 16, subtitle, {
      fontFamily: F.body, fontSize: '11px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);
    const container = this.add.container(cx, cy, [bg, titleTxt, subTxt]);
    container.setSize(w, h).setInteractive({ cursor: 'pointer' });
    container.on('pointerdown', onClick);

    // Store refs so select() can restyle
    (container as unknown as { bg: Phaser.GameObjects.Graphics; titleTxt: Phaser.GameObjects.Text; subTxt: Phaser.GameObjects.Text; w: number; h: number }).bg = bg;
    (container as unknown as { bg: Phaser.GameObjects.Graphics; titleTxt: Phaser.GameObjects.Text; subTxt: Phaser.GameObjects.Text; w: number; h: number }).titleTxt = titleTxt;
    (container as unknown as { bg: Phaser.GameObjects.Graphics; titleTxt: Phaser.GameObjects.Text; subTxt: Phaser.GameObjects.Text; w: number; h: number }).subTxt = subTxt;
    (container as unknown as { bg: Phaser.GameObjects.Graphics; titleTxt: Phaser.GameObjects.Text; subTxt: Phaser.GameObjects.Text; w: number; h: number }).w = w;
    (container as unknown as { bg: Phaser.GameObjects.Graphics; titleTxt: Phaser.GameObjects.Text; subTxt: Phaser.GameObjects.Text; w: number; h: number }).h = h;

    return container;
  }

  private drawDifficultyBg(c: Phaser.GameObjects.Container, active: boolean): void {
    const refs = c as unknown as {
      bg: Phaser.GameObjects.Graphics;
      titleTxt: Phaser.GameObjects.Text;
      subTxt: Phaser.GameObjects.Text;
      w: number; h: number;
    };
    const { bg, titleTxt, subTxt, w, h } = refs;
    bg.clear();
    if (active) {
      bg.fillStyle(C.pink, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
      titleTxt.setColor(T.white);
      subTxt.setColor('rgba(255,255,255,0.85)');
    } else {
      bg.fillStyle(C.white, 1);
      bg.lineStyle(2.5, C.lavender, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);
      titleTxt.setColor(T.main);
      subTxt.setColor(T.sub);
    }
  }

  private select(d: Difficulty): void {
    this.difficulty = d;
    this.drawDifficultyBg(this.easyBtn, d === 'easy');
    this.drawDifficultyBg(this.hardBtn, d === 'hard');
  }
}
