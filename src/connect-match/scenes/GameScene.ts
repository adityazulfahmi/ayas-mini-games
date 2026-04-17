import Phaser from 'phaser';
import { drawBg, launchConfetti } from '@shared/phaserUtils';
import { createEndPopup } from '@shared/endPopup';
import { C, T, F } from '@shared/theme';
import { sounds } from '@shared/audio';
import { shuffle } from '@shared/utils';
import { CONFETTI_EMOJIS, PAIRS, PAIRS_PER_ROUND, ROUND_DURATION_MS, type Pair } from '../data';

const W = 420, H = 780;

const CARD_SIZE = 128;
const CARD_RADIUS = 22;
const EMOJI_SIZE = 78;

const LEFT_CX   = 88;
const RIGHT_CX  = W - 88;
const ROW_Y     = [208, 378, 548];

const BAR_X = 20, BAR_Y = 94, BAR_W = W - 40, BAR_H = 10;

interface Side {
  side: 'L' | 'R';
  index: number;
}

interface CardView {
  key: string;
  emoji: string;
  cx: number;
  cy: number;
  bg: Phaser.GameObjects.Graphics;
  txt: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
  isLocked: boolean;
  isSelected: boolean;
}

export class GameScene extends Phaser.Scene {
  private leftCards: CardView[] = [];
  private rightCards: CardView[] = [];
  private lines: Phaser.GameObjects.Graphics[] = [];
  private selectedLeft: number | null = null;
  private selectedRight: number | null = null;
  private roundPairs: Pair[] = [];
  private roundLocked = 0;
  private matches = 0;
  private elapsedMs = 0;
  private frozen = false;

  private timerTxt!: Phaser.GameObjects.Text;
  private matchTxt!: Phaser.GameObjects.Text;
  private progressBar!: Phaser.GameObjects.Graphics;
  private promptTxt!: Phaser.GameObjects.Text;
  private ticker?: Phaser.Time.TimerEvent;
  private endOverlay!: ReturnType<typeof createEndPopup>;

  constructor() { super('GameScene'); }

  create(): void {
    drawBg(this);
    this.leftCards = [];
    this.rightCards = [];
    this.lines = [];
    this.selectedLeft = null;
    this.selectedRight = null;
    this.roundPairs = [];
    this.roundLocked = 0;
    this.matches = 0;
    this.elapsedMs = 0;
    this.frozen = false;

    this.buildHeader();
    this.buildProgressBar();
    this.buildPrompt();
    this.loadRound();

    this.endOverlay = createEndPopup(this, W, H, {
      onPlayAgain: () => this.scene.restart(),
      onHome:      () => this.scene.start('TitleScene'),
      onAllGames:  () => { window.location.href = '../'; },
    });

    this.ticker = this.time.addEvent({
      delay: 50, loop: true, callback: () => this.tick(),
    });
  }

  // ─── Header (title + timer + matches) ──────────────────────────────────

  private buildHeader(): void {
    this.add.text(W / 2, 28, '🔗 Connect', {
      fontFamily: F.head, fontSize: '22px', color: T.main,
    }).setOrigin(0.5);

    this.pill(76, 62, 120, 36);
    this.timerTxt = this.add.text(76, 62, '⏱ 30s', {
      fontFamily: F.head, fontSize: '16px', color: T.main,
    }).setOrigin(0.5);

    this.pill(W - 76, 62, 120, 36);
    this.matchTxt = this.add.text(W - 76, 62, '💞 0', {
      fontFamily: F.head, fontSize: '16px', color: T.main,
    }).setOrigin(0.5);
  }

  private pill(cx: number, cy: number, w: number, h: number): void {
    const g = this.add.graphics();
    g.fillStyle(C.white, 1);
    g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
    g.lineStyle(1.5, C.lavender, 0.35);
    g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
  }

