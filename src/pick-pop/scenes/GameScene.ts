import Phaser from 'phaser';
import { drawBg, launchConfetti } from '@shared/phaserUtils';
import { createEndPopup } from '@shared/endPopup';
import { C, T, F } from '@shared/theme';
import { sounds } from '@shared/audio';
import { shuffle } from '@shared/utils';
import {
  CONFETTI_EMOJIS, DISTRACTOR_POOLS, OPTIONS_PER_ROUND, TARGETS,
  TOTAL_ROUNDS, type TargetCategory,
} from '../data';

const W = 420, H = 780;

// 2×2 answer grid
const CARD_W = 152;
const CARD_H = 152;
const CARD_GAP = 18;
const GRID_CX = W / 2;
const GRID_TOP_Y = 312;
const ROW_GAP = CARD_H + CARD_GAP;
const COL_GAP = CARD_W + CARD_GAP;
const EMOJI_PX = 86;

// Prompt pill
const PROMPT_Y = 198;

interface AnswerCard {
  bg: Phaser.GameObjects.Graphics;
  txt: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
  cx: number;
  cy: number;
  value: string;
  state: 'idle' | 'correct' | 'wrong';
}

interface RoundData {
  category: TargetCategory;
  correct: string;
  options: string[];
}

export class GameScene extends Phaser.Scene {
  private roundIndex = 0;
  private score = 0;
  private firstTry = true;
  private answered = false;

  private current!: RoundData;
  // Pre-shuffled per-round target categories so categories get spread across
  // the 5 rounds with at most one repeat (4 categories, 5 rounds).
  private roundCategories: TargetCategory[] = [];

  private scoreTxt!: Phaser.GameObjects.Text;
  private progressDots: Phaser.GameObjects.Graphics[] = [];
  private promptBg!: Phaser.GameObjects.Graphics;
  private promptTxt!: Phaser.GameObjects.Text;
  private cards: AnswerCard[] = [];

  private endOverlay!: ReturnType<typeof createEndPopup>;

  constructor() { super('GameScene'); }

  create(): void {
    drawBg(this);

    this.roundIndex = 0;
    this.score = 0;
    this.progressDots = [];
    this.cards = [];
    this.roundCategories = this.makeCategoryQueue();

    this.buildHeader();
    this.buildPrompt();
    this.buildCards();

    this.endOverlay = createEndPopup(this, W, H, {
      onPlayAgain: () => this.scene.restart(),
      onHome:      () => this.scene.start('TitleScene'),
      onAllGames:  () => { window.location.href = '../'; },
    });

    this.loadRound();
  }

  // ─── Header ────────────────────────────────────────────────────────────

