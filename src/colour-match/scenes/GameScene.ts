import Phaser from 'phaser';
import { drawBg, launchConfetti } from '@shared/phaserUtils';
import { createEndPopup } from '@shared/endPopup';
import { C, T, F } from '@shared/theme';
import { sounds, playTone } from '@shared/audio';
import { shuffle } from '@shared/utils';
import {
  EASY_PALETTE, HARD_RAMP, CONFETTI_EMOJIS, RELAXED_ROUNDS, TIMED_SECONDS, lastConfig,
  type Difficulty, type Pace, type NamedColour,
} from '../data';
import { randomTarget, perturb, hsvToHex, type HSV } from '../hsv';
import { drawBuddy, type Mood } from './buddy';
import { say } from '../speech';

const W = 420, H = 780;

// Question card
const CARD = { x: 24, y: 96, w: W - 48, h: 244, r: 30 };
const TARGET = { size: 128, y: CARD.y + 100 };
const LABEL_Y = CARD.y + CARD.h - 42;

// Answer grid (2×2): each cell is a generous tap area around a big buddy.
const CELL = 176;
const TILE_SIZE = 146;
const GRID_GAP = 14;
const GRID_TOP = CARD.y + CARD.h + 22;
const COLS = [W / 2 - (CELL + GRID_GAP) / 2, W / 2 + (CELL + GRID_GAP) / 2];
const ROWS = [GRID_TOP + CELL / 2, GRID_TOP + CELL * 1.5 + GRID_GAP];

const HINT_DELAY = 7000;

interface Option { hex: number; name?: string }

interface Tile {
  c: Phaser.GameObjects.Container;
  g: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  opt: Option;
  tried: boolean;
}

export class GameScene extends Phaser.Scene {
  private difficulty: Difficulty = 'easy';
  private pace: Pace = 'relaxed';

  private rounds = 0;
  private roundIndex = 0;
  private firstTry = 0;
  private matched = 0;
  private missedThisRound = false;
  private answering = false;
  private ended = false;
  private hardStreak = 0;
  private timeLeft = TIMED_SECONDS;
  private lastEasyName = '';

  private target!: Option;
  private easyQueue: NamedColour[] = [];
  private tiles: Tile[] = [];
  private dots: Phaser.GameObjects.Graphics[] = [];
  private foundHexes: number[] = [];

  private targetC!: Phaser.GameObjects.Container;
  private targetG!: Phaser.GameObjects.Graphics;
  private labelC!: Phaser.GameObjects.Container;
  private labelBg!: Phaser.GameObjects.Graphics;
  private labelTxt!: Phaser.GameObjects.Text;
  private shadeTxt!: Phaser.GameObjects.Text;
  private scoreTxt!: Phaser.GameObjects.Text;
  private timerTxt?: Phaser.GameObjects.Text;
  private timeFill?: Phaser.GameObjects.Graphics;
  private hand?: Phaser.GameObjects.Text;
  private hintPulse?: Phaser.Tweens.Tween;
  private idleTimer?: Phaser.Time.TimerEvent;
  private timerEvent?: Phaser.Time.TimerEvent;
  private endOverlay!: ReturnType<typeof createEndPopup>;

  constructor() { super('GameScene'); }

  init(data: { difficulty?: Difficulty; pace?: Pace }): void {
    this.difficulty = data?.difficulty ?? lastConfig.difficulty;
    this.pace = data?.pace ?? lastConfig.pace;
  }

  create(): void {
    drawBg(this);
    // D-005: reset everything that accumulates across visits.
    this.tiles = [];
    this.dots = [];
    this.foundHexes = [];
    this.easyQueue = [];
    this.hand = undefined;
    this.hintPulse = undefined;
    this.idleTimer = undefined;
    this.timerEvent = undefined;
    this.timerTxt = undefined;
    this.timeFill = undefined;

    this.roundIndex = 0;
    this.firstTry = 0;
    this.matched = 0;
    this.hardStreak = 0;
    this.answering = true;
    this.ended = false;
    this.timeLeft = TIMED_SECONDS;
    this.lastEasyName = '';
    this.rounds = this.pace === 'relaxed' ? RELAXED_ROUNDS[this.difficulty] : 0;
    // D-006: queue the correct colours so a relaxed easy game shows each colour once.
    if (this.difficulty === 'easy') this.easyQueue = shuffle(EASY_PALETTE);

    this.buildHeader();
    this.buildQuestionCard();
    this.buildAnswerGrid();

    this.endOverlay = createEndPopup(this, W, H, {
      onPlayAgain: () => this.scene.restart({ difficulty: this.difficulty, pace: this.pace }),
      onHome:      () => this.scene.start('TitleScene'),
      onAllGames:  () => { window.location.href = '../'; },
    });

    if (this.pace === 'timed') {
      this.timerEvent = this.time.addEvent({
        delay: 1000, callback: this.tick, callbackScope: this, repeat: TIMED_SECONDS - 1,
      });
    }

    this.nextQuestion();
  }

