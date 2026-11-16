import Phaser from 'phaser';
import { drawBg, launchConfetti } from '@shared/phaserUtils';
import { createEndPopup } from '@shared/endPopup';
import { C, T, F } from '@shared/theme';
import { sounds, playTone } from '@shared/audio';
import { shuffle } from '@shared/utils';
import { ANIMALS, CONFETTI_EMOJIS, TOTAL_ROUNDS, callWord, type Animal } from '../data';
import { drawSpeaker } from './speaker';
import { playAnimal, preloadSounds, stopSound, unlockAudio } from '../sound';
import { say, stopSpeech, unlockSpeech } from '../speech';

const W = 420, H = 780;

const SPEAKER_CX = W / 2;
const SPEAKER_CY = 200;
const SPEAKER_R  = 70;
const CAPTION_Y  = SPEAKER_CY + SPEAKER_R + 36;
const HINT_Y     = CAPTION_Y + 32;

/** No tap for this long → hear the sound (and the question) again. */
const IDLE_MS = 7000;
/** After this many idle replays or wrong taps, the right card starts to wave. */
const HELP_AFTER = 2;

interface Layout {
  w: number; h: number; radius: number; emoji: number; label: number;
  emojiDy: number;
  pos: { cx: number; cy: number }[];
}

function layoutFor(choices: number): Layout {
  if (choices === 2) {
    // Two tall cards side by side — huge targets for little fingers.
    const w = 182, h = 256, gap = 18;
    return {
      w, h, radius: 32, emoji: 108, label: 22, emojiDy: -20,
      pos: [
        { cx: W / 2 - w / 2 - gap / 2, cy: 562 },
        { cx: W / 2 + w / 2 + gap / 2, cy: 562 },
      ],
    };
  }
  const s = 158, gap = 16, top = 470;
  return {
    w: s, h: s, radius: 28, emoji: 80, label: 17, emojiDy: -12,
    pos: [
      { cx: W / 2 - s / 2 - gap / 2, cy: top },
      { cx: W / 2 + s / 2 + gap / 2, cy: top },
      { cx: W / 2 - s / 2 - gap / 2, cy: top + s + gap },
      { cx: W / 2 + s / 2 + gap / 2, cy: top + s + gap },
    ],
  };
}

type CardState = 'idle' | 'hover' | 'correct' | 'wrong' | 'help';

interface AnimalCard {
  animal: Animal;
  cx: number;
  cy: number;
  root: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  glow: Phaser.GameObjects.Graphics;
  emoji: Phaser.GameObjects.Text;
  /** Animal name under the emoji, so a grown-up can say it along. */
  label: Phaser.GameObjects.Text;
  isLocked: boolean;
  state: CardState;
}

export class GameScene extends Phaser.Scene {
  private choices = 4;
  private layout!: Layout;
  private roundIndex = 0;
  private score = 0;
  private answered = false;
  private ended = false;
  private currentAnimal!: Animal;
  private cards: AnimalCard[] = [];
  // Pre-shuffled queue of distinct correct answers — one per round —
  // so the player never hears the same animal twice in a single game.
  private roundAnimals: Animal[] = [];
  /** Wrong taps + idle replays this round; enough of them and the answer waves. */
  private struggles = 0;
  private idleTimer?: Phaser.Time.TimerEvent;
  private helpTweens: Phaser.Tweens.Tween[] = [];
  private cueId = 0;

  private speaker!: Phaser.GameObjects.Container;
  private speakerIcon!: Phaser.GameObjects.Graphics;
  private speakerAnimal!: Phaser.GameObjects.Text;
  private speakerRipple!: Phaser.GameObjects.Graphics;
  private speakerCaption!: Phaser.GameObjects.Text;
  private replayHint!: Phaser.GameObjects.Container;
  private scoreTxt!: Phaser.GameObjects.Text;
  private progressDots: Phaser.GameObjects.Text[] = [];

  private endOverlay!: ReturnType<typeof createEndPopup>;

  constructor() { super('GameScene'); }

  init(data: { choices?: number }): void {
    this.choices = data?.choices === 2 ? 2 : 4;
  }

