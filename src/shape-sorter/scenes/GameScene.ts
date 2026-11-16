import Phaser from 'phaser';
import { drawBg, launchConfetti } from '@shared/phaserUtils';
import { createEndPopup } from '@shared/endPopup';
import { C, T, F } from '@shared/theme';
import { playTone, sounds } from '@shared/audio';
import { shuffle } from '@shared/utils';
import { BOXES, CONFETTI_EMOJIS, SHAPES, type ShapeDef } from '../data';
import { drawHole, drawPiece, drawShade, say, type HoleState } from './shapes';
import { BOX, drawBoxBody, drawBoxGlass, holeLayout, windowSlot } from './box';

const W = 420, H = 780;

const BOX_TOP = 150;
const PIECE_SIZE = 116;
const HOME = { x: W / 2, y: 650 };
/** Generous drop radius: toddler fingers are imprecise. The nearest hole wins. */
const SNAP = 84;
const MINI = 50;

interface Hole {
  shape: ShapeDef;
  lx: number;
  ly: number;
  size: number;
  g: Phaser.GameObjects.Graphics;
  filled: boolean;
  state: HoleState;
}

/** Gentle wooden "clunk" when a piece lands inside the box. */
const clunk = (): void => {
  playTone(196, 0.14, 'triangle', 0.22);
  playTone(147, 0.18, 'sine', 0.16, 0.03);
};

export class GameScene extends Phaser.Scene {
  private boxIndex = 0;
  private placed = 0;
  private firstTry = 0;
  private readonly totalPieces = BOXES.reduce((a, b) => a + b.holes, 0);
  private missedThisPiece = false;
  private busy = true;
  private dragging = false;

  private holes: Hole[] = [];
  private queue: ShapeDef[] = [];
  private lastKinds: string[] = [];
  private current?: ShapeDef;
  private inWindow: { c: Phaser.GameObjects.Container; g: Phaser.GameObjects.Graphics; shape: ShapeDef }[] = [];

  private boxC!: Phaser.GameObjects.Container;
  private windowLayer!: Phaser.GameObjects.Container;
  private piece!: Phaser.GameObjects.Container;
  private pieceG!: Phaser.GameObjects.Graphics;
  private shadeG!: Phaser.GameObjects.Graphics;
  private prompt!: Phaser.GameObjects.Text;
  private starTxt!: Phaser.GameObjects.Text;
  private progress: Phaser.GameObjects.Graphics[] = [];
  private hand?: Phaser.GameObjects.Text;
  private handChain?: Phaser.Tweens.TweenChain;
  private hintHole?: Hole;
  private idleTimer?: Phaser.Time.TimerEvent;
  private endOverlay!: ReturnType<typeof createEndPopup>;

  constructor() { super('GameScene'); }

  create(): void {
    // Scene instances are reused across restarts (D-005): reset everything.
    this.boxIndex = 0;
    this.placed = 0;
    this.firstTry = 0;
    this.holes = [];
    this.queue = [];
    this.lastKinds = [];
    this.inWindow = [];
    this.progress = [];
    this.current = undefined;
    this.hand = undefined;
    this.handChain = undefined;
    this.hintHole = undefined;
    this.idleTimer = undefined;
    this.busy = true;
    this.dragging = false;

    drawBg(this);
    this.buildHeader();

    this.prompt = this.add.text(W / 2, 118, '', {
      fontFamily: F.head, fontSize: '25px', color: T.main,
    }).setOrigin(0.5);

    this.add.text(W / 2, 744, 'Drag the shape into its hole, or tap the hole', {
      fontFamily: F.body, fontSize: '13px', color: T.sub, fontStyle: 'bold', align: 'center',
    }).setOrigin(0.5).setAlpha(0.75);

    this.boxC = this.add.container(W * 1.5, BOX_TOP);
    this.buildPiece();

    this.endOverlay = createEndPopup(this, W, H, {
      onPlayAgain: () => this.scene.restart(),
      onHome:      () => this.scene.start('TitleScene'),
      onAllGames:  () => { window.location.href = '../'; },
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    });

    this.loadBox();
  }

