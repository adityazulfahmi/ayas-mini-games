import Phaser from 'phaser';
import { drawBg } from '@shared/phaserUtils';
import { C, T, F } from '@shared/theme';
import { TARGETS, TOTAL_ROUNDS } from '../data';
import { BUBBLE_STYLES, drawBubble, spawnBubbleField } from './bubbles';

/**
 * Title scene visuals are intentionally bubble-themed:
 *  - drifting bubble field in the background
 *  - asymmetric "cluster" of four category bubbles (not a grid — that
 *    would feel like every other game in this collection)
 *  - one bubble plays the role of "the demo target": a 🎯 reticle hovers
 *    over it and it bobs slightly out of phase with its siblings
 *  - the CTA is a bubble itself, with a glossy highlight
 */
export class TitleScene extends Phaser.Scene {
  private hintTxt!: Phaser.GameObjects.Text;
  private hintChip!: Phaser.GameObjects.Graphics;

  constructor() { super('TitleScene'); }

  create(): void {
    const { width: W, height: H } = this.scale;
    drawBg(this);
    spawnBubbleField(this, W, H, 14);

    // Title — slightly larger than the standard game title; the 🎯 is part of
    // the silhouette and dropped before the wordmark to keep visual balance.
    this.add.text(W / 2, 96, '🎯 Pick & Pop!', {
      fontFamily: F.head, fontSize: '34px', color: T.main, align: 'center',
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);

    this.add.text(W / 2, 144, 'Tap the one that fits the prompt!', {
      fontFamily: F.body, fontSize: '14px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);

    this.buildClusterHero(W, 320);

    // CTA: a bubble-shaped button instead of the gradient pill used by
    // other games — keeps the metaphor consistent with the cards.
    this.buildBubbleCta(W / 2, H - 88);

    this.hintChip = this.add.graphics();
    this.hintTxt = this.add.text(W / 2, H - 168, '', {
      fontFamily: F.body, fontSize: '13px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);
    this.drawHintChip(`${TOTAL_ROUNDS} rounds · fruit · veg · vehicle · animal`);
  }

  // ─── Hero: asymmetric floating bubble cluster ──────────────────────────

  private buildClusterHero(W: number, cy: number): void {
    // Four positions arranged in a *cluster* (not a grid) with the demo
    // target at the visual center. The mint glow + pulse ring + scale pulse
    // on the target are sufficient cues — no reticle needed (avoids it
    // visually colliding with siblings).
    const layout: { dx: number; dy: number; r: number; emoji: string; isTarget: boolean; phase: number }[] = [
      // top-left bubble: vehicle
      { dx: -94, dy: -68, r: 50, emoji: TARGETS.vehicle.emoji,   isTarget: false, phase: 0    },
      // top-right bubble: animal
      { dx:  90, dy: -56, r: 48, emoji: TARGETS.animal.emoji,    isTarget: false, phase: 0.6 },
      // bottom-right bubble: veggie
      { dx:  74, dy:  76, r: 48, emoji: TARGETS.vegetable.emoji, isTarget: false, phase: 1.3 },
      // CENTER bubble: FRUIT — the demo target. Slightly bigger and at the
      // exact horizontal center so it reads as the focal point.
      { dx:   0, dy:  20, r: 64, emoji: TARGETS.fruit.emoji,     isTarget: true,  phase: 2.0 },
    ];

    layout.forEach((b, i) => {
      const bcx = W / 2 + b.dx;
      const bcy = cy + b.dy;
      const size = b.r * 2;

      const bg = this.add.graphics();
      drawBubble(bg, bcx, bcy, size, size, b.r, b.isTarget ? BUBBLE_STYLES.correct : BUBBLE_STYLES.idle);

      const txt = this.add.text(bcx, bcy, b.emoji, {
        fontFamily: F.body, fontSize: `${Math.round(b.r * 1.05)}px`,
      }).setOrigin(0.5);

      // Continuous bob — each bubble out of phase so the cluster feels alive
      this.tweens.add({
        targets: [bg, txt],
        y: '+=8',
        duration: 1800 + i * 240,
        delay: b.phase * 1000,
        ease: 'Sine.InOut',
        yoyo: true,
        repeat: -1,
      });

      // Subtle scale pulse on the demo target so "this is the one to tap"
      // reads even with the eye darting around the cluster
      if (b.isTarget) {
        this.tweens.add({
          targets: txt,
          scale: 1.07,
          duration: 1100,
          ease: 'Sine.InOut',
          yoyo: true,
          repeat: -1,
        });
        // Mint pulse ring beneath the target bubble — "tap here"
        const ring = this.add.graphics();
        ring.setPosition(bcx, bcy);
        const pulse = () => {
          ring.clear();
          ring.lineStyle(3, C.mint, 0.55);
          ring.strokeCircle(0, 0, b.r + 6);
          ring.setScale(1).setAlpha(1);
          this.tweens.add({
            targets: ring,
            scale: 1.5,
            alpha: 0,
            duration: 1200,
            ease: 'Cubic.Out',
            onComplete: () => pulse(),
          });
        };
        pulse();
      }
    });
  }

  // ─── CTA bubble ────────────────────────────────────────────────────────

  private buildBubbleCta(cx: number, cy: number): void {
    const w = 320, h = 70, r = 36;
    const bg = this.add.graphics();
    // Custom bubble-styled CTA: pink fill + gloss highlight on top-left
    const x = cx - w / 2, y = cy - h / 2;
    // Outer glow
    for (let i = 4; i >= 1; i--) {
      bg.fillStyle(C.pink, (0.18 * i) / 12);
      bg.fillRoundedRect(x - i * 1.4, y - i * 1.4, w + i * 2.8, h + i * 2.8, r + i * 1.4);
    }
    // Drop shadow
    bg.fillStyle(C.shadow, 0.22);
    bg.fillRoundedRect(x + 2, y + 10, w, h, r);
    // Body
    bg.fillStyle(C.pink, 1);
    bg.fillRoundedRect(x, y, w, h, r);
    // Gloss highlight
    bg.fillStyle(C.white, 0.45);
    bg.fillEllipse(x + w * 0.32, y + h * 0.22, w * 0.50, h * 0.32);
    bg.fillStyle(C.white, 0.85);
    bg.fillEllipse(x + w * 0.26, y + h * 0.19, w * 0.18, h * 0.13);

    const label = this.add.text(cx, cy, "Let's Pop! 🫧", {
      fontFamily: F.head, fontSize: '26px', color: T.white,
    }).setOrigin(0.5);

    const zone = this.add.zone(cx, cy, w, h).setInteractive({ cursor: 'pointer' });
    zone.on('pointerover', () => {
      this.tweens.add({ targets: [bg, label], y: '-=3', duration: 140 });
    });
    zone.on('pointerout', () => {
      this.tweens.add({ targets: [bg, label], y: '+=3', duration: 140 });
    });
    zone.on('pointerdown', () => {
      // Quick "press in" then start GameScene
      this.tweens.add({
        targets: label, scale: 0.95, duration: 80, yoyo: true,
        onComplete: () => this.scene.start('GameScene'),
      });
    });
  }

  // ─── Hint chip ─────────────────────────────────────────────────────────

  private drawHintChip(text: string): void {
    this.hintTxt.setText(text);
    const chipPadX = 14, chipH = 28;
    const w = this.hintTxt.width + chipPadX * 2;
    const cx = this.hintTxt.x, cy = this.hintTxt.y;
    this.hintChip.clear();
    this.hintChip.fillStyle(C.white, 0.7);
    this.hintChip.fillRoundedRect(cx - w / 2, cy - chipH / 2, w, chipH, chipH / 2);
    this.hintChip.lineStyle(1.5, C.lavender, 0.5);
    this.hintChip.strokeRoundedRect(cx - w / 2, cy - chipH / 2, w, chipH, chipH / 2);
  }
}
