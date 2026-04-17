import Phaser from 'phaser';
import { drawBg, launchConfetti } from '@shared/phaserUtils';
import { createEndPopup } from '@shared/endPopup';
import { C, T, F, GAME_DURATION } from '@shared/theme';
import { sounds } from '@shared/audio';
import { shuffle } from '@shared/utils';
import {
  EASY_PALETTE, HARD_RAMP, CONFETTI_EMOJIS,
  type Difficulty,
} from '../data';
import { randomTarget, perturb, hsvToHex, type HSV } from '../hsv';

const W = 420, H = 780;

// Question card
const CARD    = { x: 24, y: 92,  w: W - 48, h: 250, r: 28 };
const SWATCH  = { w: 280, h: 128, r: 22, y: CARD.y + 98 };
const CAPTION = { y: CARD.y + 196 };

// Answer grid (2×2)
const GRID_TOP = CARD.y + CARD.h + 44;          // y=386
const TILE     = { w: (W - 24 * 2 - 16) / 2, h: 128, r: 22 };
const GAP      = 16;

// Streak line
const STREAK_Y = CARD.y + CARD.h + 16;

const TIERS = { gold: 60, silver: 40, bronze: 20 };

interface Tile {
  bg: Phaser.GameObjects.Graphics;
  zone: Phaser.GameObjects.Zone;
  hex: number;
}

export class GameScene extends Phaser.Scene {
  private difficulty: Difficulty = 'easy';
  private score = 0;
  private streak = 0;
  private timeLeft = GAME_DURATION;
  private answering = false;
  private targetHex = 0xffffff;
  private hardStreak = 0;                 // only counts in hard mode
  private lastEasyIdx = -1;

  private scoreTxt!: Phaser.GameObjects.Text;
  private timerTxt!: Phaser.GameObjects.Text;
  private progressFill!: Phaser.GameObjects.Graphics;
  private streakTxt!: Phaser.GameObjects.Text;
  private targetSwatch!: Phaser.GameObjects.Graphics;
  private tiles: Tile[] = [];
  private endOverlay!: ReturnType<typeof createEndPopup>;
  private timerEvent!: Phaser.Time.TimerEvent;

  constructor() { super('GameScene'); }

  init(data: { difficulty?: Difficulty }): void {
    this.difficulty = data?.difficulty ?? 'easy';
  }

  create(): void {
    drawBg(this);
    this.score = 0;
    this.streak = 0;
    this.hardStreak = 0;
    this.timeLeft = GAME_DURATION;
    this.answering = false;
    this.lastEasyIdx = -1;

    this.buildHeader();
    this.buildQuestionCard();
    this.buildStreakLine();
    this.buildAnswerGrid();
    this.buildEndOverlay();

    this.timerEvent = this.time.addEvent({
      delay: 1000, callback: this.tick, callbackScope: this,
      repeat: GAME_DURATION - 1,
    });

    this.nextQuestion();
  }

  // ─── Header ─────────────────────────────────────────────────────────────

  private buildHeader(): void {
    const modeDot = this.difficulty === 'hard' ? '🔥' : '🌱';
    this.add.text(24, 34, `🎨 Colour Match ${modeDot}`, {
      fontFamily: F.head, fontSize: '18px', color: T.main,
    }).setOrigin(0, 0.5);

    this.pill(W - 178, 34, 88, 34);
    this.scoreTxt = this.add.text(W - 178, 34, '⭐ 0', {
      fontFamily: F.head, fontSize: '16px', color: T.main,
    }).setOrigin(0.5);

    this.pill(W - 74, 34, 100, 34);
    this.timerTxt = this.add.text(W - 74, 34, `⏱ ${GAME_DURATION}s`, {
      fontFamily: F.head, fontSize: '16px', color: T.main,
    }).setOrigin(0.5);

    // progress bar
    const track = this.add.graphics();
    track.fillStyle(0xce93d8, 0.25);
    track.fillRoundedRect(24, 62, W - 48, 6, 3);
    this.progressFill = this.add.graphics();
    this.drawProgress(1);
  }

  private pill(cx: number, cy: number, w: number, h: number): void {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
    g.lineStyle(1.5, C.lavender, 0.35);
    g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
  }

  private drawProgress(ratio: number): void {
    this.progressFill.clear();
    this.progressFill.fillStyle(C.pink, 1);
    this.progressFill.fillRoundedRect(24, 62, Math.max(0, (W - 48) * ratio), 6, 3);
  }

  // ─── Question card ─────────────────────────────────────────────────────