  private buildProgressBar(): void {
    // Track
    this.add.graphics()
      .fillStyle(0xf3e5f5, 1)
      .fillRoundedRect(BAR_X, BAR_Y, BAR_W, BAR_H, BAR_H / 2);
    this.progressBar = this.add.graphics();
    this.drawProgressBar(1);
  }

  private drawProgressBar(ratio: number): void {
    this.progressBar.clear();
    const w = Math.max(0, BAR_W * ratio);
    if (w <= 0) return;
    const colour = ratio > 0.33 ? C.pink : 0xe53935;
    this.progressBar.fillStyle(colour, 1);
    this.progressBar.fillRoundedRect(BAR_X, BAR_Y, w, BAR_H, BAR_H / 2);
  }

  private buildPrompt(): void {
    this.promptTxt = this.add.text(W / 2, 128, 'Match the friends! 💕', {
      fontFamily: F.body, fontSize: '14px', color: T.sub,
      fontStyle: 'bold', letterSpacing: 1,
    }).setOrigin(0.5);
  }

  // ─── Round lifecycle ───────────────────────────────────────────────────

  private loadRound(): void {
    // Tear down any prior round's views
    this.clearCards();
    this.clearLines();
    this.selectedLeft = null;
    this.selectedRight = null;
    this.roundLocked = 0;

    // Pick 3 distinct pairs at random for this round
    this.roundPairs = shuffle(PAIRS).slice(0, PAIRS_PER_ROUND);

    // Left column: one card per pair in pair order
    // Right column: the same set, shuffled, so rows rarely align with the match
    const rightOrder = shuffle(this.roundPairs);
    for (let i = 0; i < PAIRS_PER_ROUND; i++) {
      this.leftCards.push(this.makeCard(this.roundPairs[i].key, this.roundPairs[i].left,  LEFT_CX,  ROW_Y[i], 'L', i));
      this.rightCards.push(this.makeCard(rightOrder[i].key,      rightOrder[i].right,     RIGHT_CX, ROW_Y[i], 'R', i));
    }

    // Gentle fade-in so the new round feels like a fresh deal
    [...this.leftCards, ...this.rightCards].forEach(card => {
      card.bg.alpha = 0; card.txt.alpha = 0;
      this.tweens.add({ targets: [card.bg, card.txt], alpha: 1, duration: 260, ease: 'Sine.Out' });
    });
  }

  private clearCards(): void {
    [...this.leftCards, ...this.rightCards].forEach(card => {
      card.bg.destroy();
      card.txt.destroy();
      card.zone.destroy();
    });
    this.leftCards = [];
    this.rightCards = [];
  }

  private clearLines(): void {
    this.lines.forEach(l => l.destroy());
    this.lines = [];
  }

  private makeCard(
    key: string, emoji: string,
    cx: number, cy: number,
    side: 'L' | 'R', idx: number,
  ): CardView {
    // Depth 2 keeps cards on top of the connector lines (depth 1).
    const bg = this.add.graphics().setPosition(cx, cy).setDepth(2);
    const txt = this.add.text(cx, cy, emoji, {
      fontFamily: F.body, fontSize: `${EMOJI_SIZE}px`,
    }).setOrigin(0.5).setDepth(2);
    const zone = this.add.zone(cx, cy, CARD_SIZE, CARD_SIZE)
      .setInteractive({ cursor: 'pointer' })
      .setDepth(3);

    const card: CardView = {
      key, emoji, cx, cy, bg, txt, zone,
      isLocked: false, isSelected: false,
    };
    this.paintCard(card, 'idle');

    zone.on('pointerdown', () => this.onTap({ side, index: idx }));
    zone.on('pointerover', () => { if (!card.isLocked && !card.isSelected) this.paintCard(card, 'hover'); });
    zone.on('pointerout',  () => { if (!card.isLocked && !card.isSelected) this.paintCard(card, 'idle');  });

    return card;
  }

