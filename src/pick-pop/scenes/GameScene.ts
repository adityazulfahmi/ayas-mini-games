import Phaser from 'phaser';
import { drawBg, launchConfetti } from '@shared/phaserUtils';
import { createEndPopup } from '@shared/endPopup';
import { C, T, F } from '@shared/theme';
import { sounds } from '@shared/audio';
import { shuffle } from '@shared/utils';
import {
  CONFETTI_EMOJIS, DISTRACTOR_POOLS, OPTIONS_PER_ROUND, PROMPT_VARIANTS,
  TARGETS, TOTAL_ROUNDS, type TargetCategory,
} from '../data';
import { BUBBLE_STYLES, drawBubble, popShockwave, spawnBubbleField } from './bubbles';

const W = 420, H = 780;

const CARD_W = 152;
const CARD_H = 152;
const CARD_R = 60;
const CARD_GAP = 18;
const GRID_CX = W / 2;
const GRID_TOP_Y = 318;
const ROW_GAP = CARD_H + CARD_GAP;
const COL_GAP = CARD_W + CARD_GAP;
const EMOJI_PX = 86;

const PROMPT_Y = 198;

interface AnswerCard {
  bg: Phaser.GameObjects.Graphics;
  txt: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
  idleBob?: Phaser.Tweens.Tween;
  cx: number;
  cy: number;
  value: string;
  state: 'idle' | 'correct' | 'wrong';
}

interface RoundData {
  correct: string;
  options: string[];
}

interface SceneInit { category?: TargetCategory }

export class GameScene extends Phaser.Scene {
  private category: TargetCategory = 'fruit';
  private roundIndex = 0;
  private score = 0;
  private firstTry = true;
  private answered = false;

  private current!: RoundData;
  /**
   * Pre-shuffled correct-answer queue: 5 distinct items from the chosen
   * category's pool. Aya never sees the same fruit (or animal, etc.)
   * twice in a single playthrough.
   */
  private correctQueue: string[] = [];

  private scoreTxt!: Phaser.GameObjects.Text;
  private headerTitleTxt!: Phaser.GameObjects.Text;
  private progressDots: Phaser.GameObjects.Graphics[] = [];
  private promptBg!: Phaser.GameObjects.Graphics;
  private promptTxt!: Phaser.GameObjects.Text;
  private cards: AnswerCard[] = [];

  private endOverlay!: ReturnType<typeof createEndPopup>;

  constructor() { super('GameScene'); }

  init(data: SceneInit): void {
    this.category = data?.category ?? 'fruit';
  }

  create(): void {
    drawBg(this);
    spawnBubbleField(this, W, H, 12);

    this.roundIndex = 0;
    this.score = 0;
    this.progressDots = [];
    this.cards = [];

    const pool = TARGETS[this.category].items;
    // 5 distinct correct answers from the chosen category's pool. Pools
    // are sized ≥8 so this never under-supplies.
    this.correctQueue = shuffle(pool).slice(0, TOTAL_ROUNDS);

    this.buildHeader();
    this.buildPrompt();
    this.buildCards();

    this.endOverlay = createEndPopup(this, W, H, {
      onPlayAgain: () => this.scene.restart({ category: this.category }),
      onHome:      () => this.scene.start('TitleScene'),
      onAllGames:  () => { window.location.href = '../'; },
    });

    this.loadRound();
  }

  // ─── Header ────────────────────────────────────────────────────────────

  private buildHeader(): void {
    const t = TARGETS[this.category];
    this.headerTitleTxt = this.add.text(22, 34, `${t.promptIcon} ${t.label}`, {
      fontFamily: F.head, fontSize: '17px', color: T.main,
    }).setOrigin(0, 0.5);

    this.pill(W - 70, 34, 108, 34);
    this.scoreTxt = this.add.text(W - 70, 34, `⭐ 0/${TOTAL_ROUNDS}`, {
      fontFamily: F.head, fontSize: '15px', color: T.main,
    }).setOrigin(0.5);

    const dotGap = 10, dotSize = 12;
    const totalW = TOTAL_ROUNDS * dotSize + (TOTAL_ROUNDS - 1) * dotGap;
    const startX = W / 2 - totalW / 2 + dotSize / 2;
    this.progressDots = Array.from({ length: TOTAL_ROUNDS }, (_, i) =>
      this.add.graphics().setPosition(startX + i * (dotSize + dotGap), 76),
    );
    this.renderDots();
  }

  private pill(cx: number, cy: number, w: number, h: number): void {
    const g = this.add.graphics();
    g.fillStyle(C.white, 1);
    g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
    g.lineStyle(1.5, C.lavender, 0.4);
    g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
  }

  private renderDots(): void {
    this.progressDots.forEach((g, i) => {
      g.clear();
      if (i < this.roundIndex) {
        g.fillStyle(C.mint, 1); g.fillCircle(0, 0, 6);
      } else if (i === this.roundIndex) {
        g.fillStyle(C.pink, 1); g.fillCircle(0, 0, 7);
      } else {
        g.fillStyle(C.lavender, 0.45); g.fillCircle(0, 0, 5);
      }
    });
  }

