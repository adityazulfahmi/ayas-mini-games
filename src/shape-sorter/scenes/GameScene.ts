import Phaser from 'phaser';
import { drawBg, launchConfetti } from '@shared/phaserUtils';
import { createEndPopup } from '@shared/endPopup';
import { C, T, F } from '@shared/theme';
import { sounds } from '@shared/audio';
import { shuffle } from '@shared/utils';
import { BOXES, CONFETTI_EMOJIS, SHAPES, type ShapeDef } from '../data';
import { drawHole, drawPiece, say } from './shapes';

const W = 420, H = 780;

const LID = { x: 30, y: 168, w: W - 60, h: 230 };
const LID_CY = LID.y + LID.h / 2;
const HOLE_SIZE = 92;
const PIECE_SIZE = 116;
const PIECE_HOME = { x: W / 2, y: 560 };
/** Generous drop radius: toddler fingers are imprecise. */
const SNAP = 78;

interface Hole {
  shape: ShapeDef;
  x: number;
  y: number;
  g: Phaser.GameObjects.Graphics;
  filled: boolean;
  zone: Phaser.GameObjects.Zone;
}

export class GameScene extends Phaser.Scene {
  private boxIndex = 0;
  private placed = 0;
  private firstTry = 0;
  private totalPieces = BOXES.reduce((a, b) => a + b, 0);
  private missedThisPiece = false;
  private busy = false;

  private holes: Hole[] = [];
  private queue: ShapeDef[] = [];
  private current?: ShapeDef;
  private piece!: Phaser.GameObjects.Container;
  private pieceG!: Phaser.GameObjects.Graphics;
  private pieceBob?: Phaser.Tweens.Tween;
  private boxLayer!: Phaser.GameObjects.Container;
  private prompt!: Phaser.GameObjects.Text;
  private starTxt!: Phaser.GameObjects.Text;
  private dots: Phaser.GameObjects.Graphics[] = [];
  private hand?: Phaser.GameObjects.Text;
  private idleTimer?: Phaser.Time.TimerEvent;
  private endOverlay!: ReturnType<typeof createEndPopup>;

  constructor() { super('GameScene'); }

  create(): void {
    drawBg(this);
    this.boxIndex = 0;
    this.placed = 0;
    this.firstTry = 0;
    this.holes = [];
    this.dots = [];
    this.busy = false;

    this.buildHeader();
    this.buildLid();
    this.boxLayer = this.add.container(0, 0);

    this.prompt = this.add.text(W / 2, 128, '', {
      fontFamily: F.head, fontSize: '24px', color: T.main,
    }).setOrigin(0.5);

    this.add.text(W / 2, 690, 'Drag the shape into its home,\nor tap the right hole 👆', {
      fontFamily: F.body, fontSize: '13px', color: T.sub, fontStyle: 'bold', align: 'center', lineSpacing: 3,
    }).setOrigin(0.5).setAlpha(0.85);

    this.buildPiece();

    this.endOverlay = createEndPopup(this, W, H, {
      onPlayAgain: () => this.scene.restart(),
      onHome:      () => this.scene.start('TitleScene'),
      onAllGames:  () => { window.location.href = '../'; },
    });

    this.loadBox();
  }

  // ─── Header ────────────────────────────────────────────────────────────

  private buildHeader(): void {
    this.add.text(22, 34, '🧩 Shape Sorter', { fontFamily: F.head, fontSize: '17px', color: T.main }).setOrigin(0, 0.5);
    const g = this.add.graphics();
    g.fillStyle(C.white, 1);
    g.fillRoundedRect(W - 124, 17, 108, 34, 17);
    g.lineStyle(1.5, C.lavender, 0.4);
    g.strokeRoundedRect(W - 124, 17, 108, 34, 17);
    this.starTxt = this.add.text(W - 70, 34, '', { fontFamily: F.head, fontSize: '15px', color: T.main }).setOrigin(0.5);
    this.updateStars();

    const n = BOXES.length, gap = 22;
    const startX = W / 2 - ((n - 1) * gap) / 2;
    this.dots = Array.from({ length: n }, (_, i) => this.add.graphics().setPosition(startX + i * gap, 76));
  }