  // ─── Header ─────────────────────────────────────────────────────────────

  private buildHeader(): void {
    this.add.text(22, 34, '🎨 Colour Match', {
      fontFamily: F.head, fontSize: '18px', color: T.main,
    }).setOrigin(0, 0.5);

    if (this.pace === 'relaxed') {
      this.pill(W - 66, 34, 100);
      this.scoreTxt = this.add.text(W - 66, 34, '', { fontFamily: F.head, fontSize: '16px', color: T.main }).setOrigin(0.5);

      // One dot per round; each fills with the colour Aya found.
      const n = this.rounds, gap = 30;
      const startX = W / 2 - ((n - 1) * gap) / 2;
      this.dots = Array.from({ length: n }, (_, i) => this.add.graphics().setPosition(startX + i * gap, 74));
      this.renderDots();
    } else {
      this.pill(W - 160, 34, 76);
      this.scoreTxt = this.add.text(W - 160, 34, '', { fontFamily: F.head, fontSize: '16px', color: T.main }).setOrigin(0.5);
      this.pill(W - 66, 34, 92);
      this.timerTxt = this.add.text(W - 66, 34, `⏰ ${TIMED_SECONDS}`, { fontFamily: F.head, fontSize: '16px', color: T.main }).setOrigin(0.5);

      const track = this.add.graphics();
      track.fillStyle(C.lavender, 0.25);
      track.fillRoundedRect(24, 70, W - 48, 8, 4);
      this.timeFill = this.add.graphics();
      this.drawTimeBar(1);
    }
    this.updateScore();
  }

  private pill(cx: number, cy: number, w: number): void {
    const h = 36;
    const g = this.add.graphics();
    g.fillStyle(C.white, 1);
    g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
    g.lineStyle(1.5, C.lavender, 0.45);
    g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
  }

  private updateScore(): void {
    this.scoreTxt.setText(this.pace === 'relaxed' ? `⭐ ${this.firstTry}` : `⭐ ${this.matched}`);
  }

  private renderDots(): void {
    this.dots.forEach((g, i) => {
      g.clear();
      if (i < this.foundHexes.length) {
        g.fillStyle(this.foundHexes[i], 1);
        g.fillCircle(0, 0, 10);
        g.lineStyle(2.5, C.white, 1);
        g.strokeCircle(0, 0, 10);
      } else if (i === this.roundIndex) {
        g.fillStyle(C.pink, 0.2);
        g.fillCircle(0, 0, 12);
        g.lineStyle(2.5, C.pink, 1);
        g.strokeCircle(0, 0, 8);
      } else {
        g.fillStyle(C.white, 0.9);
        g.fillCircle(0, 0, 8);
        g.lineStyle(2, 0xe1bee7, 1);
        g.strokeCircle(0, 0, 8);
      }
    });
  }

  private drawTimeBar(ratio: number): void {
    if (!this.timeFill) return;
    this.timeFill.clear();
    this.timeFill.fillStyle(ratio > 0.34 ? C.pink : 0xffb74d, 1);
    this.timeFill.fillRoundedRect(24, 70, Math.max(8, (W - 48) * ratio), 8, 4);
  }

  // ─── Question card ─────────────────────────────────────────────────────