  private paintCard(card: CardView, state: 'idle' | 'hover' | 'selected' | 'locked' | 'wrong'): void {
    const { bg } = card;
    bg.clear();
    const half = CARD_SIZE / 2;
    switch (state) {
      case 'idle':
        bg.fillStyle(C.white, 1);
        bg.lineStyle(3, C.lavender, 1);
        break;
      case 'hover':
        bg.fillStyle(C.cream, 1);
        bg.lineStyle(3, C.pink, 0.7);
        break;
      case 'selected':
        bg.fillStyle(C.bg1, 1);
        bg.lineStyle(5, C.pink, 1);
        break;
      case 'locked':
        bg.fillStyle(C.mintBg, 1);
        bg.lineStyle(4, C.mint, 1);
        break;
      case 'wrong':
        bg.fillStyle(0xffebee, 1);
        bg.lineStyle(4, C.red, 1);
        break;
    }
    bg.fillRoundedRect(-half, -half, CARD_SIZE, CARD_SIZE, CARD_RADIUS);
    bg.strokeRoundedRect(-half, -half, CARD_SIZE, CARD_SIZE, CARD_RADIUS);
  }

  // ─── Tap handling ──────────────────────────────────────────────────────

  private onTap(s: Side): void {
    if (this.frozen) return;
    const card = s.side === 'L' ? this.leftCards[s.index] : this.rightCards[s.index];
    if (card.isLocked) return;

    if (s.side === 'L') {
      // Selecting (or re-selecting) a left card swaps the current left selection
      if (this.selectedLeft !== null) {
        const prev = this.leftCards[this.selectedLeft];
        prev.isSelected = false;
        this.paintCard(prev, 'idle');
      }
      if (this.selectedLeft === s.index) {
        // Tapping the same left card deselects it
        this.selectedLeft = null;
      } else {
        this.selectedLeft = s.index;
        card.isSelected = true;
        this.paintCard(card, 'selected');
        this.bump(card);
        sounds.flip();
      }
      return;
    }

    // side === 'R'
    if (this.selectedLeft === null) {
      // Right tapped without a left — give a tiny nudge as feedback
      this.bump(card);
      return;
    }

    const leftCard = this.leftCards[this.selectedLeft];
    const rightCard = card;
    this.evaluatePair(leftCard, rightCard);
  }

  private evaluatePair(leftCard: CardView, rightCard: CardView): void {
    this.frozen = true;
    rightCard.isSelected = true;
    this.paintCard(rightCard, 'selected');
    const line = this.drawLine(leftCard, rightCard, C.pink, 6);

    const isMatch = leftCard.key === rightCard.key;
    this.time.delayedCall(260, () => {
      if (isMatch) this.onMatch(leftCard, rightCard, line);
      else          this.onMiss(leftCard, rightCard, line);
    });
  }

  private onMatch(
    leftCard: CardView, rightCard: CardView,
    previewLine: Phaser.GameObjects.Graphics,
  ): void {
    previewLine.destroy();
    const mintLine = this.drawLine(leftCard, rightCard, C.mint, 8);
    this.lines.push(mintLine);

    leftCard.isLocked = true;
    rightCard.isLocked = true;
    leftCard.isSelected = false;
    rightCard.isSelected = false;
    this.paintCard(leftCard, 'locked');
    this.paintCard(rightCard, 'locked');
    this.bump(leftCard, 1.08);
    this.bump(rightCard, 1.08);

    this.matches++;
    this.roundLocked++;
    this.matchTxt.setText(`💞 ${this.matches}`);
    sounds.match();

    this.selectedLeft = null;
    this.selectedRight = null;

    if (this.roundLocked >= PAIRS_PER_ROUND) {
      // Brief celebration then spawn a fresh round
      this.promptTxt.setText('Yay! All matched! 🎉').setColor('#ec407a');
      this.time.delayedCall(620, () => {
        if (this.ticker) {
          this.promptTxt.setText('Match the friends! 💕').setColor(T.sub);
          this.loadRound();
          this.frozen = false;
        }
      });
      return;
    }

    this.frozen = false;
  }

