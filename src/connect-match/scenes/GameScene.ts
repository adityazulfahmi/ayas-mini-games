import Phaser from 'phaser';
import { drawBg, launchConfetti } from '@shared/phaserUtils';
import { createEndPopup } from '@shared/endPopup';
import { C, T, F } from '@shared/theme';
import { sounds } from '@shared/audio';
import { shuffle } from '@shared/utils';
import {
  CONFETTI_EMOJIS, IDLE_HINT_MS, LEVELS, PairDeck, RACE_MS, RACE_PAIRS,
  type GameConfig, type Pair,
} from '../data';
import { hush, say } from '../speech';

const W = 420, H = 780;

const CARD = 128;
const RADIUS = 26;
const EMOJI_PX = 76;
const KNOB_R = 11;

const LEFT_CX = 86;
const RIGHT_CX = W - 86;
const ROWS: Record<number, number[]> = {
  2: [318, 498],
  3: [252, 414, 576],
};

/** Each connected pair gets its own line colour so crossing lines stay readable. */
const LINE_COLOURS = [0x4db6ac, 0xf06292, 0xab47bc, 0xffa726];

type Side = 'L' | 'R';

interface Card {
  pair: Pair;
  side: Side;
  cx: number;
  cy: number;
  box: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  knob: Phaser.GameObjects.Graphics;
  matched: boolean;
  colour: number;
}

export class GameScene extends Phaser.Scene {
  private cfg: GameConfig = { level: 'easy', timed: false };
  private deck!: PairDeck;
  private rounds: number[] = [];
  private roundIdx = 0;
  private cards: Card[] = [];
  private lines: Phaser.GameObjects.Graphics[] = [];
  private selected: Card | null = null;
  private dragFrom: Card | null = null;
  private dragStart = { x: 0, y: 0 };
  private dragging = false;
  private tapDeselect = false;
  private dragLine!: Phaser.GameObjects.Graphics;
  private hoverTarget: Card | null = null;
  private busy = false;
  private over = false;
  private matches = 0;
  private firstTry = 0;
  private missedKeys = new Set<string>();
  private colourIdx = 0;
  private remainingMs = 0;
  private hintCount = 0;

  private prompt!: Phaser.GameObjects.Text;
  private matchTxt!: Phaser.GameObjects.Text;
  private dots: Phaser.GameObjects.Graphics[] = [];
  private timerBar?: Phaser.GameObjects.Graphics;
  private timerTxt?: Phaser.GameObjects.Text;
  private ticker?: Phaser.Time.TimerEvent;
  private idleTimer?: Phaser.Time.TimerEvent;
  private hintObjs: Phaser.GameObjects.GameObject[] = [];
  private selPulse?: Phaser.Tweens.Tween;
  private endOverlay!: ReturnType<typeof createEndPopup>;

  constructor() { super('GameScene'); }

  init(data: Partial<GameConfig>): void {
    this.cfg = { level: data.level ?? 'easy', timed: !!data.timed };
  }