  private buildQuestionCard(): void {
    const card = this.add.graphics();
    card.fillStyle(C.shadow, 0.12);
    card.fillRoundedRect(CARD.x + 2, CARD.y + 8, CARD.w, CARD.h, CARD.r);
    card.fillStyle(C.white, 1);
    card.fillRoundedRect(CARD.x, CARD.y, CARD.w, CARD.h, CARD.r);
    card.lineStyle(2, C.lavender, 0.45);
    card.strokeRoundedRect(CARD.x, CARD.y, CARD.w, CARD.h, CARD.r);

    this.targetG = this.add.graphics();
    this.targetC = this.add.container(W / 2, TARGET.y, [this.targetG]);
    this.targetC.setSize(TARGET.size + 30, TARGET.size + 30).setInteractive({ cursor: 'pointer' });
    this.targetC.on('pointerdown', () => this.repeatPrompt());

    // Little speaker button: tapping it (or the buddy) says the colour again.
    const spk = this.add.graphics();
    const sx = CARD.x + CARD.w - 38, sy = CARD.y + 38;
    spk.fillStyle(C.bg1, 1);
    spk.fillCircle(sx, sy, 24);
    this.add.text(sx, sy, '🔊', { fontSize: '22px' }).setOrigin(0.5);
    this.add.zone(sx, sy, 64, 64).setInteractive({ cursor: 'pointer' })
      .on('pointerdown', () => this.repeatPrompt());

    // Colour name pill (easy) — filled with the colour itself.
    this.labelBg = this.add.graphics();
    this.labelTxt = this.add.text(0, 0, '', {
      fontFamily: F.head, fontSize: '28px', color: T.white,
    }).setOrigin(0.5);
    this.labelC = this.add.container(W / 2, LABEL_Y, [this.labelBg, this.labelTxt]);

    // Shades prompt (hard).
    this.shadeTxt = this.add.text(W / 2, LABEL_Y, 'Find the same one!', {
      fontFamily: F.head, fontSize: '24px', color: T.main,
    }).setOrigin(0.5).setVisible(false);
  }

  private drawLabel(c: NamedColour): void {
    this.labelTxt.setText(c.name).setColor(c.ink);
    const w = Math.max(150, this.labelTxt.width + 64), h = 50;
    this.labelBg.clear();
    this.labelBg.fillStyle(c.hex, 1);
    this.labelBg.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    this.labelBg.lineStyle(3, C.white, 1);
    this.labelBg.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  }

  // ─── Answer grid ───────────────────────────────────────────────────────

  private buildAnswerGrid(): void {
    for (let i = 0; i < 4; i++) {
      const x = COLS[i % 2], y = ROWS[Math.floor(i / 2)];
      const g = this.add.graphics();
      const c = this.add.container(x, y, [g]);
      c.setSize(CELL, CELL).setInteractive({ cursor: 'pointer' });
      const tile: Tile = { c, g, x, y, opt: { hex: 0xffffff }, tried: false };
      c.on('pointerdown', () => this.onAnswer(tile));
      this.tiles.push(tile);
    }

    if (this.pace === 'relaxed') {
      this.add.text(W / 2, H - 26, 'Tap the buddy with the same colour', {
        fontFamily: F.body, fontSize: '14px', color: T.sub, fontStyle: 'bold',
      }).setOrigin(0.5).setAlpha(0.8);
    }
  }

  private drawTile(t: Tile, mood: Mood = 'smile', glow = false): void {
    drawBuddy(t.g, TILE_SIZE, t.opt.hex, mood, glow);
  }

  // ─── Round logic ───────────────────────────────────────────────────────

  private nextQuestion(): void {
    if (this.ended) return;
    this.missedThisRound = false;
    this.clearHint();

    const { correct, distractors } = this.difficulty === 'hard'
      ? this.generateHardOptions()
      : this.generateEasyOptions();
    this.target = correct;

    // Target buddy pops in.
    drawBuddy(this.targetG, TARGET.size, correct.hex, 'smile');
    this.targetC.setScale(0.6).setAngle(0);
    this.tweens.add({ targets: this.targetC, scale: 1, duration: 360, ease: 'Back.Out' });

    if (this.difficulty === 'easy') {
      const named = EASY_PALETTE.find(c => c.hex === correct.hex)!;
      this.drawLabel(named);
      this.labelC.setVisible(true).setScale(0.7);
      this.tweens.add({ targets: this.labelC, scale: 1, duration: 300, delay: 120, ease: 'Back.Out' });
      this.shadeTxt.setVisible(false);
    } else {
      this.labelC.setVisible(false);
      this.shadeTxt.setVisible(true);
    }

    const ordered = shuffle([correct, ...distractors]);
    this.tiles.forEach((t, i) => {
      t.opt = ordered[i];
      t.tried = false;
      this.drawTile(t);
      t.c.setAlpha(1).setScale(0).setAngle(0).setPosition(t.x, t.y);
      this.tweens.add({ targets: t.c, scale: 1, duration: 340, delay: 160 + i * 70, ease: 'Back.Out' });
    });

    // Accept taps once the tiles have landed.
    this.time.delayedCall(420, () => { if (!this.ended) this.answering = false; });
    this.repeatPrompt();
    if (this.pace === 'relaxed') this.armIdleHint();
    this.renderDots();
  }

