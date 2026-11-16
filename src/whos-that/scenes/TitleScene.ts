import Phaser from 'phaser';
import { drawBg, primaryBtn } from '@shared/phaserUtils';
import { C, T, F } from '@shared/theme';
import { shuffle } from '@shared/utils';
import { ANIMALS, CHARACTERS, MODE, type Difficulty, type GameMode } from '../data';
import { say, unlockAudio } from '../speech';

const HERO_Y = 262;
const HERO = { w: 136, h: 204 };

interface PickerRefs {
  bg: Phaser.GameObjects.Graphics;
  titleTxt: Phaser.GameObjects.Text;
  subTxt?: Phaser.GameObjects.Text;
  w: number; h: number;
}

type Picker = Phaser.GameObjects.Container & PickerRefs;

export class TitleScene extends Phaser.Scene {
  private difficulty: Difficulty = 'easy';
  private gameMode: GameMode = 'bing';
  private easyBtn!: Picker;
  private hardBtn!: Picker;
  private bingModeBtn!: Picker;
  private animalModeBtn!: Picker;

  private hero!: Phaser.GameObjects.Container;
  private heroSilImg!: Phaser.GameObjects.Image;
  private heroColImg!: Phaser.GameObjects.Image;
  private heroSilEmoji!: Phaser.GameObjects.Text;
  private heroColEmoji!: Phaser.GameObjects.Text;
  private heroQueue: string[] = [];
  private heroLoop?: Phaser.Time.TimerEvent;

  constructor() { super('TitleScene'); }

  preload(): void {
    CHARACTERS.forEach(c => { if (!this.textures.exists(c.key)) this.load.image(c.key, c.url); });
  }