  private updateStars(): void {
    this.starTxt.setText(`⭐ ${this.placed}/${this.totalPieces}`);
  }

  private renderDots(): void {
    this.dots.forEach((g, i) => {
      g.clear();
      if (i < this.boxIndex) { g.fillStyle(C.pink, 1); g.fillCircle(0, 0, 5); }
      else if (i === this.boxIndex) { g.fillStyle(C.pink, 0.22); g.fillCircle(0, 0, 11); g.fillStyle(C.pink, 1); g.fillCircle(0, 0, 6); }
      else { g.fillStyle(0xe1bee7, 1); g.fillCircle(0, 0, 5); }
    });
  }

  // ─── Sorter box ────────────────────────────────────────────────────────

  private buildLid(): void {
    const g = this.add.graphics();
    // Box body peeking out under the lid gives it depth.
    g.fillStyle(C.shadow, 0.16);
    g.fillRoundedRect(LID.x + 6, LID.y + 18, LID.w - 12, LID.h, 34);
    g.fillStyle(0xd1c4e9, 1);
    g.fillRoundedRect(LID.x, LID.y + 12, LID.w, LID.h, 34);
    g.fillStyle(C.white, 1);
    g.fillRoundedRect(LID.x, LID.y, LID.w, LID.h, 34);
    g.lineStyle(3, C.lavender, 0.9);
    g.strokeRoundedRect(LID.x, LID.y, LID.w, LID.h, 34);
    // Screws in the corners: a small toy detail.
    g.fillStyle(0xe1bee7, 1);
    for (const [x, y] of [[LID.x + 22, LID.y + 22], [LID.x + LID.w - 22, LID.y + 22], [LID.x + 22, LID.y + LID.h - 22], [LID.x + LID.w - 22, LID.y + LID.h - 22]]) {
      g.fillCircle(x, y, 5);
    }
  }

  private loadBox(): void {
    this.renderDots();
    this.boxLayer.removeAll(true);
    this.holes.forEach(h => h.zone.destroy());
    this.holes = [];

    const n = BOXES[this.boxIndex];
    const shapes = shuffle(SHAPES).slice(0, n);
    const xs = n === 2 ? [W / 2 - 80, W / 2 + 80] : [W / 2 - 115, W / 2, W / 2 + 115];
    shapes.forEach((shape, i) => {
      const x = xs[i];
      const y = LID_CY;
      const g = this.add.graphics().setPosition(x, y);
      drawHole(g, shape.kind, shape.color, HOLE_SIZE);
      this.boxLayer.add(g);
      const zone = this.add.zone(x, y, HOLE_SIZE + 24, HOLE_SIZE + 24).setInteractive({ cursor: 'pointer' });
      const hole: Hole = { shape, x, y, g, filled: false, zone };
      zone.on('pointerdown', () => this.onHoleTap(hole));
      this.holes.push(hole);
      g.setScale(0);
      this.tweens.add({ targets: g, scale: 1, duration: 380, delay: 80 * i, ease: 'Back.Out' });
    });

    this.queue = shuffle(shapes);
    this.time.delayedCall(420, () => this.nextPiece());
  }

  // ─── The piece ─────────────────────────────────────────────────────────

