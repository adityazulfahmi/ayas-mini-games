import Phaser from 'phaser';
import { drawBg, launchConfetti } from '@shared/phaserUtils';
import { createEndPopup } from '@shared/endPopup';
import { C, T, F } from '@shared/theme';
import { sounds, playTone } from '@shared/audio';
import { shuffle } from '@shared/utils';
import { ANIMALS, CONFETTI_EMOJIS, OPTIONS_PER_ROUND, TOTAL_ROUNDS, type Animal } from '../data';

const W = 420, H = 780;

const SPEAKER_CX = W / 2;
const SPEAKER_CY = 220;
const SPEAKER_R  = 86;

const CARD_SIZE   = 148;
const CARD_RADIUS = 24;
const EMOJI_SIZE  = 84;
const CARD_CX_L   = 126;
const CARD_CX_R   = W - 126;
const CARD_ROW_Y  = [438, 608];

interface AnimalCard {
  animal: Animal;
  cx: number;
  cy: number;
  bg: Phaser.GameObjects.Graphics;
  txt: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
  isLocked: boolean;
}

export class GameScene extends Phaser.Scene {
  private roundIndex = 0;
  private score = 0;
  private answered = false;
  private currentAnimal!: Animal;
  private options: Animal[] = [];
  private cards: AnimalCard[] = [];

  private speakerBg!: Phaser.GameObjects.Graphics;
  private speakerIcon!: Phaser.GameObjects.Text;
  private speakerCaption!: Phaser.GameObjects.Text;
  private speakerRipple!: Phaser.GameObjects.Graphics;
  private speakerPulse?: Phaser.Tweens.Tween;
  private scoreTxt!: Phaser.GameObjects.Text;
  private progressDots: Phaser.GameObjects.Graphics[] = [];

  private endOverlay!: ReturnType<typeof createEndPopup>;

  constructor() { super('GameScene'); }

  create(): void {
    drawBg(this);
    this.roundIndex = 0;
    this.score = 0;
    this.cards = [];
    this.progressDots = [];

    this.buildHeader();
    this.buildSpeaker();
    this.buildCards();

    this.endOverlay = createEndPopup(this, W, H, {
      onPlayAgain: () => this.scene.restart(),
      onHome:      () => this.scene.start('TitleScene'),
      onAllGames:  () => { window.location.href = '../'; },
    });

    this.loadRound();
  }

  // ─── Header (title + score + progress dots) ────────────────────────────

  private buildHeader(): void {
    this.add.text(24, 34, '🔊 Who Makes?', {
      fontFamily: F.head, fontSize: '18px', color: T.main,
    }).setOrigin(0, 0.5);

    this.pill(W - 76, 34, 120, 34);
    this.scoreTxt = this.add.text(W - 76, 34, `⭐ 0/${TOTAL_ROUNDS}`, {
      fontFamily: F.head, fontSize: '15px', color: T.main,
    }).setOrigin(0.5);

    const n = TOTAL_ROUNDS;
    const dotGap = 8;
    const dotSize = 10;
    const totalW = n * dotSize + (n - 1) * dotGap;
    const startX = W / 2 - totalW / 2 + dotSize / 2;
    this.progressDots = Array.from({ length: n }, (_, i) =>
      this.add.graphics().setPosition(startX + i * (dotSize + dotGap), 72),
    );
    this.renderDots();
  }

  private pill(cx: number, cy: number, w: number, h: number): void {
    const g = this.add.graphics();
    g.fillStyle(C.white, 1);
    g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
    g.lineStyle(1.5, C.lavender, 0.35);
    g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
  }

  private renderDots(): void {
    this.progressDots.forEach((g, i) => {
      g.clear();
      if (i < this.roundIndex) {
        g.fillStyle(C.pink, 1);
        g.fillCircle(0, 0, 5);
      } else if (i === this.roundIndex) {
        g.fillStyle(C.lavender, 0.35);
        g.fillCircle(0, 0, 9);
        g.fillStyle(C.lavender, 1);
        g.fillCircle(0, 0, 5);
      } else {
        g.fillStyle(0xe1bee7, 1);
        g.fillCircle(0, 0, 5);
      }
    });
  }

  // ─── Speaker (tap to hear) ─────────────────────────────────────────────

