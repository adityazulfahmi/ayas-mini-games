import Phaser from 'phaser';
import { drawBg, launchConfetti } from '@shared/phaserUtils';
import { createEndPopup } from '@shared/endPopup';
import { C, T, F } from '@shared/theme';
import { sounds } from '@shared/audio';
import { shuffle } from '@shared/utils';
import {
  CATEGORY_ORDER, CHEERS, CONFETTI_EMOJIS, DISTRACTOR_POOLS, NAMES, OPTIONS_PER_ROUND,
  PROMPT_VARIANTS, TARGETS, TOTAL_ROUNDS, displayName, type Mode, type TargetCategory,
} from '../data';
import { BUBBLE_STYLES, bubbleBurst, drawBubble, popShockwave, spawnBubbleField } from './bubbles';
import { boopSound, chime, hush, popSound, say } from '../voice';

const W = 420, H = 780;

const HEADER_Y = 40;

const PROMPT_Y = 130;
const PROMPT_H = 74;

const CARD = 168;           // bubble width/height
const CARD_R = 66;
const CARD_GAP = 20;
const GRID_TOP_Y = 312;     // centre of the top row
const COL_DX = (CARD + CARD_GAP) / 2;
const ROW_DY = CARD + CARD_GAP;
const EMOJI_PX = 96;

const TRAY_Y = 690;
const TRAY_W = 372;
const TRAY_H = 92;
const SLOT_R = 30;

const IDLE_FIRST_MS = 6500;
const IDLE_REPEAT_MS = 8000;

interface AnswerCard {
  body: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  txt: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
  bob?: Phaser.Tweens.Tween;
  cx: number;
  cy: number;
  value: string;
  state: 'idle' | 'correct' | 'wrong';
}

interface Round {
  category: TargetCategory;
  correct: string;
  options: string[];
}

interface SceneInit { mode?: Mode; category?: TargetCategory }

export class GameScene extends Phaser.Scene {
  private mode: Mode = 'fruit';
  private roundIndex = 0;
  private score = 0;
  private firstTry = true;
  private answered = false;
  private idleStage = 0;

  /** Pre-built rounds (D-006): distinct correct items, distractors per round. */
  private plan: { category: TargetCategory; correct: string }[] = [];
  private current!: Round;

  private headerTxt!: Phaser.GameObjects.Text;
  private scoreTxt!: Phaser.GameObjects.Text;
  private promptBody!: Phaser.GameObjects.Container;
  private promptBg!: Phaser.GameObjects.Graphics;
  private promptTxt!: Phaser.GameObjects.Text;
  private promptSpeaker!: Phaser.GameObjects.Graphics;
  private cards: AnswerCard[] = [];
  private slots: { x: number; ring: Phaser.GameObjects.Graphics; item?: Phaser.GameObjects.Text }[] = [];
  private idleTimer?: Phaser.Time.TimerEvent;
  private hand?: Phaser.GameObjects.Text;

  private endOverlay!: ReturnType<typeof createEndPopup>;

  constructor() { super('GameScene'); }

  init(data: SceneInit): void {
    this.mode = data?.mode ?? data?.category ?? 'fruit';
  }