  create(): void {
    drawBg(this);
    // D-005: reset every pushed-into field on each visit.
    this.cards = [];
    this.lines = [];
    this.dots = [];
    this.hintObjs = [];
    this.selected = null;
    this.dragFrom = null;
    this.dragging = false;
    this.hoverTarget = null;
    this.selPulse = undefined;
    this.busy = false;
    this.over = false;
    this.matches = 0;
    this.firstTry = 0;
    this.missedKeys = new Set();
    this.colourIdx = 0;
    this.roundIdx = 0;
    this.hintCount = 0;
    this.timerBar = undefined;
    this.timerTxt = undefined;
    this.ticker = undefined;
    this.idleTimer = undefined;

    const level = LEVELS[this.cfg.level];
    this.deck = new PairDeck(level.pairs, shuffle);
    this.rounds = this.cfg.timed ? [] : level.rounds;

    this.buildHeader();
    this.prompt = this.add.text(W / 2, 134, '', {
      fontFamily: F.head, fontSize: '23px', color: T.main, align: 'center',
    }).setOrigin(0.5);

    this.add.text(W / 2, 712, 'Draw a line from a friend to its food,\nor tap one and then the other 👆', {
      fontFamily: F.body, fontSize: '13px', color: T.sub, fontStyle: 'bold', align: 'center', lineSpacing: 3,
    }).setOrigin(0.5).setAlpha(0.85);

    this.dragLine = this.add.graphics().setDepth(4);
    this.wireInput();

    this.endOverlay = createEndPopup(this, W, H, {
      onPlayAgain: () => this.scene.restart(this.cfg),
      onHome:      () => this.scene.start('TitleScene'),
      onAllGames:  () => { window.location.href = '../'; },
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => hush());

    if (this.cfg.timed) {
      this.remainingMs = RACE_MS;
      this.ticker = this.time.addEvent({ delay: 100, loop: true, callback: () => this.tick() });
    }

    this.loadRound(true);
  }

  // ─── Header ────────────────────────────────────────────────────────────

  private buildHeader(): void {
    this.add.text(22, 36, '🔗 Connect', { fontFamily: F.head, fontSize: '19px', color: T.main }).setOrigin(0, 0.5);

    const g = this.add.graphics();
    g.fillStyle(C.white, 1);
    g.fillRoundedRect(W - 118, 18, 100, 36, 18);
    g.lineStyle(1.5, C.lavender, 0.4);
    g.strokeRoundedRect(W - 118, 18, 100, 36, 18);
    this.matchTxt = this.add.text(W - 68, 36, '💞 0', { fontFamily: F.head, fontSize: '17px', color: T.main }).setOrigin(0.5);

    if (this.cfg.timed) {
      const x = 30, y = 82, w = W - 120;
      this.add.graphics().fillStyle(0xf3e5f5, 1).fillRoundedRect(x, y - 6, w, 12, 6);
      this.timerBar = this.add.graphics();
      this.timerTxt = this.add.text(W - 50, y, '', { fontFamily: F.head, fontSize: '17px', color: T.main }).setOrigin(0.5);
      this.drawTimer();
    } else {
      const n = this.rounds.length, gap = 26;
      const startX = W / 2 - ((n - 1) * gap) / 2;
      this.dots = Array.from({ length: n }, (_, i) => this.add.graphics().setPosition(startX + i * gap, 82));
      this.renderDots();
    }
  }

  private renderDots(): void {
    this.dots.forEach((g, i) => {
      g.clear();
      if (i < this.roundIdx) { g.fillStyle(C.pink, 1); g.fillCircle(0, 0, 6); }
      else if (i === this.roundIdx) { g.fillStyle(C.pink, 0.22); g.fillCircle(0, 0, 12); g.fillStyle(C.pink, 1); g.fillCircle(0, 0, 6); }
      else { g.fillStyle(0xe1bee7, 1); g.fillCircle(0, 0, 6); }
    });
  }

  private drawTimer(): void {
    if (!this.timerBar || !this.timerTxt) return;
    const x = 30, y = 82, w = W - 120;
    const ratio = Math.max(0, this.remainingMs / RACE_MS);
    this.timerBar.clear();
    if (ratio > 0) {
      // Stays soft to the end: no alarming red for a toddler.
      this.timerBar.fillStyle(ratio > 0.25 ? C.pink : C.lavender2, 1);
      this.timerBar.fillRoundedRect(x, y - 6, Math.max(12, w * ratio), 12, 6);
    }
    this.timerTxt.setText(`⏱ ${Math.max(0, Math.ceil(this.remainingMs / 1000))}`);
  }

  private tick(): void {
    if (this.over) return;
    this.remainingMs -= 100;
    this.drawTimer();
    if (this.remainingMs <= 0) this.endGame();
  }

  // ─── Rounds ────────────────────────────────────────────────────────────

  private loadRound(first = false): void {
    this.clearRound();
    const n = this.cfg.timed ? RACE_PAIRS : this.rounds[this.roundIdx];
    const pairs = this.deck.draw(n);
    const rows = ROWS[pairs.length] ?? ROWS[3];
    // Right column is shuffled, and never left in the same order as the left
    // column (otherwise every line is a flat "straight across").
    let right = shuffle(pairs);
    for (let tries = 0; tries < 8 && right.every((p, i) => p === pairs[i]); tries++) right = shuffle(pairs);

    pairs.forEach((p, i) => this.cards.push(this.makeCard(p, 'L', LEFT_CX, rows[i], i)));
    right.forEach((p, i) => this.cards.push(this.makeCard(p, 'R', RIGHT_CX, rows[i], i + 0.5)));

    const easy = this.cfg.level === 'easy';
    this.setPrompt(easy ? 'Who eats what? 🍽️' : 'Who goes with what? 💞');
    if (first) say(easy ? 'Who eats what? Draw a line!' : 'Who goes with what? Draw a line!');
    this.busy = false;
    this.armIdleHint();
  }

  private clearRound(): void {
    this.cards.forEach(c => c.box.destroy());
    this.lines.forEach(l => l.destroy());
    this.cards = [];
    this.lines = [];
    this.selected = null;
    this.dragFrom = null;
    this.hoverTarget = null;
    this.selPulse?.remove();
    this.selPulse = undefined;
    this.dragLine.clear();
    this.colourIdx = Math.floor(Math.random() * LINE_COLOURS.length);
  }

  private setPrompt(text: string): void {
    this.prompt.setText(text);
    this.tweens.add({ targets: this.prompt, scale: { from: 0.86, to: 1 }, duration: 260, ease: 'Back.Out' });
  }

  // ─── Cards ─────────────────────────────────────────────────────────────

  private makeCard(pair: Pair, side: Side, cx: number, cy: number, order: number): Card {
    const bg = this.add.graphics();
    const emoji = this.add.text(0, 2, side === 'L' ? pair.left : pair.right, {
      fontFamily: F.body, fontSize: `${EMOJI_PX}px`,
    }).setOrigin(0.5);
    const knob = this.add.graphics();
    const box = this.add.container(cx, cy, [bg, emoji, knob]).setDepth(2);
    // Generous hit area: a bit larger than the card itself.
    box.setSize(CARD + 24, CARD + 20).setInteractive({ cursor: 'pointer' });

    const card: Card = { pair, side, cx, cy, box, bg, knob, matched: false, colour: C.pink };
    this.paint(card, 'idle');
    box.on('pointerdown', (p: Phaser.Input.Pointer) => this.onCardDown(card, p));

    box.setScale(0);
    this.tweens.add({ targets: box, scale: 1, duration: 380, delay: 70 * order, ease: 'Back.Out' });
    return card;
  }

  private knobX(card: Card): number {
    return card.side === 'L' ? card.cx + CARD / 2 : card.cx - CARD / 2;
  }

  private paint(card: Card, state: 'idle' | 'selected' | 'target' | 'matched' | 'miss'): void {
    const { bg, knob } = card;
    const h = CARD / 2;
    bg.clear();
    // Soft drop shadow
    bg.fillStyle(C.shadow, state === 'matched' ? 0.08 : 0.14);
    bg.fillRoundedRect(-h + 3, -h + 7, CARD, CARD, RADIUS);

    let fill: number = C.white, stroke: number = C.lavender, lw = 3;
    if (card.side === 'R' && state === 'idle') fill = C.cream;
    if (state === 'selected') { fill = C.bg1; stroke = C.pink; lw = 6; }
    if (state === 'target')   { fill = 0xfff0f6; stroke = C.pink; lw = 5; }
    if (state === 'matched')  { fill = C.mintBg; stroke = card.colour; lw = 5; }
    if (state === 'miss')     { fill = 0xf3e5f5; stroke = C.lavender2; lw = 4; }
    bg.fillStyle(fill, 1);
    bg.fillRoundedRect(-h, -h, CARD, CARD, RADIUS);
    bg.lineStyle(lw, stroke, 1);
    bg.strokeRoundedRect(-h, -h, CARD, CARD, RADIUS);

    // Connector knob on the inner edge: where the line plugs in.
    const kx = card.side === 'L' ? h : -h;
    const kc = state === 'matched' ? card.colour : state === 'selected' || state === 'target' ? C.pink : C.lavender;
    knob.clear();
    knob.fillStyle(C.white, 1);
    knob.fillCircle(kx, 0, KNOB_R + 4);
    knob.fillStyle(kc, 1);
    knob.fillCircle(kx, 0, KNOB_R);
  }

  // ─── Input: tap-tap and drag ───────────────────────────────────────────

  private wireInput(): void {
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.dragFrom || !p.isDown || this.busy) return;
      if (!this.dragging && Math.hypot(p.x - this.dragStart.x, p.y - this.dragStart.y) > 14) {
        this.dragging = true;
        this.tapDeselect = false;
        this.clearHint();
      }
      if (this.dragging) this.updateDrag(p);
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onPointerUp(p));
    this.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.onPointerUp(p));
  }

  private onCardDown(card: Card, p: Phaser.Input.Pointer): void {
    if (this.busy || this.over || card.matched) return;
    this.clearHint();
    this.armIdleHint();

    if (this.selected && this.selected.side !== card.side) {
      this.evaluate(this.selected, card);
      return;
    }
    this.tapDeselect = this.selected === card;
    if (this.selected !== card) this.select(card);
    this.dragFrom = card;
    this.dragging = false;
    this.dragStart = { x: p.x, y: p.y };
  }

  private onPointerUp(p: Phaser.Input.Pointer): void {
    const from = this.dragFrom;
    this.dragFrom = null;
    if (!from || this.busy) return;
    if (this.dragging) {
      this.dragging = false;
      const target = this.findTarget(p.x, p.y, from.side);
      this.setHover(null);
      this.dragLine.clear();
      if (target) this.evaluate(from, target);
      // Dropped on nothing: keep the friend selected so a tap still finishes it.
      return;
    }
    if (this.tapDeselect) this.deselect();
  }

  private findTarget(x: number, y: number, fromSide: Side): Card | null {
    let best: Card | null = null, bestD = Infinity;
    for (const c of this.cards) {
      if (c.side === fromSide || c.matched) continue;
      const dx = Math.abs(x - c.cx), dy = Math.abs(y - c.cy);
      if (dx > CARD / 2 + 34 || dy > CARD / 2 + 22) continue;
      const d = dx + dy;
      if (d < bestD) { best = c; bestD = d; }
    }
    return best;
  }

  private updateDrag(p: Phaser.Input.Pointer): void {
    const from = this.dragFrom!;
    const target = this.findTarget(p.x, p.y, from.side);
    this.setHover(target);
    const sx = this.knobX(from), sy = from.cy;
    const ex = target ? this.knobX(target) : p.x;
    const ey = target ? target.cy : p.y;
    const g = this.dragLine;
    g.clear();
    g.lineStyle(10, C.pink, 0.85);
    g.lineBetween(sx, sy, ex, ey);
    g.lineStyle(3, C.white, 0.6);
    g.lineBetween(sx, sy, ex, ey);
    g.fillStyle(C.pink, 1);
    g.fillCircle(ex, ey, 13);
    g.fillStyle(C.white, 1);
    g.fillCircle(ex, ey, 5);
  }

  private setHover(card: Card | null): void {
    if (this.hoverTarget === card) return;
    if (this.hoverTarget && !this.hoverTarget.matched) {
      this.paint(this.hoverTarget, 'idle');
      this.tweens.add({ targets: this.hoverTarget.box, scale: 1, duration: 120 });
    }
    this.hoverTarget = card;
    if (card) {
      this.paint(card, 'target');
      this.tweens.add({ targets: card.box, scale: 1.07, duration: 120 });
    }
  }

  private select(card: Card, speak = true): void {
    this.deselect();
    this.selected = card;
    card.box.setDepth(3);
    this.paint(card, 'selected');
    if (speak) {
      sounds.flip();
      say(card.side === 'L' ? card.pair.leftName : card.pair.rightName);
    }
    this.selPulse = this.tweens.add({
      targets: card.box, scale: { from: 1, to: 1.06 }, yoyo: true, repeat: -1, duration: 520, ease: 'Sine.InOut',
    });
  }

  private deselect(): void {
    this.selPulse?.remove();
    this.selPulse = undefined;
    const s = this.selected;
    this.selected = null;
    if (s && !s.matched) {
      s.box.setScale(1).setDepth(2);
      this.paint(s, 'idle');
    }
  }

  // ─── Answers ───────────────────────────────────────────────────────────

  private evaluate(a: Card, b: Card): void {
    const left = a.side === 'L' ? a : b;
    const right = a.side === 'L' ? b : a;
    this.busy = true;
    this.clearHint();
    this.idleTimer?.remove();
    this.dragLine.clear();
    this.setHover(null);
    this.selPulse?.remove();
    this.selPulse = undefined;
    this.selected = null;
    [left, right].forEach(c => c.box.setScale(1).setDepth(2));
    if (left.pair.key === right.pair.key) this.onMatch(left, right);
    else this.onMiss(left, right);
  }

  private onMatch(left: Card, right: Card): void {
    const colour = LINE_COLOURS[this.colourIdx++ % LINE_COLOURS.length];
    left.colour = right.colour = colour;
    left.matched = right.matched = true;
    left.box.disableInteractive();
    right.box.disableInteractive();

    const x1 = this.knobX(left), x2 = this.knobX(right);
    const line = this.add.graphics().setDepth(1);
    this.lines.push(line);
    const s = { t: 0 };
    this.tweens.add({
      targets: s, t: 1, duration: 260, ease: 'Sine.Out',
      onUpdate: () => {
        const ex = x1 + (x2 - x1) * s.t, ey = left.cy + (right.cy - left.cy) * s.t;
        line.clear();
        line.lineStyle(12, colour, 1);
        line.lineBetween(x1, left.cy, ex, ey);
        line.lineStyle(4, C.white, 0.55);
        line.lineBetween(x1, left.cy, ex, ey);
      },
      onComplete: () => {
        this.paint(left, 'matched');
        this.paint(right, 'matched');
        [left, right].forEach(c => {
          this.tweens.add({ targets: c.box, scale: { from: 1.16, to: 1 }, duration: 320, ease: 'Back.Out' });
          this.heartBadge(c);
        });
        this.sparkles(right.cx, right.cy);
        sounds.match();
      },
    });

    this.matches++;
    if (!this.missedKeys.has(left.pair.key)) this.firstTry++;
    this.matchTxt.setText(`💞 ${this.matches}`);
    this.tweens.add({ targets: this.matchTxt, scale: { from: 1.35, to: 1 }, duration: 300, ease: 'Back.Out' });
    this.setPrompt(`${left.pair.left} ${left.pair.phrase}`);
    say(left.pair.phrase);

    if (this.cards.every(c => c.matched)) {
      this.time.delayedCall(1300, () => this.finishRound());
    } else {
      this.time.delayedCall(380, () => { this.busy = false; this.armIdleHint(); });
    }
  }

  private onMiss(left: Card, right: Card): void {
    this.missedKeys.add(left.pair.key);
    const x1 = this.knobX(left), x2 = this.knobX(right);
    const line = this.add.graphics().setDepth(1);
    const s = { t: 1 };
    const draw = () => {
      const ex = x1 + (x2 - x1) * s.t, ey = left.cy + (right.cy - left.cy) * s.t;
      line.clear();
      line.lineStyle(9, C.lavender, 0.8);
      line.lineBetween(x1, left.cy, ex, ey);
    };
    draw();
    this.paint(left, 'miss');
    this.paint(right, 'miss');
    sounds.wrong();
    say(`Hmm, not the ${right.pair.rightName}. Try again!`);
    [left, right].forEach(c => this.tweens.add({
      targets: c.box, angle: { from: -6, to: 6 }, yoyo: true, repeat: 2, duration: 80,
      onComplete: () => c.box.setAngle(0),
    }));
    // The line gently springs back into the friend.
    this.tweens.add({
      targets: s, t: 0, delay: 300, duration: 320, ease: 'Sine.In', onUpdate: draw,
      onComplete: () => {
        line.destroy();
        this.paint(right, 'idle');
        this.paint(left, 'idle');
        this.busy = false;
        // Keep the friend chosen so the next tap on the right finishes the match.
        if (!this.over) this.select(left, false);
        this.armIdleHint();
      },
    });
  }

  private finishRound(): void {
    if (this.over) return;
    sounds.streak();
    this.setPrompt('Yay! Everyone is happy! 🎉');
    say('Yay! Everyone is happy!', false);
    this.cards.forEach((c, i) => this.tweens.add({
      targets: c.box, y: c.cy - 18, yoyo: true, duration: 180, delay: 60 * i, ease: 'Sine.Out',
    }));
    this.time.delayedCall(1500, () => {
      if (this.over) return;
      this.roundIdx++;
      if (!this.cfg.timed) {
        this.renderDots();
        if (this.roundIdx >= this.rounds.length) { this.endGame(); return; }
      }
      // Cards whoosh out before the next deal.
      this.tweens.add({ targets: this.cards.map(c => c.box), alpha: 0, scale: 0.6, duration: 220, ease: 'Sine.In' });
      this.tweens.add({ targets: this.lines, alpha: 0, duration: 220 });
      this.time.delayedCall(240, () => { if (!this.over) this.loadRound(); });
    });
  }

  private endGame(): void {
    if (this.over) return;
    this.over = true;
    this.busy = true;
    this.ticker?.remove();
    this.ticker = undefined;
    this.idleTimer?.remove();
    this.clearHint();
    this.dragLine.clear();
    this.cards.forEach(c => c.box.disableInteractive());
    sounds.end();
    if (this.matches > 0) launchConfetti(this, CONFETTI_EMOJIS);

    if (this.cfg.timed) {
      const m = this.matches;
      const t = m >= 12 ? { e: '🎉', ti: 'Amazing!', s: 3 }
        : m >= 6 ? { e: '🌟', ti: 'Great job!', s: 2 }
        : m >= 1 ? { e: '🌸', ti: 'Nice matching!', s: 1 }
        : { e: '💖', ti: "Let's play again!", s: 0 };
      say(m > 0 ? `${t.ti} You matched ${m}!` : "Let's play again!");
      this.endOverlay.show({
        emoji: t.e, title: t.ti,
        subtitle: m > 0 ? `You matched ${m} friends in time! 💞` : 'Draw a line from a friend to its food!',
        score: { value: m, label: 'Pairs Matched' },
        stars: { earned: t.s, total: 3 },
      });
      return;
    }

    const ratio = this.firstTry / Math.max(1, this.matches);
    const stars = ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1;
    say('You did it, Aya! Every friend is happy!');
    this.endOverlay.show({
      emoji: stars === 3 ? '🎉' : '🌟',
      title: stars === 3 ? 'Super matcher!' : 'Great matching!',
      subtitle: 'Every friend got their favourite, Aya! 💖',
      score: { value: `${this.firstTry}/${this.matches}`, label: 'First-Try Matches' },
      stars: { earned: stars, total: 3 },
    });
  }

  // ─── Idle hint & effects ───────────────────────────────────────────────

  /** After a quiet spell, a little hand draws a ghost line for one pair. */
  private armIdleHint(): void {
    this.idleTimer?.remove();
    if (this.over) return;
    const wait = this.hintCount === 0 && this.matches === 0 ? 4500 : IDLE_HINT_MS;
    this.idleTimer = this.time.delayedCall(wait, () => this.showHint());
  }

  private showHint(): void {
    if (this.busy || this.over || this.dragFrom) { this.armIdleHint(); return; }
    // Prefer finishing whatever the child already picked.
    const from = this.selected ?? this.cards.find(c => c.side === 'L' && !c.matched);
    if (!from) return;
    const to = this.cards.find(c => c.side !== from.side && c.pair.key === from.pair.key);
    if (!to) return;
    this.clearHint();
    this.hintCount++;

    const x1 = this.knobX(from), x2 = this.knobX(to);
    const ghost = this.add.graphics().setDepth(1);
    const hand = this.add.text(x1, from.cy, '👆', { fontSize: '46px' }).setOrigin(0.35, 0.05).setDepth(20);
    this.hintObjs.push(ghost, hand);
    const s = { t: 0 };
    const steps = 14;
    this.tweens.add({
      targets: s, t: 1, duration: 1100, ease: 'Sine.InOut', delay: 250, repeat: 2, repeatDelay: 500,
      onUpdate: () => {
        hand.setPosition(x1 + (x2 - x1) * s.t, from.cy + (to.cy - from.cy) * s.t);
        ghost.clear();
        ghost.fillStyle(C.pink, 0.55);
        const n = Math.floor(s.t * steps);
        for (let i = 0; i <= n; i++) {
          const k = i / steps;
          ghost.fillCircle(x1 + (x2 - x1) * k, from.cy + (to.cy - from.cy) * k, 5);
        }
      },
      onRepeat: () => ghost.clear(),
      onComplete: () => { this.clearHint(); this.armIdleHint(); },
    });
    if (this.hintCount <= 2 || this.hintCount % 2 === 0) {
      say(`${from.pair.leftName} wants the ${from.pair.rightName}!`);
    }
  }

  private clearHint(): void {
    this.hintObjs.forEach(o => { this.tweens.killTweensOf(o); o.destroy(); });
    this.hintObjs = [];
  }

  private heartBadge(card: Card): void {
    const dx = card.side === 'L' ? -CARD / 2 + 20 : CARD / 2 - 20;
    const t = this.add.text(dx, -CARD / 2 + 20, '💖', { fontSize: '22px' }).setOrigin(0.5);
    card.box.add(t);
    this.tweens.add({ targets: t, scale: { from: 0, to: 1 }, duration: 300, ease: 'Back.Out' });
  }

  private sparkles(x: number, y: number): void {
    const emojis = ['✨', '⭐', '🌟', '💖'];
    for (let i = 0; i < 7; i++) {
      const a = (Math.PI * 2 * i) / 7 + Math.random() * 0.4;
      const d = 70 + Math.random() * 26;
      const e = this.add.text(x, y, emojis[i % emojis.length], { fontFamily: F.body, fontSize: '24px' })
        .setOrigin(0.5).setDepth(15);
      this.tweens.add({
        targets: e, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, duration: 700, ease: 'Sine.Out',
        onComplete: () => e.destroy(),
      });
    }
  }
}
