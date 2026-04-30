import Phaser from 'phaser';
import { drawBg, primaryBtn } from '@shared/phaserUtils';
import { C, T, F } from '@shared/theme';
import { PATTERN_SETS, STORIES, TOTAL_ROUNDS, type GameMode } from '../data';

export class TitleScene extends Phaser.Scene {
  private mode: GameMode = 'pattern';
  private patternBtn!: Phaser.GameObjects.Container;
  private storyBtn!: Phaser.GameObjects.Container;
  private heroFrames: Phaser.GameObjects.Text[] = [];
  private heroArrows: Phaser.GameObjects.Text[] = [];
  private heroQuestion!: Phaser.GameObjects.Text;
  private hintTxt!: Phaser.GameObjects.Text;
  private hintChip!: Phaser.GameObjects.Graphics;

  constructor() { super('TitleScene'); }

  create(): void {
    const { width: W, height: H } = this.scale;
    drawBg(this);
    this.decorateBg(W, H);
    // Phaser reuses scene instances across scene.start, so any field
    // collected via .push() must be reset at the top of create() — otherwise
    // the second visit would re-use stale references to destroyed objects.
    this.heroFrames = [];
    this.heroArrows = [];

    this.add.text(W / 2, 92, '🔮 What Comes Next?', {
      fontFamily: F.head, fontSize: '32px', color: T.main, align: 'center',
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);

    this.add.text(W / 2, 138, 'Spot the next one in the row!', {
      fontFamily: F.body, fontSize: '14px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);

    // Hero preview — a mini sequence row reflecting the chosen mode.
    // Three small cards with arrow connectors and a final ? card so the
    // player sees exactly what gameplay will look like before tapping Play.
    this.buildHero(W, 222);

    // Mode picker — section chip + two large pickable cards
    this.sectionLabel(W / 2, 372, 'CHOOSE A MODE');

    const modeW = 168, modeH = 86, modeGap = 14;
    this.patternBtn = this.buildPickerBtn(
      W / 2 - modeW / 2 - modeGap / 2, 432, modeW, modeH,
      '🎨', 'Pattern', 'Shapes & colours',
      () => this.selectMode('pattern'),
    );
    this.storyBtn = this.buildPickerBtn(
      W / 2 + modeW / 2 + modeGap / 2, 432, modeW, modeH,
      '📖', 'Story', 'Things that grow',
      () => this.selectMode('story'),
    );

    // Hint chip below the picker
    this.hintChip = this.add.graphics();
    this.hintTxt = this.add.text(W / 2, 538, '', {
      fontFamily: F.body, fontSize: '13px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);

    this.selectMode('pattern');

    primaryBtn(this, W / 2, H - 90, 340, 62, "Let's Go! 🎉", () => {
      this.scene.start('GameScene', { mode: this.mode });
    });
  }

  // ─── Hero preview ──────────────────────────────────────────────────────

  private buildHero(W: number, cy: number): void {
    // Four slots: three filled frames + a final ? frame. Lavender arrows
    // sit in the gaps so the row reads as a left-to-right sequence.
    const frameW = 56, frameH = 70, gap = 22;
    const total = frameW * 4 + gap * 3;
    const startX = W / 2 - total / 2 + frameW / 2;

    for (let i = 0; i < 4; i++) {
      const x = startX + i * (frameW + gap);
      // Card background
      const isQ = i === 3;
      const bg = this.add.graphics();
      const fill = isQ ? C.bg2 : C.white;
      bg.fillStyle(C.shadow, 0.14);
      bg.fillRoundedRect(x - frameW / 2 + 2, cy - frameH / 2 + 6, frameW, frameH, 14);
      bg.fillStyle(fill, 1);
      bg.fillRoundedRect(x - frameW / 2, cy - frameH / 2, frameW, frameH, 14);
      if (isQ) {
        bg.lineStyle(2.5, C.lavender, 0.85);
        bg.strokeRoundedRect(x - frameW / 2, cy - frameH / 2, frameW, frameH, 14);
      }
      // Frame content (filled later by selectMode)
      const txt = this.add.text(x, cy, '', {
        fontFamily: F.body, fontSize: isQ ? '32px' : '36px',
        color: isQ ? T.sub : T.main,
      }).setOrigin(0.5);
      if (isQ) this.heroQuestion = txt;
      else this.heroFrames.push(txt);

      // Arrow connector to the right of every frame except the last
      if (i < 3) {
        const ax = x + frameW / 2 + gap / 2;
        const ar = this.add.text(ax, cy, '➜', {
          fontFamily: F.body, fontSize: '20px', color: T.sub,
        }).setOrigin(0.5).setAlpha(0.65);
        this.heroArrows.push(ar);
      }
    }

    this.heroQuestion.setText('?');
    // Gentle bob on the ? to draw the eye to the answer slot
    this.tweens.add({
      targets: this.heroQuestion,
      scale: 1.12, yoyo: true, repeat: -1,
      duration: 900, ease: 'Sine.InOut',
    });
  }

  private setHeroFrames(a: string, b: string, c: string): void {
    const triplet = [a, b, c];
    this.heroFrames.forEach((t, i) => t.setText(triplet[i] ?? ''));
  }

  // ─── Decoration ────────────────────────────────────────────────────────

  private decorateBg(W: number, H: number): void {
    // Scattered ➜ + ✨ + 🌀 marks echo the "sequence/flow" motif of the game.
    const marks = [
      { x: 36,      y: 178, c: '➜', s: 26, r: -8,  a: 0.10 },
      { x: W - 38,  y: 168, c: '✨', s: 24, r: 12, a: 0.18 },
      { x: 30,      y: 320, c: '✨', s: 20, r: 0,  a: 0.18 },
      { x: W - 30,  y: 326, c: '🌀', s: 22, r: 0,  a: 0.12 },
      { x: 44,      y: H - 218, c: '➜', s: 24, r: 6, a: 0.10 },
      { x: W - 40,  y: H - 200, c: '✨', s: 22, r: 0, a: 0.15 },
    ];
    marks.forEach(m => {
      this.add.text(m.x, m.y, m.c, {
        fontFamily: F.body, fontSize: `${m.s}px`,
      }).setOrigin(0.5).setAlpha(m.a).setRotation(m.r * Math.PI / 180);
    });
  }

  private sectionLabel(cx: number, cy: number, text: string): void {
    const w = 170, h = 22;
    const bg = this.add.graphics();
    bg.fillStyle(C.white, 0.85);
    bg.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
    bg.lineStyle(1.5, C.lavender, 0.5);
    bg.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
    this.add.text(cx, cy, text, {
      fontFamily: F.body, fontSize: '11px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  // ─── Picker button ─────────────────────────────────────────────────────

  private buildPickerBtn(
    cx: number, cy: number, w: number, h: number,
    icon: string, title: string, subtitle: string,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const bg = this.add.graphics();
    const iconTxt = this.add.text(0, -22, icon, {
      fontFamily: F.body, fontSize: '32px',
    }).setOrigin(0.5);
    const titleTxt = this.add.text(0, 12, title, {
      fontFamily: F.head, fontSize: '17px', color: T.main,
    }).setOrigin(0.5);
    const subTxt = this.add.text(0, 32, subtitle, {
      fontFamily: F.body, fontSize: '10px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);
    const container = this.add.container(cx, cy, [bg, iconTxt, titleTxt, subTxt]);
    container.setSize(w, h).setInteractive({ cursor: 'pointer' });
    container.on('pointerdown', onClick);

    const refs = container as unknown as PickerRefs;
    refs.bg = bg; refs.iconTxt = iconTxt; refs.titleTxt = titleTxt; refs.subTxt = subTxt;
    refs.w = w; refs.h = h;
    return container;
  }

  private drawPickerBg(c: Phaser.GameObjects.Container, active: boolean): void {
    const { bg, titleTxt, subTxt, w, h } = c as unknown as PickerRefs;
    bg.clear();
    if (active) {
      bg.fillStyle(C.shadow, 0.18);
      bg.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 20);
      bg.fillStyle(C.pink, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 20);
      titleTxt.setColor(T.white);
      subTxt.setColor('rgba(255,255,255,0.85)');
    } else {
      bg.fillStyle(C.white, 1);
      bg.lineStyle(2.5, C.lavender, 0.9);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 20);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 20);
      titleTxt.setColor(T.main);
      subTxt.setColor(T.sub);
    }
  }

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

  // ─── Mode change ───────────────────────────────────────────────────────

  private selectMode(m: GameMode): void {
    this.mode = m;
    this.drawPickerBg(this.patternBtn, m === 'pattern');
    this.drawPickerBg(this.storyBtn,   m === 'story');

    if (m === 'pattern') {
      // Pick a random pair from a random set so the preview hints at the
      // ABAB structure ("look, the same thing keeps coming back!").
      const set = PATTERN_SETS[Math.floor(Math.random() * PATTERN_SETS.length)];
      const [a, b] = set.items;
      this.setHeroFrames(a, b, a);
      this.drawHintChip(`${TOTAL_ROUNDS} rounds of patterns to spot 🎯`);
    } else {
      // Show the first three frames of a real story so the preview teases
      // the transformation reasoning that the mode is about.
      const story = STORIES[Math.floor(Math.random() * STORIES.length)];
      this.setHeroFrames(story.frames[0], story.frames[1], story.frames[2]);
      this.drawHintChip(`${TOTAL_ROUNDS} little stories that grow 🌱`);
    }
  }
}

interface PickerRefs {
  bg: Phaser.GameObjects.Graphics;
  iconTxt: Phaser.GameObjects.Text;
  titleTxt: Phaser.GameObjects.Text;
  subTxt: Phaser.GameObjects.Text;
  w: number; h: number;
}
