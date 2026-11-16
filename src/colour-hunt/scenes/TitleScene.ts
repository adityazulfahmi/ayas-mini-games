import Phaser from 'phaser';
import { drawBg, primaryBtn, outlineBtn, bounceLoop } from '@shared/phaserUtils';
import { C, T, F } from '@shared/theme';
import { COLOUR_POOL, ROUNDS, SPEED_SECONDS, type Mode } from '../data';
import { say, shade } from '../speech';

export class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }

  create(): void {
    const { width: W, height: H } = this.scale;
    drawBg(this);

    this.add.text(W / 2, 104, 'Colour Hunt', {
      fontFamily: F.head, fontSize: '46px', color: T.main,
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);
    this.add.text(W / 2, 160, 'Hear a colour, then find it! 🔍', {
      fontFamily: F.body, fontSize: '16px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);

    // Paint palette: 8 blobs, tap one to hear its name.
    const pal = { x: 40, y: 214, w: W - 80, h: 204 };
    const g = this.add.graphics();
    g.fillStyle(C.shadow, 0.12);
    g.fillRoundedRect(pal.x, pal.y + 8, pal.w, pal.h, 32);
    g.fillStyle(C.white, 1);
    g.fillRoundedRect(pal.x, pal.y, pal.w, pal.h, 32);
    g.lineStyle(3, C.lavender, 0.6);
    g.strokeRoundedRect(pal.x, pal.y, pal.w, pal.h, 32);

    const r = 30, colW = pal.w / 4;
    const blobs = COLOUR_POOL.map((c, i) => {
      const col = i % 4, row = Math.floor(i / 4);
      const bx = pal.x + colW * (col + 0.5);
      const by = pal.y + 62 + row * 86;
      const b = this.add.graphics();
      b.fillStyle(shade(c.phex, -0.25), 1);
      b.fillCircle(0, 4, r);
      b.fillStyle(c.phex, 1);
      b.fillCircle(0, 0, r);
      b.fillStyle(0xffffff, 0.45);
      b.fillEllipse(-9, -11, 16, 9);
      const ct = this.add.container(bx, by, [b]);
      ct.setSize(r * 2 + 24, r * 2 + 24).setInteractive({ cursor: 'pointer' });
      ct.on('pointerdown', () => {
        say(c.prompt);
        this.tweens.add({ targets: b, scale: { from: 1.25, to: 1 }, duration: 320, ease: 'Back.Out' });
      });
      return ct;
    });
    bounceLoop(this, blobs);

    this.add.text(W / 2, pal.y + pal.h + 26, 'Tap a colour to hear its name 🔊', {
      fontFamily: F.body, fontSize: '13px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.85);

    const start = (mode: Mode) => this.scene.start('GameScene', { mode });

    primaryBtn(this, W / 2, 572, 340, 72, "Let's Hunt! 🎨", () => start('relaxed'));
    this.chip(W / 2, 630, `${ROUNDS} colours · no timer`);

    outlineBtn(this, W / 2, 712, 250, 52, `⏱ Speed Hunt · ${SPEED_SECONDS}s`, () => start('speed'));
  }

  private chip(x: number, y: number, label: string): void {
    const w = 200, h = 28;
    const g = this.add.graphics();
    g.fillStyle(C.white, 0.85);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
    g.lineStyle(1.5, C.lavender, 0.5);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
    this.add.text(x, y, label, {
      fontFamily: F.body, fontSize: '13px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);
  }
}