  create(): void {
    drawBg(this);
    spawnBubbleField(this, W, H, 12);

    // D-005: scene instances are reused — reset accumulating fields.
    this.roundIndex = 0;
    this.score = 0;
    this.idleStage = 0;
    this.cards = [];
    this.slots = [];
    this.hand = undefined;
    this.idleTimer = undefined;
    this.plan = this.buildPlan();

    this.buildHeader();
    this.buildPrompt();
    this.buildCards();
    this.buildTray();

    this.endOverlay = createEndPopup(this, W, H, {
      onPlayAgain: () => this.scene.restart({ mode: this.mode }),
      onHome:      () => this.scene.start('TitleScene'),
      onAllGames:  () => { window.location.href = '../'; },
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => hush());

    this.loadRound(true);
  }

  /**
   * Category per round + a distinct correct item for each. Single-category
   * mode repeats the chosen category; Mix walks all four categories (plus
   * one extra) without the same category twice in a row.
   */
  private buildPlan(): { category: TargetCategory; correct: string }[] {
    let cats: TargetCategory[];
    if (this.mode === 'mix') {
      const base = shuffle(CATEGORY_ORDER);
      const extra = shuffle(CATEGORY_ORDER.filter(c => c !== base[base.length - 1]))[0];
      cats = [...base, extra].slice(0, TOTAL_ROUNDS);
    } else {
      cats = Array(TOTAL_ROUNDS).fill(this.mode);
    }
    const queues = new Map<TargetCategory, string[]>();
    CATEGORY_ORDER.forEach(c => queues.set(c, shuffle(TARGETS[c].items)));
    return cats.map(category => ({ category, correct: queues.get(category)!.shift()! }));
  }

  // ─── Header ────────────────────────────────────────────────────────────

  private buildHeader(): void {
    const label = this.mode === 'mix' ? '🎲 MIX' : `${TARGETS[this.mode].emoji} ${TARGETS[this.mode].label}`;
    const pillG = this.add.graphics();
    this.headerTxt = this.add.text(22 + 16, HEADER_Y, label, {
      fontFamily: F.head, fontSize: '17px', color: T.main,
    }).setOrigin(0, 0.5);
    this.pill(22 + (this.headerTxt.width + 32) / 2, HEADER_Y, this.headerTxt.width + 32, 40, pillG);

    this.pill(W - 64, HEADER_Y, 96, 40);
    this.scoreTxt = this.add.text(W - 64, HEADER_Y, `⭐ 0`, {
      fontFamily: F.head, fontSize: '18px', color: T.main,
    }).setOrigin(0.5);
  }

  private pill(cx: number, cy: number, w: number, h: number, g = this.add.graphics()): void {
    g.fillStyle(C.white, 0.9);
    g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
    g.lineStyle(1.5, C.lavender, 0.45);
    g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
  }

  // ─── Prompt (speech bubble — tap to hear it again) ────────────────────

  private buildPrompt(): void {
    this.promptBg = this.add.graphics();
    this.promptTxt = this.add.text(-14, 0, '', {
      fontFamily: F.head, fontSize: '26px', color: T.main, align: 'center',
    }).setOrigin(0.5);
    this.promptSpeaker = this.add.graphics();
    this.promptBody = this.add.container(W / 2, PROMPT_Y, [this.promptBg, this.promptTxt, this.promptSpeaker]);

    const zone = this.add.zone(W / 2, PROMPT_Y, 380, PROMPT_H + 10).setInteractive({ cursor: 'pointer' });
    zone.on('pointerdown', () => {
      if (this.answered) return;
      this.speakPrompt(true);
      this.tweens.add({ targets: this.promptBody, scale: { from: 0.94, to: 1 }, duration: 260, ease: 'Back.Out' });
      this.armIdle();
    });
  }

  /** Paint the speech bubble around the current text. `found` = mint style. */
  private paintPrompt(found: boolean): void {
    const speakerW = found ? 0 : 34;
    this.promptTxt.setScale(1);
    const maxTextW = 380 - 44 - speakerW;
    if (this.promptTxt.width > maxTextW) this.promptTxt.setScale(maxTextW / this.promptTxt.width);
    const textW = this.promptTxt.width * this.promptTxt.scaleX;
    const w = Math.min(380, Math.max(textW + 44 + speakerW, 250));
    const h = PROMPT_H;
    const x = -w / 2, y = -h / 2;
    this.promptTxt.setX(-speakerW / 2);
    this.promptTxt.setColor(found ? T.mint : T.main);

    const g = this.promptBg;
    g.clear();
    g.fillStyle(C.shadow, 0.16);
    g.fillRoundedRect(x + 2, y + 8, w, h, h / 2);
    g.fillStyle(found ? C.mintBg : C.white, 1);
    g.fillRoundedRect(x, y, w, h, h / 2);
    g.lineStyle(3, found ? C.mint : C.lavender, found ? 1 : 0.75);
    g.strokeRoundedRect(x, y, w, h, h / 2);
    g.fillStyle(C.white, 0.6);
    g.fillEllipse(0, y + h * 0.22, w * 0.74, h * 0.26);
    // Tail pointing down at the bubbles.
    const ty = y + h;
    g.fillStyle(found ? C.mintBg : C.white, 1);
    g.fillTriangle(-11, ty - 2, 11, ty - 2, 0, ty + 13);
    g.lineStyle(3, found ? C.mint : C.lavender, found ? 1 : 0.75);
    g.lineBetween(-11, ty - 1, 0, ty + 13);
    g.lineBetween(11, ty - 1, 0, ty + 13);

    // Small drawn speaker (the 🔊 emoji renders dark grey on Apple devices).
    const s = this.promptSpeaker;
    s.clear();
    if (!found) {
      const sx = x + w - 40, sy = 0;
      s.fillStyle(C.lavender2, 1);
      s.fillRoundedRect(sx - 4, sy - 6, 7, 12, 2);
      s.fillTriangle(sx + 1, sy - 6, sx + 1, sy + 6, sx + 11, sy + 12);
      s.fillTriangle(sx + 1, sy - 6, sx + 11, sy - 12, sx + 11, sy + 12);
      s.lineStyle(2.5, C.lavender2, 1);
      s.beginPath(); s.arc(sx + 13, sy, 7, -0.9, 0.9); s.strokePath();
      s.beginPath(); s.arc(sx + 13, sy, 13, -0.9, 0.9); s.strokePath();
    }
  }

  private promptText(): { shown: string; spoken: string } {
    const t = TARGETS[this.current.category];
    const variant = PROMPT_VARIANTS[this.roundIndex % PROMPT_VARIANTS.length];
    return {
      shown: `${t.emoji} ${variant.replace('{L}', t.label)}`,
      spoken: variant.replace('{L}', t.word),
    };
  }

  private speakPrompt(interrupt: boolean): void {
    say(this.promptText().spoken, interrupt);
  }

  // ─── Cards (bubbles) ───────────────────────────────────────────────────

  private buildCards(): void {
    const positions: [number, number][] = [
      [W / 2 - COL_DX, GRID_TOP_Y],
      [W / 2 + COL_DX, GRID_TOP_Y],
      [W / 2 - COL_DX, GRID_TOP_Y + ROW_DY],
      [W / 2 + COL_DX, GRID_TOP_Y + ROW_DY],
    ];
    positions.forEach(([cx, cy]) => {
      const bg = this.add.graphics();
      const txt = this.add.text(0, -2, '', { fontFamily: F.body, fontSize: `${EMOJI_PX}px` }).setOrigin(0.5);
      const body = this.add.container(cx, cy, [bg, txt]);
      // Forgiving hit area: the full cell including half the gap.
      const zone = this.add.zone(cx, cy, CARD + CARD_GAP, CARD + CARD_GAP).setInteractive({ cursor: 'pointer' });
      const card: AnswerCard = { body, bg, txt, zone, cx, cy, value: '', state: 'idle' };
      this.cards.push(card);
      zone.on('pointerdown', () => this.onCardTap(card));
      zone.on('pointerover', () => { if (card.state === 'idle' && !this.answered) this.tweens.add({ targets: txt, scale: 1.08, duration: 140 }); });
      zone.on('pointerout', () => { if (card.state === 'idle' && !this.answered) this.tweens.add({ targets: txt, scale: 1, duration: 140 }); });
    });
  }

  private paint(card: AnswerCard): void {
    drawBubble(card.bg, 0, 0, CARD, CARD, CARD_R, BUBBLE_STYLES[card.state]);
  }

  private startBob(card: AnswerCard, i: number): void {
    card.bob?.remove();
    card.body.y = card.cy;
    card.bob = this.tweens.add({
      targets: card.body, y: card.cy + 6,
      duration: 1700 + i * 160, delay: i * 200,
      ease: 'Sine.InOut', yoyo: true, repeat: -1,
    });
  }

  // ─── Found-items tray ─────────────────────────────────────────────────

  private buildTray(): void {
    const g = this.add.graphics();
    const x = W / 2 - TRAY_W / 2, y = TRAY_Y - TRAY_H / 2;
    g.fillStyle(C.shadow, 0.12);
    g.fillRoundedRect(x + 2, y + 6, TRAY_W, TRAY_H, TRAY_H / 2);
    g.fillStyle(C.white, 0.75);
    g.fillRoundedRect(x, y, TRAY_W, TRAY_H, TRAY_H / 2);
    g.lineStyle(2, C.lavender, 0.5);
    g.strokeRoundedRect(x, y, TRAY_W, TRAY_H, TRAY_H / 2);

    const inset = TRAY_H / 2;
    const step = (TRAY_W - inset * 2) / (TOTAL_ROUNDS - 1);
    for (let i = 0; i < TOTAL_ROUNDS; i++) {
      const sx = x + inset + i * step;
      const ring = this.add.graphics().setPosition(sx, TRAY_Y);
      this.slots.push({ x: sx, ring });
    }
    this.paintSlots();
  }

  private paintSlots(): void {
    this.slots.forEach((s, i) => {
      const g = s.ring;
      g.clear();
      if (s.item) {
        g.fillStyle(C.mintBg, 1);
        g.fillCircle(0, 0, SLOT_R);
        g.lineStyle(2.5, C.mint, 1);
        g.strokeCircle(0, 0, SLOT_R);
      } else if (i === this.roundIndex) {
        g.fillStyle(C.white, 1);
        g.fillCircle(0, 0, SLOT_R);
        g.lineStyle(3, C.pink, 0.9);
        g.strokeCircle(0, 0, SLOT_R);
      } else {
        g.fillStyle(C.bg2, 0.9);
        g.fillCircle(0, 0, SLOT_R);
        g.lineStyle(2, C.lavender, 0.45);
        g.strokeCircle(0, 0, SLOT_R);
      }
    });
  }

  // ─── Round logic ──────────────────────────────────────────────────────

  private loadRound(first: boolean): void {
    this.answered = false;
    this.firstTry = true;
    this.idleStage = 0;
    this.current = this.makeRound();
    this.paintSlots();

    this.promptTxt.setText(this.promptText().shown);
    this.paintPrompt(false);
    this.tweens.add({ targets: this.promptBody, scale: { from: 0.85, to: 1 }, duration: 300, ease: 'Back.Out' });
    // First prompt follows the title tap (a user gesture), so it may
    // interrupt; later ones queue behind "Strawberry! Yay!".
    this.speakPrompt(first);

    this.cards.forEach((card, i) => {
      card.value = this.current.options[i];
      card.state = 'idle';
      card.zone.setInteractive({ cursor: 'pointer' });
      card.txt.setText(card.value).setScale(1).setAlpha(1).setAngle(0);
      card.bg.setScale(1).setAlpha(1);
      this.paint(card);
      card.body.setScale(0).setAlpha(1).setAngle(0);
      this.tweens.add({
        targets: card.body, scale: 1,
        delay: 80 + i * 90, duration: 360, ease: 'Back.Out',
        onComplete: () => this.startBob(card, i),
      });
    });

    this.armIdle();
  }

  /**
   * One correct from the plan + three distractors, each from a different
   * pool, after filtering the target's excluded pools/items (D-012).
   */
  private makeRound(): Round {
    const { category, correct } = this.plan[this.roundIndex];
    const t = TARGETS[category];
    const excludedPools = new Set(t.excludedDistractorPools ?? []);
    const excludedItems = new Set(t.excludedDistractorItems ?? []);
    const pools = Object.keys(DISTRACTOR_POOLS).filter(k => !excludedPools.has(k));
    const distractors = shuffle(pools).slice(0, OPTIONS_PER_ROUND - 1).map(key => {
      const items = DISTRACTOR_POOLS[key].filter(e => !excludedItems.has(e));
      return items[Math.floor(Math.random() * items.length)];
    });
    return { category, correct, options: shuffle([correct, ...distractors]) };
  }

  // ─── Taps ─────────────────────────────────────────────────────────────

  private onCardTap(card: AnswerCard): void {
    if (this.answered || card.state !== 'idle') return;
    this.hideHand();
    if (card.value === this.current.correct) this.handleCorrect(card);
    else this.handleWrong(card);
  }

  /** Gentle: a jelly wobble, a soft boop, and the item's name. Never punishing. */
  private handleWrong(card: AnswerCard): void {
    this.firstTry = false;
    card.state = 'wrong';
    card.zone.disableInteractive();
    card.bob?.remove();
    boopSound();
    const t = TARGETS[this.current.category];
    say(`That's ${NAMES[card.value] ?? 'not it'}. Find the ${t.word}!`);

    this.tweens.chain({
      targets: card.body,
      tweens: [
        { scaleX: 1.12, scaleY: 0.88, duration: 90, ease: 'Sine.Out' },
        { scaleX: 0.92, scaleY: 1.08, duration: 110, ease: 'Sine.InOut' },
        { scaleX: 1, scaleY: 1, duration: 160, ease: 'Back.Out' },
      ],
      onComplete: () => {
        this.paint(card);
        this.tweens.add({ targets: card.txt, alpha: 0.4, scale: 0.86, duration: 220 });
      },
    });
    this.armIdle();
  }

  private handleCorrect(card: AnswerCard): void {
    this.answered = true;
    this.idleTimer?.remove();
    if (this.firstTry) this.score++;
    this.scoreTxt.setText(`⭐ ${this.score}`);
    if (this.firstTry) this.tweens.add({ targets: this.scoreTxt, scale: { from: 1.4, to: 1 }, duration: 320, ease: 'Back.Out' });

    // Pop! The bubble skin bursts; the item stays and grows.
    popSound();
    this.time.delayedCall(90, () => sounds.correct());
    const name = displayName(card.value);
    const cheer = CHEERS[Math.floor(Math.random() * CHEERS.length)];
    say(`${name}! ${cheer}`);

    card.state = 'correct';
    card.bob?.remove();
    const wx = card.body.x, wy = card.body.y;
    bubbleBurst(this, wx, wy, CARD / 2, C.mint);
    popShockwave(this, wx, wy, CARD * 0.45, CARD * 0.95);
    this.tweens.add({ targets: card.bg, scale: 1.18, alpha: 0, duration: 160, ease: 'Cubic.Out' });
    this.tweens.add({ targets: card.txt, scale: 1.35, duration: 280, ease: 'Back.Out' });
    card.body.setDepth(10);
    this.sparkles(wx, wy);

    this.promptTxt.setText(`${card.value} ${name}!`);
    this.paintPrompt(true);
    this.tweens.add({ targets: this.promptBody, scale: { from: 0.85, to: 1 }, duration: 300, ease: 'Back.Out' });

    // The other bubbles drift away softly.
    this.cards.forEach(c => {
      c.zone.disableInteractive();
      if (c === card) return;
      c.bob?.remove();
      this.tweens.add({ targets: c.body, alpha: 0, scale: 0.7, duration: 320, delay: 250, ease: 'Sine.In' });
    });

    // Then the found item flies into its tray slot.
    const slot = this.slots[this.roundIndex];
    this.time.delayedCall(950, () => {
      const flyer = this.add.text(wx, wy, card.value, { fontFamily: F.body, fontSize: `${EMOJI_PX}px` })
        .setOrigin(0.5).setScale(1.35).setDepth(20);
      card.txt.setAlpha(0);
      this.tweens.add({
        targets: flyer, x: slot.x, y: TRAY_Y, scale: 0.42,
        duration: 520, ease: 'Cubic.InOut',
        onComplete: () => {
          flyer.destroy();
          slot.item = this.add.text(slot.x, TRAY_Y, card.value, { fontFamily: F.body, fontSize: '40px' })
            .setOrigin(0.5).setDepth(5);
          this.tweens.add({ targets: slot.item, scale: { from: 1.4, to: 1 }, duration: 260, ease: 'Back.Out' });
          chime(this.roundIndex);
          this.paintSlots();
          card.body.setDepth(0);
          this.time.delayedCall(380, () => this.nextRound());
        },
      });
    });
  }

  private sparkles(cx: number, cy: number): void {
    const sparks = ['✨', '⭐', '💖', '🌟'];
    for (let i = 0; i < 8; i++) {
      const s = this.add.text(cx, cy, sparks[i % sparks.length], { fontFamily: F.body, fontSize: '26px' })
        .setOrigin(0.5).setDepth(25);
      const a = (i / 8) * Math.PI * 2 + Math.random() * 0.3;
      const d = 96 + Math.random() * 30;
      this.tweens.add({
        targets: s,
        x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d - 16,
        alpha: 0, scale: { from: 0.5, to: 1.4 },
        duration: 760, ease: 'Cubic.Out',
        onComplete: () => s.destroy(),
      });
    }
  }

  // ─── Idle hint ────────────────────────────────────────────────────────

  /**
   * No success for a while → say the prompt again and give the right
   * bubble a happy wiggle. If still stuck, a little hand points at it.
   */
  private armIdle(): void {
    this.idleTimer?.remove();
    this.idleTimer = this.time.delayedCall(this.idleStage === 0 ? IDLE_FIRST_MS : IDLE_REPEAT_MS, () => {
      if (this.answered) return;
      const target = this.cards.find(c => c.value === this.current.correct);
      if (!target) return;
      this.idleStage++;
      // Repeat the spoken prompt a few times, then go quiet (the wiggle
      // and hand keep going) so it never nags.
      if (this.idleStage <= 3) this.speakPrompt(true);
      this.tweens.add({
        targets: target.txt, angle: { from: -12, to: 12 },
        duration: 110, yoyo: true, repeat: 3,
        onComplete: () => target.txt.setAngle(0),
      });
      this.tweens.add({ targets: target.txt, scale: { from: 1, to: 1.18 }, duration: 220, yoyo: true });
      if (this.idleStage >= 2) this.showHand(target);
      this.armIdle();
    });
  }

  private showHand(card: AnswerCard): void {
    if (this.hand) return;
    this.hand = this.add.text(card.cx + 34, card.cy + 70, '👆', { fontFamily: F.body, fontSize: '50px' })
      .setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: this.hand, y: card.cy + 52, yoyo: true, repeat: -1, duration: 420, ease: 'Sine.InOut' });
  }

  private hideHand(): void {
    this.hand?.destroy();
    this.hand = undefined;
  }

  // ─── Flow ─────────────────────────────────────────────────────────────

  private nextRound(): void {
    this.roundIndex++;
    if (this.roundIndex >= TOTAL_ROUNDS) {
      this.celebrate();
      return;
    }
    this.loadRound(false);
  }

  /** The five found items hop one by one with a rising chime, then the popup. */
  private celebrate(): void {
    this.idleTimer?.remove();
    this.promptTxt.setText('🎉 You found them all!');
    this.paintPrompt(true);
    this.tweens.add({ targets: this.promptBody, scale: { from: 0.85, to: 1 }, duration: 300, ease: 'Back.Out' });
    say('You found them all! Yay, Aya!', false);
    this.slots.forEach((s, i) => {
      this.time.delayedCall(i * 180, () => {
        chime(i);
        if (s.item) this.tweens.add({ targets: s.item, y: TRAY_Y - 26, scale: 1.25, duration: 160, yoyo: true, ease: 'Sine.Out' });
      });
    });
    this.time.delayedCall(TOTAL_ROUNDS * 180 + 500, () => {
      sounds.end();
      launchConfetti(this, CONFETTI_EMOJIS);
      this.endOverlay.show(this.endGameData());
    });
  }

  private endGameData(): Parameters<typeof this.endOverlay.show>[0] {
    const stars = this.score >= TOTAL_ROUNDS ? 3 : this.score >= 3 ? 2 : 1;
    const found = this.slots.map(s => s.item?.text ?? '').join('');
    const scoreLabel = 'First-try pops';
    if (this.score === TOTAL_ROUNDS) {
      return {
        emoji: '🏆', title: 'Pop star!',
        subtitle: `Every one on the first try, Aya! ${found}`,
        score: { value: `${this.score}/${TOTAL_ROUNDS}`, label: scoreLabel },
        stars: { earned: stars, total: 3 },
      };
    }
    return {
      emoji: stars === 2 ? '🌟' : '🎉', title: stars === 2 ? 'Super popping!' : 'You found them all!',
      subtitle: `Look what Aya found! ${found}`,
      score: { value: `${this.score}/${TOTAL_ROUNDS}`, label: scoreLabel },
      stars: { earned: stars, total: 3 },
    };
  }
}