  private buildQuestionCard(): void {
    const card = this.add.graphics();
    card.fillStyle(C.white, 1);
    card.fillRoundedRect(CARD.x, CARD.y, CARD.w, CARD.h, CARD.r);

    this.add.text(W / 2, CARD.y + 28, 'MATCH THIS COLOUR', {
      fontFamily: F.body, fontSize: '12px', color: T.sub,
      fontStyle: 'bold', letterSpacing: 1.5,
    }).setOrigin(0.5);

    this.targetSwatch = this.add.graphics();

    this.add.text(W / 2, CAPTION.y, 'Tap the matching swatch below', {
      fontFamily: F.body, fontSize: '13px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  private drawTarget(hex: number): void {
    this.targetSwatch.clear();
    this.targetSwatch.fillStyle(hex, 1);
    this.targetSwatch.fillRoundedRect(W / 2 - SWATCH.w / 2, SWATCH.y - SWATCH.h / 2, SWATCH.w, SWATCH.h, SWATCH.r);
    this.targetSwatch.lineStyle(3, 0xffffff, 0.7);
    this.targetSwatch.strokeRoundedRect(W / 2 - SWATCH.w / 2, SWATCH.y - SWATCH.h / 2, SWATCH.w, SWATCH.h, SWATCH.r);
  }

  // ─── Streak ribbon ─────────────────────────────────────────────────────

  private buildStreakLine(): void {
    this.streakTxt = this.add.text(W / 2, STREAK_Y, '', {
      fontFamily: F.head, fontSize: '14px', color: T.sub,
    }).setOrigin(0.5);
  }

  // ─── Answer grid ───────────────────────────────────────────────────────

  private buildAnswerGrid(): void {
    this.tiles = [0, 1, 2, 3].map(i => {
      const col = i % 2, row = Math.floor(i / 2);
      const cx = 24 + col * (TILE.w + GAP) + TILE.w / 2;
      const cy = GRID_TOP + row * (TILE.h + GAP) + TILE.h / 2;

      const bg = this.add.graphics().setPosition(cx, cy);
      this.drawTile(bg, 0xffffff, 'idle');

      const zone = this.add.zone(cx, cy, TILE.w, TILE.h).setInteractive({ cursor: 'pointer' });
      zone.on('pointerdown', () => this.onAnswer(i));
      zone.on('pointerover', () => {
        if (!this.answering) this.drawTile(bg, this.tiles[i].hex, 'hover');
      });
      zone.on('pointerout', () => {
        if (!this.answering) this.drawTile(bg, this.tiles[i].hex, 'idle');
      });

      return { bg, zone, hex: 0xffffff };
    });
  }

  private drawTile(
    g: Phaser.GameObjects.Graphics,
    fill: number,
    state: 'idle' | 'hover' | 'correct' | 'wrong',
  ): void {
    g.clear();
    const w = TILE.w, h = TILE.h, r = TILE.r;
    // frame
    let border = 0xffffff;
    let borderAlpha = 0.9;
    let shadow = false;
    switch (state) {
      case 'hover':   border = 0xf06292; borderAlpha = 1; break;
      case 'correct': border = 0x66bb6a; borderAlpha = 1; shadow = true; break;
      case 'wrong':   border = 0xef5350; borderAlpha = 1; break;
    }
    if (shadow) {
      g.fillStyle(0x66bb6a, 0.18);
      g.fillRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, r + 4);
    }
    g.fillStyle(fill, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    g.lineStyle(4, border, borderAlpha);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
  }

  // ─── Round logic ───────────────────────────────────────────────────────

  private nextQuestion(): void {
    this.answering = false;

    const options = this.difficulty === 'hard'
      ? this.generateHardOptions()
      : this.generateEasyOptions();

    this.targetHex = options.correct;
    this.drawTarget(this.targetHex);

    const ordered = shuffle([options.correct, ...options.distractors]);
    this.tiles.forEach((t, i) => {
      t.hex = ordered[i];
      this.drawTile(t.bg, t.hex, 'idle');
      t.zone.setInteractive({ cursor: 'pointer' });
    });
  }

  private generateEasyOptions(): { correct: number; distractors: number[] } {
    // Pick a correct colour that isn't the same as last round, then 3 distractors
    // from the remaining anchor palette.
    let idx: number;
    do { idx = Math.floor(Math.random() * EASY_PALETTE.length); }
    while (idx === this.lastEasyIdx && EASY_PALETTE.length > 1);
    this.lastEasyIdx = idx;

    const correct = EASY_PALETTE[idx];
    const rest = EASY_PALETTE.filter((_, i) => i !== idx);
    const distractors = shuffle(rest).slice(0, 3);
    return { correct, distractors };
  }

  private generateHardOptions(): { correct: number; distractors: number[] } {
    const target: HSV = randomTarget();
    const range = this.currentHardRange();
    const distractors = [perturb(target, range), perturb(target, range), perturb(target, range)];
    return {
      correct: hsvToHex(target),
      distractors: distractors.map(hsvToHex),
    };
  }

  /** Shrink wiggle-room by `hardStreak * perStep`, floored. */
  private currentHardRange(): { h: number; s: number; v: number } {
    const step = this.hardStreak;
    return {
      h: Math.max(HARD_RAMP.floor.h, HARD_RAMP.initial.h - step * HARD_RAMP.perStep.h),
      s: Math.max(HARD_RAMP.floor.s, HARD_RAMP.initial.s - step * HARD_RAMP.perStep.s),
      v: Math.max(HARD_RAMP.floor.v, HARD_RAMP.initial.v - step * HARD_RAMP.perStep.v),
    };
  }

  private onAnswer(idx: number): void {
    if (this.answering) return;
    this.answering = true;

    const tile = this.tiles[idx];
    const isCorrect = tile.hex === this.targetHex;
    this.tiles.forEach(t => t.zone.disableInteractive());

    if (isCorrect) {
      this.drawTile(tile.bg, tile.hex, 'correct');
      this.tweens.add({
        targets: tile.bg, scale: { from: 1, to: 1.06 },
        yoyo: true, duration: 180, ease: 'Sine.InOut',
      });
      this.streak++;
      if (this.difficulty === 'hard') this.hardStreak++;
      this.score += this.streak >= 3 ? 15 : 10;
      this.scoreTxt.setText(`⭐ ${this.score}`);

      if (this.streak >= 3) {
        sounds.streak();
        this.streakTxt.setText(`🔥 ${this.streak} in a row!  +15`).setColor('#f06292');
      } else if (this.streak === 2) {
        sounds.correct();
        this.streakTxt.setText('✨ One more for a streak!').setColor(T.sub);
      } else {
        sounds.correct();
        this.streakTxt.setText('').setColor(T.sub);
      }

      this.time.delayedCall(700, () => this.nextQuestion());
    } else {
      this.drawTile(tile.bg, tile.hex, 'wrong');
      this.streak = 0;
      if (this.difficulty === 'hard') this.hardStreak = 0;   // reset ramp
      sounds.wrong();
      this.streakTxt.setText('').setColor(T.sub);

      // Highlight the correct tile
      this.tiles.forEach(t => {
        if (t.hex === this.targetHex) this.drawTile(t.bg, t.hex, 'correct');
      });
      this.tweens.add({ targets: tile.bg, x: tile.bg.x - 6, yoyo: true, repeat: 3, duration: 55 });

      this.time.delayedCall(1000, () => this.nextQuestion());
    }
  }

  // ─── Timer / end ───────────────────────────────────────────────────────

  private tick(): void {
    this.timeLeft--;
    this.timerTxt.setText(`⏱ ${this.timeLeft}s`);
    if (this.timeLeft <= 10) this.timerTxt.setColor(T.red);
    this.drawProgress(this.timeLeft / GAME_DURATION);
    if (this.timeLeft <= 0) this.endGame();
  }

  private buildEndOverlay(): void {
    this.endOverlay = createEndPopup(this, W, H, {
      onPlayAgain: () => this.scene.restart({ difficulty: this.difficulty }),
      onHome:      () => this.scene.start('TitleScene'),
      onAllGames:  () => { window.location.href = '../'; },
    });
  }

  private endGame(): void {
    this.timerEvent.remove();
    this.tiles.forEach(t => t.zone.disableInteractive());
    sounds.end();

    const s = this.score;
    let emoji: string, title: string, subtitle: string, stars: number;
    if (s >= TIERS.gold)        { emoji = '🏆'; title = 'Colour Master!';    subtitle = 'Aya sees every shade! 🌈✨';         stars = 3; }
    else if (s >= TIERS.silver) { emoji = '🌟'; title = 'Brilliant, Aya!';   subtitle = "You're a colour superstar! 🎨";      stars = 3; }
    else if (s >= TIERS.bronze) { emoji = '🎀'; title = 'Well done, Aya!';   subtitle = 'Great matching! 💖';                 stars = 2; }
    else                        { emoji = '🌸'; title = 'Nice try, Aya!';    subtitle = "Let's match more colours! 🌺";       stars = 1; }

    this.endOverlay.show({
      emoji, title, subtitle,
      score: { value: s, label: `Points · ${this.difficulty}` },
      stars: { earned: stars },
    });
    if (s >= TIERS.silver) launchConfetti(this, CONFETTI_EMOJIS);
  }
}
