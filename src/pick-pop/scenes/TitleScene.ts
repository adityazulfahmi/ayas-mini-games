import Phaser from 'phaser';
import { drawBg } from '@shared/phaserUtils';
import { C, T, F } from '@shared/theme';
import { TARGETS, TOTAL_ROUNDS, type TargetCategory } from '../data';
import { BUBBLE_STYLES, drawBubble, spawnBubbleField } from './bubbles';

/**
 * Cluster slot — one tappable category bubble. Position is pre-baked
 * (asymmetric, not a grid) so even the unselected bubbles feel
 * deliberately placed; the "selected" bubble gets a mint glow + pulse
 * ring + scale pulse on its emoji.
 */
interface ClusterSlot {
  category: TargetCategory;
  cx: number;
  cy: number;
  r: number;
  bg: Phaser.GameObjects.Graphics;
  txt: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
  ring?: Phaser.GameObjects.Graphics;
  ringTween?: Phaser.Tweens.Tween;
  pulseTween?: Phaser.Tweens.Tween;
}

const ORDER: TargetCategory[] = ['vehicle', 'animal', 'instrument', 'fruit'];

export class TitleScene extends Phaser.Scene {
  private hintTxt!: Phaser.GameObjects.Text;
  private hintChip!: Phaser.GameObjects.Graphics;
  private slots: ClusterSlot[] = [];
  private selected: TargetCategory = 'fruit';

  constructor() { super('TitleScene'); }

  create(): void {
    const { width: W, height: H } = this.scale;
    drawBg(this);
    spawnBubbleField(this, W, H, 14);

    // Phaser reuses scene instances across `scene.start` — reset arrays
    // that get .push()'ed into. (See decisions.md D-005.)
    this.slots = [];
    this.selected = 'fruit';

    this.add.text(W / 2, 96, '🎯 Pick & Pop!', {
      fontFamily: F.head, fontSize: '34px', color: T.main, align: 'center',
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);

    this.add.text(W / 2, 144, 'Pick a category — then pop the matches!', {
      fontFamily: F.body, fontSize: '14px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);

    this.buildClusterPicker(W, 322);

    this.buildBubbleCta(W / 2, H - 88);

    this.hintChip = this.add.graphics();
    this.hintTxt = this.add.text(W / 2, H - 168, '', {
      fontFamily: F.body, fontSize: '13px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);
    this.drawHintChip(`${TOTAL_ROUNDS} rounds of one category at a time`);
  }

  // ─── Cluster picker ────────────────────────────────────────────────────

  private buildClusterPicker(W: number, cy: number): void {
    // Asymmetric cluster — fruit at center is the default selection. The
    // dx/dy values are hand-tuned to feel organic, not gridded.
    const layout: { category: TargetCategory; dx: number; dy: number; r: number }[] = [
      { category: 'vehicle',    dx: -94, dy: -68, r: 52 },
      { category: 'animal',     dx:  92, dy: -54, r: 52 },
      { category: 'instrument', dx:  76, dy:  82, r: 52 },
      { category: 'fruit',      dx:   0, dy:  22, r: 64 }, // bigger — defaults selected
    ];

    layout.forEach(({ category, dx, dy, r }) => {
      const cx = W / 2 + dx;
      const ccy = cy + dy;
      const size = r * 2;
      const t = TARGETS[category];

      const bg = this.add.graphics();
      const txt = this.add.text(cx, ccy, t.emoji, {
        fontFamily: F.body, fontSize: `${Math.round(r * 1.05)}px`,
      }).setOrigin(0.5);
      // The hit zone is a square that bounds the bubble — easy for a
      // 2-year-old's tap (Phaser's circle shapes for hit zones are noticeably
      // less forgiving on the corners than a slightly oversized square).
      const zone = this.add.zone(cx, ccy, size + 12, size + 12).setInteractive({ cursor: 'pointer' });

      const slot: ClusterSlot = { category, cx, cy: ccy, r, bg, txt, zone };
      this.slots.push(slot);

      zone.on('pointerdown', () => this.select(category));
      zone.on('pointerover', () => {
        if (this.selected === category) return;
        this.tweens.add({ targets: txt, scale: 1.06, duration: 140 });
      });
      zone.on('pointerout', () => {
        if (this.selected === category) return;
        this.tweens.add({ targets: txt, scale: 1, duration: 140 });
      });

      // Continuous lazy bob — phase varies so the cluster feels alive.
      const phase = ORDER.indexOf(category);
      this.tweens.add({
        targets: [bg, txt],
        y: '+=8',
        duration: 1900 + phase * 220,
        delay: phase * 320,
        ease: 'Sine.InOut',
        yoyo: true,
        repeat: -1,
      });
    });

    this.applySelectionVisuals();
  }

  private select(category: TargetCategory): void {
    if (this.selected === category) return;
    this.selected = category;
    this.applySelectionVisuals();
  }

  /**
   * Repaint each slot's bubble fill and start/stop the selection-only
   * effects (mint pulse ring + scale pulse on the emoji).
   */
  private applySelectionVisuals(): void {
    this.slots.forEach((slot) => {
      const isSelected = slot.category === this.selected;
      drawBubble(
        slot.bg, slot.cx, slot.cy, slot.r * 2, slot.r * 2, slot.r,
        isSelected ? BUBBLE_STYLES.correct : BUBBLE_STYLES.idle,
      );

      // Stop any prior selection effects and clean up the ring graphic.
      slot.pulseTween?.stop();
      slot.pulseTween = undefined;
      slot.ringTween?.stop();
      slot.ringTween = undefined;
      slot.ring?.destroy();
      slot.ring = undefined;
      // Reset the emoji scale so a previously-selected bubble settles.
      slot.txt.setScale(1);

      if (isSelected) {
        // Scale-pulse on the emoji — "this is the choice".
        slot.pulseTween = this.tweens.add({
          targets: slot.txt,
          scale: 1.08,
          duration: 1100,
          ease: 'Sine.InOut',
          yoyo: true,
          repeat: -1,
        });
        // Mint pulse ring beneath — "tap Let's Pop!".
        const ring = this.add.graphics();
        ring.setPosition(slot.cx, slot.cy);
        slot.ring = ring;
        const pulse = () => {
          ring.clear();
          ring.lineStyle(3, C.mint, 0.55);
          ring.strokeCircle(0, 0, slot.r + 6);
          ring.setScale(1).setAlpha(1);
          slot.ringTween = this.tweens.add({
            targets: ring,
            scale: 1.5,
            alpha: 0,
            duration: 1200,
            ease: 'Cubic.Out',
            onComplete: () => {
              if (this.selected === slot.category) pulse();
            },
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
    const x = cx - w / 2, y = cy - h / 2;
    // Outer glow
    for (let i = 4; i >= 1; i--) {
      bg.fillStyle(C.pink, (0.18 * i) / 12);
      bg.fillRoundedRect(x - i * 1.4, y - i * 1.4, w + i * 2.8, h + i * 2.8, r + i * 1.4);
    }
    bg.fillStyle(C.shadow, 0.22);
    bg.fillRoundedRect(x + 2, y + 10, w, h, r);
    bg.fillStyle(C.pink, 1);
    bg.fillRoundedRect(x, y, w, h, r);
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
      // Quick "press in" then start GameScene with the chosen category.
      this.tweens.add({
        targets: label, scale: 0.95, duration: 80, yoyo: true,
        onComplete: () => this.scene.start('GameScene', { category: this.selected }),
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