  // ─── Prompt (speech bubble) ───────────────────────────────────────────

  private buildPrompt(): void {
    this.promptBg = this.add.graphics();
    this.promptTxt = this.add.text(W / 2, PROMPT_Y, '', {
      fontFamily: F.head, fontSize: '24px', color: T.main, align: 'center',
    }).setOrigin(0.5);
  }

  private paintPrompt(): void {
    const cx = W / 2, cy = PROMPT_Y;
    const padX = 24, h = 60;
    const w = Math.max(this.promptTxt.width + padX * 2, 280);
    const x = cx - w / 2, y = cy - h / 2;
    this.promptBg.clear();
    this.promptBg.fillStyle(C.shadow, 0.18);
    this.promptBg.fillRoundedRect(x + 2, y + 8, w, h, h / 2);
    this.promptBg.fillStyle(C.white, 1);
    this.promptBg.fillRoundedRect(x, y, w, h, h / 2);
    this.promptBg.lineStyle(2.5, C.lavender, 0.7);
    this.promptBg.strokeRoundedRect(x, y, w, h, h / 2);
    // Gloss highlight along top
    this.promptBg.fillStyle(C.white, 0.6);
    this.promptBg.fillEllipse(x + w * 0.5, y + h * 0.22, w * 0.78, h * 0.30);
    // Speech-bubble tail pointing at the grid
    this.promptBg.fillStyle(C.white, 1);
    this.promptBg.fillTriangle(cx - 10, y + h - 1, cx + 10, y + h - 1, cx, y + h + 12);
    this.promptBg.lineStyle(2.5, C.lavender, 0.7);
    this.promptBg.lineBetween(cx - 10, y + h - 1, cx, y + h + 12);
    this.promptBg.lineBetween(cx + 10, y + h - 1, cx, y + h + 12);
    this.promptBg.fillStyle(C.white, 1);
    this.promptBg.fillRect(cx - 9, y + h - 2, 18, 3);
  }

  // ─── Cards (bubbles) ───────────────────────────────────────────────────

  private buildCards(): void {
    const positions: [number, number][] = [
      [GRID_CX - COL_GAP / 2, GRID_TOP_Y],
      [GRID_CX + COL_GAP / 2, GRID_TOP_Y],
      [GRID_CX - COL_GAP / 2, GRID_TOP_Y + ROW_GAP],
      [GRID_CX + COL_GAP / 2, GRID_TOP_Y + ROW_GAP],
    ];
    positions.forEach(([cx, cy], i) => {
      const bg = this.add.graphics();
      const txt = this.add.text(cx, cy, '', {
        fontFamily: F.body, fontSize: `${EMOJI_PX}px`,
      }).setOrigin(0.5);
      const zone = this.add.zone(cx, cy, CARD_W, CARD_H).setInteractive({ cursor: 'pointer' });

      const card: AnswerCard = { bg, txt, zone, cx, cy, value: '', state: 'idle' };
      this.cards.push(card);
      this.paintCardState(card);
      this.startIdleBob(card, i);

      zone.on('pointerdown', () => this.onCardTap(card));
      zone.on('pointerover', () => {
        if (card.state !== 'idle') return;
        this.tweens.add({ targets: card.txt, scale: 1.06, duration: 140 });
      });
      zone.on('pointerout', () => {
        if (card.state !== 'idle') return;
        this.tweens.add({ targets: card.txt, scale: 1, duration: 140 });
      });
    });
  }

  private startIdleBob(card: AnswerCard, i: number): void {
    card.idleBob?.stop();
    card.idleBob = this.tweens.add({
      targets: [card.bg, card.txt],
      y: '+=6',
      duration: 1700 + i * 160,
      delay: i * 200,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    });
  }

  private paintCardState(card: AnswerCard): void {
    drawBubble(card.bg, card.cx, card.cy, CARD_W, CARD_H, CARD_R, BUBBLE_STYLES[card.state]);
  }

  // ─── Round logic ──────────────────────────────────────────────────────

  private loadRound(): void {
    this.answered = false;
    this.firstTry = true;
    this.current = this.makeRound();
    this.renderDots();

    // Prompt phrasing rotates by round so the screen stays fresh.
    const t = TARGETS[this.category];
    const variant = PROMPT_VARIANTS[this.roundIndex % PROMPT_VARIANTS.length];
    const text = variant.replace('{LABEL}', t.label);
    this.promptTxt.setText(`${t.promptIcon}  ${text}`);
    this.paintPrompt();

    this.cards.forEach((card, i) => {
      card.value = this.current.options[i];
      card.txt.setText(card.value).setScale(0).setAlpha(1);
      card.state = 'idle';
      this.paintCardState(card);
      card.zone.setInteractive({ cursor: 'pointer' });
      this.startIdleBob(card, i);
      this.tweens.add({
        targets: card.txt, scale: 1,
        delay: 120 + i * 90, duration: 320, ease: 'Back.Out',
      });
    });
  }

