import Phaser from 'phaser';
import { drawBg, primaryBtn } from '@shared/phaserUtils';
import { playTone } from '@shared/audio';
import { C, T, F } from '@shared/theme';
import { GRID_SIZES, type GridSize } from '../data';
import { drawCardBack, drawCardFront, radiusFor, say } from '../cards';

const W = 480, H = 820;
const STORE_KEY = 'aya-flip-size';

function loadSize(): number {
  try {
    const i = Number(localStorage.getItem(STORE_KEY));
    return Number.isInteger(i) && i >= 0 && i < GRID_SIZES.length ? i : 0;
  } catch { return 0; }
}

export class TitleScene extends Phaser.Scene {
  private selected = 0;

  constructor() { super('TitleScene'); }

  create(): void {
    drawBg(this);
    this.selected = loadSize();

    this.add.text(W / 2, 86, 'Aya\'s Flip\n& Match', {
      fontFamily: F.head, fontSize: '50px', color: T.main, align: 'center', lineSpacing: -6,
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);

    this.add.text(W / 2, 170, 'Turn the cards, find two the same!', {
      fontFamily: F.body, fontSize: '17px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);

    this.buildHero();

    this.add.text(W / 2, 392, 'How many cards?', {
      fontFamily: F.head, fontSize: '20px', color: T.main,
    }).setOrigin(0.5);

    this.buildSizeTiles();

    primaryBtn(this, W / 2, H - 76, 360, 72, "Let's Play! 🎉", () => {
      const size: GridSize = GRID_SIZES[this.selected];
      this.scene.start('GameScene', { size });
    });
  }

  /** A face-down card that keeps peeking, next to a matched pair. */
  private buildHero(): void {
    const cw = 92, ch = 110, y = 278;
    const xs = [W / 2 - 112, W / 2, W / 2 + 112];

    const mk = (x: number, front: string | null, matched = false) => {
      const g = this.add.graphics();
      const t = this.add.text(0, 0, front ?? '🍓', { fontFamily: F.body, fontSize: '54px', padding: { top: 6, bottom: 6 } })
        .setOrigin(0.5).setVisible(!!front);
      if (front) drawCardFront(g, cw, ch, matched); else drawCardBack(g, cw, ch);
      return { c: this.add.container(x, y, [g, t]), g, t };
    };
    const peeker = mk(xs[0], null);
    const a = mk(xs[1], '🐰', true);
    const b = mk(xs[2], '🐰', true);
    a.c.setAngle(-4); b.c.setAngle(5);
    [peeker.c, a.c, b.c].forEach((c, i) => this.tweens.add({
      targets: c, y: y - 8, yoyo: true, repeat: -1, duration: 950, ease: 'Sine.InOut', delay: i * 220,
    }));
    this.add.text(xs[1] + 56, y - 66, '💖', { fontFamily: F.body, fontSize: '26px' }).setOrigin(0.5);

    let up = false;
    this.time.addEvent({
      delay: 1900, loop: true, callback: () => {
        up = !up;
        this.tweens.add({
          targets: peeker.c, scaleX: 0, duration: 120, ease: 'Sine.In',
          onComplete: () => {
            if (up) drawCardFront(peeker.g, cw, ch, false); else drawCardBack(peeker.g, cw, ch);
            peeker.t.setVisible(up);
            this.tweens.add({ targets: peeker.c, scaleX: 1, duration: 200, ease: 'Back.Out' });
          },
        });
      },
    });
  }

  /** Picture tiles: each shows a tiny grid of card backs, so no reading needed. */
  private buildSizeTiles(): void {
    const tw = 134, th = 124, gap = 14;
    const rows = [GRID_SIZES.slice(0, 3), GRID_SIZES.slice(3)];
    const draws: ((on: boolean) => void)[] = [];
    let idx = 0;

    rows.forEach((row, r) => {
      const rowW = row.length * tw + (row.length - 1) * gap;
      row.forEach((size, j) => {
        const i = idx++;
        const x = W / 2 - rowW / 2 + tw / 2 + j * (tw + gap);
        const y = 486 + r * (th + gap);
        const bg = this.add.graphics().setPosition(x, y);
        const mini = this.add.graphics().setPosition(x, y - 14);
        const n = size.cols * size.rows;
        const lbl = this.add.text(x, y + th / 2 - 20, `${n} cards`, {
          fontFamily: F.head, fontSize: '16px', color: T.main,
        }).setOrigin(0.5);

        const draw = (on: boolean) => {
          bg.clear();
          bg.fillStyle(C.shadow, on ? 0.25 : 0.12);
          bg.fillRoundedRect(-tw / 2, -th / 2 + 5, tw, th, 22);
          bg.fillStyle(on ? 0xfff0f6 : C.white, 1);
          bg.fillRoundedRect(-tw / 2, -th / 2, tw, th, 22);
          bg.lineStyle(on ? 4 : 2, on ? C.pink : C.lavender, on ? 1 : 0.6);
          bg.strokeRoundedRect(-tw / 2, -th / 2, tw, th, 22);
          this.drawMiniGrid(mini, size, on);
          lbl.setColor(on ? '#d81b60' : T.main);
          const s = on ? 1.04 : 1;
          [bg, mini, lbl].forEach(o => o.setScale(s));
          mini.setY(y - 14 * s);
          lbl.setY(y + (th / 2 - 20) * s);
        };
        draws.push(draw);
        draw(i === this.selected);

        this.add.zone(x, y, tw + gap, th + gap).setInteractive({ cursor: 'pointer' }).on('pointerdown', () => {
          if (this.selected === i) return;
          this.selected = i;
          try { localStorage.setItem(STORE_KEY, String(i)); } catch { /* private mode */ }
          draws.forEach((d, k) => d(k === i));
          playTone(520 + i * 90, 0.12, 'sine', 0.12);
          say(`${n} cards`);
          this.tweens.add({ targets: [bg, mini, lbl], angle: { from: -3, to: 3 }, duration: 80, yoyo: true, repeat: 1,
            onComplete: () => [bg, mini, lbl].forEach(o => o.setAngle(0)) });
        });
      });
    });
  }

  private drawMiniGrid(g: Phaser.GameObjects.Graphics, size: GridSize, on: boolean): void {
    g.clear();
    const boxW = 84, boxH = 62, gap = 4;
    const cw = Math.min((boxW - gap * (size.cols - 1)) / size.cols, (boxH - gap * (size.rows - 1)) / size.rows / 1.2);
    const ch = cw * 1.2;
    const gw = size.cols * cw + (size.cols - 1) * gap;
    const gh = size.rows * ch + (size.rows - 1) * gap;
    for (let r = 0; r < size.rows; r++) {
      for (let c = 0; c < size.cols; c++) {
        const x = -gw / 2 + c * (cw + gap);
        const y = -gh / 2 + r * (ch + gap);
        g.fillStyle(on ? C.pink : C.lavender2, 1);
        g.fillRoundedRect(x, y, cw, ch, Math.max(2, radiusFor(cw, ch)));
        g.fillStyle(0xffd54f, 1);
        g.fillCircle(x + cw / 2, y + ch / 2, Math.max(1.5, cw * 0.16));
      }
    }
  }
}