  // ─── Header ────────────────────────────────────────────────────────────

  private buildHeader(): void {
    this.add.text(22, 34, 'Shape Sorter', { fontFamily: F.head, fontSize: '19px', color: T.main }).setOrigin(0, 0.5);
    const g = this.add.graphics();
    g.fillStyle(C.white, 1);
    g.fillRoundedRect(W - 124, 17, 108, 34, 17);
    g.lineStyle(1.5, C.lavender, 0.4);
    g.strokeRoundedRect(W - 124, 17, 108, 34, 17);
    this.starTxt = this.add.text(W - 70, 34, '', { fontFamily: F.head, fontSize: '15px', color: T.main }).setOrigin(0.5);
    this.updateStars();

    const n = BOXES.length, gap = 40;
    const startX = W / 2 - ((n - 1) * gap) / 2;
    this.progress = BOXES.map((_, i) => this.add.graphics().setPosition(startX + i * gap, 74));
  }

  private updateStars(): void {
    this.starTxt.setText(`⭐ ${this.placed}/${this.totalPieces}`);
  }

  /** A tiny box icon per sorter box: done ones get a tick, the current one is big. */
  private renderProgress(): void {
    this.progress.forEach((g, i) => {
      g.clear();
      const col = BOXES[i].color;
      const big = i === this.boxIndex;
      const w = big ? 30 : 22, h = big ? 24 : 18;
      g.fillStyle(col, i > this.boxIndex ? 0.3 : 1);
      g.fillRoundedRect(-w / 2, -h / 2 + 3, w, h, 6);
      g.fillStyle(0xffffff, i > this.boxIndex ? 0.55 : 1);
      g.fillRoundedRect(-w / 2 - 2, -h / 2, w + 4, 7, 3);
      if (i < this.boxIndex) {
        g.lineStyle(3, 0xffffff, 1);
        g.beginPath();
        g.moveTo(-6, 4); g.lineTo(-2, 8); g.lineTo(6, 0);
        g.strokePath();
      }
      g.setScale(1);
    });
  }

  // ─── Sorter box ────────────────────────────────────────────────────────

  private pickShapes(n: number): ShapeDef[] {
    // Prefer shapes the last box didn't have, so every box feels new.
    const fresh = shuffle(SHAPES.filter(s => !this.lastKinds.includes(s.kind)));
    const seen = shuffle(SHAPES.filter(s => this.lastKinds.includes(s.kind)));
    const pick = shuffle([...fresh, ...seen].slice(0, n));
    this.lastKinds = pick.map(s => s.kind);
    return pick;
  }

  private loadBox(): void {
    this.busy = true;
    this.renderProgress();
    this.boxC.removeAll(true);
    this.holes = [];
    this.inWindow = [];

    const cfg = BOXES[this.boxIndex];
    const body = this.add.graphics();
    drawBoxBody(body, cfg.color);
    this.boxC.add(body);

    const shapes = this.pickShapes(cfg.holes);
    const layout = holeLayout(cfg.holes);
    shapes.forEach((shape, i) => {
      const { x, y } = layout.spots[i];
      const g = this.add.graphics().setPosition(x, y);
      drawHole(g, shape.kind, shape.color, layout.size);
      const zone = this.add.zone(x, y, layout.size + 34, layout.size + 34).setInteractive({ cursor: 'pointer' });
      const hole: Hole = { shape, lx: x, ly: y, size: layout.size, g, filled: false, state: 'idle' };
      zone.on('pointerdown', () => this.onHoleTap(hole));
      this.boxC.add([g, zone]);
      this.holes.push(hole);
    });

    this.windowLayer = this.add.container(0, 0);
    const glass = this.add.graphics();
    drawBoxGlass(glass, cfg.color);
    this.boxC.add([this.windowLayer, glass]);

    // Slide in from the right with a little bounce, then pop the holes.
    this.boxC.setPosition(W * 1.5, BOX_TOP).setAngle(0);
    this.holes.forEach(h => h.g.setScale(0));
    this.tweens.add({
      targets: this.boxC, x: W / 2, duration: 620, ease: 'Back.Out',
      onComplete: () => {
        this.holes.forEach((h, i) => this.tweens.add({
          targets: h.g, scale: 1, duration: 340, delay: 90 * i, ease: 'Back.Out',
          onStart: () => playTone(660 + i * 110, 0.08, 'sine', 0.08),
        }));
        this.queue = shuffle(shapes);
        this.time.delayedCall(240 + 90 * shapes.length, () => this.nextPiece());
      },
    });
  }

