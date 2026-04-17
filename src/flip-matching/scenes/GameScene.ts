import Phaser from 'phaser';
import { drawBg, launchConfetti } from '@shared/phaserUtils';
import { createEndPopup } from '@shared/endPopup';
import { C, T, F } from '@shared/theme';
import { sounds } from '@shared/audio';
import { shuffle, formatTime } from '@shared/utils';
import { POOL, CONFETTI_EMOJIS, type GridSize } from '../data';

const W = 480, H = 820;
const HEADER_TOP = 10;
const HEADER_H = 64;
const STATS_H = 46;
const PROGRESS_H = 8;
const PAD = 14;
const GRID_TOP_GAP = 12;

interface CardState {
  id: number;
  symbol: string;
  bg: Phaser.GameObjects.Graphics;
  frontTxt: Phaser.GameObjects.Text;
  container: Phaser.GameObjects.Container;
  isFlipped: boolean;
  isMatched: boolean;
}

export class GameScene extends Phaser.Scene {
  private cols = 2;
  private rows = 2;
  private cards: CardState[] = [];
  private flipped: CardState[] = [];
  private matchedCount = 0;
  private totalPairs = 0;
  private locked = false;
  private seconds = 0;
  private timerStarted = false;

  private timerEvent!: Phaser.Time.TimerEvent;
  private timerTxt!: Phaser.GameObjects.Text;
  private matchTxt!: Phaser.GameObjects.Text;
  private progressFill!: Phaser.GameObjects.Graphics;
  private progressBarW = 0;
  private progressBarX = 0;
  private progressBarY = 0;
  private endOverlay!: ReturnType<typeof createEndPopup>;

  constructor() { super('GameScene'); }

  init(data: { size?: GridSize }): void {
    if (data?.size) {
      this.cols = data.size.cols;
      this.rows = data.size.rows;
    } else {
      this.cols = 2; this.rows = 2;
    }
  }

  create(): void {
    drawBg(this);
    this.cards = []; this.flipped = [];
    this.matchedCount = 0; this.locked = false;
    this.seconds = 0; this.timerStarted = false;
    this.totalPairs = (this.cols * this.rows) / 2;

    this.buildHeader();
    this.buildGrid();
    this.buildEndOverlay();
  }

  private buildHeader(): void {
    // Main header panel
    const headerY = HEADER_TOP;
    const bg = this.add.graphics();
    bg.fillStyle(C.white, 1);
    bg.fillRoundedRect(PAD, headerY, W - PAD * 2, HEADER_H, 18);

    // Title
    this.add.text(PAD + 18, headerY + HEADER_H / 2, '🌸 Aya\'s Match', {
      fontFamily: F.head, fontSize: '22px', color: T.main,
    }).setOrigin(0, 0.5);

    // Restart button — icon-only circle on the right
    const restartCx = W - PAD - 22;
    const restartCy = headerY + HEADER_H / 2;
    const restartBg = this.add.graphics();
    restartBg.lineStyle(2, C.pink, 1);
    restartBg.fillStyle(C.bg1, 1);
    restartBg.fillCircle(restartCx, restartCy, 18);
    restartBg.strokeCircle(restartCx, restartCy, 18);
    this.add.text(restartCx, restartCy, '↻', {
      fontFamily: F.head, fontSize: '22px', color: T.main,
    }).setOrigin(0.5);
    const restartZone = this.add.zone(restartCx, restartCy, 40, 40).setInteractive({ cursor: 'pointer' });
    restartZone.on('pointerdown', () => this.scene.restart({ size: { cols: this.cols, rows: this.rows } }));

    // Stats pill row: timer · pair counter
    const statsY = headerY + HEADER_H + 8;
    const statsPill = this.add.graphics();
    statsPill.fillStyle(C.white, 0.7);
    statsPill.fillRoundedRect(PAD, statsY, W - PAD * 2, STATS_H, 14);

    this.timerTxt = this.add.text(PAD + 20, statsY + STATS_H / 2, '⏱ 0:00', {
      fontFamily: F.head, fontSize: '20px', color: T.main,
    }).setOrigin(0, 0.5);

    this.matchTxt = this.add.text(W - PAD - 20, statsY + STATS_H / 2, `0 / ${this.totalPairs} pairs`, {
      fontFamily: F.head, fontSize: '18px', color: T.sub,
    }).setOrigin(1, 0.5);

    // Progress bar beneath the stats pill
    const progressY = statsY + STATS_H + 6;
    this.progressBarX = PAD + 4;
    this.progressBarY = progressY;
    this.progressBarW = W - PAD * 2 - 8;
    const progressTrack = this.add.graphics();
    progressTrack.fillStyle(C.lavender, 0.35);
    progressTrack.fillRoundedRect(this.progressBarX, progressY, this.progressBarW, PROGRESS_H, PROGRESS_H / 2);

    this.progressFill = this.add.graphics();
    this.drawProgress(0);
  }