  create(): void {
    const { width: W, height: H } = this.scale;
    drawBg(this);
    this.decorateBg(W, H);
    this.heroQueue = [];
    this.heroLoop = undefined;
    this.input.on('pointerdown', unlockAudio);

    this.add.text(W / 2, 78, "Who's That, Aya?", {
      fontFamily: F.head, fontSize: '36px', color: T.main, align: 'center',
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5).setPadding(4);

    this.add.text(W / 2, 120, 'Who is hiding in the shadow? 🔦', {
      fontFamily: F.body, fontSize: '15px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5).setPadding(2);

    this.buildHero(W);

    // Game picker — pictures, not words.
    this.sectionLabel(W / 2, 410, 'WHO TO FIND');
    const tileW = 178, gap = 14;
    const lx = W / 2 - tileW / 2 - gap / 2, rx = W / 2 + tileW / 2 + gap / 2;
    this.bingModeBtn = this.buildModeTile(lx, 476, tileW, 104, 'bing', 'Bing & friends');
    this.animalModeBtn = this.buildModeTile(rx, 476, tileW, 104, 'animal', 'Animals');

    // Pace picker. Relaxed (no clock) is the default.
    this.sectionLabel(W / 2, 558, 'HOW TO PLAY');
    this.easyBtn = this.buildPickerBtn(
      lx, 610, tileW, 70, '🐢 Relaxed', `${MODE.easy.optionCount} pictures · no timer`,
      () => this.selectDifficulty('easy', true),
    );
    this.hardBtn = this.buildPickerBtn(
      rx, 610, tileW, 70, '⏱️ Quick', `${MODE.hard.optionCount} pictures · ${MODE.hard.roundMs / 1000}s timer`,
      () => this.selectDifficulty('hard', true),
    );

    this.selectMode(this.gameMode, false);
    this.selectDifficulty(this.difficulty, false);

    primaryBtn(this, W / 2, H - 82, 340, 66, "Let's Play! 🎉", () => {
      this.scene.start('GameScene', { difficulty: this.difficulty, gameMode: this.gameMode });
    });
  }

  // ─── Hero: a shadow that keeps lighting up into a friend ──────────────

  private buildHero(W: number): void {
    const stage = this.add.graphics();
    stage.fillStyle(C.lavender, 0.14);
    stage.fillCircle(W / 2, HERO_Y - 4, 120);
    stage.fillStyle(C.white, 0.85);
    stage.fillCircle(W / 2, HERO_Y - 4, 96);
    stage.fillStyle(C.shadow, 0.14);
    stage.fillEllipse(W / 2, HERO_Y + HERO.h / 2 - 10, 150, 20);

    const k = CHARACTERS[0].key;
    this.heroSilImg = this.add.image(0, 0, k).setDisplaySize(HERO.w, HERO.h);
    this.heroColImg = this.add.image(0, 0, k).setDisplaySize(HERO.w, HERO.h).setAlpha(0);
    this.heroSilEmoji = this.add.text(0, 0, '', { fontFamily: F.body, fontSize: '128px' })
      .setOrigin(0.5).setPadding(10);
    this.heroColEmoji = this.add.text(0, 0, '', { fontFamily: F.body, fontSize: '128px' })
      .setOrigin(0.5).setPadding(10).setAlpha(0);
    this.hero = this.add.container(W / 2, HERO_Y, [
      this.heroSilImg, this.heroColImg, this.heroSilEmoji, this.heroColEmoji,
    ]);
    this.tweens.add({
      targets: this.hero, y: HERO_Y - 6, yoyo: true, repeat: -1, duration: 1300, ease: 'Sine.InOut',
    });
  }

  private nextHero(): string {
    if (this.heroQueue.length === 0) {
      this.heroQueue = this.gameMode === 'bing'
        ? shuffle(CHARACTERS.map(c => c.key))
        : shuffle(ANIMALS.map(a => a.emoji));
    }
    return this.heroQueue.shift()!;
  }

  /** Show a fresh silhouette, then light it up, then repeat. */
  private startHeroLoop(): void {
    this.heroLoop?.remove();
    this.heroQueue = [];
    const isBing = this.gameMode === 'bing';
    this.heroSilImg.setVisible(isBing);
    this.heroColImg.setVisible(isBing);
    this.heroSilEmoji.setVisible(!isBing);
    this.heroColEmoji.setVisible(!isBing);

    const step = () => {
      const v = this.nextHero();
      const sil = isBing ? this.heroSilImg : this.heroSilEmoji;
      const col = isBing ? this.heroColImg : this.heroColEmoji;
      this.tweens.killTweensOf([sil, col]);
      if (isBing) {
        this.heroSilImg.setTexture(v).setDisplaySize(HERO.w, HERO.h);
        this.heroColImg.setTexture(v).setDisplaySize(HERO.w, HERO.h);
      } else {
        this.heroSilEmoji.setText(v);
        this.heroColEmoji.setText(v);
      }
      sil.setTint(0x4a2c6e).setTintMode(Phaser.TintModes.FILL);
      col.setAlpha(0);
      sil.setAlpha(0);
      this.tweens.add({ targets: sil, alpha: 1, duration: 250 });
      // Hold the shadow, then fill with colour, hold, fade back for the next.
      this.tweens.add({ targets: col, alpha: 1, delay: 1400, duration: 500 });
      this.tweens.add({ targets: sil, alpha: 0, delay: 1400, duration: 500 });
      this.tweens.add({ targets: col, alpha: 0, delay: 3150, duration: 250 });
    };
    step();
    this.heroLoop = this.time.addEvent({ delay: 3400, loop: true, callback: step });
  }

  // ─── Pickers ──────────────────────────────────────────────────────────

  private decorateBg(W: number, H: number): void {
    const marks = [
      { x: 40,     y: 190,     c: '🔍', s: 28, r: -14, a: 0.13 },
      { x: W - 44, y: 176,     c: '🐾', s: 30, r: 12,  a: 0.13 },
      { x: 34,     y: H - 250, c: '🐾', s: 26, r: -8,  a: 0.10 },
      { x: W - 40, y: H - 270, c: '✨', s: 24, r: 6,   a: 0.16 },
      { x: 46,     y: 330,     c: '✨', s: 22, r: 0,   a: 0.18 },
      { x: W - 50, y: 340,     c: '⭐', s: 22, r: 0,   a: 0.16 },
    ];
    marks.forEach(m => {
      this.add.text(m.x, m.y, m.c, { fontFamily: F.body, fontSize: `${m.s}px` })
        .setOrigin(0.5).setPadding(4).setAlpha(m.a).setRotation(m.r * Math.PI / 180);
    });
  }

  private sectionLabel(cx: number, cy: number, text: string): void {
    const w = 150, h = 24;
    const bg = this.add.graphics();
    bg.fillStyle(C.white, 0.85);
    bg.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
    bg.lineStyle(1.5, C.lavender, 0.5);
    bg.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
    this.add.text(cx, cy, text, {
      fontFamily: F.body, fontSize: '11px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  private buildModeTile(
    cx: number, cy: number, w: number, h: number, mode: GameMode, title: string,
  ): Picker {
    const bg = this.add.graphics();
    const parts: Phaser.GameObjects.GameObject[] = [bg];
    if (mode === 'bing') {
      // A little group of three friends.
      const keys = ['flop', 'bing', 'sula'];
      keys.forEach((k, i) => {
        const big = i === 1;
        const ph = big ? 74 : 60;
        parts.push(this.add.image((i - 1) * 40, big ? -14 : -8, k).setDisplaySize(ph * 2 / 3, ph));
      });
    } else {
      ['🐘', '🦒', '🐢'].forEach((e, i) => {
        parts.push(this.add.text((i - 1) * 44, -14, e, {
          fontFamily: F.body, fontSize: i === 1 ? '46px' : '36px',
        }).setOrigin(0.5).setPadding(4));
      });
    }
    const titleTxt = this.add.text(0, h / 2 - 20, title, {
      fontFamily: F.head, fontSize: '17px', color: T.main,
    }).setOrigin(0.5).setPadding(2);
    parts.push(titleTxt);
    const c = this.add.container(cx, cy, parts) as Picker;
    Object.assign(c, { bg, titleTxt, w, h });
    c.setSize(w, h).setInteractive({ cursor: 'pointer' });
    c.on('pointerdown', () => this.selectMode(mode, true));
    return c;
  }

  private buildPickerBtn(
    cx: number, cy: number, w: number, h: number,
    title: string, subtitle: string,
    onClick: () => void,
  ): Picker {
    const bg = this.add.graphics();
    const titleTxt = this.add.text(0, -11, title, {
      fontFamily: F.head, fontSize: '19px', color: T.main,
    }).setOrigin(0.5).setPadding(2);
    const subTxt = this.add.text(0, 15, subtitle, {
      fontFamily: F.body, fontSize: '11px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);
    const c = this.add.container(cx, cy, [bg, titleTxt, subTxt]) as Picker;
    Object.assign(c, { bg, titleTxt, subTxt, w, h });
    c.setSize(w, h).setInteractive({ cursor: 'pointer' });
    c.on('pointerdown', onClick);
    return c;
  }

  private drawPickerBg(c: Picker, active: boolean): void {
    const { bg, titleTxt, subTxt, w, h } = c;
    bg.clear();
    if (active) {
      bg.fillStyle(C.shadow, 0.18);
      bg.fillRoundedRect(-w / 2, -h / 2 + 5, w, h, 22);
      bg.fillStyle(C.pink, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 22);
      titleTxt.setColor(T.white);
      subTxt?.setColor('rgba(255,255,255,0.9)');
    } else {
      bg.fillStyle(C.white, 1);
      bg.lineStyle(2.5, C.lavender, 0.9);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 22);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 22);
      titleTxt.setColor(T.main);
      subTxt?.setColor(T.sub);
    }
  }

  /** Mode tiles keep a white face (pictures need contrast) and get a pink frame. */
  private drawModeBg(c: Picker, active: boolean): void {
    const { bg, titleTxt, w, h } = c;
    bg.clear();
    bg.fillStyle(C.shadow, active ? 0.18 : 0.08);
    bg.fillRoundedRect(-w / 2, -h / 2 + 5, w, h, 24);
    bg.fillStyle(active ? C.cream : C.white, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 24);
    bg.lineStyle(active ? 4 : 2.5, active ? C.pink : C.lavender, active ? 1 : 0.6);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 24);
    titleTxt.setColor(active ? '#d81b60' : T.main);
  }

  private bump(c: Picker): void {
    this.tweens.add({ targets: c, scale: { from: 0.94, to: 1 }, duration: 220, ease: 'Back.Out' });
  }

  private selectDifficulty(d: Difficulty, user: boolean): void {
    this.difficulty = d;
    this.drawPickerBg(this.easyBtn, d === 'easy');
    this.drawPickerBg(this.hardBtn, d === 'hard');
    if (user) {
      this.bump(d === 'easy' ? this.easyBtn : this.hardBtn);
      say(d === 'easy' ? 'Relaxed' : 'Quick');
    }
  }

  private selectMode(m: GameMode, user: boolean): void {
    const changed = m !== this.gameMode || !this.heroLoop;
    this.gameMode = m;
    this.drawModeBg(this.bingModeBtn, m === 'bing');
    this.drawModeBg(this.animalModeBtn, m === 'animal');
    if (changed) this.startHeroLoop();
    if (user) {
      this.bump(m === 'bing' ? this.bingModeBtn : this.animalModeBtn);
      say(m === 'bing' ? 'Bing and friends!' : 'Animals!');
    }
  }
}