  private holeWorld(h: Hole): { x: number; y: number } {
    return { x: this.boxC.x + h.lx, y: this.boxC.y + h.ly };
  }

  private setHole(h: Hole, state: HoleState): void {
    if (h.filled && state !== 'done') return;
    if (h.state === state) return;
    h.state = state;
    drawHole(h.g, h.shape.kind, h.shape.color, h.size, state);
  }

  private nearestHole(x: number, y: number): Hole | undefined {
    let best: Hole | undefined, bestD = SNAP;
    for (const h of this.holes) {
      if (h.filled) continue;
      const p = this.holeWorld(h);
      const d = Phaser.Math.Distance.Between(x, y, p.x, p.y);
      if (d < bestD) { best = h; bestD = d; }
    }
    return best;
  }

  // ─── The piece ─────────────────────────────────────────────────────────

  private buildPiece(): void {
    this.pieceG = this.add.graphics();
    this.shadeG = this.add.graphics().setAlpha(0);
    this.piece = this.add.container(HOME.x, 900, [this.pieceG, this.shadeG]).setDepth(10);
    this.piece.setSize(PIECE_SIZE + 30, PIECE_SIZE + 30);
    this.piece.setInteractive({ draggable: true, cursor: 'grab' });

    let downAt = { x: 0, y: 0 };
    this.piece.on('pointerdown', (p: Phaser.Input.Pointer) => { downAt = { x: p.x, y: p.y }; });
    this.piece.on('pointerup', (p: Phaser.Input.Pointer) => {
      // A tap (not a drag) says the name again.
      if (!this.busy && Math.hypot(p.x - downAt.x, p.y - downAt.y) < 12 && this.current) {
        say(this.current.name);
        this.wiggle();
        this.armIdleHint(5000);
      }
    });
    this.piece.on('dragstart', () => {
      if (this.busy) return;
      this.dragging = true;
      this.tweens.killTweensOf(this.piece);
      this.piece.setAngle(0);
      this.hideHint();
      this.idleTimer?.remove();
      this.tweens.add({ targets: this.piece, scale: 1.1, duration: 120 });
    });
    this.piece.on('drag', (_p: Phaser.Input.Pointer, x: number, y: number) => {
      if (!this.dragging) return;
      this.piece.setPosition(x, y);
      const near = this.nearestHole(x, y);
      this.holes.forEach(h => this.setHole(h, h === near ? 'glow' : 'idle'));
    });
    this.piece.on('dragend', () => {
      if (!this.dragging) return;
      this.dragging = false;
      const hole = this.nearestHole(this.piece.x, this.piece.y);
      this.holes.forEach(h => this.setHole(h, 'idle'));
      if (!hole) { this.returnHome(); this.armIdleHint(); }
      else if (hole.shape.kind === this.current?.kind) this.placeInto(hole);
      else this.wrongHole(hole);
    });
  }