  private drawProgress(frac: number): void {
    this.progressFill.clear();
    const w = Math.max(0, Math.min(1, frac)) * this.progressBarW;
    if (w < 2) return;
    this.progressFill.fillStyle(C.pink, 1);
    this.progressFill.fillRoundedRect(this.progressBarX, this.progressBarY, w, PROGRESS_H, PROGRESS_H / 2);
  }

  private buildGrid(): void {
    const gridTop = HEADER_TOP + HEADER_H + 8 + STATS_H + 6 + PROGRESS_H + GRID_TOP_GAP;
    const gridW = W - PAD * 2;
    const gridH = H - gridTop - PAD;
    const cellW = (gridW - (this.cols - 1) * 10) / this.cols;
    const cellH = (gridH - (this.rows - 1) * 10) / this.rows;
    const cell = Math.min(cellW, cellH);
    const actualGridW = cell * this.cols + 10 * (this.cols - 1);
    const offX = PAD + (gridW - actualGridW) / 2;
    const offY = gridTop; // anchor to top, not centered

    const count = this.totalPairs;
    const symbols = shuffle([...POOL]).slice(0, count);
    const deck = shuffle([...symbols, ...symbols]);

    this.cards = deck.map((sym, i) => {
      const col = i % this.cols;
      const row = Math.floor(i / this.cols);
      const cx = offX + col * (cell + 10) + cell / 2;
      const cy = offY + row * (cell + 10) + cell / 2;

      const bg = this.add.graphics().setPosition(cx, cy);
      this.drawCardBack(bg, cell);

      const frontTxt = this.add.text(cx, cy, sym, {
        fontSize: `${Math.round(cell * 0.52)}px`,
      }).setOrigin(0.5).setVisible(false);

      const container = this.add.container(0, 0);
      const zone = this.add.zone(cx, cy, cell, cell).setInteractive({ cursor: 'pointer' });

      const card: CardState = { id: i, symbol: sym, bg, frontTxt, container, isFlipped: false, isMatched: false };

      zone.on('pointerover', () => {
        if (!card.isFlipped && !card.isMatched && !this.locked) {
          bg.clear();
          this.drawCardBack(bg, cell, true);
        }
      });
      zone.on('pointerout', () => {
        if (!card.isFlipped && !card.isMatched) {
          bg.clear();
          this.drawCardBack(bg, cell, false);
        }
      });
      zone.on('pointerdown', () => this.onCardClick(card, cell));

      return card;
    });
  }

  private drawCardBack(g: Phaser.GameObjects.Graphics, cell: number, hover = false): void {
    g.clear();
    g.fillStyle(hover ? C.pink : C.lavender, 1);
    g.fillRoundedRect(-cell / 2, -cell / 2, cell, cell, Math.round(cell * 0.15));
    g.fillStyle(C.white, 0.35);
    const s = cell * 0.3;
    g.fillRoundedRect(-s / 2, -s / 2, s, s, 4);
  }

