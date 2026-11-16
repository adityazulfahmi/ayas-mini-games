import Phaser from 'phaser';
import { drawBg, primaryBtn } from '@shared/phaserUtils';
import { C, T, F } from '@shared/theme';
import {
  PATTERN_LEVELS, STORIES, THING_FAMILIES, TOTAL_ROUNDS, loadLevel, saveLevel,
  type GameMode,
} from '../data';
import { say, unlockSpeech } from '../speech';

const HERO_Y = 208;
const LEVEL_Y = 528;
const DOT_COLOURS = [0xf06292, 0x64b5f6, 0xffca28];

interface HeroItem { e: string; bg?: number }

export class TitleScene extends Phaser.Scene {
  private mode: GameMode = 'pattern';
  private patternBtn!: Phaser.GameObjects.Container;
  private storyBtn!: Phaser.GameObjects.Container;
  private heroObjs: Phaser.GameObjects.GameObject[] = [];
  private heroSlots: Phaser.GameObjects.Container[] = [];
  private heroLoop?: Phaser.Time.TimerEvent;
  private heroChick?: Phaser.GameObjects.Text;
  private level = 1;
  private levelChips: Phaser.GameObjects.Container[] = [];
  private levelLabel: Phaser.GameObjects.GameObject[] = [];
  private storyStrip!: Phaser.GameObjects.Text;
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
    this.heroChick = undefined;
    this.levelChips = [];
    this.levelLabel = [];
    this.level = loadLevel();