  private nextPiece(): void {
    this.current = this.queue.shift();
    if (!this.current) return;
    this.missedThisPiece = false;
    drawPiece(this.pieceG, this.current.kind, this.current.color, PIECE_SIZE);
    drawShade(this.shadeG, this.current.kind, PIECE_SIZE);
    this.shadeG.setAlpha(0);
    this.tweens.killTweensOf(this.piece);
    this.piece.setPosition(HOME.x, 900).setScale(1).setAngle(0).setAlpha(1).setVisible(true);
    this.tweens.add({
      targets: this.piece, y: HOME.y, duration: 520, ease: 'Back.Out',
      onComplete: () => { this.busy = false; this.bob(); },
    });
    this.prompt.setText(`Where does the ${this.current.name} go?`);
    this.tweens.add({ targets: this.prompt, scale: { from: 0.85, to: 1 }, duration: 260, ease: 'Back.Out' });
    say(`${this.current.name}! Where does it go?`, false);
    this.armIdleHint();
  }

  private bob(): void {
    this.tweens.add({
      targets: this.piece, y: HOME.y - 8, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.InOut',
    });
  }

  private wiggle(): void {
    this.tweens.add({ targets: this.piece, angle: { from: -10, to: 10 }, yoyo: true, repeat: 1, duration: 90,
      onComplete: () => this.piece.setAngle(0) });
  }

  private returnHome(): void {
    this.tweens.killTweensOf(this.piece);
    this.tweens.add({
      targets: this.piece, x: HOME.x, y: HOME.y, scale: 1, angle: 0, duration: 380, ease: 'Back.Out',
      onComplete: () => this.bob(),
    });
  }

  // ─── Answers ───────────────────────────────────────────────────────────

  private onHoleTap(hole: Hole): void {
    if (this.busy || this.dragging || hole.filled || !this.current) return;
    this.hideHint();
    if (hole.shape.kind === this.current.kind) this.placeInto(hole);
    else this.wrongHole(hole);
  }

  private wrongHole(hole: Hole): void {
    this.missedThisPiece = true;
    sounds.wrong();
    say(`That's the ${hole.shape.name}. Try another one!`);
    this.tweens.killTweensOf(hole.g);
    this.tweens.add({ targets: hole.g, x: { from: hole.lx - 9, to: hole.lx + 9 }, yoyo: true, repeat: 3, duration: 60,
      onComplete: () => hole.g.setX(hole.lx) });
    this.returnHome();
    // A little "no-no" head shake as it hops back.
    this.tweens.add({ targets: this.piece, angle: { from: -12, to: 12 }, yoyo: true, repeat: 2, duration: 80, delay: 120,
      onComplete: () => this.piece.setAngle(0) });
    // After a miss the hint comes sooner.
    this.armIdleHint(4000);
  }

  private placeInto(hole: Hole): void {
    this.busy = true;
    this.idleTimer?.remove();
    this.hideHint();
    this.tweens.killTweensOf(this.piece);
    hole.filled = true;
    this.placed++;
    if (!this.missedThisPiece) this.firstTry++;
    this.updateStars();

    const p = this.holeWorld(hole);
    const fit = (hole.size * 0.94) / PIECE_SIZE;
    // Hover over the hole, line up, then sink in: shrink and darken as it drops.
    this.tweens.chain({
      targets: this.piece,
      tweens: [
        { x: p.x, y: p.y - 22, scale: fit * 1.08, angle: 0, duration: 260, ease: 'Sine.Out' },
        { y: p.y, scale: fit, duration: 110, ease: 'Quad.In' },
        {
          y: p.y + 6, scale: fit * 0.5, alpha: 0, duration: 300, ease: 'Quad.In',
          onStart: () => { this.tweens.add({ targets: this.shadeG, alpha: 0.95, duration: 200 }); },
        },
      ],
      onComplete: () => {
        this.piece.setVisible(false);
        clunk();
        sounds.match();
        say(`${hole.shape.name}! Yay!`);
        this.setHole(hole, 'done');
        this.tweens.add({ targets: hole.g, scale: { from: 1.18, to: 1 }, duration: 300, ease: 'Back.Out' });
        // The box gives a little "thunk" jiggle.
        this.tweens.add({ targets: this.boxC, y: BOX_TOP + 5, yoyo: true, duration: 80, ease: 'Sine.Out' });
        this.ring(p.x, p.y, hole.shape.color, hole.size);
        this.sparkles(p.x, p.y);
        this.dropIntoWindow(hole.shape);

        const boxDone = this.holes.every(h => h.filled);
        this.time.delayedCall(boxDone ? 650 : 1250, () => (boxDone ? this.celebrateBox() : this.nextPiece()));
      },
    });
  }

