import Phaser from 'phaser';
import { drawBg } from '@shared/phaserUtils';
import { C, T, F } from '@shared/theme';
import { CATEGORY_ORDER, TARGETS, TOTAL_ROUNDS, type Mode } from '../data';
import { BUBBLE_STYLES, bubbleBurst, drawBubble, popShockwave, spawnBubbleField } from './bubbles';
import { popSound, say } from '../voice';

const W = 420;
const H = 780;

const BUBBLE_R = 76;
const COL_DX = 92;
const ROW1_Y = 286;
const ROW2_Y = 486;
const MIX_Y = 676;

/**
 * One tap = play. Aya taps the bubble she wants (fruit / animals /
 * vehicles / music, or "Mix"), it pops with a sound, the category is
 * spoken, and the game starts. No separate select + "Go" step: two-step
 * flows lose a 2½-year-old.
 */
export class TitleScene extends Phaser.Scene {
  private starting = false;

  constructor() { super('TitleScene'); }

  create(): void {
    drawBg(this);
    spawnBubbleField(this, W, H, 14);
    this.starting = false;

    const title = this.add.text(W / 2, 88, 'Pick & Pop!', {
      fontFamily: F.head, fontSize: '44px', color: T.main, align: 'center',
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);
    this.tweens.add({ targets: title, scale: 1.04, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    this.add.text(W / 2, 142, 'Tap a bubble to play!', {
      fontFamily: F.body, fontSize: '17px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);

    CATEGORY_ORDER.forEach((cat, i) => {
      const cx = W / 2 + (i % 2 === 0 ? -COL_DX : COL_DX);
      const cy = i < 2 ? ROW1_Y : ROW2_Y;
      const t = TARGETS[cat];
      this.buildCategoryBubble(cat, cx, cy, t.emoji, t.caption, t.tint, i);
    });

    this.buildMixBubble();

    this.add.text(W / 2, H - 34, `${TOTAL_ROUNDS} little rounds · no timer`, {
      fontFamily: F.body, fontSize: '13px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0.8);
  }

  private buildCategoryBubble(
    mode: Mode, cx: number, cy: number,
    emoji: string, caption: string, tint: number, i: number,
  ): void {
    const g = this.add.graphics();
    drawBubble(g, 0, 0, BUBBLE_R * 2, BUBBLE_R * 2, BUBBLE_R, { ...BUBBLE_STYLES.idle, fill: tint });
    const txt = this.add.text(0, -4, emoji, { fontFamily: F.body, fontSize: '74px' }).setOrigin(0.5);
    const body = this.add.container(cx, cy, [g, txt]);

    const capTxt = this.add.text(cx, cy + BUBBLE_R + 26, caption, {
      fontFamily: F.head, fontSize: '19px', color: T.main,
    }).setOrigin(0.5);

    // Lazy bob, phase-shifted per bubble so the grid feels alive.
    this.tweens.add({
      targets: body, y: cy + 8, duration: 1800 + i * 200, delay: i * 260,
      ease: 'Sine.InOut', yoyo: true, repeat: -1,
    });

    const zone = this.add.zone(cx, cy + 14, BUBBLE_R * 2 + 24, BUBBLE_R * 2 + 52)
      .setInteractive({ cursor: 'pointer' });
    zone.on('pointerover', () => { if (!this.starting) this.tweens.add({ targets: txt, scale: 1.1, duration: 140 }); });
    zone.on('pointerout', () => { if (!this.starting) this.tweens.add({ targets: txt, scale: 1, duration: 140 }); });
    zone.on('pointerdown', () => this.start(mode, body, g, txt, capTxt, BUBBLE_R));
  }

  private buildMixBubble(): void {
    const w = 300, h = 84;
    const g = this.add.graphics();
    const x = -w / 2, y = -h / 2, r = h / 2;
    for (let i = 4; i >= 1; i--) {
      g.fillStyle(C.pink, (0.18 * i) / 12);
      g.fillRoundedRect(x - i * 1.4, y - i * 1.4, w + i * 2.8, h + i * 2.8, r + i * 1.4);
    }
    g.fillStyle(C.shadow, 0.22);
    g.fillRoundedRect(x + 2, y + 10, w, h, r);
    g.fillStyle(C.pink, 1);
    g.fillRoundedRect(x, y, w, h, r);
    g.fillStyle(C.white, 0.4);
    g.fillEllipse(x + w * 0.34, y + h * 0.22, w * 0.5, h * 0.3);
    g.fillStyle(C.white, 0.85);
    g.fillEllipse(x + w * 0.27, y + h * 0.19, w * 0.16, h * 0.12);

    const icons = this.add.text(-w / 2 + 74, 2, '🍓🐶', { fontFamily: F.body, fontSize: '30px' }).setOrigin(0.5);
    const label = this.add.text(36, 0, 'Mix it up!', {
      fontFamily: F.head, fontSize: '28px', color: T.white,
    }).setOrigin(0.5);
    const body = this.add.container(W / 2, MIX_Y, [g, icons, label]);

    const zone = this.add.zone(W / 2, MIX_Y, w + 20, h + 20).setInteractive({ cursor: 'pointer' });
    zone.on('pointerover', () => { if (!this.starting) this.tweens.add({ targets: body, y: MIX_Y - 3, duration: 140 }); });
    zone.on('pointerout', () => { if (!this.starting) this.tweens.add({ targets: body, y: MIX_Y, duration: 140 }); });
    zone.on('pointerdown', () => this.start('mix', body, g, label, undefined, 70));
  }

  /** Pop the tapped bubble, say the category, then go. */
  private start(
    mode: Mode,
    body: Phaser.GameObjects.Container,
    g: Phaser.GameObjects.Graphics,
    content: Phaser.GameObjects.Text,
    caption: Phaser.GameObjects.Text | undefined,
    burstR: number,
  ): void {
    if (this.starting) return;
    this.starting = true;
    this.tweens.killTweensOf(body);
    popSound();
    say(mode === 'mix' ? 'Mix it up!' : `${TARGETS[mode].caption}!`);

    bubbleBurst(this, body.x, body.y, burstR, mode === 'mix' ? C.pink : C.lavender);
    popShockwave(this, body.x, body.y, burstR * 0.8, burstR * 1.6, mode === 'mix' ? C.pink : C.mint);
    this.tweens.add({ targets: g, scale: 1.25, alpha: 0, duration: 180, ease: 'Cubic.Out' });
    this.tweens.add({ targets: content, scale: 1.3, duration: 260, ease: 'Back.Out' });
    if (caption) this.tweens.add({ targets: caption, alpha: 0, duration: 200 });
    else this.tweens.add({ targets: body, alpha: 0, duration: 260, delay: 120 });

    this.time.delayedCall(700, () => this.scene.start('GameScene', { mode }));
  }
}