  private buildPiece(): void {
    this.pieceG = this.add.graphics();
    this.piece = this.add.container(PIECE_HOME.x, PIECE_HOME.y, [this.pieceG]).setDepth(10);
    this.piece.setSize(PIECE_SIZE + 20, PIECE_SIZE + 20);
    this.piece.setInteractive({ draggable: true, cursor: 'grab' });

    let downAt = { x: 0, y: 0 };
    this.piece.on('pointerdown', (p: Phaser.Input.Pointer) => { downAt = { x: p.x, y: p.y }; });
    this.piece.on('pointerup', (p: Phaser.Input.Pointer) => {
      // A tap (not a drag) says the name again.
      if (!this.busy && Math.hypot(p.x - downAt.x, p.y - downAt.y) < 10 && this.current) {
        say(this.current.name);
        this.wiggle();
      }
    });
    this.piece.on('dragstart', () => {
      if (this.busy) return;
      this.pieceBob?.pause();
      this.hideHand();
      this.tweens.add({ targets: this.piece, scale: 1.08, duration: 120 });
    });
    this.piece.on('drag', (_p: Phaser.Input.Pointer, x: number, y: number) => {
      if (this.busy) return;
      this.piece.setPosition(x, y);
      this.holes.forEach(h => {
        if (h.filled) return;
        const near = Phaser.Math.Distance.Between(x, y, h.x, h.y) < SNAP;
        drawHole(h.g, h.shape.kind, h.shape.color, HOLE_SIZE, near);
      });
    });
    this.piece.on('dragend', () => {
      if (this.busy) return;
      const hole = this.holes.find(h => !h.filled && Phaser.Math.Distance.Between(this.piece.x, this.piece.y, h.x, h.y) < SNAP);
      this.holes.forEach(h => !h.filled && drawHole(h.g, h.shape.kind, h.shape.color, HOLE_SIZE));
      if (!hole) this.returnHome();
      else if (hole.shape.kind === this.current?.kind) this.placeInto(hole);
      else this.wrongHole(hole);
    });
  }

  private nextPiece(): void {
    this.current = this.queue.shift();
    if (!this.current) return;
    this.missedThisPiece = false;
    this.busy = false;
    drawPiece(this.pieceG, this.current.kind, this.current.color, PIECE_SIZE);
    this.piece.setPosition(PIECE_HOME.x, 860).setScale(1).setAngle(0).setAlpha(1).setVisible(true);
    this.tweens.add({
      targets: this.piece, y: PIECE_HOME.y, duration: 520, ease: 'Back.Out',
      onComplete: () => this.bob(),
    });
    this.prompt.setText(`Where does the ${this.current.name} go?`);
    this.tweens.add({ targets: this.prompt, scale: { from: 0.85, to: 1 }, duration: 260, ease: 'Back.Out' });
    say(`${this.current.name}! Where does it go?`);
    this.armIdleHint();
  }

  private bob(): void {
    this.pieceBob?.remove();
    this.pieceBob = this.tweens.add({
      targets: this.piece, y: PIECE_HOME.y - 8, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.InOut',
    });
  }

  private wiggle(): void {
    this.tweens.add({ targets: this.piece, angle: { from: -10, to: 10 }, yoyo: true, repeat: 1, duration: 90,
      onComplete: () => this.piece.setAngle(0) });
  }

  private returnHome(): void {
    this.tweens.add({
      targets: this.piece, x: PIECE_HOME.x, y: PIECE_HOME.y, scale: 1, duration: 360, ease: 'Back.Out',
      onComplete: () => this.bob(),
    });
  }

  // ─── Answers ───────────────────────────────────────────────────────────

  private onHoleTap(hole: Hole): void {
    if (this.busy || hole.filled || !this.current) return;
    this.hideHand();
    if (hole.shape.kind === this.current.kind) this.placeInto(hole);
    else this.wrongHole(hole);
  }

  private wrongHole(hole: Hole): void {
    this.missedThisPiece = true;
    sounds.wrong();
    say(`That's the ${hole.shape.name}. Try another one!`);
    this.tweens.add({ targets: hole.g, x: { from: hole.x - 7, to: hole.x + 7 }, yoyo: true, repeat: 3, duration: 55,
      onComplete: () => hole.g.setX(hole.x) });
    this.wiggle();
    this.returnHome();
    this.armIdleHint();
  }