  /** The piece reappears inside the box window, tumbling to the floor. */
  private dropIntoWindow(shape: ShapeDef): void {
    const n = this.holes.length;
    const slot = windowSlot(this.inWindow.length, n);
    const g = this.add.graphics();
    drawPiece(g, shape.kind, shape.color, MINI);
    const c = this.add.container(slot.x, BOX.win.y + 16, [g]).setAlpha(0).setAngle(Phaser.Math.Between(-30, 30));
    this.windowLayer.add(c);
    this.inWindow.push({ c, g, shape });
    this.tweens.add({ targets: c, alpha: 1, duration: 120, delay: 120 });
    this.tweens.add({
      targets: c, y: slot.y, angle: Phaser.Math.Between(-10, 10), duration: 560, delay: 120, ease: 'Bounce.Out',
    });
  }

  // ─── Box complete ──────────────────────────────────────────────────────

  private celebrateBox(): void {
    const last = this.boxIndex >= BOXES.length - 1;
    this.prompt.setText(last ? 'All the shapes are in! 🎉' : 'All in! Yay! 🎉');
    this.tweens.add({ targets: this.prompt, scale: { from: 0.7, to: 1 }, duration: 380, ease: 'Back.Out' });
    sounds.streak();
    say(last ? 'All in! Hooray!' : 'All in the box! Yay!', false);

    // Everyone inside the window smiles and hops.
    this.inWindow.forEach(({ c, g, shape }, i) => {
      drawPiece(g, shape.kind, shape.color, MINI, true);
      this.tweens.add({ targets: c, y: c.y - 16, angle: 0, yoyo: true, repeat: 2, duration: 200, delay: i * 90, ease: 'Sine.Out' });
    });
    // The box does a happy hop.
    this.tweens.chain({
      targets: this.boxC,
      tweens: [
        { y: BOX_TOP - 26, angle: -2, duration: 220, ease: 'Sine.Out' },
        { y: BOX_TOP, angle: 0, duration: 200, ease: 'Bounce.Out' },
        { y: BOX_TOP - 16, angle: 2, duration: 180, ease: 'Sine.Out' },
        { y: BOX_TOP, angle: 0, duration: 200, ease: 'Bounce.Out' },
      ],
    });
    this.shapeBurst(W / 2, BOX_TOP + BOX.topH / 2, last ? 22 : 14);
    this.progressPop();

    this.time.delayedCall(last ? 1500 : 1700, () => {
      if (last) { this.endGame(); return; }
      this.tweens.add({
        targets: this.boxC, x: -W / 2, duration: 520, ease: 'Back.In',
        onComplete: () => {
          this.boxIndex++;
          this.prompt.setText(this.boxIndex === BOXES.length - 1 ? 'The big box!' : 'A new box!');
          this.loadBox();
        },
      });
    });
  }

  private progressPop(): void {
    const g = this.progress[this.boxIndex];
    if (!g) return;
    this.tweens.add({ targets: g, scale: { from: 1, to: 1.5 }, yoyo: true, duration: 220, ease: 'Sine.Out' });
  }