  create(): void {
    drawBg(this);
    this.layout = layoutFor(this.choices);
    this.roundIndex = 0;
    this.score = 0;
    this.answered = false;
    this.ended = false;
    this.cards = [];
    this.progressDots = [];
    this.helpTweens = [];
    this.idleTimer = undefined;
    this.roundAnimals = shuffle(ANIMALS).slice(0, TOTAL_ROUNDS);
    preloadSounds(ANIMALS);
    // Any tap anywhere (re)unlocks audio on iOS and counts as "not idle".
    this.input.on('pointerdown', () => { unlockAudio(); this.armIdle(); });
    this.events.once('shutdown', () => { stopSound(); stopSpeech(); });

    this.buildHeader();
    this.buildSpeaker();
    this.buildCards();

    this.endOverlay = createEndPopup(this, W, H, {
      onPlayAgain: () => this.scene.restart({ choices: this.choices }),
      onHome:      () => this.scene.start('TitleScene'),
      onAllGames:  () => { window.location.href = '../'; },
    });

    this.loadRound();
  }

  // ─── Header (title + score + progress) ─────────────────────────────────

  private buildHeader(): void {
    this.add.text(22, 34, '🎧 Who Makes This Sound?', {
      fontFamily: F.head, fontSize: '17px', color: T.main,
    }).setOrigin(0, 0.5);

    const pw = 86, ph = 34, px = W - 22 - pw / 2;
    const g = this.add.graphics();
    g.fillStyle(C.white, 1);
    g.fillRoundedRect(px - pw / 2, 34 - ph / 2, pw, ph, ph / 2);
    g.lineStyle(1.5, C.lavender, 0.4);
    g.strokeRoundedRect(px - pw / 2, 34 - ph / 2, pw, ph, ph / 2);
    this.scoreTxt = this.add.text(px, 34, `⭐ 0/${TOTAL_ROUNDS}`, {
      fontFamily: F.head, fontSize: '15px', color: T.main,
    }).setOrigin(0.5);

    // Progress: one paw per round. Found animals replace their paw.
    const n = TOTAL_ROUNDS, step = 40;
    const startX = W / 2 - ((n - 1) * step) / 2;
    const track = this.add.graphics();
    track.fillStyle(C.white, 0.6);
    track.fillRoundedRect(startX - 26, 80 - 18, (n - 1) * step + 52, 36, 18);
    this.progressDots = Array.from({ length: n }, (_, i) =>
      this.add.text(startX + i * step, 80, '🐾', {
        fontFamily: F.body, fontSize: '20px',
      }).setOrigin(0.5).setAlpha(0.25),
    );
  }

  private renderProgress(): void {
    this.progressDots.forEach((t, i) => {
      if (i < this.roundIndex) return; // already shows the found animal
      t.setText('🐾').setScale(1).setAlpha(i === this.roundIndex ? 0.75 : 0.25);
    });
  }

  // ─── Speaker (tap to hear) ─────────────────────────────────────────────

  private buildSpeaker(): void {
    this.speakerRipple = this.add.graphics();

    const halo = this.add.graphics();
    halo.fillStyle(C.lavender, 0.16);
    halo.fillCircle(0, 0, SPEAKER_R + 22);
    halo.fillStyle(C.lavender, 0.32);
    halo.fillCircle(0, 0, SPEAKER_R + 10);
    const bubble = this.add.graphics();
    bubble.fillStyle(C.pink, 1);
    bubble.fillCircle(0, 0, SPEAKER_R);
    // Soft gloss so the bubble reads like a squishy toy button.
    bubble.fillStyle(C.white, 0.14);
    bubble.fillCircle(-SPEAKER_R * 0.12, -SPEAKER_R * 0.14, SPEAKER_R * 0.8);
    bubble.lineStyle(4, C.white, 1);
    bubble.strokeCircle(0, 0, SPEAKER_R);

    this.speakerIcon = drawSpeaker(this, 0, 0, 0.9);
    // On a correct answer the speaker turns into the animal that made the sound.
    this.speakerAnimal = this.add.text(0, 4, '', {
      fontFamily: F.body, fontSize: '84px',
    }).setOrigin(0.5).setVisible(false);

    this.speaker = this.add.container(SPEAKER_CX, SPEAKER_CY, [halo, bubble, this.speakerIcon, this.speakerAnimal]);
    this.speaker.setSize(SPEAKER_R * 2 + 20, SPEAKER_R * 2 + 20).setInteractive({ cursor: 'pointer' });
    this.speaker.on('pointerdown', () => {
      if (this.ended) return;
      unlockSpeech();
      void this.playCue(!this.answered);
    });

    this.tweens.add({
      targets: halo, scale: { from: 1, to: 1.08 },
      yoyo: true, repeat: -1, duration: 1000, ease: 'Sine.InOut',
    });

    this.speakerCaption = this.add.text(SPEAKER_CX, CAPTION_Y, 'Listen… 👂', {
      fontFamily: F.head, fontSize: '24px', color: T.main,
    }).setOrigin(0.5);

    this.replayHint = this.buildReplayHint(SPEAKER_CX, HINT_Y);
  }

