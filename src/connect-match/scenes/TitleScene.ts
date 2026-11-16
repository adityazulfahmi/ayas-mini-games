import Phaser from 'phaser';
import { drawBg, primaryBtn } from '@shared/phaserUtils';
import { C, T, F } from '@shared/theme';
import { sounds } from '@shared/audio';
import { RACE_MS, type GameConfig, type Level } from '../data';
import { say } from '../speech';

/** Remembered for the whole visit so Home → Play keeps the same choice. */
const choice: GameConfig = { level: 'easy', timed: false };

export class TitleScene extends Phaser.Scene {
  private tiles: { level: Level; g: Phaser.GameObjects.Graphics; c: Phaser.GameObjects.Container }[] = [];

  constructor() { super('TitleScene'); }

  create(): void {
    const { width: W, height: H } = this.scale;
    drawBg(this);
    this.tiles = [];

    this.add.text(W / 2, 92, 'Connect the Match', {
      fontFamily: F.head, fontSize: '36px', color: T.main,
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);
    this.add.text(W / 2, 146, 'Who eats what?\nDraw a line to feed each friend! 🥕', {
      fontFamily: F.body, fontSize: '15px', color: T.sub, fontStyle: 'bold', align: 'center', lineSpacing: 4,
    }).setOrigin(0.5);

    this.buildDemo(W, 282);

    this.add.text(W / 2, 398, 'Pick your friends', {
      fontFamily: F.body, fontSize: '13px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);
    this.buildTile(W / 2 - 92, 472, 'easy', '🐶 🦴', 'Easy');
    this.buildTile(W / 2 + 92, 472, 'tricky', '🐝 🌻', 'Tricky');
    this.paintTiles();

    this.buildTimerChip(W / 2, 572);

    primaryBtn(this, W / 2, H - 102, 340, 66, "Let's Match! 💕", () => {
      this.scene.start('GameScene', { ...choice });
    });
  }

  /** A looping demo: a little hand draws a line from the dog to its bone. */
  private buildDemo(W: number, cy: number): void {
    const s = 92, lx = W / 2 - 104, rx = W / 2 + 104;
    const card = (cx: number, emoji: string, name: string, side: 'L' | 'R') => {
      const g = this.add.graphics();
      g.fillStyle(C.shadow, 0.14);
      g.fillRoundedRect(-s / 2 + 2, -s / 2 + 6, s, s, 20);
      g.fillStyle(side === 'L' ? C.white : C.cream, 1);
      g.fillRoundedRect(-s / 2, -s / 2, s, s, 20);
      g.lineStyle(3, C.lavender, 1);
      g.strokeRoundedRect(-s / 2, -s / 2, s, s, 20);
      const kx = side === 'L' ? s / 2 : -s / 2;
      g.fillStyle(C.white, 1); g.fillCircle(kx, 0, 12);
      g.fillStyle(C.lavender, 1); g.fillCircle(kx, 0, 8);
      const t = this.add.text(0, 2, emoji, { fontFamily: F.body, fontSize: '54px' }).setOrigin(0.5);
      const c = this.add.container(cx, cy, [g, t]).setDepth(2);
      c.setSize(s + 10, s + 10).setInteractive({ cursor: 'pointer' });
      c.on('pointerdown', () => {
        say(name);
        this.tweens.add({ targets: c, angle: { from: -8, to: 8 }, yoyo: true, repeat: 1, duration: 90, onComplete: () => c.setAngle(0) });
      });
      return c;
    };
    const dog = card(lx, '🐶', 'Dog', 'L');
    const bone = card(rx, '🦴', 'Bone', 'R');

    const x1 = lx + s / 2, x2 = rx - s / 2;
    const line = this.add.graphics().setDepth(1);
    const hand = this.add.text(x1, cy, '👆', { fontSize: '40px' }).setOrigin(0.35, 0.05).setDepth(3);
    const heart = this.add.text(W / 2, cy - 30, '💞', { fontSize: '28px' }).setOrigin(0.5).setDepth(3).setAlpha(0);
    const p = { t: 0 };
    const loop = () => {
      p.t = 0;
      line.clear();
      hand.setAlpha(1).setPosition(x1, cy);
      this.tweens.add({
        targets: p, t: 1, duration: 1200, delay: 500, ease: 'Sine.InOut',
        onUpdate: () => {
          const ex = x1 + (x2 - x1) * p.t;
          hand.setX(ex);
          line.clear();
          line.lineStyle(10, C.pink, 0.9);
          line.lineBetween(x1, cy, ex, cy);
          line.lineStyle(3, C.white, 0.6);
          line.lineBetween(x1, cy, ex, cy);
        },
        onComplete: () => {
          line.clear();
          line.lineStyle(10, 0x4db6ac, 1);
          line.lineBetween(x1, cy, x2, cy);
          line.lineStyle(3, C.white, 0.55);
          line.lineBetween(x1, cy, x2, cy);
          this.tweens.add({ targets: hand, alpha: 0, duration: 200 });
          this.tweens.add({ targets: [dog, bone], scale: { from: 1.14, to: 1 }, duration: 320, ease: 'Back.Out' });
          this.tweens.add({ targets: heart, alpha: { from: 1, to: 0 }, y: { from: cy - 26, to: cy - 60 }, duration: 1100 });
          this.time.delayedCall(1700, loop);
        },
      });
    };
    loop();
  }

  private buildTile(cx: number, cy: number, level: Level, emojis: string, label: string): void {
    const w = 168, h = 116;
    const g = this.add.graphics();
    const e = this.add.text(0, -14, emojis, { fontFamily: F.body, fontSize: '40px' }).setOrigin(0.5);
    const t = this.add.text(0, 36, label, { fontFamily: F.head, fontSize: '20px', color: T.main }).setOrigin(0.5);
    const c = this.add.container(cx, cy, [g, e, t]);
    c.setSize(w, h).setInteractive({ cursor: 'pointer' });
    c.on('pointerdown', () => {
      choice.level = level;
      sounds.flip();
      say(level === 'easy' ? 'Easy! Who eats what?' : 'Tricky! More friends!');
      this.paintTiles();
      this.tweens.add({ targets: c, scale: { from: 1.08, to: 1 }, duration: 220, ease: 'Back.Out' });
    });
    this.tiles.push({ level, g, c });
  }

  private paintTiles(): void {
    const w = 168, h = 116;
    for (const { level, g } of this.tiles) {
      const on = choice.level === level;
      g.clear();
      g.fillStyle(C.shadow, on ? 0.18 : 0.1);
      g.fillRoundedRect(-w / 2 + 2, -h / 2 + 6, w, h, 24);
      g.fillStyle(on ? C.bg1 : C.white, 1);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 24);
      g.lineStyle(on ? 5 : 2.5, on ? C.pink : C.lavender, on ? 1 : 0.7);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, 24);
      if (on) {
        g.fillStyle(C.pink, 1);
        g.fillCircle(w / 2 - 14, -h / 2 + 14, 11);
        g.lineStyle(3, C.white, 1);
        g.beginPath();
        g.moveTo(w / 2 - 19, -h / 2 + 14);
        g.lineTo(w / 2 - 15, -h / 2 + 18);
        g.lineTo(w / 2 - 9, -h / 2 + 10);
        g.strokePath();
      }
    }
  }

  private buildTimerChip(cx: number, cy: number): void {
    const w = 236, h = 44;
    const g = this.add.graphics();
    const t = this.add.text(0, 0, '', { fontFamily: F.body, fontSize: '15px', color: T.main, fontStyle: 'bold' }).setOrigin(0.5);
    const c = this.add.container(cx, cy, [g, t]);
    c.setSize(w, h).setInteractive({ cursor: 'pointer' });
    const paint = () => {
      g.clear();
      g.fillStyle(choice.timed ? 0xfff3e0 : C.white, 0.95);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
      g.lineStyle(2, choice.timed ? 0xffb74d : C.lavender, 0.8);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
      t.setText(choice.timed ? `⏱ ${RACE_MS / 1000}-second race` : '🐢 No timer · take your time');
    };
    paint();
    c.on('pointerdown', () => {
      choice.timed = !choice.timed;
      sounds.flip();
      paint();
      this.tweens.add({ targets: c, scale: { from: 1.06, to: 1 }, duration: 200, ease: 'Back.Out' });
    });
    this.add.text(cx, cy + 36, 'Tap to change', { fontFamily: F.body, fontSize: '11px', color: T.sub, fontStyle: 'bold' })
      .setOrigin(0.5).setAlpha(0.7);
  }
}