  private repeatPrompt(): void {
    if (this.ended || !this.target) return;
    this.tweens.add({
      targets: this.targetC, angle: { from: -8, to: 8 }, yoyo: true, repeat: 1, duration: 110,
      onComplete: () => this.targetC.setAngle(0),
    });
    if (this.target.name) say(this.pace === 'timed' ? `${this.target.name}!` : `Find ${this.target.name}!`);
    else say(this.pace === 'timed' ? 'Find it!' : 'Find the same colour!');
  }

  private generateEasyOptions(): { correct: Option; distractors: Option[] } {
    let pick: NamedColour;
    if (this.pace === 'relaxed') {
      pick = this.easyQueue[this.roundIndex % this.easyQueue.length];
    } else {
      // Timed: endless rounds, just never the same colour twice in a row.
      do { pick = EASY_PALETTE[Math.floor(Math.random() * EASY_PALETTE.length)]; }
      while (pick.name === this.lastEasyName);
    }
    this.lastEasyName = pick.name;
    const others = shuffle(EASY_PALETTE.filter(c => c.name !== pick.name)).slice(0, 3);
    return {
      correct: { hex: pick.hex, name: pick.name },
      distractors: others.map(c => ({ hex: c.hex, name: c.name })),
    };
  }

  private generateHardOptions(): { correct: Option; distractors: Option[] } {
    const target: HSV = randomTarget();
    const range = this.currentHardRange();
    const hexes = new Set<number>([hsvToHex(target)]);
    const distractors: Option[] = [];
    while (distractors.length < 3) {
      const hex = hsvToHex(perturb(target, range));
      if (hexes.has(hex)) continue;
      hexes.add(hex);
      distractors.push({ hex });
    }
    return { correct: { hex: hsvToHex(target) }, distractors };
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

  private onAnswer(tile: Tile): void {
    if (this.answering || this.ended || tile.tried) return;
    this.clearHint();
    if (tile.opt.hex === this.target.hex) this.onCorrect(tile);
    else this.onWrong(tile);
  }

  /** D-007: a wrong tap never ends the round; that buddy just says "oops" and steps back. */
  private onWrong(tile: Tile): void {
    tile.tried = true;
    this.missedThisRound = true;
    if (this.difficulty === 'hard') this.hardStreak = 0;
    playTone(330, 0.16, 'sine', 0.08);
    playTone(294, 0.2, 'sine', 0.07, 0.13);

    this.drawTile(tile, 'oops');
    this.tweens.add({
      targets: tile.c, angle: { from: -9, to: 9 }, yoyo: true, repeat: 2, duration: 80,
      onComplete: () => {
        tile.c.setAngle(0);
        this.drawTile(tile);
        this.tweens.add({ targets: tile.c, alpha: 0.35, scale: 0.88, duration: 260 });
      },
    });

    if (tile.opt.name && this.target.name) say(`That's ${tile.opt.name}. Find ${this.target.name}!`);
    else if (this.pace === 'relaxed') say('Almost! Try another one.');

    if (this.pace === 'relaxed') this.armIdleHint();
  }

  private onCorrect(tile: Tile): void {
    this.answering = true;
    this.idleTimer?.remove();
    this.matched++;
    if (!this.missedThisRound) this.firstTry++;
    if (this.difficulty === 'hard') this.hardStreak++;
    this.updateScore();

    sounds.correct();
    say(this.target.name ? `${this.target.name}! Yay!` : 'Yes! Same colour!');

    this.drawTile(tile, 'happy', true);
    drawBuddy(this.targetG, TARGET.size, this.target.hex, 'happy');
    this.tweens.add({ targets: tile.c, scale: { from: 1, to: 1.12 }, yoyo: true, duration: 200, ease: 'Sine.Out' });
    this.tweens.add({ targets: this.targetC, y: TARGET.y - 16, yoyo: true, duration: 200, ease: 'Sine.Out' });
    this.ring(tile.x, tile.y, this.target.hex);
    this.sparkles(tile.x, tile.y);
    this.tiles.forEach(t => {
      if (t !== tile) this.tweens.add({ targets: t.c, alpha: 0.25, scale: 0.85, duration: 240 });
    });

    if (this.pace === 'relaxed') {
      this.foundHexes.push(this.target.hex);
      this.roundIndex++;
      this.renderDots();
      const dot = this.dots[this.roundIndex - 1];
      if (dot) this.tweens.add({ targets: dot, scale: { from: 1.8, to: 1 }, duration: 380, ease: 'Back.Out' });
      const done = this.roundIndex >= this.rounds;
      this.time.delayedCall(done ? 1300 : 1500, () => (done ? this.endGame() : this.nextQuestion()));
    } else {
      this.time.delayedCall(800, () => this.nextQuestion());
    }
  }

  // ─── Hints & effects ───────────────────────────────────────────────────

  /** After a pause, the right buddy gently pulses and a little hand points at it. */
  private armIdleHint(): void {
    this.idleTimer?.remove();
    this.idleTimer = this.time.delayedCall(HINT_DELAY, () => {
      if (this.ended || this.answering) return;
      const t = this.tiles.find(x => x.opt.hex === this.target.hex);
      if (!t) return;
      this.clearHint();
      this.hand = this.add.text(t.x + 44, t.y + 58, '👆', { fontSize: '46px' }).setOrigin(0.5).setDepth(20);
      this.tweens.add({ targets: this.hand, y: t.y + 42, yoyo: true, repeat: -1, duration: 420, ease: 'Sine.InOut' });
      this.hintPulse = this.tweens.add({ targets: t.c, scale: 1.07, yoyo: true, repeat: -1, duration: 520, ease: 'Sine.InOut' });
      this.repeatPrompt();
    });
  }

  private clearHint(): void {
    this.hand?.destroy();
    this.hand = undefined;
    if (this.hintPulse) {
      const targets = this.hintPulse.targets as Phaser.GameObjects.Container[];
      this.hintPulse.remove();
      targets.forEach(c => c.setScale(1));
      this.hintPulse = undefined;
    }
  }

  private ring(x: number, y: number, color: number): void {
    const g = this.add.graphics().setDepth(5);
    const s = { r: TILE_SIZE / 2, a: 0.85 };
    this.tweens.add({
      targets: s, r: TILE_SIZE * 0.95, a: 0, duration: 620, ease: 'Sine.Out',
      onUpdate: () => { g.clear(); g.lineStyle(6, color, s.a); g.strokeCircle(x, y, s.r); },
      onComplete: () => g.destroy(),
    });
  }

  private sparkles(x: number, y: number): void {
    const emojis = ['✨', '⭐', '🌟', '💖'];
    for (let i = 0; i < 7; i++) {
      const a = (Math.PI * 2 * i) / 7 + Math.random() * 0.4;
      const d = 80 + Math.random() * 30;
      const e = this.add.text(x, y, emojis[i % emojis.length], { fontSize: '26px' }).setOrigin(0.5).setDepth(15);
      this.tweens.add({
        targets: e, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, duration: 750, ease: 'Sine.Out',
        onComplete: () => e.destroy(),
      });
    }
  }

  // ─── Timer / end ───────────────────────────────────────────────────────

  private tick(): void {
    if (this.ended) return;
    this.timeLeft--;
    this.timerTxt?.setText(`⏰ ${this.timeLeft}`);
    if (this.timeLeft <= 5) this.timerTxt?.setColor('#ef6c00');
    this.drawTimeBar(this.timeLeft / TIMED_SECONDS);
    if (this.timeLeft <= 0) this.endGame();
  }

  private endGame(): void {
    if (this.ended) return;
    this.ended = true;
    this.answering = true;
    this.clearHint();
    this.idleTimer?.remove();
    this.timerEvent?.remove();
    this.tiles.forEach(t => t.c.disableInteractive());
    this.targetC.disableInteractive();
    sounds.end();
    launchConfetti(this, CONFETTI_EMOJIS);

    if (this.pace === 'relaxed') {
      const ratio = this.firstTry / this.rounds;
      const stars = ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1;
      const easy = this.difficulty === 'easy';
      say(easy ? 'You found all the colours, Aya!' : 'You matched them all, Aya!');
      this.endOverlay.show({
        emoji: stars === 3 ? '🌈' : '🎨',
        title: stars === 3 ? 'Colour star!' : 'Lovely matching!',
        subtitle: easy ? 'You found every colour, Aya! 💖' : 'Such sharp eyes, Aya! 💖',
        score: { value: `${this.firstTry}/${this.rounds}`, label: 'First-try matches' },
        stars: { earned: stars, total: 3 },
      });
    } else {
      const n = this.matched;
      const stars = n >= 12 ? 3 : n >= 7 ? 2 : 1;
      say(`${n} colours! Well done, Aya!`);
      this.endOverlay.show({
        emoji: stars === 3 ? '🏆' : '🌟',
        title: stars === 3 ? 'Super speedy!' : 'Well done, Aya!',
        subtitle: n === 1 ? 'You matched 1 colour! 🎨' : `You matched ${n} colours! 🎨`,
        score: { value: n, label: `Matches in ${TIMED_SECONDS}s` },
        stars: { earned: stars, total: 3 },
      });
    }
  }
}