  private drawCardFront(g: Phaser.GameObjects.Graphics, cell: number, matched: boolean): void {
    g.clear();
    if (matched) {
      g.fillStyle(C.mintBg, 1);
      g.lineStyle(3, C.mint, 1);
    } else {
      g.fillStyle(C.cream, 1);
    }
    g.fillRoundedRect(-cell / 2, -cell / 2, cell, cell, Math.round(cell * 0.15));
    if (matched) g.strokeRoundedRect(-cell / 2, -cell / 2, cell, cell, Math.round(cell * 0.15));
  }

  private onCardClick(card: CardState, cell: number): void {
    if (this.locked || card.isFlipped || card.isMatched) return;

    if (!this.timerStarted) {
      this.timerStarted = true;
      this.timerEvent = this.time.addEvent({ delay: 1000, callback: this.tick, callbackScope: this, loop: true });
    }

    this.flipCard(card, cell, true, () => {
      this.flipped.push(card);
      if (this.flipped.length === 2) {
        this.locked = true;
        this.checkMatch(cell);
      }
    });
  }

  private flipCard(card: CardState, cell: number, toFront: boolean, onMid?: () => void): void {
    sounds.flip();
    this.tweens.add({
      targets: card.bg,
      scaleX: 0,
      duration: 180,
      ease: 'Quad.In',
      onComplete: () => {
        card.isFlipped = toFront;
        if (toFront) {
          this.drawCardFront(card.bg, cell, false);
          card.frontTxt.setVisible(true);
        } else {
          this.drawCardBack(card.bg, cell);
          card.frontTxt.setVisible(false);
        }
        onMid?.();
        this.tweens.add({ targets: card.bg, scaleX: 1, duration: 180, ease: 'Quad.Out' });
      },
    });
  }

  private checkMatch(cell: number): void {
    const [a, b] = this.flipped;
    if (a.symbol === b.symbol) {
      sounds.match();
      this.time.delayedCall(300, () => {
        [a, b].forEach(c => {
          c.isMatched = true;
          this.drawCardFront(c.bg, cell, true);
          this.tweens.add({ targets: [c.bg, c.frontTxt], scaleX: 1.1, scaleY: 1.1, yoyo: true, duration: 175 });
        });
        this.matchedCount++;
        this.matchTxt.setText(`${this.matchedCount} / ${this.totalPairs} pairs`);
        this.drawProgress(this.matchedCount / this.totalPairs);
        this.flipped = [];
        this.locked = false;
        if (this.matchedCount === this.totalPairs) this.time.delayedCall(400, () => this.onWin());
      });
    } else {
      sounds.noMatch();
      this.time.delayedCall(800, () => {
        this.flipCard(a, cell, false);
        this.flipCard(b, cell, false);
        this.flipped = [];
        this.locked = false;
      });
    }
  }

  private tick(): void {
    this.seconds++;
    this.timerTxt.setText(`⏱ ${formatTime(this.seconds)}`);
  }

  private buildEndOverlay(): void {
    this.endOverlay = createEndPopup(this, W, H, {
      onPlayAgain: () => this.scene.restart({ size: { cols: this.cols, rows: this.rows } }),
      onHome:      () => this.scene.start('TitleScene'),
      onAllGames:  () => { window.location.href = '../'; },
    });
  }

  private onWin(): void {
    if (this.timerEvent) this.timerEvent.remove();
    sounds.win();
    this.endOverlay.show({
      emoji: '🎊',
      title: 'You did it, Aya!',
      subtitle: 'All pairs matched! 🌟',
      score: { value: formatTime(this.seconds), label: 'Your Time' },
      stars: { earned: starsForTime(this.seconds) },
    });
    launchConfetti(this, CONFETTI_EMOJIS);
  }
}

function starsForTime(seconds: number): number {
  if (seconds <= 30) return 3;
  if (seconds <= 60) return 2;
  return 1;
}