  private buildSpeaker(): void {
    this.speakerRipple = this.add.graphics();

    this.speakerBg = this.add.graphics();
    this.drawSpeakerBg();

    this.speakerIcon = this.add.text(SPEAKER_CX, SPEAKER_CY, '🔊', {
      fontFamily: F.body, fontSize: '84px',
    }).setOrigin(0.5);

    this.speakerCaption = this.add.text(SPEAKER_CX, SPEAKER_CY + SPEAKER_R + 28, 'Tap to hear! 🎧', {
      fontFamily: F.head, fontSize: '18px', color: T.main,
    }).setOrigin(0.5);

    const zone = this.add.zone(SPEAKER_CX, SPEAKER_CY, SPEAKER_R * 2, SPEAKER_R * 2)
      .setInteractive({ cursor: 'pointer' });
    zone.on('pointerdown', () => this.playCue());

    // A gentle pulse so the button reads as "alive" — toddlers notice motion
    this.speakerPulse = this.tweens.add({
      targets: [this.speakerBg, this.speakerIcon],
      scale: { from: 1, to: 1.06 },
      yoyo: true, repeat: -1, duration: 900, ease: 'Sine.InOut',
    });
  }

  private drawSpeakerBg(): void {
    const g = this.speakerBg;
    g.clear();
    // Outer soft halo
    g.fillStyle(C.lavender, 0.22);
    g.fillCircle(SPEAKER_CX, SPEAKER_CY, SPEAKER_R + 14);
    // Main circle
    g.fillStyle(C.pink, 1);
    g.fillCircle(SPEAKER_CX, SPEAKER_CY, SPEAKER_R);
    g.lineStyle(4, C.white, 1);
    g.strokeCircle(SPEAKER_CX, SPEAKER_CY, SPEAKER_R);
  }

  private rippleSpeaker(): void {
    const g = this.speakerRipple;
    g.clear();
    const state = { r: SPEAKER_R, alpha: 0.6 };
    this.tweens.add({
      targets: state,
      r: SPEAKER_R + 38,
      alpha: 0,
      duration: 700,
      ease: 'Sine.Out',
      onUpdate: () => {
        g.clear();
        g.lineStyle(4, C.pink, state.alpha);
        g.strokeCircle(SPEAKER_CX, SPEAKER_CY, state.r);
      },
      onComplete: () => g.clear(),
    });
  }

  // ─── Answer cards (2x2 grid) ───────────────────────────────────────────

  private buildCards(): void {
    const positions = [
      { cx: CARD_CX_L, cy: CARD_ROW_Y[0] },
      { cx: CARD_CX_R, cy: CARD_ROW_Y[0] },
      { cx: CARD_CX_L, cy: CARD_ROW_Y[1] },
      { cx: CARD_CX_R, cy: CARD_ROW_Y[1] },
    ];

    for (let i = 0; i < OPTIONS_PER_ROUND; i++) {
      const { cx, cy } = positions[i];
      const bg = this.add.graphics().setPosition(cx, cy);
      const txt = this.add.text(cx, cy, '', {
        fontFamily: F.body, fontSize: `${EMOJI_SIZE}px`,
      }).setOrigin(0.5);
      const zone = this.add.zone(cx, cy, CARD_SIZE, CARD_SIZE)
        .setInteractive({ cursor: 'pointer' });

      const card: AnimalCard = {
        animal: ANIMALS[0], cx, cy, bg, txt, zone, isLocked: false,
      };
      this.paintCard(card, 'idle');

      const idx = i;
      zone.on('pointerover', () => { if (!this.answered) this.paintCard(card, 'hover'); });
      zone.on('pointerout',  () => { if (!this.answered) this.paintCard(card, 'idle');  });
      zone.on('pointerdown', () => this.onAnswer(idx));

      this.cards.push(card);
    }
  }