  private buildReplayHint(cx: number, cy: number): Phaser.GameObjects.Container {
    const w = 210, h = 28;
    const bg = this.add.graphics();
    bg.fillStyle(C.white, 0.75);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    bg.lineStyle(1.5, C.lavender, 0.55);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    const txt = this.add.text(0, 0, '↻  tap the speaker to hear again', {
      fontFamily: F.body, fontSize: '12px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);
    return this.add.container(cx, cy, [bg, txt]);
  }

  /** Speaker "talks" while a clip plays: squish, rings, floating notes. */
  private animateSpeaker(ms: number): void {
    this.tweens.killTweensOf(this.speaker);
    this.speaker.setScale(1).setAngle(0);
    const beats = Math.max(1, Math.round(ms / 260));
    this.tweens.add({
      targets: this.speaker, scale: 1.1, angle: { from: -4, to: 4 },
      yoyo: true, repeat: beats - 1, duration: 130, ease: 'Sine.InOut',
      onComplete: () => this.speaker.setScale(1).setAngle(0),
    });
    for (let t = 0; t < ms; t += 260) this.time.delayedCall(t, () => this.rippleSpeaker());
    const notes = ['♪', '♫', '♩'];
    for (let i = 0; i < Math.min(5, beats + 1); i++) {
      this.time.delayedCall(i * 220, () => this.floatNote(notes[i % 3], i % 2 === 0 ? 1 : -1));
    }
  }

  private floatNote(ch: string, side: number): void {
    const x0 = SPEAKER_CX + side * (SPEAKER_R + 6);
    const n = this.add.text(x0, SPEAKER_CY - 10, ch, {
      fontFamily: F.head, fontSize: '30px', color: '#f06292',
    }).setOrigin(0.5).setDepth(4);
    this.tweens.add({
      targets: n,
      x: x0 + side * (24 + Math.random() * 20),
      y: SPEAKER_CY - 80 - Math.random() * 30,
      angle: side * 20, alpha: { from: 1, to: 0 },
      duration: 1100, ease: 'Sine.Out',
      onComplete: () => n.destroy(),
    });
  }

  private rippleSpeaker(): void {
    const g = this.speakerRipple;
    const state = { r: SPEAKER_R, alpha: 0.6 };
    this.tweens.add({
      targets: state,
      r: SPEAKER_R + 34,
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

  private showSpeakerAnimal(a: Animal | null): void {
    this.speakerIcon.setVisible(!a);
    this.speakerAnimal.setVisible(!!a);
    if (a) {
      this.speakerAnimal.setText(a.emoji).setScale(0.3);
      this.tweens.add({ targets: this.speakerAnimal, scale: 1, duration: 380, ease: 'Back.Out' });
    }
  }

  // ─── Answer cards ──────────────────────────────────────────────────────

  private buildCards(): void {
    const L = this.layout;
    for (let i = 0; i < this.choices; i++) {
      const { cx, cy } = L.pos[i];
      // Soft drop shadow — gives the grid a physical, lifted feel.
      const shadow = this.add.graphics();
      shadow.fillStyle(C.shadow, 0.14);
      shadow.fillRoundedRect(-L.w / 2, -L.h / 2 + 6, L.w, L.h, L.radius);
      const glow = this.add.graphics();
      glow.fillStyle(0xffd54f, 0.55);
      glow.fillRoundedRect(-L.w / 2 - 9, -L.h / 2 - 9, L.w + 18, L.h + 18, L.radius + 8);
      glow.setAlpha(0);
      const bg = this.add.graphics();
      const emoji = this.add.text(0, L.emojiDy, '', {
        fontFamily: F.body, fontSize: `${L.emoji}px`,
      }).setOrigin(0.5);
      const label = this.add.text(0, L.h / 2 - 26, '', {
        fontFamily: F.head, fontSize: `${L.label}px`, color: T.sub,
      }).setOrigin(0.5);
      const root = this.add.container(cx, cy, [glow, shadow, bg, emoji, label]);
      root.setSize(L.w, L.h).setInteractive({ cursor: 'pointer' });

      const card: AnimalCard = {
        animal: ANIMALS[0], cx, cy, root, bg, glow, emoji, label, isLocked: false, state: 'idle',
      };
      this.paintCard(card, 'idle');

      const idx = i;
      root.on('pointerover', () => { if (!this.answered && !card.isLocked && card.state === 'idle') this.paintCard(card, 'hover'); });
      root.on('pointerout',  () => { if (!this.answered && !card.isLocked && card.state === 'hover') this.paintCard(card, 'idle'); });
      root.on('pointerdown', () => this.onAnswer(idx));

      this.cards.push(card);
    }
  }

  private paintCard(card: AnimalCard, state: CardState): void {
    const { bg } = card;
    const L = this.layout;
    card.state = state;
    bg.clear();
    switch (state) {
      case 'idle':
        bg.fillStyle(C.white, 1);
        bg.lineStyle(3, C.lavender, 0.9);
        break;
      case 'hover':
        bg.fillStyle(C.cream, 1);
        bg.lineStyle(3, C.pink, 0.85);
        break;
      case 'help':
        bg.fillStyle(0xfffde7, 1);
        bg.lineStyle(4, 0xffca28, 1);
        break;
      case 'correct':
        bg.fillStyle(C.mintBg, 1);
        bg.lineStyle(5, C.mint, 1);
        break;
      case 'wrong':
        // Gentle, not alarming: a soft lilac "not this one".
        bg.fillStyle(0xf3e5f5, 1);
        bg.lineStyle(3, C.lavender2, 0.7);
        break;
    }
    bg.fillRoundedRect(-L.w / 2, -L.h / 2, L.w, L.h, L.radius);
    bg.strokeRoundedRect(-L.w / 2, -L.h / 2, L.w, L.h, L.radius);
  }

  // ─── Round logic ───────────────────────────────────────────────────────

  private loadRound(): void {
    this.answered = false;
    this.struggles = 0;
    this.stopHelp();
    this.renderProgress();
    this.showSpeakerAnimal(null);
    this.replayHint.setVisible(true);
    this.speakerCaption.setText('Listen… 👂');

    // Correct animal from the pre-shuffled queue + distractors
    this.currentAnimal = this.roundAnimals[this.roundIndex];
    const wrong = shuffle(ANIMALS.filter(a => a.name !== this.currentAnimal.name))
      .slice(0, this.choices - 1);
    const options = shuffle([this.currentAnimal, ...wrong]);

    this.cards.forEach((card, i) => {
      card.animal = options[i];
      card.emoji.setText(card.animal.emoji);
      card.label.setText(card.animal.name);
      card.isLocked = false;
      this.tweens.killTweensOf([card.root, card.emoji]);
      card.root.setPosition(card.cx, card.cy).setAngle(0).setAlpha(0).setScale(0.6).setDepth(0);
      card.emoji.setPosition(0, this.layout.emojiDy).setAngle(0).setScale(1);
      card.glow.setAlpha(0);
      this.paintCard(card, 'idle');
      card.root.setInteractive({ cursor: 'pointer' });
      // Cards pop in one after another.
      this.tweens.add({
        targets: card.root, alpha: 1, scale: 1,
        duration: 320, delay: 60 + i * 70, ease: 'Back.Out',
      });
    });

    // Auto-play the cue shortly after the round appears.
    this.time.delayedCall(320, () => void this.playCue(true));
  }

  /** Plays the animal's sound; with `ask`, follows it with "Who says moo?". */
  private async playCue(ask: boolean): Promise<void> {
    if (!this.currentAnimal || this.ended) return;
    unlockAudio();
    stopSpeech();
    const id = ++this.cueId;
    const animal = this.currentAnimal;
    if (!this.answered) this.speakerCaption.setText('Listen… 👂');
    this.idleTimer?.remove();
    const total = await playAnimal(animal);
    if (id !== this.cueId || !this.scene.isActive()) return;
    this.animateSpeaker(total);
    if (!ask) return;
    this.time.delayedCall(total + 200, () => {
      if (id !== this.cueId || this.answered || this.ended) return;
      const q = `Who says ${callWord(animal)}?`;
      this.speakerCaption.setText(q);
      this.tweens.add({ targets: this.speakerCaption, scale: { from: 0.85, to: 1 }, duration: 260, ease: 'Back.Out' });
      void say(q).then(() => { if (id === this.cueId) this.armIdle(); });
    });
  }

  /** (Re)starts the idle timer: no tap for a while → replay + maybe help. */
  private armIdle(): void {
    this.idleTimer?.remove();
    if (this.answered || this.ended) return;
    this.idleTimer = this.time.delayedCall(IDLE_MS, () => {
      if (this.answered || this.ended) return;
      this.struggles++;
      if (this.struggles >= HELP_AFTER) this.startHelp();
      void this.playCue(true);
    });
  }

  /** The right card glows and waves — a nudge, never a penalty. */
  private startHelp(): void {
    const card = this.cards.find(c => c.animal.name === this.currentAnimal.name);
    if (!card || this.helpTweens.length) return;
    this.paintCard(card, 'help');
    this.helpTweens.push(
      this.tweens.add({ targets: card.glow, alpha: { from: 0.2, to: 0.9 }, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.InOut' }),
      this.tweens.add({ targets: card.emoji, angle: { from: -8, to: 8 }, yoyo: true, repeat: -1, duration: 380, ease: 'Sine.InOut' }),
    );
  }

  private stopHelp(): void {
    this.helpTweens.forEach(t => t.stop());
    this.helpTweens = [];
  }

  private onAnswer(i: number): void {
    if (this.answered || this.ended) return;
    const card = this.cards[i];
    if (card.isLocked) return;
    unlockSpeech();

    if (card.animal.name === this.currentAnimal.name) this.onCorrect(card);
    else                                                this.onWrong(card);
  }

  private onCorrect(card: AnimalCard): void {
    this.answered = true;
    this.idleTimer?.remove();
    this.stopHelp();
    stopSpeech();
    this.score++;
    this.scoreTxt.setText(`⭐ ${this.score}/${TOTAL_ROUNDS}`);
    this.replayHint.setVisible(false);
    card.isLocked = true;
    card.glow.setAlpha(0);
    card.emoji.setAngle(0);
    this.paintCard(card, 'correct');
    sounds.match();

    const a = card.animal;
    this.speakerCaption.setText(`${a.name} says ${a.says}!`);
    this.showSpeakerAnimal(a);

    // Winner pops forward, everyone else steps back.
    card.root.setDepth(3);
    this.tweens.add({ targets: card.root, scale: 1.1, duration: 220, ease: 'Back.Out' });
    this.cards.forEach(c => {
      if (c !== card) this.tweens.add({ targets: c.root, alpha: 0.3, scale: 0.94, duration: 200 });
    });
    this.spawnSparkles(card.cx, card.cy);
    this.markProgress(a);

    // Hear it again now that she knows who it was — and the animal "talks".
    this.time.delayedCall(380, async () => {
      if (this.ended || !this.scene.isActive()) return;
      const id = ++this.cueId;
      const ms = await playAnimal(a);
      if (id !== this.cueId || !this.scene.isActive()) return;
      this.animateSpeaker(ms);
      this.animalTalks(card, ms);
      this.time.delayedCall(ms + 150, async () => {
        if (!this.scene.isActive()) return;
        await say(`Yes! The ${a.name.toLowerCase()} says ${callWord(a)}!`);
        if (!this.scene.isActive() || this.ended) return;
        this.time.delayedCall(450, () => this.nextRound());
      });
    });
  }

  /** Correct card hops while its sound plays, with a "Moo!" speech bubble. */
  private animalTalks(card: AnimalCard, ms: number): void {
    const hops = Math.max(2, Math.round(ms / 300));
    const baseY = this.layout.emojiDy;
    this.tweens.add({
      targets: card.emoji, y: baseY - 16, angle: { from: -6, to: 6 },
      yoyo: true, repeat: hops - 1, duration: 150, ease: 'Sine.Out',
      onComplete: () => card.emoji.setY(baseY).setAngle(0),
    });

    const word = `${card.animal.says}!`;
    const txt = this.add.text(0, 0, word, {
      fontFamily: F.head, fontSize: word.length > 10 ? '16px' : '22px', color: T.main,
    }).setOrigin(0.5);
    const bw = txt.width + 28, bh = 42;
    const g = this.add.graphics();
    g.fillStyle(C.white, 1);
    g.lineStyle(3, C.pink, 1);
    g.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, bh / 2);
    g.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, bh / 2);
    g.fillTriangle(-8, bh / 2 - 2, 8, bh / 2 - 2, 0, bh / 2 + 12);
    g.lineBetween(-8, bh / 2, 0, bh / 2 + 12);
    g.lineBetween(8, bh / 2, 0, bh / 2 + 12);
    // Keep the bubble on-screen (cards sit close to the edges).
    const top = card.cy - this.layout.h / 2;
    const x = Phaser.Math.Clamp(card.cx, bw / 2 + 8, W - bw / 2 - 8);
    const bubble = this.add.container(x, top - 14, [g, txt]).setDepth(6).setScale(0);
    this.tweens.add({ targets: bubble, scale: 1, duration: 260, ease: 'Back.Out' });
    this.tweens.add({
      targets: bubble, alpha: 0, delay: Math.max(1100, ms + 600), duration: 300,
      onComplete: () => bubble.destroy(),
    });
  }

  private onWrong(card: AnimalCard): void {
    card.isLocked = true;
    this.struggles++;
    this.paintCard(card, 'wrong');
    playTone(392, 0.16, 'sine', 0.1);
    playTone(330, 0.2, 'sine', 0.08, 0.14);
    // A soft "no-no" head shake, then the card rests a little faded so the
    // remaining choices stand out. Progress is never lost.
    this.tweens.add({
      targets: card.root, angle: { from: -6, to: 6 },
      yoyo: true, repeat: 2, duration: 90, ease: 'Sine.InOut',
      onComplete: () => card.root.setAngle(0),
    });
    this.tweens.add({ targets: card.root, alpha: 0.45, scale: 0.94, delay: 400, duration: 260 });

    if (this.struggles >= HELP_AFTER) this.startHelp();
    // If only one card is left, it's the answer: make it obvious.
    const open = this.cards.filter(c => !c.isLocked);
    if (open.length === 1) this.startHelp();

    const cue = ++this.cueId;
    this.speakerCaption.setText('Hmm… listen again!');
    void say(`That's the ${card.animal.name.toLowerCase()}. Listen again!`).then(() => {
      if (cue === this.cueId && !this.answered && !this.ended) void this.playCue(true);
    });
  }

  private markProgress(a: Animal): void {
    const dot = this.progressDots[this.roundIndex];
    if (!dot) return;
    dot.setText(a.emoji).setAlpha(1).setScale(0.3);
    this.tweens.add({ targets: dot, scale: 1.15, duration: 300, ease: 'Back.Out' });
  }

  private spawnSparkles(cx: number, cy: number): void {
    const emojis = ['✨', '⭐', '🌟', '💖'];
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.4;
      const dist = 84 + Math.random() * 30;
      const e = this.add.text(cx, cy, emojis[i % emojis.length], {
        fontFamily: F.body, fontSize: '28px',
      }).setOrigin(0.5).setDepth(5);
      this.tweens.add({
        targets: e,
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        alpha: 0, scale: 1.3,
        duration: 760,
        ease: 'Sine.Out',
        onComplete: () => e.destroy(),
      });
    }
  }

  private nextRound(): void {
    if (this.ended) return;
    this.roundIndex++;
    if (this.roundIndex >= TOTAL_ROUNDS) this.endGame();
    else                                  this.loadRound();
  }

  // ─── End ───────────────────────────────────────────────────────────────

  private endGame(): void {
    this.ended = true;
    this.idleTimer?.remove();
    this.stopHelp();
    this.replayHint.setVisible(false);
    this.speaker.disableInteractive();
    this.cards.forEach(c => {
      c.root.disableInteractive();
      this.tweens.add({ targets: c.root, alpha: 0, scale: 0.7, duration: 260 });
    });
    this.showSpeakerAnimal(null);
    this.speakerCaption.setText('You found them all! 🎉');

    // Animal parade: every animal she found hops in a row, then the popup.
    const found = this.roundAnimals.slice(0, TOTAL_ROUNDS);
    const step = 74, startX = W / 2 - ((found.length - 1) * step) / 2;
    found.forEach((a, i) => {
      const t = this.add.text(startX + i * step, 500, a.emoji, {
        fontFamily: F.body, fontSize: '58px',
      }).setOrigin(0.5).setScale(0).setDepth(4);
      this.tweens.add({ targets: t, scale: 1, duration: 320, delay: 300 + i * 110, ease: 'Back.Out' });
      this.tweens.add({
        targets: t, y: 470, yoyo: true, repeat: -1, duration: 320,
        delay: 700 + i * 110, ease: 'Sine.Out',
      });
    });

    sounds.end();
    launchConfetti(this, CONFETTI_EMOJIS);
    void say('Yay! You found all the animals!');

    this.time.delayedCall(2400, () => {
      this.endOverlay.show({
        emoji: '🎉',
        title: 'Super listening!',
        subtitle: `You found all ${TOTAL_ROUNDS} animals, Aya! 🌟`,
        score: { value: `${this.score}/${TOTAL_ROUNDS}`, label: 'Animals Found' },
        stars: { earned: 3, total: 3 },
      });
    });
  }
}
