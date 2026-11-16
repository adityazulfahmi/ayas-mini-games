import Phaser from 'phaser';
import { drawBg, primaryBtn } from '@shared/phaserUtils';
import { C, T, F } from '@shared/theme';
import { EASY_PALETTE, RELAXED_ROUNDS, TIMED_SECONDS, lastConfig, type Difficulty, type Pace } from '../data';
import { drawBuddy } from './buddy';
import { say, primeSpeech } from '../speech';

interface Choice {
  c: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  title: Phaser.GameObjects.Text;
  sub: Phaser.GameObjects.Text;
  w: number;
  h: number;
}

export class TitleScene extends Phaser.Scene {
  private easy!: Choice;
  private hard!: Choice;
  private relaxed!: Choice;
  private timed!: Choice;

  constructor() { super('TitleScene'); }

  create(): void {
    const { width: W, height: H } = this.scale;
    drawBg(this);

    this.add.text(W / 2, 92, 'Colour Match', {
      fontFamily: F.head, fontSize: '44px', color: T.main,
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);
    this.add.text(W / 2, 142, 'Find the buddy with the same colour! 🌈', {
      fontFamily: F.body, fontSize: '16px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);

    // Row of colour buddies: tap one to hear its name.
    const size = 44, gap = 10;
    const n = EASY_PALETTE.length;
    const startX = W / 2 - ((n - 1) * (size + gap)) / 2;
    EASY_PALETTE.forEach((col, i) => {
      const g = this.add.graphics();
      drawBuddy(g, size, col.hex);
      const c = this.add.container(startX + i * (size + gap), 226, [g]);
      c.setSize(size + gap, size + 24).setInteractive({ cursor: 'pointer' });
      this.tweens.add({ targets: c, y: 216, yoyo: true, repeat: -1, duration: 800, ease: 'Sine.InOut', delay: i * 140 });
      c.on('pointerdown', () => {
        say(col.name);
        drawBuddy(g, size, col.hex, 'happy');
        this.tweens.add({ targets: c, scale: { from: 1.35, to: 1 }, duration: 380, ease: 'Back.Out' });
        this.time.delayedCall(700, () => drawBuddy(g, size, col.hex));
      });
    });
    this.add.text(W / 2, 274, 'Tap a buddy to hear its colour', {
      fontFamily: F.body, fontSize: '13px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.75);

    // What to play
    this.sectionLabel(W / 2, 322, 'WHAT TO MATCH');
    const cw = 172, gapX = 14;
    const lx = W / 2 - cw / 2 - gapX / 2, rx = W / 2 + cw / 2 + gapX / 2;
    this.easy = this.choice(lx, 394, cw, 104, '🌈', 'Colours', 'Bright, with names', () => this.pick('easy'));
    this.hard = this.choice(rx, 394, cw, 104, '🎨', 'Shades', 'Tricky look-alikes', () => this.pick('hard'));

    this.sectionLabel(W / 2, 478, 'HOW TO PLAY');
    this.relaxed = this.choice(lx, 544, cw, 92, '🐢', 'Relaxed', '', () => this.pickPace('relaxed'));
    this.timed = this.choice(rx, 544, cw, 92, '⏰', 'Timed', `${TIMED_SECONDS} seconds`, () => this.pickPace('timed'));

    this.pick(lastConfig.difficulty);
    this.pickPace(lastConfig.pace);

    primaryBtn(this, W / 2, H - 98, 320, 68, "Let's Play! 🎉", () => {
      primeSpeech();
      this.scene.start('GameScene', { difficulty: lastConfig.difficulty, pace: lastConfig.pace });
    });
  }

  private sectionLabel(x: number, y: number, text: string): void {
    // Plain text only: letterSpacing splits emoji, so never put one here.
    this.add.text(x, y, text, {
      fontFamily: F.body, fontSize: '13px', color: T.sub, fontStyle: 'bold', letterSpacing: 1.5,
    }).setOrigin(0.5);
  }

  private choice(
    x: number, y: number, w: number, h: number,
    emoji: string, title: string, sub: string, onClick: () => void,
  ): Choice {
    const bg = this.add.graphics();
    const icon = this.add.text(-w / 2 + 34, -4, emoji, { fontSize: '30px' }).setOrigin(0.5);
    const titleTxt = this.add.text(-w / 2 + 60, -12, title, {
      fontFamily: F.head, fontSize: '22px', color: T.main,
    }).setOrigin(0, 0.5);
    const subTxt = this.add.text(-w / 2 + 60, 14, sub, {
      fontFamily: F.body, fontSize: '12px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    const c = this.add.container(x, y, [bg, icon, titleTxt, subTxt]);
    c.setSize(w, h).setInteractive({ cursor: 'pointer' });
    c.on('pointerdown', () => {
      onClick();
      this.tweens.add({ targets: c, scale: { from: 0.94, to: 1 }, duration: 220, ease: 'Back.Out' });
    });
    return { c, bg, title: titleTxt, sub: subTxt, w, h };
  }

  private style(ch: Choice, active: boolean): void {
    const { bg, w, h } = ch;
    bg.clear();
    if (active) {
      bg.fillStyle(C.shadow, 0.18);
      bg.fillRoundedRect(-w / 2 + 2, -h / 2 + 6, w, h, 22);
      bg.fillStyle(C.pink, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 22);
      bg.fillStyle(0xffffff, 0.18);
      bg.fillRoundedRect(-w / 2 + 8, -h / 2 + 6, w - 16, h * 0.32, 14);
      ch.title.setColor(T.white);
      ch.sub.setColor('#fff3f8');
    } else {
      bg.fillStyle(C.white, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 22);
      bg.lineStyle(2.5, 0xe1bee7, 1);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 22);
      ch.title.setColor(T.main);
      ch.sub.setColor(T.sub);
    }
  }

  private pick(d: Difficulty): void {
    lastConfig.difficulty = d;
    this.style(this.easy, d === 'easy');
    this.style(this.hard, d === 'hard');
    const n = RELAXED_ROUNDS[d];
    this.relaxed.sub.setText(d === 'easy' ? `${n} colours, no rush` : `${n} rounds, no rush`);
  }

  private pickPace(p: Pace): void {
    lastConfig.pace = p;
    this.style(this.relaxed, p === 'relaxed');
    this.style(this.timed, p === 'timed');
  }
}
