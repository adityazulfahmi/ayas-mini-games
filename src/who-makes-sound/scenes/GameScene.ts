import Phaser from 'phaser';
import { drawBg, launchConfetti } from '@shared/phaserUtils';
import { createEndPopup } from '@shared/endPopup';
import { C, T, F } from '@shared/theme';
import { sounds, playTone } from '@shared/audio';
import { shuffle } from '@shared/utils';
import { ANIMALS, CONFETTI_EMOJIS, OPTIONS_PER_ROUND, TOTAL_ROUNDS, type Animal } from '../data';
import { drawSpeaker } from './speaker';

const W = 420, H = 780;

const SPEAKER_CX = W / 2;
const SPEAKER_CY = 232;
const SPEAKER_R  = 78;

const CARD_SIZE   = 148;
const CARD_RADIUS = 24;
const EMOJI_SIZE  = 80;
const CARD_CX_L   = 126;
const CARD_CX_R   = W - 126;
const CARD_ROW_Y  = [452, 614];

interface AnimalCard {
  animal: Animal;
  cx: number;
  cy: number;
  shadow: Phaser.GameObjects.Graphics;
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
  private speakerIcon!: Phaser.GameObjects.Graphics;
  private speakerCaption!: Phaser.GameObjects.Text;
  private speakerRipple!: Phaser.GameObjects.Graphics;
  private speakerPulse?: Phaser.Tweens.Tween;
  private replayHint!: Phaser.GameObjects.Container;
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
    // Drop the awkward "Who Makes?" — complete the thought with a short
    // active-voice title so the header reads as a finished phrase.
    this.add.text(22, 34, '🎧 Guess the Sound', {
      fontFamily: F.head, fontSize: '17px', color: T.main,
    }).setOrigin(0, 0.5);

    this.pill(W - 70, 34, 108, 34);
    this.scoreTxt = this.add.text(W - 70, 34, `⭐ 0/${TOTAL_ROUNDS}`, {
      fontFamily: F.head, fontSize: '15px', color: T.main,
    }).setOrigin(0.5);