    this.add.text(W / 2, 72, '🔮 What Comes Next?', {
      fontFamily: F.head, fontSize: '32px', color: T.main, align: 'center',
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);

    this.add.text(W / 2, 112, 'Hop along the pattern and find the next one!', {
      fontFamily: F.body, fontSize: '15px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);

    // Hero panel: a live mini version of the game row.
    const pg = this.add.graphics();
    pg.fillStyle(C.shadow, 0.1);
    pg.fillRoundedRect(14, HERO_Y - 74 + 6, W - 28, 148, 28);
    pg.fillStyle(C.white, 0.75);
    pg.fillRoundedRect(14, HERO_Y - 74, W - 28, 148, 28);

    this.sectionLabel(W / 2, 316, 'CHOOSE A GAME');

    const modeW = 176, modeH = 112, modeGap = 16;
    this.patternBtn = this.buildPickerBtn(
      W / 2 - modeW / 2 - modeGap / 2, 396, modeW, modeH,
      '🐥', 'Pattern', 'Hop to the beat',
      () => this.selectMode('pattern', true),
    );
    this.storyBtn = this.buildPickerBtn(
      W / 2 + modeW / 2 + modeGap / 2, 396, modeW, modeH,
      '📖', 'Story', 'Little stories',
      () => this.selectMode('story', true),
    );

    this.hintChip = this.add.graphics();
    this.hintTxt = this.add.text(W / 2, 598, '', {
      fontFamily: F.body, fontSize: '14px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);

    // Pattern mode: Papa picks where to start; the game then adapts by itself.
    this.levelLabel = this.sectionLabel(W / 2, 472, 'START AT LEVEL');
    const chipW = 84, chipH = 68, chipGap = 10;
    const n = PATTERN_LEVELS.length;
    const startX = W / 2 - (chipW * n + chipGap * (n - 1)) / 2 + chipW / 2;
    PATTERN_LEVELS.forEach((_, i) => {
      this.levelChips.push(this.buildLevelChip(startX + i * (chipW + chipGap), LEVEL_Y, chipW, chipH, i + 1));
    });

    // Story mode: a strip of story endings instead of the level picker.
    this.storyStrip = this.add.text(W / 2, 510, STORIES.slice(0, 6).map(st => st.end.e).join('  '), {
      fontFamily: F.body, fontSize: '34px', padding: { top: 6, bottom: 6 },
    }).setOrigin(0.5);

    this.selectMode(this.mode, false);

    primaryBtn(this, W / 2, H - 96, 340, 70, "Let's Go! 🎉", () => {
      unlockSpeech();
      this.scene.start('GameScene', { mode: this.mode, level: this.level });
    });
  }

  // ─── Hero preview ──────────────────────────────────────────────────────

  private buildHero(items: HeroItem[], unitLen = 0): void {
    this.heroLoop?.remove();
    this.heroObjs.forEach(o => o.destroy());
    this.heroObjs = [];
    this.heroSlots = [];
    this.heroChick = undefined;
    const W = this.scale.width;
    const n = items.length + 1;
    const fw = n >= 6 ? 50 : 66, fh = n >= 6 ? 62 : 84;
    const gap = n >= 6 ? 4 : 18, unitGap = n >= 6 ? 14 : gap;
    const groups = unitLen ? n / unitLen : 1;
    const total = fw * n + gap * (n - groups) + unitGap * (groups - 1);
    const y = unitLen ? HERO_Y + 16 : HERO_Y;
    let x = W / 2 - total / 2;

    for (let i = 0; i < n; i++) {
      const isQ = i === n - 1;
      if (unitLen && i % unitLen === 0) {
        const tw = fw * unitLen + gap * (unitLen - 1) + 8;
        const tray = this.add.graphics();
        tray.fillStyle(0xf1e3f7, 1);
        tray.fillRoundedRect(x - 4, y - fh / 2 - 5, tw, fh + 10, 16);
        tray.lineStyle(2, C.lavender, 0.55);
        tray.strokeRoundedRect(x - 4, y - fh / 2 - 5, tw, fh + 10, 16);
        this.heroObjs.push(tray);
      }
      const g = this.add.graphics();
      g.fillStyle(C.shadow, 0.12);
      g.fillRoundedRect(-fw / 2 + 1, -fh / 2 + 4, fw, fh, 14);
      g.fillStyle(isQ ? 0xfff0f6 : items[i].bg ?? C.white, 1);
      g.fillRoundedRect(-fw / 2, -fh / 2, fw, fh, 14);
      g.lineStyle(isQ ? 3 : 2, isQ ? C.pink : unitLen ? C.white : C.lavender, isQ ? 0.9 : unitLen ? 0.9 : 0.45);
      g.strokeRoundedRect(-fw / 2, -fh / 2, fw, fh, 14);
      const t = this.add.text(0, 0, isQ ? '?' : items[i].e, {
        fontFamily: isQ ? F.head : F.body, fontSize: `${Math.round(fw * (isQ ? 0.62 : 0.6))}px`,
        color: isQ ? '#f06292' : T.main, padding: { top: 6, bottom: 6 },
      }).setOrigin(0.5);
      const c = this.add.container(x + fw / 2, y, [g, t]);
      this.heroObjs.push(c);
      this.heroSlots.push(c);
      if (isQ) {
        this.tweens.add({ targets: t, scale: 1.15, yoyo: true, repeat: -1, duration: 650, ease: 'Sine.InOut' });
      }
      x += fw + ((i + 1) % (unitLen || n) === 0 ? unitGap : gap);
    }

    const chickY = y - fh / 2 - 20;
    if (unitLen) {
      this.heroChick = this.add.text(this.heroSlots[0].x, chickY, '🐥', {
        fontFamily: F.body, fontSize: '30px', padding: { top: 6, bottom: 6 },
      }).setOrigin(0.5);
      this.heroObjs.push(this.heroChick);
    }

    // Each picture dips in turn, like the beat in the game; the chick hops
    // from stone to stone and stops before the "?".
    const run = () => {
      this.heroSlots.forEach((c, i) => {
        this.time.delayedCall(i * 380, () => {
          if (!c.active) return;
          this.tweens.add({ targets: c, y: y - 8, duration: 150, yoyo: true, ease: 'Sine.Out' });
          const chick = this.heroChick;
          if (!chick || !chick.active || i === n - 1) return;
          const fromX = i === 0 ? c.x : chick.x;
          this.tweens.addCounter({
            from: 0, to: 1, duration: 200,
            onUpdate: tw => {
              if (!chick.active) return;
              const k = tw.getValue() ?? 0;
              chick.x = fromX + (c.x - fromX) * k;
              chick.y = chickY - Math.sin(Math.PI * k) * 18;
            },
          });
        });
      });
    };
    run();
    this.heroLoop = this.time.addEvent({ delay: 3600, loop: true, callback: run });
  }

  // ─── Decoration ────────────────────────────────────────────────────────

  private decorateBg(W: number, H: number): void {
    const marks = [
      { x: 30,     y: 40,      c: '🎵', s: 22, r: -8, a: 0.16 },
      { x: W - 30, y: 36,      c: '✨', s: 22, r: 12, a: 0.2 },
      { x: 30,     y: 316,     c: '✨', s: 18, r: 0,  a: 0.18 },
      { x: W - 32, y: 316,     c: '🎶', s: 20, r: 0,  a: 0.16 },
      { x: 40,     y: H - 180, c: '🌸', s: 22, r: 6,  a: 0.16 },
      { x: W - 40, y: H - 176, c: '✨', s: 20, r: 0,  a: 0.18 },
    ];
    marks.forEach(m => {
      this.add.text(m.x, m.y, m.c, {
        fontFamily: F.body, fontSize: `${m.s}px`,
      }).setOrigin(0.5).setAlpha(m.a).setRotation(m.r * Math.PI / 180);
    });
  }

  private sectionLabel(cx: number, cy: number, text: string): Phaser.GameObjects.GameObject[] {
    const w = 176, h = 26;
    const bg = this.add.graphics();
    bg.fillStyle(C.white, 0.85);
    bg.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
    bg.lineStyle(1.5, C.lavender, 0.5);
    bg.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
    const t = this.add.text(cx, cy, text, {
      fontFamily: F.body, fontSize: '12px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);
    return [bg, t];
  }

  // ─── Level chips ───────────────────────────────────────────────────────

  private buildLevelChip(cx: number, cy: number, w: number, h: number, level: number): Phaser.GameObjects.Container {
    const bg = this.add.graphics();
    const num = this.add.text(0, -12, String(level), {
      fontFamily: F.head, fontSize: '26px', color: T.main,
    }).setOrigin(0.5);
    // Tiny dots show the repeating unit: ●● / ●●●● / ●●● / ●●●.
    const shape = level === 2 ? 'ABAB' : PATTERN_LEVELS[level - 1].shapes[0];
    const dots = this.add.graphics();
    const r = 5.5, step = 15;
    [...shape].forEach((ch, i) => {
      const x = (i - (shape.length - 1) / 2) * step;
      dots.fillStyle(C.white, 1);
      dots.fillCircle(x, 18, r + 1.5);
      dots.fillStyle(DOT_COLOURS[ch.charCodeAt(0) - 65], 1);
      dots.fillCircle(x, 18, r);
    });
    const c = this.add.container(cx, cy, [bg, num, dots]);
    c.setSize(w, h + 10).setInteractive({ cursor: 'pointer' });
    c.on('pointerdown', () => this.selectLevel(level, true));
    const refs = c as unknown as ChipRefs;
    refs.bg = bg; refs.num = num; refs.w = w; refs.h = h;
    return c;
  }

  private selectLevel(level: number, tapped: boolean): void {
    this.level = level;
    this.levelChips.forEach((c, i) => {
      const { bg, num, w, h } = c as unknown as ChipRefs;
      const active = i + 1 === level;
      bg.clear();
      if (active) {
        bg.fillStyle(C.shadow, 0.2);
        bg.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 20);
        bg.fillStyle(C.pink, 1);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 20);
      } else {
        bg.fillStyle(C.white, 1);
        bg.lineStyle(2.5, C.lavender, 0.9);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 20);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 20);
      }
      num.setColor(active ? T.white : T.main);
    });
    if (this.mode === 'pattern') this.drawHintChip(`${PATTERN_LEVELS[level - 1].blurb} · adapts as Aya plays`);
    if (tapped) {
      saveLevel(level);
      this.tweens.add({ targets: this.levelChips[level - 1], scale: 1.08, duration: 120, yoyo: true });
      say(`Level ${level}`);
    }
  }

  // ─── Picker button ─────────────────────────────────────────────────────

  private buildPickerBtn(
    cx: number, cy: number, w: number, h: number,
    icon: string, title: string, subtitle: string,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const bg = this.add.graphics();
    const iconTxt = this.add.text(0, -24, icon, {
      fontFamily: F.body, fontSize: '40px', padding: { top: 6, bottom: 6 },
    }).setOrigin(0.5);
    const titleTxt = this.add.text(0, 16, title, {
      fontFamily: F.head, fontSize: '22px', color: T.main,
    }).setOrigin(0.5);
    const subTxt = this.add.text(0, 39, subtitle, {
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

    const pattern = m === 'pattern';
    this.levelChips.forEach(c => c.setVisible(pattern));
    this.levelLabel.forEach(o => (o as Phaser.GameObjects.Text).setVisible(pattern));
    this.storyStrip.setVisible(!pattern);

    if (pattern) {
      const fam = THING_FAMILIES[Math.floor(Math.random() * THING_FAMILIES.length)];
      const [a, b] = fam.items;
      this.buildHero([a, b, a, b, a], 2);
      this.hintTxt.setY(598);
      this.selectLevel(this.level, false);
    } else {
      const story = STORIES[Math.floor(Math.random() * STORIES.length)];
      this.buildHero(story.frames.map(f => ({ e: f.e })));
      this.hintTxt.setY(566);
      this.drawHintChip(`${TOTAL_ROUNDS} little stories · no timer 🌱`);
    }
  }
}

interface ChipRefs {
  bg: Phaser.GameObjects.Graphics;
  num: Phaser.GameObjects.Text;
  w: number; h: number;
}

interface PickerRefs {
  bg: Phaser.GameObjects.Graphics;
  iconTxt: Phaser.GameObjects.Text;
  titleTxt: Phaser.GameObjects.Text;
  subTxt: Phaser.GameObjects.Text;
  w: number; h: number;
}
