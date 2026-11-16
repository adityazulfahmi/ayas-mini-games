import Phaser from 'phaser';
import { drawBg, primaryBtn } from '@shared/phaserUtils';
import { C, T, F } from '@shared/theme';
import { ROUNDS, TIMED_SECONDS, settings, type Difficulty, type PlayMode } from '../data';
import { say } from '../speech';

interface Choice {
  bg: Phaser.GameObjects.Graphics;
  texts: Phaser.GameObjects.Text[];
  icon?: Phaser.GameObjects.Graphics;
  w: number;
  h: number;
  dots?: number;
}

const PREVIEW = [
  { emoji: '🐱', name: 'cat' },
  { emoji: '🐶', name: 'dog' },
  { emoji: '🐰', name: 'bunny' },
  { emoji: '🍎', name: 'apple' },
];

export class TitleScene extends Phaser.Scene {
  private levels: Record<Difficulty, Choice> = {} as Record<Difficulty, Choice>;
  private paces: Record<PlayMode, Choice> = {} as Record<PlayMode, Choice>;

  constructor() { super('TitleScene'); }

  create(): void {
    const { width: W, height: H } = this.scale;
    drawBg(this);
    this.levels = {} as Record<Difficulty, Choice>;
    this.paces = {} as Record<PlayMode, Choice>;

    this.add.text(W / 2, 108, 'Odd One Out', {
      fontFamily: F.head, fontSize: '46px', color: T.main,
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);
    this.add.text(W / 2, 164, 'Three are the same, one is different.\nCan you find it? 🔍', {
      fontFamily: F.body, fontSize: '15px', color: T.sub, fontStyle: 'bold', align: 'center', lineSpacing: 4,
    }).setOrigin(0.5);

    this.buildPreview(W / 2, 308);

    // ── Level ──
    this.label(W / 2, 440, 'LEVEL');
    const cw = 182, ch = 96, gx = 10;
    this.levels.easy = this.choice(W / 2 - cw / 2 - gx / 2, 500, cw, ch, 'Easy', '4 cards · I say the group', 2,
      () => this.pickLevel('easy'));
    this.levels.hard = this.choice(W / 2 + cw / 2 + gx / 2, 500, cw, ch, 'Hard', '9 cards · trickier', 3,
      () => this.pickLevel('hard'));

    // ── Pace ──
    this.label(W / 2, 576, 'PACE');
    const pw = 182, ph = 58;
    this.paces.relaxed = this.choice(W / 2 - pw / 2 - gx / 2, 620, pw, ph, '🌿 Relaxed', `${ROUNDS} rounds · no timer`, 0,
      () => this.pickPace('relaxed'));
    this.paces.timed = this.choice(W / 2 + pw / 2 + gx / 2, 620, pw, ph, `⏱ ${TIMED_SECONDS} seconds`, 'beat the clock', 0,
      () => this.pickPace('timed'));

    this.pickLevel(settings.difficulty);
    this.pickPace(settings.mode);

    primaryBtn(this, W / 2, H - 62, 340, 66, "Let's Play! 🎉", () => {
      this.scene.start('GameScene', { difficulty: settings.difficulty, mode: settings.mode });
    });
  }

  /** 2×2 sample round: three animals and an apple that wiggles. Tap to hear names. */
  private buildPreview(cx: number, cy: number): void {
    const size = 92, gap = 12;
    PREVIEW.forEach((p, i) => {
      const x = cx + (i % 2 === 0 ? -1 : 1) * (size / 2 + gap / 2);
      const y = cy + (i < 2 ? -1 : 1) * (size / 2 + gap / 2);
      const odd = i === 3;
      const g = this.add.graphics();
      g.fillStyle(C.shadow, 0.12);
      g.fillRoundedRect(-size / 2 + 2, -size / 2 + 5, size, size, 20);
      g.fillStyle(odd ? C.mintBg : C.white, 1);
      g.fillRoundedRect(-size / 2, -size / 2, size, size, 20);
      g.lineStyle(odd ? 4 : 2.5, odd ? C.mint : C.lavender, odd ? 1 : 0.45);
      g.strokeRoundedRect(-size / 2, -size / 2, size, size, 20);
      const t = this.add.text(0, 2, p.emoji, { fontFamily: F.body, fontSize: '52px', padding: { x: 4, y: 8 } }).setOrigin(0.5);
      const c = this.add.container(x, y, [g, t]);
      c.setSize(size, size).setInteractive({ cursor: 'pointer' });
      c.on('pointerdown', () => {
        say(odd ? 'Apple! The apple is a fruit!' : `${p.name}!`);
        this.tweens.add({ targets: t, angle: { from: -12, to: 12 }, yoyo: true, repeat: 1, duration: 90,
          onComplete: () => t.setAngle(0) });
      });
      if (odd) {
        this.tweens.add({ targets: c, scale: 1.08, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.InOut' });
        const hand = this.add.text(x + 40, y + 46, '👆', { fontFamily: F.body, fontSize: '36px' }).setOrigin(0.5);
        this.tweens.add({ targets: hand, y: y + 34, yoyo: true, repeat: -1, duration: 420, ease: 'Sine.InOut' });
      } else {
        this.tweens.add({ targets: c, y: y - 5, yoyo: true, repeat: -1, duration: 900, delay: i * 200, ease: 'Sine.InOut' });
      }
    });
  }

  /** Small section label: plain letters only, so letterSpacing is safe here. */
  private label(x: number, y: number, text: string): void {
    this.add.text(x, y, text, {
      fontFamily: F.body, fontSize: '12px', color: T.sub, fontStyle: 'bold', letterSpacing: 1.5,
    }).setOrigin(0.5);
  }

  private choice(
    cx: number, cy: number, w: number, h: number,
    title: string, sub: string, dots: number, onClick: () => void,
  ): Choice {
    const bg = this.add.graphics();
    const parts: Phaser.GameObjects.GameObject[] = [bg];
    const texts: Phaser.GameObjects.Text[] = [];
    let icon: Phaser.GameObjects.Graphics | undefined;
    if (dots) {
      // Mini grid icon on the left shows 2×2 vs 3×3 without reading.
      icon = this.add.graphics().setPosition(-w / 2 + 38, -6);
      parts.push(icon);
      const t = this.add.text(-w / 2 + 70, -14, title, { fontFamily: F.head, fontSize: '24px', color: T.main }).setOrigin(0, 0.5);
      const s = this.add.text(0, 28, sub, { fontFamily: F.body, fontSize: '12px', color: T.sub, fontStyle: 'bold' }).setOrigin(0.5);
      texts.push(t, s);
    } else {
      const t = this.add.text(0, -9, title, { fontFamily: F.head, fontSize: '18px', color: T.main }).setOrigin(0.5);
      const s = this.add.text(0, 13, sub, { fontFamily: F.body, fontSize: '12px', color: T.sub, fontStyle: 'bold' }).setOrigin(0.5);
      texts.push(t, s);
    }
    parts.push(...texts);
    const c = this.add.container(cx, cy, parts);
    c.setSize(w, h).setInteractive({ cursor: 'pointer' });
    c.on('pointerdown', () => {
      onClick();
      this.tweens.add({ targets: c, scale: { from: 0.95, to: 1 }, duration: 200, ease: 'Back.Out' });
    });
    return { bg, texts, icon, w, h, dots };
  }

  private paint(ch: Choice, active: boolean): void {
    const { bg, w, h } = ch;
    bg.clear();
    if (active) {
      bg.fillStyle(C.shadow, 0.18);
      bg.fillRoundedRect(-w / 2 + 2, -h / 2 + 5, w, h, 20);
      bg.fillStyle(C.pink, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 20);
    } else {
      bg.fillStyle(C.white, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 20);
      bg.lineStyle(2.5, C.lavender, 0.8);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 20);
    }
    ch.texts[0].setColor(active ? T.white : T.main);
    ch.texts[1].setColor(active ? '#fff0f6' : T.sub);
    if (ch.icon && ch.dots) {
      const g = ch.icon, n = ch.dots;
      const span = 34, cell = (span - (n - 1) * 3) / n;
      g.clear();
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          const isOdd = r === n - 1 && c === n - 1;
          g.fillStyle(isOdd ? (active ? 0xfff59d : C.mint) : (active ? C.white : C.lavender), isOdd ? 1 : active ? 0.95 : 0.7);
          g.fillRoundedRect(-span / 2 + c * (cell + 3), -span / 2 + r * (cell + 3), cell, cell, 3);
        }
      }
    }
  }

  private pickLevel(d: Difficulty): void {
    settings.difficulty = d;
    this.paint(this.levels.easy, d === 'easy');
    this.paint(this.levels.hard, d === 'hard');
  }

  private pickPace(m: PlayMode): void {
    settings.mode = m;
    this.paint(this.paces.relaxed, m === 'relaxed');
    this.paint(this.paces.timed, m === 'timed');
  }
}
