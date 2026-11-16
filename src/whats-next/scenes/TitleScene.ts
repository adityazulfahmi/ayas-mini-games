import Phaser from 'phaser';
import { drawBg, primaryBtn } from '@shared/phaserUtils';
import { C, T, F } from '@shared/theme';
import { PATTERN_FAMILIES, STORIES, TOTAL_ROUNDS, type GameMode } from '../data';
import { say, unlockSpeech } from '../speech';

const HERO_Y = 248;

export class TitleScene extends Phaser.Scene {
  private mode: GameMode = 'pattern';
  private patternBtn!: Phaser.GameObjects.Container;
  private storyBtn!: Phaser.GameObjects.Container;
  private heroObjs: Phaser.GameObjects.GameObject[] = [];
  private heroSlots: Phaser.GameObjects.Container[] = [];
  private heroLoop?: Phaser.Time.TimerEvent;
  private hintTxt!: Phaser.GameObjects.Text;
  private hintChip!: Phaser.GameObjects.Graphics;

  constructor() { super('TitleScene'); }

  create(): void {
    const { width: W, height: H } = this.scale;
    drawBg(this);
    this.decorateBg(W, H);
    // D-005: reset pushed-into fields on every visit.
    this.heroObjs = [];
    this.heroSlots = [];
    this.heroLoop = undefined;

    this.add.text(W / 2, 86, '🔮 What Comes Next?', {
      fontFamily: F.head, fontSize: '32px', color: T.main, align: 'center',
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);

    this.add.text(W / 2, 130, 'Listen, look, and find the next one!', {
      fontFamily: F.body, fontSize: '15px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);

    // Hero panel: a live mini version of the game row.
    const pg = this.add.graphics();
    pg.fillStyle(C.shadow, 0.1);
    pg.fillRoundedRect(22, HERO_Y - 74 + 6, W - 44, 148, 28);
    pg.fillStyle(C.white, 0.75);
    pg.fillRoundedRect(22, HERO_Y - 74, W - 44, 148, 28);

    this.sectionLabel(W / 2, 372, 'CHOOSE A MODE');

    const modeW = 176, modeH = 140, modeGap = 16;
    this.patternBtn = this.buildPickerBtn(
      W / 2 - modeW / 2 - modeGap / 2, 466, modeW, modeH,
      '🎶', 'Pattern', 'Hear the beat',
      () => this.selectMode('pattern', true),
    );
    this.storyBtn = this.buildPickerBtn(
      W / 2 + modeW / 2 + modeGap / 2, 466, modeW, modeH,
      '📖', 'Story', 'Little stories',
      () => this.selectMode('story', true),
    );

    this.hintChip = this.add.graphics();
    this.hintTxt = this.add.text(W / 2, 570, '', {
      fontFamily: F.body, fontSize: '14px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);

    this.selectMode(this.mode, false);

    primaryBtn(this, W / 2, H - 96, 340, 70, "Let's Go! 🎉", () => {
      unlockSpeech();
      this.scene.start('GameScene', { mode: this.mode });
    });
  }

  // ─── Hero preview ──────────────────────────────────────────────────────

  private buildHero(items: string[]): void {
    this.heroLoop?.remove();
    this.heroObjs.forEach(o => o.destroy());
    this.heroObjs = [];
    this.heroSlots = [];
    const W = this.scale.width;
    const n = items.length + 1;
    const fw = n >= 5 ? 58 : 66, fh = 84, gap = n >= 5 ? 10 : 18;
    const startX = W / 2 - (fw * n + gap * (n - 1)) / 2 + fw / 2;

    for (let i = 0; i < n; i++) {
      const isQ = i === n - 1;
      const g = this.add.graphics();
      g.fillStyle(C.shadow, 0.12);
      g.fillRoundedRect(-fw / 2 + 1, -fh / 2 + 5, fw, fh, 16);
      g.fillStyle(isQ ? 0xfff0f6 : C.white, 1);
      g.fillRoundedRect(-fw / 2, -fh / 2, fw, fh, 16);
      g.lineStyle(isQ ? 3 : 2, isQ ? C.pink : C.lavender, isQ ? 0.9 : 0.45);
      g.strokeRoundedRect(-fw / 2, -fh / 2, fw, fh, 16);
      const t = this.add.text(0, 0, isQ ? '?' : items[i], {
        fontFamily: isQ ? F.head : F.body, fontSize: isQ ? '40px' : '38px',
        color: isQ ? '#f06292' : T.main, padding: { top: 6, bottom: 6 },
      }).setOrigin(0.5);
      const c = this.add.container(startX + i * (fw + gap), HERO_Y, [g, t]);
      this.heroObjs.push(c);
      this.heroSlots.push(c);
      if (isQ) {
        this.tweens.add({ targets: t, scale: 1.15, yoyo: true, repeat: -1, duration: 650, ease: 'Sine.InOut' });
      }
    }

    // Each picture hops in turn, like the beat in the game.
    const run = () => {
      this.heroSlots.forEach((c, i) => {
        this.time.delayedCall(i * 380, () => {
          this.tweens.add({ targets: c, y: HERO_Y - 12, duration: 150, yoyo: true, ease: 'Sine.Out' });
        });
      });
    };
    run();
    this.heroLoop = this.time.addEvent({ delay: 3600, loop: true, callback: run });
  }

  // ─── Decoration ────────────────────────────────────────────────────────

  private decorateBg(W: number, H: number): void {
    const marks = [
      { x: 34,     y: 168,     c: '🎵', s: 22, r: -8, a: 0.16 },
      { x: W - 36, y: 160,     c: '✨', s: 22, r: 12, a: 0.2 },
      { x: 30,     y: 330,     c: '✨', s: 18, r: 0,  a: 0.18 },
      { x: W - 32, y: 336,     c: '🎶', s: 20, r: 0,  a: 0.16 },
      { x: 40,     y: H - 180, c: '🌸', s: 22, r: 6,  a: 0.16 },
      { x: W - 40, y: H - 176, c: '✨', s: 20, r: 0,  a: 0.18 },
    ];
    marks.forEach(m => {
      this.add.text(m.x, m.y, m.c, {
        fontFamily: F.body, fontSize: `${m.s}px`,
      }).setOrigin(0.5).setAlpha(m.a).setRotation(m.r * Math.PI / 180);
    });
  }

  private sectionLabel(cx: number, cy: number, text: string): void {
    const w = 176, h = 26;
    const bg = this.add.graphics();
    bg.fillStyle(C.white, 0.85);
    bg.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
    bg.lineStyle(1.5, C.lavender, 0.5);
    bg.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
    this.add.text(cx, cy, text, {
      fontFamily: F.body, fontSize: '12px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  // ─── Picker button ─────────────────────────────────────────────────────

  private buildPickerBtn(
    cx: number, cy: number, w: number, h: number,
    icon: string, title: string, subtitle: string,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const bg = this.add.graphics();
    const iconTxt = this.add.text(0, -26, icon, {
      fontFamily: F.body, fontSize: '46px', padding: { top: 6, bottom: 6 },
    }).setOrigin(0.5);
    const titleTxt = this.add.text(0, 24, title, {
      fontFamily: F.head, fontSize: '22px', color: T.main,
    }).setOrigin(0.5);
    const subTxt = this.add.text(0, 50, subtitle, {
      fontFamily: F.body, fontSize: '13px', color: T.sub, fontStyle: 'bold',
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
      bg.fillStyle(C.shadow, 0.2);
      bg.fillRoundedRect(-w / 2, -h / 2 + 5, w, h, 24);
      bg.fillStyle(C.pink, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 24);
      titleTxt.setColor(T.white);
      subTxt.setColor('rgba(255,255,255,0.9)');
    } else {
      bg.fillStyle(C.white, 1);
      bg.lineStyle(2.5, C.lavender, 0.9);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 24);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 24);
      titleTxt.setColor(T.main);
      subTxt.setColor(T.sub);
    }
  }

  private drawHintChip(text: string): void {
    this.hintTxt.setText(text);
    const chipPadX = 16, chipH = 32;
    const w = this.hintTxt.width + chipPadX * 2;
    const cx = this.hintTxt.x, cy = this.hintTxt.y;
    this.hintChip.clear();
    this.hintChip.fillStyle(C.white, 0.7);
    this.hintChip.fillRoundedRect(cx - w / 2, cy - chipH / 2, w, chipH, chipH / 2);
    this.hintChip.lineStyle(1.5, C.lavender, 0.5);
    this.hintChip.strokeRoundedRect(cx - w / 2, cy - chipH / 2, w, chipH, chipH / 2);
  }

  // ─── Mode change ───────────────────────────────────────────────────────

  private selectMode(m: GameMode, tapped: boolean): void {
    this.mode = m;
    this.drawPickerBg(this.patternBtn, m === 'pattern');
    this.drawPickerBg(this.storyBtn,   m === 'story');
    const btn = m === 'pattern' ? this.patternBtn : this.storyBtn;
    if (tapped) {
      this.tweens.add({ targets: btn, scale: 1.05, duration: 120, yoyo: true });
      say(m === 'pattern' ? 'Patterns!' : 'Stories!');
    }

    if (m === 'pattern') {
      const fam = PATTERN_FAMILIES[Math.floor(Math.random() * PATTERN_FAMILIES.length)];
      const [a, b] = fam.items;
      this.buildHero([a.e, b.e, a.e, b.e]);
      this.drawHintChip(`${TOTAL_ROUNDS} patterns · no timer 🎵`);
    } else {
      const story = STORIES[Math.floor(Math.random() * STORIES.length)];
      this.buildHero(story.frames.map(f => f.e));
      this.drawHintChip(`${TOTAL_ROUNDS} little stories · no timer 🌱`);
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