    const n = TOTAL_ROUNDS;
    const dotGap = 10;
    const dotSize = 12;
    const totalW = n * dotSize + (n - 1) * dotGap;
    const startX = W / 2 - totalW / 2 + dotSize / 2;
    this.progressDots = Array.from({ length: n }, (_, i) =>
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
    // Active dot uses pink (brand accent) so it clearly separates from the
    // lavender "not yet" dots — the previous lavender-on-lavender combo was
    // almost invisible from a glance.
    this.progressDots.forEach((g, i) => {
      g.clear();
      if (i < this.roundIndex) {
        g.fillStyle(C.pink, 1);
        g.fillCircle(0, 0, 5);
      } else if (i === this.roundIndex) {
        g.fillStyle(C.pink, 0.22);
        g.fillCircle(0, 0, 11);
        g.fillStyle(C.pink, 1);
        g.fillCircle(0, 0, 6);
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

    // Drawn speaker glyph (scale 0.85 of the 1x) so it sits nicely inside
    // the 78px bubble.
    this.speakerIcon = drawSpeaker(this, SPEAKER_CX, SPEAKER_CY, 0.9);

    this.speakerCaption = this.add.text(SPEAKER_CX, SPEAKER_CY + SPEAKER_R + 26, 'Tap to listen', {
      fontFamily: F.head, fontSize: '17px', color: T.main,
    }).setOrigin(0.5);

    // Small "tap again to replay" hint sits under the caption — the speaker
    // is tappable every round, not just on first load, and kids need a cue.
    this.replayHint = this.buildReplayHint(SPEAKER_CX, SPEAKER_CY + SPEAKER_R + 48);

    const zone = this.add.zone(SPEAKER_CX, SPEAKER_CY, SPEAKER_R * 2, SPEAKER_R * 2)
      .setInteractive({ cursor: 'pointer' });
    zone.on('pointerdown', () => this.playCue());

    // A gentle pulse so the button reads as "alive"
    this.speakerPulse = this.tweens.add({
      targets: [this.speakerBg, this.speakerIcon],
      scale: { from: 1, to: 1.06 },
      yoyo: true, repeat: -1, duration: 900, ease: 'Sine.InOut',
    });
  }

  private buildReplayHint(cx: number, cy: number): Phaser.GameObjects.Container {
    const w = 148, h = 24;
    const bg = this.add.graphics();
    bg.fillStyle(C.white, 0.75);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    bg.lineStyle(1.5, C.lavender, 0.55);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    const txt = this.add.text(0, 0, '↻  tap again to replay', {
      fontFamily: F.body, fontSize: '12px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);
    return this.add.container(cx, cy, [bg, txt]);
  }

  private drawSpeakerBg(): void {
    const g = this.speakerBg;
    g.clear();
    // Outer soft halo — lighter outer and a slightly tighter inner ring give
    // the bubble a layered, glowing look.
    g.fillStyle(C.lavender, 0.16);
    g.fillCircle(SPEAKER_CX, SPEAKER_CY, SPEAKER_R + 22);
    g.fillStyle(C.lavender, 0.32);
    g.fillCircle(SPEAKER_CX, SPEAKER_CY, SPEAKER_R + 10);
    // Main circle
    g.fillStyle(C.pink, 1);
    g.fillCircle(SPEAKER_CX, SPEAKER_CY, SPEAKER_R);
    g.lineStyle(4, C.white, 1);
    g.strokeCircle(SPEAKER_CX, SPEAKER_CY, SPEAKER_R);
  }

  private rippleSpeaker(): void {
    const g = this.speakerRipple;
    const state = { r: SPEAKER_R, alpha: 0.6 };
    this.tweens.add({
      targets: state,
      r: SPEAKER_R + 30,
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
      // Soft drop shadow under each card — gives the grid a physical,
      // lifted feel instead of looking like flat outlined tiles.
      const shadow = this.add.graphics().setPosition(cx, cy + 6);
      shadow.fillStyle(C.shadow, 0.14);
      shadow.fillRoundedRect(-CARD_SIZE / 2, -CARD_SIZE / 2, CARD_SIZE, CARD_SIZE, CARD_RADIUS);

      const bg = this.add.graphics().setPosition(cx, cy);
      const txt = this.add.text(cx, cy, '', {
        fontFamily: F.body, fontSize: `${EMOJI_SIZE}px`,
      }).setOrigin(0.5);
      const zone = this.add.zone(cx, cy, CARD_SIZE, CARD_SIZE)
        .setInteractive({ cursor: 'pointer' });

      const card: AnimalCard = {
        animal: ANIMALS[0], cx, cy, shadow, bg, txt, zone, isLocked: false,
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
        bg.lineStyle(3, C.lavender, 0.9);
        break;
      case 'hover':
        bg.fillStyle(C.cream, 1);
        bg.lineStyle(3, C.pink, 0.85);
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
      // Reset alpha — the previous round's celebrate() dimmed the non-winners
      card.bg.alpha = 1; card.txt.alpha = 1;
      card.shadow.alpha = 1;
      this.paintCard(card, 'idle');
      card.zone.setInteractive({ cursor: 'pointer' });
    });

    // Auto-play the cue shortly after the round appears.
    this.time.delayedCall(260, () => this.playCue());
  }

  private playCue(): void {
    if (!this.currentAnimal) return;
    playAnimalSound(this.currentAnimal);
    // Ripples every 260ms for the clip's duration so the speaker visibly
    // says "I'm playing right now"
    const total = this.currentAnimal.clipMs;
    for (let t = 0; t < total; t += 260) {
      this.time.delayedCall(t, () => this.rippleSpeaker());
    }
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
      // Wrong — soft red flash + shake, then reset this card.
      this.paintCard(card, 'wrong');
      this.shake(card);
      sounds.wrong();
      this.time.delayedCall(520, () => {
        if (!this.answered) this.paintCard(card, 'idle');
      });
    }
  }

  private celebrate(card: AnimalCard): void {
    // Bounce the correct card and dim everything else so the winner is the
    // clear focus during the short celebration window.
    this.tweens.add({
      targets: [card.bg, card.txt],
      scale: { from: 1, to: 1.14 },
      yoyo: true, duration: 200, ease: 'Sine.Out',
    });
    this.cards.forEach(c => {
      if (c === card) return;
      this.tweens.add({ targets: [c.bg, c.txt, c.shadow], alpha: 0.35, duration: 180 });
    });
    this.spawnSparkles(card.cx, card.cy);
  }

  private spawnSparkles(cx: number, cy: number): void {
    const emojis = ['✨', '⭐', '🌟', '💖'];
    // Sparkles bloom outward from the card's center so the effect obviously
    // belongs to the correct card, not the one above it.
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 + Math.random() * 0.4;
      const dist = 70 + Math.random() * 30;
      const e = this.add.text(cx, cy, emojis[i % emojis.length], {
        fontFamily: F.body, fontSize: '26px',
      }).setOrigin(0.5).setDepth(5);
      this.tweens.add({
        targets: e,
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        alpha: 0,
        duration: 720,
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
    this.replayHint.setVisible(false);
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
 * Play the animal's real-world recording if the browser can decode it,
 * otherwise fall back to speech-synth saying the cue text, and if that's
 * unavailable too, a single soft tone so the player always gets feedback.
 */
const audioCache = new Map<string, HTMLAudioElement>();
let activeAudio: HTMLAudioElement | null = null;
let activeTimeout: number | null = null;

function playAnimalSound(animal: Animal): void {
  // Cut any in-flight playback from the previous cue
  if (activeAudio) { activeAudio.pause(); activeAudio.currentTime = 0; activeAudio = null; }
  if (activeTimeout !== null) { window.clearTimeout(activeTimeout); activeTimeout = null; }

  const canPlay = typeof Audio !== 'undefined'
    && !!document.createElement('audio').canPlayType('audio/ogg; codecs="vorbis"');
  if (!canPlay) { speakFallback(animal.fallback); return; }

  let a = audioCache.get(animal.src);
  if (!a) {
    a = new Audio(animal.src);
    a.preload = 'auto';
    audioCache.set(animal.src, a);
  }
  a.currentTime = 0;
  const p = a.play();
  if (p && typeof p.catch === 'function') p.catch(() => speakFallback(animal.fallback));
  activeAudio = a;
  activeTimeout = window.setTimeout(() => {
    if (activeAudio === a) {
      a!.pause();
      a!.currentTime = 0;
      activeAudio = null;
    }
  }, animal.clipMs);
}

function speakFallback(text: string): void {
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