  private onMiss(
    leftCard: CardView, rightCard: CardView,
    previewLine: Phaser.GameObjects.Graphics,
  ): void {
    // Repaint preview line in red, shake both cards, then fade line away
    previewLine.clear();
    previewLine.lineStyle(7, C.red, 0.95);
    previewLine.beginPath();
    previewLine.moveTo(leftCard.cx, leftCard.cy);
    previewLine.lineTo(rightCard.cx, rightCard.cy);
    previewLine.strokePath();

    this.paintCard(leftCard, 'wrong');
    this.paintCard(rightCard, 'wrong');
    this.shake(leftCard);
    this.shake(rightCard);
    sounds.wrong();

    this.time.delayedCall(520, () => {
      previewLine.destroy();
      leftCard.isSelected = false;
      rightCard.isSelected = false;
      this.paintCard(leftCard, 'idle');
      this.paintCard(rightCard, 'idle');
      this.selectedLeft = null;
      this.selectedRight = null;
      this.frozen = false;
    });
  }

  private drawLine(
    a: CardView, b: CardView,
    colour: number, width: number,
  ): Phaser.GameObjects.Graphics {
    // Lines sit at depth 1 — above the gradient background (depth 0) but
    // below the card faces (depth 2) so the cable visually plugs *into*
    // each card's edge rather than drawing on top of the emoji.
    const g = this.add.graphics().setDepth(1);
    g.lineStyle(width, colour, 0.9);
    g.beginPath();
    g.moveTo(a.cx, a.cy);
    g.lineTo(b.cx, b.cy);
    g.strokePath();
    return g;
  }

  private bump(card: CardView, to = 1.06): void {
    this.tweens.add({
      targets: [card.bg, card.txt],
      scale: { from: 1, to },
      yoyo: true, duration: 140, ease: 'Sine.Out',
    });
  }

  private shake(card: CardView): void {
    const baseX = card.cx;
    this.tweens.add({
      targets: [card.bg, card.txt],
      x: { from: baseX - 6, to: baseX + 6 },
      yoyo: true, repeat: 3, duration: 55,
      onComplete: () => { card.bg.x = baseX; card.txt.x = baseX; },
    });
  }

  // ─── Tick + end ────────────────────────────────────────────────────────

  private tick(): void {
    this.elapsedMs += 50;
    const remaining = Math.max(0, ROUND_DURATION_MS - this.elapsedMs);
    const seconds = Math.ceil(remaining / 1000);
    this.timerTxt.setText(`⏱ ${seconds}s`);
    if (seconds <= 10) this.timerTxt.setColor(T.red);
    this.drawProgressBar(remaining / ROUND_DURATION_MS);
    if (remaining <= 0) this.endGame();
  }

  private endGame(): void {
    if (!this.ticker) return;
    this.ticker.remove();
    this.ticker = undefined;
    this.frozen = true;
    // Disable any outstanding interactivity
    [...this.leftCards, ...this.rightCards].forEach(card => card.zone.disableInteractive());

    sounds.end();
    if (this.matches > 0) launchConfetti(this, CONFETTI_EMOJIS);

    const { emoji, title, subtitle, stars } = tierFor(this.matches);
    this.endOverlay.show({
      emoji, title, subtitle,
      score: { value: this.matches, label: 'Pairs Matched' },
      stars: { earned: stars, total: 3 },
    });
  }
}

function tierFor(matches: number): { emoji: string; title: string; subtitle: string; stars: number } {
  if (matches >= 12) return { emoji: '🎉', title: 'Amazing!',    subtitle: `You matched ${matches} pairs! 🌟`,   stars: 3 };
  if (matches >= 6)  return { emoji: '🌟', title: 'Great job!',  subtitle: `${matches} lovely matches! 🎀`,      stars: 2 };
  if (matches >= 1)  return { emoji: '🌸', title: 'Nice try!',   subtitle: `You matched ${matches}! Keep going 💖`, stars: 1 };
  return              { emoji: '💪', title: 'Keep trying!', subtitle: 'Tap one on each side to match!',         stars: 0 };
}
