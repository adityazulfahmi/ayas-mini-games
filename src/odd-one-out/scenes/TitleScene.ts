import Phaser from 'phaser';
import { drawBg, primaryBtn, bounceLoop } from '@shared/phaserUtils';
import { C, T, F } from '@shared/theme';
import type { Difficulty } from '../data';

export class TitleScene extends Phaser.Scene {
  private difficulty: Difficulty = 'easy';
  private easyBtn!: Phaser.GameObjects.Container;
  private hardBtn!: Phaser.GameObjects.Container;

  constructor() { super('TitleScene'); }

  create(): void {
    const { width: W, height: H } = this.scale;
    drawBg(this);

    this.add.text(W / 2, 112, "🤔 Which One\nDoesn't Belong?", {
      fontFamily: F.head, fontSize: '38px', color: T.main,
      align: 'center',
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);

    this.add.text(W / 2, 206, 'Find the sneaky one that\ndoesn\'t fit the group! 🕵️', {
      fontFamily: F.body, fontSize: '16px', color: T.sub,
      align: 'center', fontStyle: 'bold',
    }).setOrigin(0.5);

    // 2×2 preview grid (3 matching + 1 odd) with bounce
    const cellSize = 76, gap = 12;
    const gridCX = W / 2, gridCY = 320;
    const previewEmojis = ['🐱', '🐶', '🐸', '🚗'];
    const items: Phaser.GameObjects.Container[] = previewEmojis.map((e, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = gridCX - cellSize / 2 - gap / 2 + col * (cellSize + gap);
      const y = gridCY - cellSize / 2 - gap / 2 + row * (cellSize + gap);
      const bg = this.add.graphics();
      bg.fillStyle(C.white, 1);
      bg.fillRoundedRect(-cellSize / 2, -cellSize / 2, cellSize, cellSize, 14);
      if (i === 3) {
        bg.lineStyle(3, C.pink, 1);
        bg.strokeRoundedRect(-cellSize / 2, -cellSize / 2, cellSize, cellSize, 14);
      }
      const txt = this.add.text(0, 0, e, { fontSize: '34px' }).setOrigin(0.5);
      return this.add.container(x, y, [bg, txt]);
    });
    bounceLoop(this, items);

    // Difficulty picker
    this.add.text(W / 2, 460, 'CHOOSE DIFFICULTY', {
      fontFamily: F.body, fontSize: '12px', color: T.sub,
      fontStyle: 'bold', letterSpacing: 1.5,
    }).setOrigin(0.5);

    const btnW = 150, btnH = 68, gap2 = 16;
    this.easyBtn = this.buildDifficultyBtn(
      W / 2 - btnW / 2 - gap2 / 2, 518, btnW, btnH,
      'Easy', '2×2 with hint',
      () => this.select('easy'),
    );
    this.hardBtn = this.buildDifficultyBtn(
      W / 2 + btnW / 2 + gap2 / 2, 518, btnW, btnH,
      'Hard', '3×3 · no hint',
      () => this.select('hard'),
    );
    this.select('easy');

    primaryBtn(this, W / 2, H - 90, 340, 62, "Let's Play! 🎉", () => {
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

    const refs = container as unknown as DifficultyRefs;
    refs.bg = bg; refs.titleTxt = titleTxt; refs.subTxt = subTxt; refs.w = w; refs.h = h;
    return container;
  }

  private drawDifficultyBg(c: Phaser.GameObjects.Container, active: boolean): void {
    const { bg, titleTxt, subTxt, w, h } = c as unknown as DifficultyRefs;
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

interface DifficultyRefs {
  bg: Phaser.GameObjects.Graphics;
  titleTxt: Phaser.GameObjects.Text;
  subTxt: Phaser.GameObjects.Text;
  w: number; h: number;
}
