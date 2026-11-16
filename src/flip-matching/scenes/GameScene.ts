import Phaser from 'phaser';
import { drawBg, launchConfetti } from '@shared/phaserUtils';
import { createEndPopup } from '@shared/endPopup';
import { C, T, F } from '@shared/theme';
import { sounds, playTone } from '@shared/audio';
import { shuffle, formatTime } from '@shared/utils';
import { CONFETTI_EMOJIS, type GridSize, type Item } from '../data';
import { drawCardBack, drawCardFront, pickItems, say } from '../cards';

const W = 480, H = 820;
const PAD = 14;
const HEADER_Y = 12;
const HEADER_H = 76;
const GRID_TOP = HEADER_Y + HEADER_H + 16;
const GRID_BOTTOM = H - 18;
/** Cards are a little taller than wide, like real playing cards. */
const ASPECT = 1.2;
const MAX_CARD_W = 210;
const IDLE_MS = 8000;

interface Card {
  item: Item;
  x: number;
  y: number;
  container: Phaser.GameObjects.Container;
  g: Phaser.GameObjects.Graphics;
  face: Phaser.GameObjects.Text;
  faceUp: boolean;
  matched: boolean;
}

interface Slot { x: number; y: number; size: number; g: Phaser.GameObjects.Graphics; heart: Phaser.GameObjects.Text }

export class GameScene extends Phaser.Scene {
  private cols = 2;
  private rows = 2;
  private cw = 100;
  private ch = 120;
  private cards: Card[] = [];
  private open: Card[] = [];
  private slots: Slot[] = [];
  private matchedCount = 0;
  private totalPairs = 0;
  /** True during the deal/peek and after the win. */
  private locked = true;
  /** True for the brief moment a 2nd card is turning over. */
  private judging = false;
  private mismatchTimer?: Phaser.Time.TimerEvent;
  private idleTimer?: Phaser.Time.TimerEvent;
  private hand?: Phaser.GameObjects.Text;
  private startedAt = 0;
  private endOverlay!: ReturnType<typeof createEndPopup>;

  constructor() { super('GameScene'); }

  init(data: { size?: GridSize }): void {
    this.cols = data?.size?.cols ?? 2;
    this.rows = data?.size?.rows ?? 2;
  }

  create(): void {
    drawBg(this);
    // D-005: arrays persist across scene visits — reset them.
    this.cards = [];
    this.open = [];
    this.slots = [];
    this.matchedCount = 0;
    this.locked = true;
    this.judging = false;
    this.mismatchTimer = undefined;
    this.idleTimer = undefined;
    this.hand = undefined;
    this.startedAt = 0;
    this.totalPairs = (this.cols * this.rows) / 2;

    this.buildHeader();
    this.buildGrid();
    this.buildEndOverlay();
    this.dealAndPeek();
    // Play-test hook (screenshots): expose card layout only with ?test in the URL.
    if (new URLSearchParams(location.search).has('test')) {
      (window as unknown as { __flip: unknown }).__flip = this;
    }
  }

  // ─── Header: 🏠 · pair slots · ↻ ───────────────────────────────────────

  private buildHeader(): void {
    const bg = this.add.graphics();
    bg.fillStyle(C.shadow, 0.12);
    bg.fillRoundedRect(PAD, HEADER_Y + 4, W - PAD * 2, HEADER_H, 24);
    bg.fillStyle(C.white, 0.92);
    bg.fillRoundedRect(PAD, HEADER_Y, W - PAD * 2, HEADER_H, 24);

    const cy = HEADER_Y + HEADER_H / 2;
    this.roundBtn(PAD + 42, cy, '🏠', () => this.scene.start('TitleScene'));
    this.roundBtn(W - PAD - 42, cy, '↻', () => this.scene.restart({ size: { cols: this.cols, rows: this.rows } }));

    // One slot per pair; a matched pair's picture flies up into its slot.
    // More than 8 pairs: two rows, so the slots stay big enough to see.
    const n = this.totalPairs;
    const lines = n > 8 ? 2 : 1;
    const perLine = Math.ceil(n / lines);
    const avail = W - PAD * 2 - 84 * 2;
    const gap = lines > 1 ? 5 : 8;
    const size = Math.min(46, (avail - gap * (perLine - 1)) / perLine, (HEADER_H - 12 - gap * (lines - 1)) / lines);
    for (let i = 0; i < n; i++) {
      const line = Math.floor(i / perLine);
      const inLine = line === lines - 1 ? n - perLine * (lines - 1) : perLine;
      const rowW = inLine * size + (inLine - 1) * gap;
      const x = W / 2 - rowW / 2 + size / 2 + (i % perLine) * (size + gap);
      const sy = cy + (line - (lines - 1) / 2) * (size + gap);
      const g = this.add.graphics();
      g.fillStyle(C.lavender, 0.18);
      g.fillRoundedRect(x - size / 2, sy - size / 2, size, size, size * 0.3);
      g.lineStyle(2, C.lavender, 0.5);
      g.strokeRoundedRect(x - size / 2, sy - size / 2, size, size, size * 0.3);
      const heart = this.add.text(x, sy, '♥', {
        fontFamily: F.head, fontSize: `${Math.round(size * 0.46)}px`, color: '#e1bee7',
      }).setOrigin(0.5);
      this.slots.push({ x, y: sy, size, g, heart });
    }
  }