  /**
   * Build a single round: pull the correct from the queue, plus three
   * distractors — one each from three different distractor pools, after
   * filtering out any pools the target has explicitly excluded. The
   * exclusion list lives on TARGETS so the policy is data-driven, not
   * hard-coded into the round generator.
   */
  private makeRound(): RoundData {
    const t = TARGETS[this.category];
    const correct = this.correctQueue[this.roundIndex];
    const excluded = new Set(t.excludedDistractorPools ?? []);
    const pools = Object.keys(DISTRACTOR_POOLS).filter(k => !excluded.has(k));
    const chosenPools = shuffle(pools).slice(0, OPTIONS_PER_ROUND - 1);
    const distractors = chosenPools.map(key => {
      const items = DISTRACTOR_POOLS[key];
      return items[Math.floor(Math.random() * items.length)];
    });
    const options = shuffle([correct, ...distractors]);
    return { correct, options };
  }

  // ─── Tap handling ─────────────────────────────────────────────────────

  private onCardTap(card: AnswerCard): void {
    if (this.answered || card.state !== 'idle') return;
    if (card.value === this.current.correct) this.handleCorrect(card);
    else this.handleWrong(card);
  }

  private handleWrong(card: AnswerCard): void {
    this.firstTry = false;
    card.state = 'wrong';
    this.paintCardState(card);
    card.zone.disableInteractive();
    sounds.wrong();
    card.idleBob?.stop();
    this.tweens.add({
      targets: [card.bg, card.txt],
      angle: { from: -6, to: 6 },
      duration: 90, yoyo: true, repeat: 2,
      onComplete: () => {
        card.bg.angle = 0; card.txt.angle = 0;
        this.tweens.add({
          targets: card.txt, alpha: 0.45, scale: 0.9,
          duration: 220,
        });
      },
    });
  }

  private handleCorrect(card: AnswerCard): void {
    this.answered = true;
    if (this.firstTry) this.score++;
    this.scoreTxt.setText(`⭐ ${this.score}/${TOTAL_ROUNDS}`);
    sounds.correct();

    this.cards.forEach(c => {
      c.zone.disableInteractive();
      c.idleBob?.stop();
      if (c === card) {
        c.state = 'correct';
        this.paintCardState(c);
        this.tweens.add({
          targets: c.txt,
          scale: { from: 1, to: 1.28 },
          duration: 180, ease: 'Back.Out',
          yoyo: true,
          onComplete: () => { c.txt.setScale(1.18); },
        });
        popShockwave(this, c.cx, c.cy, CARD_W * 0.45, CARD_W * 0.95);
      } else if (c.state === 'idle') {
        this.tweens.add({ targets: [c.bg, c.txt], alpha: 0.4, duration: 220 });
      }
    });

    this.popBurst(card.cx, card.cy);
    this.time.delayedCall(950, () => this.nextRound());
  }

  private popBurst(cx: number, cy: number): void {
    const sparks = ['🫧', '✨', '🎯', '⭐', '💖'];
    for (let i = 0; i < 10; i++) {
      const s = this.add.text(cx, cy, sparks[i % sparks.length], {
        fontFamily: F.body, fontSize: '24px',
      }).setOrigin(0.5).setAlpha(0.95);
      const angle = (i / 10) * Math.PI * 2 + Math.random() * 0.3;
      const dist = 80 + Math.random() * 40;
      this.tweens.add({
        targets: s,
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist - 24,
        alpha: 0,
        scale: { from: 0.4, to: 1.55 },
        duration: 760, ease: 'Cubic.Out',
        onComplete: () => s.destroy(),
      });
    }
  }

  // ─── Round / game flow ────────────────────────────────────────────────

  private nextRound(): void {
    this.roundIndex++;
    if (this.roundIndex >= TOTAL_ROUNDS) {
      this.endGame();
      return;
    }
    this.loadRound();
  }

  private endGame(): void {
    sounds.end();
    launchConfetti(this, CONFETTI_EMOJIS);
    this.endOverlay.show(this.endGameData());
  }

  private endGameData(): Parameters<typeof this.endOverlay.show>[0] {
    const stars = this.score >= 5 ? 3 : this.score >= 3 ? 2 : this.score >= 1 ? 1 : 0;
    const t = TARGETS[this.category];
    const labelLine = `${t.label} · PICK & POP`;
    if (this.score === TOTAL_ROUNDS) {
      return {
        emoji: '🏆', title: 'Perfect Pop!',
        subtitle: `Aya popped every ${t.label.toLowerCase()}! 🎯✨`,
        score: { value: `${this.score}/${TOTAL_ROUNDS}`, label: `${labelLine} · PERFECT` },
        stars: { earned: stars, total: 3 },
      };
    }
    if (this.score >= 3) {
      return {
        emoji: '🌟', title: 'Sharp eyes!',
        subtitle: 'So many right picks! 🫧',
        score: { value: `${this.score}/${TOTAL_ROUNDS}`, label: labelLine },
        stars: { earned: stars, total: 3 },
      };
    }
    return {
      emoji: '🌸', title: 'Nice try!',
      subtitle: 'Tap the matching one — try again! 💖',
      score: { value: `${this.score}/${TOTAL_ROUNDS}`, label: labelLine },
      stars: { earned: stars, total: 3 },
    };
  }
}