  private buildHeader(): void {
    this.add.text(22, 34, '🎯 Pick & Pop', {
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

  // ─── Prompt ───────────────────────────────────────────────────────────

  private buildPrompt(): void {
    this.promptBg = this.add.graphics();
    this.promptTxt = this.add.text(W / 2, PROMPT_Y, '', {
      fontFamily: F.head, fontSize: '24px', color: T.main, align: 'center',
    }).setOrigin(0.5);
  }

  private paintPrompt(): void {
    const cx = W / 2, cy = PROMPT_Y;
    const padX = 24, h = 56;
    const w = Math.max(this.promptTxt.width + padX * 2, 280);
    this.promptBg.clear();
    this.promptBg.fillStyle(C.shadow, 0.14);
    this.promptBg.fillRoundedRect(cx - w / 2 + 2, cy - h / 2 + 6, w, h, h / 2);
    this.promptBg.fillStyle(C.white, 1);
    this.promptBg.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
    this.promptBg.lineStyle(2.5, C.lavender, 0.7);
    this.promptBg.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
  }

  // ─── Cards ────────────────────────────────────────────────────────────

  private buildCards(): void {
    const positions: [number, number][] = [
      [GRID_CX - COL_GAP / 2, GRID_TOP_Y],                    // top-left
      [GRID_CX + COL_GAP / 2, GRID_TOP_Y],                    // top-right
      [GRID_CX - COL_GAP / 2, GRID_TOP_Y + ROW_GAP],          // bottom-left
      [GRID_CX + COL_GAP / 2, GRID_TOP_Y + ROW_GAP],          // bottom-right
    ];
    positions.forEach(([cx, cy]) => {
      const bg = this.add.graphics();
      const txt = this.add.text(cx, cy, '', {
        fontFamily: F.body, fontSize: `${EMOJI_PX}px`,
      }).setOrigin(0.5);
      const zone = this.add.zone(cx, cy, CARD_W, CARD_H).setInteractive({ cursor: 'pointer' });

      const card: AnswerCard = { bg, txt, zone, cx, cy, value: '', state: 'idle' };
      this.cards.push(card);
      this.paintCard(card, 'idle');

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

  private paintCard(card: AnswerCard, state: 'idle' | 'correct' | 'wrong'): void {
    card.state = state;
    const x = card.cx - CARD_W / 2, y = card.cy - CARD_H / 2;
    const g = card.bg;
    g.clear();
    g.fillStyle(C.shadow, 0.18);
    g.fillRoundedRect(x + 2, y + 8, CARD_W, CARD_H, 26);
    if (state === 'correct') {
      g.fillStyle(C.mintBg, 1);
      g.fillRoundedRect(x, y, CARD_W, CARD_H, 26);
      g.lineStyle(3.5, C.mint, 1);
      g.strokeRoundedRect(x, y, CARD_W, CARD_H, 26);
    } else if (state === 'wrong') {
      g.fillStyle(C.white, 0.55);
      g.fillRoundedRect(x, y, CARD_W, CARD_H, 26);
      g.lineStyle(2.5, C.lavender, 0.4);
      g.strokeRoundedRect(x, y, CARD_W, CARD_H, 26);
    } else {
      g.fillStyle(C.white, 1);
      g.fillRoundedRect(x, y, CARD_W, CARD_H, 26);
      g.lineStyle(2.5, C.lavender, 0.85);
      g.strokeRoundedRect(x, y, CARD_W, CARD_H, 26);
    }
  }

  // ─── Round logic ──────────────────────────────────────────────────────

  /**
   * Build a 5-round category sequence. With 4 distinct target categories
   * and 5 rounds, exactly one category will repeat. We shuffle the four
   * unique categories first, then append a random fifth — guaranteeing
   * every category appears at least once.
   */
  private makeCategoryQueue(): TargetCategory[] {
    const all: TargetCategory[] = ['fruit', 'vegetable', 'vehicle', 'animal'];
    const shuffled = shuffle(all);
    const fifth = shuffled[Math.floor(Math.random() * shuffled.length)];
    return [...shuffled, fifth];
  }

  private loadRound(): void {
    this.answered = false;
    this.firstTry = true;
    this.current = this.makeRound(this.roundCategories[this.roundIndex]);
    this.renderDots();

    // Prompt: "<emoji> Find the <CATEGORY>!"
    const t = TARGETS[this.current.category];
    this.promptTxt.setText(`${t.promptIcon}  Find the ${t.label}!`);
    this.paintPrompt();

    // Reset cards and stagger pop-in
    this.cards.forEach((card, i) => {
      card.value = this.current.options[i];
      card.txt.setText(card.value).setScale(0).setAlpha(1);
      this.paintCard(card, 'idle');
      card.zone.setInteractive({ cursor: 'pointer' });
      this.tweens.add({
        targets: card.txt, scale: 1,
        delay: 120 + i * 90, duration: 320, ease: 'Back.Out',
      });
    });
  }

  /**
   * Build a single round: pick the correct item from the target pool, then
   * three distractors — each from a *different* extreme distractor pool —
   * so no two cards on screen feel category-adjacent. Distractor categories
   * are reshuffled per round.
   */
  private makeRound(category: TargetCategory): RoundData {
    const pool = TARGETS[category].items;
    const correct = pool[Math.floor(Math.random() * pool.length)];

    const distractorCategories = shuffle(Object.keys(DISTRACTOR_POOLS))
      .slice(0, OPTIONS_PER_ROUND - 1);
    const distractors = distractorCategories.map(key => {
      const items = DISTRACTOR_POOLS[key];
      return items[Math.floor(Math.random() * items.length)];
    });

    const options = shuffle([correct, ...distractors]);
    return { category, correct, options };
  }

  // ─── Tap handling ─────────────────────────────────────────────────────

  private onCardTap(card: AnswerCard): void {
    if (this.answered || card.state !== 'idle') return;
    if (card.value === this.current.correct) this.handleCorrect(card);
    else this.handleWrong(card);
  }

  private handleWrong(card: AnswerCard): void {
    this.firstTry = false;
    this.paintCard(card, 'wrong');
    card.zone.disableInteractive();
    sounds.wrong();
    // Shake + dim, but the round stays playable so Aya can try again.
    this.tweens.add({
      targets: [card.bg, card.txt],
      x: '+=8',
      duration: 70, yoyo: true, repeat: 3,
      onComplete: () => {
        card.bg.x = 0; card.txt.x = card.cx;
        this.tweens.add({ targets: card.txt, alpha: 0.5, duration: 200 });
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
      if (c === card) {
        this.paintCard(c, 'correct');
        this.tweens.add({ targets: c.txt, scale: 1.18, duration: 220, ease: 'Back.Out' });
      } else if (c.state === 'idle') {
        this.tweens.add({ targets: [c.bg, c.txt], alpha: 0.4, duration: 220 });
      }
    });

    this.popBurst(card.cx, card.cy);

    this.time.delayedCall(900, () => this.nextRound());
  }

  /** Bubble-pop sparkle radiating from the tapped card */
  private popBurst(cx: number, cy: number): void {
    const sparks = ['🫧', '✨', '🎯', '⭐', '💖'];
    for (let i = 0; i < 8; i++) {
      const s = this.add.text(cx, cy, sparks[i % sparks.length], {
        fontFamily: F.body, fontSize: '24px',
      }).setOrigin(0.5).setAlpha(0.95);
      const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.3;
      const dist = 80 + Math.random() * 30;
      this.tweens.add({
        targets: s,
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist - 24,
        alpha: 0,
        scale: { from: 0.4, to: 1.5 },
        duration: 720, ease: 'Cubic.Out',
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
    if (this.score === TOTAL_ROUNDS) {
      return {
        emoji: '🏆', title: 'Perfect Pop!',
        subtitle: 'Aya found every one! 🎯✨',
        score: { value: `${this.score}/${TOTAL_ROUNDS}`, label: 'PICK & POP · PERFECT' },
        stars: { earned: stars, total: 3 },
      };
    }
    if (this.score >= 3) {
      return {
        emoji: '🌟', title: 'Sharp eyes!',
        subtitle: 'So many right picks! 🫧',
        score: { value: `${this.score}/${TOTAL_ROUNDS}`, label: 'PICK & POP' },
        stars: { earned: stars, total: 3 },
      };
    }
    return {
      emoji: '🌸', title: 'Nice try!',
      subtitle: 'Tap the matching one — try again! 💖',
      score: { value: `${this.score}/${TOTAL_ROUNDS}`, label: 'PICK & POP' },
      stars: { earned: stars, total: 3 },
    };
  }
}