  private roundBtn(x: number, y: number, label: string, onTap: () => void): void {
    const g = this.add.graphics();
    g.fillStyle(C.bg1, 1);
    g.fillCircle(x, y, 25);
    g.lineStyle(2.5, C.pink, 0.7);
    g.strokeCircle(x, y, 25);
    const isEmoji = label !== '↻';
    this.add.text(x, y + (isEmoji ? 0 : -1), label, {
      fontFamily: isEmoji ? F.body : F.head,
      fontSize: isEmoji ? '24px' : '30px', color: T.main,
    }).setOrigin(0.5);
    this.add.zone(x, y, 64, 64).setInteractive({ cursor: 'pointer' }).on('pointerdown', onTap);
  }

  // ─── Grid ─────────────────────────────────────────────────────────────

  private buildGrid(): void {
    const gap = this.cols >= 4 ? 10 : 14;
    const availW = W - PAD * 2;
    const availH = GRID_BOTTOM - GRID_TOP;
    const cw = Math.min(
      MAX_CARD_W,
      (availW - gap * (this.cols - 1)) / this.cols,
      (availH - gap * (this.rows - 1)) / this.rows / ASPECT,
    );
    const ch = cw * ASPECT;
    this.cw = cw; this.ch = ch;
    const gridW = cw * this.cols + gap * (this.cols - 1);
    const gridH = ch * this.rows + gap * (this.rows - 1);
    const x0 = W / 2 - gridW / 2 + cw / 2;
    const y0 = GRID_TOP + (availH - gridH) / 2 + ch / 2;

    const items = pickItems(this.totalPairs);
    const deck = shuffle([...items, ...items]);

    this.cards = deck.map((item, i) => {
      const x = x0 + (i % this.cols) * (cw + gap);
      const y = y0 + Math.floor(i / this.cols) * (ch + gap);
      const g = this.add.graphics();
      drawCardBack(g, cw, ch);
      const face = this.add.text(0, 0, item.emoji, {
        fontFamily: F.body, fontSize: `${Math.round(cw * 0.6)}px`,
        padding: { top: 6, bottom: 6 },
      }).setOrigin(0.5).setVisible(false);
      const container = this.add.container(x, y, [g, face]);
      const card: Card = { item, x, y, container, g, face, faceUp: false, matched: false };

      // Forgiving hit area: the card plus half the gap around it.
      const zone = this.add.zone(x, y, cw + gap, ch + gap).setInteractive({ cursor: 'pointer' });
      zone.on('pointerdown', () => this.onTap(card));
      zone.on('pointerover', () => {
        if (!card.faceUp && !card.matched && !this.locked) drawCardBack(g, cw, ch, true);
      });
      zone.on('pointerout', () => {
        if (!card.faceUp && !card.matched) drawCardBack(g, cw, ch, false);
      });
      return card;
    });
  }

  /** Cards pop in, all turn over for a short "peek", then turn back. */
  private dealAndPeek(): void {
    this.cards.forEach((c, i) => {
      c.container.setScale(0);
      this.tweens.add({ targets: c.container, scale: 1, duration: 320, delay: 60 * i, ease: 'Back.Out' });
    });
    const dealt = 60 * this.cards.length + 360;
    const stagger = 40;
    const peek = 1400 + 260 * this.totalPairs;
    this.time.delayedCall(dealt, () => {
      say('Look!');
      this.cards.forEach((c, i) => this.time.delayedCall(i * stagger, () => this.flip(c, true, i === 0)));
    });
    this.time.delayedCall(dealt + peek, () => {
      this.cards.forEach((c, i) => this.time.delayedCall(i * stagger, () => this.flip(c, false, i === 0)));
    });
    this.time.delayedCall(dealt + peek + stagger * this.cards.length + 320, () => {
      this.locked = false;
      say('Find two the same!');
      this.armIdleHint();
    });
  }

  // ─── Play ─────────────────────────────────────────────────────────────