  private placeInto(hole: Hole): void {
    this.busy = true;
    this.idleTimer?.remove();
    this.pieceBob?.remove();
    hole.filled = true;
    this.placed++;
    if (!this.missedThisPiece) this.firstTry++;
    this.updateStars();

    // Fly over the hole, then shrink as it drops inside.
    this.tweens.chain({
      targets: this.piece,
      tweens: [
        { x: hole.x, y: hole.y - 14, scale: 1, duration: 260, ease: 'Sine.Out' },
        { y: hole.y, scale: HOLE_SIZE / PIECE_SIZE * 0.92, duration: 160, ease: 'Quad.In' },
      ],
      onComplete: () => {
        sounds.match();
        say(`${hole.shape.name}! Yay!`);
        // The piece now lives in the hole; draw it into the lid layer.
        const settled = this.add.graphics().setPosition(hole.x, hole.y);
        drawPiece(settled, hole.shape.kind, hole.shape.color, HOLE_SIZE * 0.92);
        this.boxLayer.add(settled);
        this.tweens.add({ targets: settled, scale: { from: 1.15, to: 1 }, duration: 260, ease: 'Back.Out' });
        this.piece.setVisible(false);
        this.ring(hole.x, hole.y, hole.shape.color);
        this.sparkles(hole.x, hole.y);

        const boxDone = this.holes.every(h => h.filled);
        this.time.delayedCall(boxDone ? 300 : 900, () => (boxDone ? this.finishBox() : this.nextPiece()));
      },
    });
  }

  private finishBox(): void {
    this.prompt.setText('All home! 🎉');
    sounds.streak();
    this.tweens.add({ targets: this.boxLayer, y: { from: 0, to: -10 }, yoyo: true, repeat: 1, duration: 160, ease: 'Sine.Out' });
    this.time.delayedCall(1300, () => {
      this.boxIndex++;
      if (this.boxIndex >= BOXES.length) this.endGame();
      else this.loadBox();
    });
  }

  private endGame(): void {
    this.renderDots();
    this.piece.disableInteractive();
    sounds.end();
    launchConfetti(this, CONFETTI_EMOJIS);
    say('You did it, Aya!');
    const ratio = this.firstTry / this.totalPieces;
    const stars = ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1;
    this.endOverlay.show({
      emoji: stars === 3 ? '🎉' : '🌟',
      title: stars === 3 ? 'Shape star!' : 'Great sorting!',
      subtitle: `Every shape found its home, Aya! 💖`,
      score: { value: `${this.firstTry}/${this.totalPieces}`, label: 'First-Try Shapes' },
      stars: { earned: stars, total: 3 },
    });
  }

  // ─── Hints & effects ───────────────────────────────────────────────────

  /** After a pause with no success, a little hand points at the right hole. */
  private armIdleHint(): void {
    this.idleTimer?.remove();
    this.idleTimer = this.time.delayedCall(7000, () => {
      const target = this.holes.find(h => !h.filled && h.shape.kind === this.current?.kind);
      if (!target || this.busy) return;
      this.hideHand();
      this.hand = this.add.text(target.x + 20, target.y + 60, '👆', { fontSize: '44px' }).setOrigin(0.5).setDepth(20);
      this.tweens.add({ targets: this.hand, y: target.y + 44, yoyo: true, repeat: -1, duration: 420, ease: 'Sine.InOut' });
      drawHole(target.g, target.shape.kind, target.shape.color, HOLE_SIZE, true);
    });
  }

  private hideHand(): void {
    this.hand?.destroy();
    this.hand = undefined;
  }

  private ring(x: number, y: number, color: number): void {
    const g = this.add.graphics().setDepth(5);
    const s = { r: HOLE_SIZE / 2, a: 0.8 };
    this.tweens.add({
      targets: s, r: HOLE_SIZE, a: 0, duration: 600, ease: 'Sine.Out',
      onUpdate: () => { g.clear(); g.lineStyle(5, color, s.a); g.strokeCircle(x, y, s.r); },
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