  private paintCard(card: AnimalCard, state: 'idle' | 'hover' | 'correct' | 'wrong'): void {
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
        bg.lineStyle(3, C.pink, 0.8);
        break;
      case 'correct':
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

  // ─── Round logic ───────────────────────────────────────────────────────

  private loadRound(): void {
    this.answered = false;
    this.renderDots();

    // Pick the correct animal + 3 distractors
    this.currentAnimal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    const wrong = shuffle(ANIMALS.filter(a => a.name !== this.currentAnimal.name))
      .slice(0, OPTIONS_PER_ROUND - 1);
    this.options = shuffle([this.currentAnimal, ...wrong]);

    this.cards.forEach((card, i) => {
      card.animal = this.options[i];
      card.txt.setText(card.animal.emoji);
      card.isLocked = false;
      card.bg.scale = 1; card.txt.scale = 1;
      card.bg.x = card.cx; card.txt.x = card.cx;
      this.paintCard(card, 'idle');
      card.zone.setInteractive({ cursor: 'pointer' });
    });

    // Auto-play the cue shortly after the round appears; a single 250ms pause
    // lets the card fade-in finish and stops the speech from colliding with
    // the previous round's celebration chime.
    this.time.delayedCall(260, () => this.playCue());
  }

  private playCue(): void {
    if (!this.currentAnimal) return;
    this.rippleSpeaker();
    speak(this.currentAnimal.utter);
  }

  private onAnswer(i: number): void {
    if (this.answered) return;
    const card = this.cards[i];
    if (card.isLocked) return;

    if (card.animal.name === this.currentAnimal.name) {
      this.answered = true;
      this.score++;
      this.scoreTxt.setText(`⭐ ${this.score}/${TOTAL_ROUNDS}`);
      this.paintCard(card, 'correct');
      card.isLocked = true;
      this.celebrate(card);
      sounds.match();
      this.time.delayedCall(950, () => this.nextRound());
    } else {
      // Wrong — soft red flash + shake, then reset this card. Toddler keeps
      // trying on the same round until they get it, so we don't advance.
      this.paintCard(card, 'wrong');
      this.shake(card);
      sounds.wrong();
      this.time.delayedCall(520, () => {
        if (!this.answered) this.paintCard(card, 'idle');
      });
    }
  }

  private celebrate(card: AnimalCard): void {
    // Bounce the correct card and emit a tiny confetti sparkle above it
    this.tweens.add({
      targets: [card.bg, card.txt],
      scale: { from: 1, to: 1.14 },
      yoyo: true, duration: 200, ease: 'Sine.Out',
    });
    this.spawnSparkles(card.cx, card.cy - CARD_SIZE / 2);
  }

  private spawnSparkles(cx: number, cy: number): void {
    const emojis = ['✨', '⭐', '🌟', '💖'];
    for (let i = 0; i < 5; i++) {
      const e = this.add.text(cx, cy, emojis[i % emojis.length], {
        fontFamily: F.body, fontSize: '24px',
      }).setOrigin(0.5);
      this.tweens.add({
        targets: e,
        y: cy - 60 - Math.random() * 30,
        x: cx + (Math.random() - 0.5) * 80,
        alpha: 0,
        duration: 700,
        ease: 'Sine.Out',
        onComplete: () => e.destroy(),
      });
    }
  }

  private shake(card: AnimalCard): void {
    const baseX = card.cx;
    this.tweens.add({
      targets: [card.bg, card.txt],
      x: { from: baseX - 6, to: baseX + 6 },
      yoyo: true, repeat: 3, duration: 55,
      onComplete: () => { card.bg.x = baseX; card.txt.x = baseX; },
    });
  }

  private nextRound(): void {
    this.roundIndex++;
    if (this.roundIndex >= TOTAL_ROUNDS) this.endGame();
    else                                  this.loadRound();
  }

  // ─── End ───────────────────────────────────────────────────────────────

  private endGame(): void {
    this.speakerPulse?.stop();
    this.cards.forEach(c => c.zone.disableInteractive());
    sounds.end();
    if (this.score >= Math.ceil(TOTAL_ROUNDS * 0.6)) launchConfetti(this, CONFETTI_EMOJIS);

    const { emoji, title, subtitle, stars } = tierFor(this.score, TOTAL_ROUNDS);
    this.endOverlay.show({
      emoji, title, subtitle,
      score: { value: `${this.score}/${TOTAL_ROUNDS}`, label: 'Sounds Matched' },
      stars: { earned: stars, total: 3 },
    });
  }
}

function tierFor(score: number, total: number): { emoji: string; title: string; subtitle: string; stars: number } {
  const ratio = total === 0 ? 0 : score / total;
  if (ratio >= 1)   return { emoji: '🎉', title: 'Perfect ear!',  subtitle: `All ${total} right! Amazing, Aya! 🌟`,  stars: 3 };
  if (ratio >= 0.7) return { emoji: '🌟', title: 'Great job!',   subtitle: `${score} of ${total} — brilliant! 🎀`,    stars: 3 };
  if (ratio >= 0.4) return { emoji: '🌸', title: 'Nice try!',    subtitle: `${score} of ${total} — keep listening 💖`, stars: 2 };
  return              { emoji: '💪', title: 'Keep trying!', subtitle: `You got ${score} of ${total}. Try again!`, stars: 1 };
}

/**
 * Speak the given text via the browser's Web Speech API. Falls back to a
 * short synth tone when speech is unavailable (older browsers, privacy
 * extensions) so the player always gets audible feedback on a tap.
 */
function speak(text: string): void {
  try {
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
      playTone(520, 0.2, 'sine', 0.14);
      return;
    }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.85;
    u.pitch = 1.25;
    u.volume = 1;
    u.lang = 'en-US';
    synth.speak(u);
  } catch {
    playTone(520, 0.2, 'sine', 0.14);
  }
}