  private onTap(card: Card): void {
    if (this.locked || this.judging || card.faceUp || card.matched) return;
    if (!this.startedAt) this.startedAt = Date.now();
    this.clearHint();
    // An impatient tap while a wrong pair is showing just turns them back now.
    if (this.mismatchTimer) this.turnBackMismatch(false);

    card.faceUp = true;
    this.open.push(card);
    const second = this.open.length === 2;
    const isMatch = second && this.open[0].item === this.open[1].item;
    if (!isMatch) say(card.item.name);
    if (second) this.judging = true;

    this.flip(card, true, true, () => {
      if (!second) { this.armIdleHint(); return; }
      this.judging = false;
      if (isMatch) this.onMatch();
      else this.onMismatch();
    });
  }

  /** A card turn: it lifts and squashes to edge-on, swaps faces, then springs back. */
  private flip(card: Card, toFront: boolean, withSound: boolean, onDone?: () => void): void {
    if (withSound) playTone(toFront ? 660 : 520, 0.09, 'triangle', 0.1);
    const c = card.container;
    this.tweens.killTweensOf(c);
    c.setDepth(5);
    this.tweens.add({
      targets: c, scaleX: 0, scaleY: 1.08, y: card.y - 10, duration: 110, ease: 'Sine.In',
      onComplete: () => {
        if (toFront) {
          drawCardFront(card.g, this.cw, this.ch, card.matched);
          card.face.setVisible(true);
        } else {
          drawCardBack(card.g, this.cw, this.ch);
          card.face.setVisible(false);
        }
        this.tweens.add({
          targets: c, scaleX: 1, scaleY: 1, y: card.y, duration: 200, ease: 'Back.Out',
          onComplete: () => { c.setDepth(0); onDone?.(); },
        });
      },
    });
  }

  private onMatch(): void {
    const [a, b] = this.open;
    this.open = [];
    a.matched = b.matched = true;
    this.matchedCount++;
    sounds.match();
    playTone(1047, 0.14, 'sine', 0.08, 0.42);
    say(`Two ${a.item.plural}!`);

    [a, b].forEach((c, i) => {
      drawCardFront(c.g, this.cw, this.ch, true);
      c.container.setDepth(6);
      this.tweens.add({
        targets: c.container, scale: 1.14, angle: i ? 5 : -5, duration: 180, yoyo: true, ease: 'Sine.Out',
        onComplete: () => { c.container.setAngle(0).setDepth(0); },
      });
      this.tweens.add({ targets: c.face, y: -8, duration: 160, yoyo: true, repeat: 1, ease: 'Sine.Out', delay: 360 });
      this.ring(c.x, c.y);
      this.sparkles(c.x, c.y);
    });

    // A copy of the picture flies up into its slot in the header.
    const slot = this.slots[this.matchedCount - 1];
    const fly = this.add.text(b.x, b.y, a.item.emoji, {
      fontFamily: F.body, fontSize: `${Math.round(this.cw * 0.6)}px`,
      padding: { top: 6, bottom: 6 },
    }).setOrigin(0.5).setDepth(20);
    const endScale = (slot.size * 0.72) / Math.max(fly.width, fly.height - 12);
    this.tweens.add({
      targets: fly, x: slot.x, y: slot.y, scale: endScale,
      duration: 650, delay: 380, ease: 'Cubic.InOut',
      onComplete: () => {
        slot.heart.setVisible(false);
        const s = slot.size;
        slot.g.clear();
        slot.g.fillStyle(C.mintBg, 1);
        slot.g.fillRoundedRect(slot.x - s / 2, slot.y - s / 2, s, s, s * 0.3);
        slot.g.lineStyle(2, C.mint, 1);
        slot.g.strokeRoundedRect(slot.x - s / 2, slot.y - s / 2, s, s, s * 0.3);
        this.tweens.add({ targets: fly, scale: endScale * 1.35, duration: 120, yoyo: true });
        playTone(880, 0.1, 'sine', 0.08);
      },
    });

    if (this.matchedCount === this.totalPairs) {
      this.locked = true;
      this.clearHint();
      this.idleTimer?.remove();
      this.time.delayedCall(1200, () => this.onWin());
    } else {
      this.armIdleHint();
    }
  }

  private onMismatch(): void {
    sounds.noMatch();
    this.mismatchTimer = this.time.delayedCall(1100, () => this.turnBackMismatch(true));
    this.armIdleHint();
  }