  /** Little toy shapes fly up out of the box and tumble down. */
  private shapeBurst(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const s = SHAPES[i % SHAPES.length];
      const g = this.add.graphics().setDepth(30);
      drawPiece(g, s.kind, s.color, Phaser.Math.Between(28, 42), true);
      g.setPosition(x, y);
      const vx = Phaser.Math.FloatBetween(-260, 260);
      const vy = Phaser.Math.FloatBetween(-560, -380);
      const spin = Phaser.Math.FloatBetween(-400, 400);
      const st = { t: 0 };
      this.tweens.add({
        targets: st, t: 1.5, duration: 1500, delay: i * 25,
        onUpdate: () => {
          g.setPosition(x + vx * st.t, y + vy * st.t + 520 * st.t * st.t);
          g.setAngle(spin * st.t);
          g.setAlpha(st.t > 1.1 ? Math.max(0, 1 - (st.t - 1.1) / 0.4) : 1);
        },
        onComplete: () => g.destroy(),
      });
    }
  }

  private endGame(): void {
    this.boxIndex = BOXES.length;
    this.renderProgress();
    this.piece.disableInteractive();
    sounds.end();
    launchConfetti(this, CONFETTI_EMOJIS);
    say('You did it, Aya!', false);
    const ratio = this.firstTry / this.totalPieces;
    const stars = ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1;
    this.endOverlay.show({
      emoji: stars === 3 ? '🎉' : '🌟',
      title: stars === 3 ? 'Shape star!' : 'Great sorting!',
      subtitle: 'Every shape found its home, Aya! 💖',
      score: { value: `${this.firstTry}/${this.totalPieces}`, label: 'First-Try Shapes' },
      stars: { earned: stars, total: 3 },
    });
  }

  // ─── Hints & effects ───────────────────────────────────────────────────

  /** After a pause, a little hand shows the way: from the piece to its hole. */
  private armIdleHint(delay = 7000): void {
    this.idleTimer?.remove();
    this.idleTimer = this.time.delayedCall(delay, () => this.showHint());
  }

  private showHint(): void {
    const target = this.holes.find(h => !h.filled && h.shape.kind === this.current?.kind);
    if (!target || this.busy || this.dragging || !this.current) return;
    this.hideHint();
    this.hintHole = target;
    this.setHole(target, 'glow');
    this.tweens.add({ targets: target.g, scale: 1.08, yoyo: true, repeat: -1, duration: 420, ease: 'Sine.InOut' });
    say(`The ${this.current.name} goes here!`);

    const to = this.holeWorld(target);
    // The fingertip of 👆 is near its top-left; offset so it points at the spot.
    this.hand = this.add.text(HOME.x, HOME.y, '👆', { fontSize: '52px' }).setOrigin(0.32, 0.08).setDepth(40).setAlpha(0);
    this.handChain = this.tweens.chain({
      targets: this.hand,
      loop: -1,
      tweens: [
        { alpha: 1, x: HOME.x, y: HOME.y, duration: 200 },
        { x: to.x, y: to.y, duration: 1100, ease: 'Sine.InOut', hold: 350 },
        { alpha: 0, duration: 250 },
        { alpha: 0, duration: 450 },
      ],
    });
  }

  private hideHint(): void {
    this.handChain?.stop();
    this.handChain = undefined;
    if (this.hand) {
      this.tweens.killTweensOf(this.hand);
      this.hand.destroy();
      this.hand = undefined;
    }
    if (this.hintHole) {
      this.tweens.killTweensOf(this.hintHole.g);
      this.hintHole.g.setScale(1).setX(this.hintHole.lx);
      this.setHole(this.hintHole, 'idle');
      this.hintHole = undefined;
    }
  }

  private ring(x: number, y: number, color: number, size: number): void {
    const g = this.add.graphics().setDepth(5);
    const s = { r: size / 2, a: 0.85 };
    this.tweens.add({
      targets: s, r: size * 1.05, a: 0, duration: 620, ease: 'Sine.Out',
      onUpdate: () => { g.clear(); g.lineStyle(6, color, s.a); g.strokeCircle(x, y, s.r); },
      onComplete: () => g.destroy(),
    });
  }

  private sparkles(x: number, y: number): void {
    const emojis = ['✨', '⭐', '🌟', '💖'];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 * i) / 6 + Math.random() * 0.4;
      const d = 64 + Math.random() * 26;
      const e = this.add.text(x, y, emojis[i % emojis.length], { fontFamily: F.body, fontSize: '24px' }).setOrigin(0.5).setDepth(15);
      this.tweens.add({ targets: e, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, duration: 700, ease: 'Sine.Out',
        onComplete: () => e.destroy() });
    }
  }
}