  private turnBackMismatch(wiggle: boolean): void {
    this.mismatchTimer?.remove();
    this.mismatchTimer = undefined;
    const pair = this.open;
    this.open = [];
    pair.forEach(c => {
      c.faceUp = false;
      if (!wiggle) { this.flip(c, false, false); return; }
      // A gentle "nope" wiggle, then they turn back over.
      this.tweens.add({
        targets: c.container, angle: { from: -4, to: 4 }, duration: 70, yoyo: true, repeat: 2,
        onComplete: () => { c.container.setAngle(0); this.flip(c, false, false); },
      });
    });
  }

  // ─── Idle hint ────────────────────────────────────────────────────────

  /**
   * After a quiet spell, gently help: with one card up, its twin wiggles and a
   * hand points at it; with none up, a random face-down card wiggles.
   */
  private armIdleHint(): void {
    this.idleTimer?.remove();
    this.idleTimer = this.time.delayedCall(IDLE_MS, () => {
      if (this.locked) return;
      if (this.judging || this.mismatchTimer) { this.armIdleHint(); return; }
      let target: Card | undefined;
      if (this.open.length === 1) {
        const first = this.open[0];
        target = this.cards.find(c => c !== first && c.item === first.item);
        if (target) this.showHand(target);
      } else {
        const down = this.cards.filter(c => !c.faceUp && !c.matched);
        target = down[Math.floor(Math.random() * down.length)];
      }
      if (target) {
        const ctr = target.container;
        this.tweens.add({
          targets: ctr, angle: { from: -6, to: 6 }, duration: 120, yoyo: true, repeat: 3,
          onComplete: () => ctr.setAngle(0),
        });
      }
      this.armIdleHint();
    });
  }

  private showHand(card: Card): void {
    this.hand?.destroy();
    const y = card.y + this.ch * 0.2;
    this.hand = this.add.text(card.x + this.cw * 0.15, y, '👆', { fontFamily: F.body, fontSize: '44px' })
      .setOrigin(0.5, 0).setDepth(30);
    this.tweens.add({ targets: this.hand, y: y + 12, yoyo: true, repeat: -1, duration: 420, ease: 'Sine.InOut' });
  }

  private clearHint(): void {
    this.hand?.destroy();
    this.hand = undefined;
  }

  // ─── Effects ──────────────────────────────────────────────────────────

  private ring(x: number, y: number): void {
    const g = this.add.graphics().setDepth(4);
    const base = Math.min(this.cw, this.ch) / 2;
    const s = { r: base * 0.8, a: 0.9 };
    this.tweens.add({
      targets: s, r: base * 1.5, a: 0, duration: 650, ease: 'Sine.Out',
      onUpdate: () => { g.clear(); g.lineStyle(5, C.mint, s.a); g.strokeCircle(x, y, s.r); },
      onComplete: () => g.destroy(),
    });
  }

  private sparkles(x: number, y: number): void {
    const emojis = ['✨', '⭐', '💖', '🌟'];
    const reach = Math.min(this.cw, this.ch) * 0.7 + 20;
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6 + Math.random() * 0.5;
      const d = reach * (0.8 + Math.random() * 0.4);
      const e = this.add.text(x, y, emojis[i % emojis.length], { fontFamily: F.body, fontSize: '22px' })
        .setOrigin(0.5).setDepth(15);
      this.tweens.add({
        targets: e, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, scale: 1.3,
        duration: 750, ease: 'Sine.Out', onComplete: () => e.destroy(),
      });
    }
  }

  // ─── End ──────────────────────────────────────────────────────────────

  private buildEndOverlay(): void {
    this.endOverlay = createEndPopup(this, W, H, {
      onPlayAgain: () => this.scene.restart({ size: { cols: this.cols, rows: this.rows } }),
      onHome:      () => this.scene.start('TitleScene'),
      onAllGames:  () => { window.location.href = '../'; },
    });
  }

  private onWin(): void {
    const secs = this.startedAt ? Math.round((Date.now() - this.startedAt) / 1000) : 0;
    // Every card does a little hop, row by row.
    this.cards.forEach((c, i) => {
      this.tweens.add({
        targets: c.container, y: c.y - 16, duration: 180, yoyo: true, ease: 'Sine.Out',
        delay: Math.floor(i / this.cols) * 90 + (i % this.cols) * 30,
      });
    });
    sounds.win();
    say('You did it, Aya!');
    launchConfetti(this, CONFETTI_EMOJIS);
    this.time.delayedCall(900, () => {
      // No time pressure: every finished game earns all three stars. The time
      // is shown quietly for Papa, never scored.
      this.endOverlay.show({
        emoji: '🎊',
        title: 'You did it, Aya!',
        subtitle: `Every picture found its twin 💖  ·  ${formatTime(secs)}`,
        score: { value: `${this.totalPairs}`, label: 'Pairs Found' },
        stars: { earned: 3 },
      });
    });
  }
}
