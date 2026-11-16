import Phaser from 'phaser';
import { drawBg } from '@shared/phaserUtils';
import { C, T, F } from '@shared/theme';
import { sounds } from '@shared/audio';
import { shuffle } from '@shared/utils';
import {
  ANIMALS, CHARACTERS, MODE,
  type Difficulty, type GameMode,
} from '../data';
import { say, stopSpeech, unlockAudio } from '../speech';

const W = 420;

const CARD = { x: 20, y: 92, w: W - 40, h: 384, r: 30 };
const FIG  = { y: CARD.y + 206, w: 196, h: 294 };   // 2:3 like the PNGs
const PROMPT_Y = CARD.y + 34;
const BAR  = { x: CARD.x + 48, y: CARD.y + CARD.h - 26, w: CARD.w - 96, h: 10 };
const BANNER_Y = CARD.y + CARD.h;

/** Relaxed mode: re-ask + nudge the right picture after this long idle. */
const IDLE_HINT_MS = 9_000;
/** How long the coloured reveal stays up before the next round. */
const REVEAL_MS = 2_700;

const MINT_DEEP = 0x4db6ac;

type TileState = 'idle' | 'correct' | 'wrong' | 'hint';

interface Item {
  key: string;
  name: string;
  /** What we say: "Molly" or "a Dog". */
  spoken: string;
  emoji?: string;
  group?: string;
}

interface Tile {
  item: Item;
  w: number; h: number;
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  badge: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
  state: TileState;
}

type ModeConfig = (typeof MODE)[Difficulty];

function article(name: string): string {
  return /^[AEIOU]/.test(name) ? `an ${name}` : `a ${name}`;
}

export class GameScene extends Phaser.Scene {
  private difficulty: Difficulty = 'easy';
  private gameMode: GameMode = 'bing';
  private mode: ModeConfig = MODE.easy;

  private roundItems: Item[] = [];
  private roundIndex = 0;
  private score = 0;
  private answered = false;
  private firstTry = true;
  private beatClock = true;
  private wrongCount = 0;
  /** Per finished round: true = first-try star, false = found after a try. */
  private results: boolean[] = [];

  private scoreTxt!: Phaser.GameObjects.Text;
  private progressDots: Phaser.GameObjects.Graphics[] = [];
  private tiles: Tile[] = [];

  private figure!: Phaser.GameObjects.Container;
  private silImg!: Phaser.GameObjects.Image;
  private colImg!: Phaser.GameObjects.Image;
  private silEmoji!: Phaser.GameObjects.Text;
  private colEmoji!: Phaser.GameObjects.Text;
  private glow!: Phaser.GameObjects.Graphics;

  private prompt!: Phaser.GameObjects.Container;
  private banner!: Phaser.GameObjects.Container;
  private bannerBg!: Phaser.GameObjects.Graphics;
  private bannerTxt!: Phaser.GameObjects.Text;

  private barTrack?: Phaser.GameObjects.Graphics;
  private bar?: Phaser.GameObjects.Graphics;
  private barTween?: Phaser.Tweens.Tween;
  private idleTimer?: Phaser.Time.TimerEvent;

  constructor() { super('GameScene'); }

  init(data: { difficulty?: Difficulty; gameMode?: GameMode }): void {
    this.difficulty = data?.difficulty ?? 'easy';
    this.gameMode = data?.gameMode ?? 'bing';
    this.mode = MODE[this.difficulty];
  }

  preload(): void {
    CHARACTERS.forEach(c => { if (!this.textures.exists(c.key)) this.load.image(c.key, c.url); });
  }

  create(): void {
    drawBg(this);
    // D-005: scene instances are reused — reset everything we push into.
    this.tiles = [];
    this.progressDots = [];
    this.results = [];
    this.roundIndex = 0;
    this.score = 0;
    this.barTween = undefined;
    this.idleTimer = undefined;
    this.barTrack = undefined;
    this.bar = undefined;

    // D-006: one shuffled queue of correct answers, no repeats per game.
    this.roundItems = shuffle(this.pool).slice(0, this.mode.rounds);

    this.input.on('pointerdown', unlockAudio);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => stopSpeech());

    this.buildHeader();
    this.buildCard();
    this.loadRound();
  }

  private get pool(): Item[] {
    return this.gameMode === 'bing'
      ? CHARACTERS.map(c => ({ key: c.key, name: c.name, spoken: c.name }))
      : ANIMALS.map(a => ({
          key: a.name, name: a.name, spoken: article(a.name), emoji: a.emoji, group: a.group,
        }));
  }

  // ─── Header ─────────────────────────────────────────────────────────────

  private buildHeader(): void {
    const icon = this.gameMode === 'animal' ? '🐾' : '🐰';
    const pace = this.mode.roundMs > 0 ? '⏱️' : '🐢';
    this.add.text(22, 36, `${icon} Who's That? ${pace}`, {
      fontFamily: F.head, fontSize: '18px', color: T.main,
    }).setOrigin(0, 0.5).setPadding(2);

    const g = this.add.graphics();
    g.fillStyle(C.white, 1);
    g.fillRoundedRect(W - 22 - 84, 36 - 18, 84, 36, 18);
    g.lineStyle(1.5, C.lavender, 0.45);
    g.strokeRoundedRect(W - 22 - 84, 36 - 18, 84, 36, 18);
    this.scoreTxt = this.add.text(W - 22 - 42, 36, '⭐ 0', {
      fontFamily: F.head, fontSize: '17px', color: T.main,
    }).setOrigin(0.5).setPadding(2);

    const n = this.mode.rounds;
    const gap = 26;
    const startX = W / 2 - ((n - 1) * gap) / 2;
    this.progressDots = Array.from({ length: n }, (_, i) =>
      this.add.graphics().setPosition(startX + i * gap, 72),
    );
  }

  private renderDots(): void {
    this.progressDots.forEach((g, i) => {
      g.clear();
      if (i < this.results.length) {
        g.fillStyle(this.results[i] ? C.pink : MINT_DEEP, 1);
        g.fillCircle(0, 0, 7);
      } else if (i === this.roundIndex) {
        g.fillStyle(C.pink, 0.22);
        g.fillCircle(0, 0, 12);
        g.fillStyle(C.pink, 1);
        g.fillCircle(0, 0, 6);
      } else {
        g.fillStyle(0xe1bee7, 1);
        g.fillCircle(0, 0, 6);
      }
    });
  }

  // ─── Silhouette card ───────────────────────────────────────────────────

  private buildCard(): void {
    const shadow = this.add.graphics();
    shadow.fillStyle(C.shadow, 0.12);
    shadow.fillRoundedRect(CARD.x, CARD.y + 8, CARD.w, CARD.h, CARD.r);
    const card = this.add.graphics();
    card.fillStyle(C.white, 1);
    card.fillRoundedRect(CARD.x, CARD.y, CARD.w, CARD.h, CARD.r);

    // Spotlight stage behind the figure.
    const stage = this.add.graphics();
    stage.fillStyle(C.lavender, 0.13);
    stage.fillCircle(W / 2, FIG.y - 6, 138);
    stage.fillStyle(C.bg1, 0.95);
    stage.fillCircle(W / 2, FIG.y - 6, 112);
    stage.fillStyle(C.shadow, 0.14);
    stage.fillEllipse(W / 2, FIG.y + FIG.h / 2 - 16, 170, 22);

    // Warm glow that blooms behind the figure on a correct answer.
    this.glow = this.add.graphics().setPosition(W / 2, FIG.y - 6).setAlpha(0);
    this.glow.fillStyle(0xfff59d, 0.55);
    this.glow.fillCircle(0, 0, 138);
    this.glow.fillStyle(0xffffff, 0.75);
    this.glow.fillCircle(0, 0, 100);

    // The figure: a dark silhouette with the full-colour copy stacked on top
    // at alpha 0. The reveal cross-fades between them.
    const firstKey = CHARACTERS[0].key;
    this.silImg = this.add.image(0, 0, firstKey).setDisplaySize(FIG.w, FIG.h);
    this.colImg = this.add.image(0, 0, firstKey).setDisplaySize(FIG.w, FIG.h).setAlpha(0);
    this.silEmoji = this.add.text(0, 0, '', { fontFamily: F.body, fontSize: '170px' })
      .setOrigin(0.5).setPadding(10);
    this.colEmoji = this.add.text(0, 0, '', { fontFamily: F.body, fontSize: '170px' })
      .setOrigin(0.5).setPadding(10).setAlpha(0);
    const isBing = this.gameMode === 'bing';
    this.silImg.setVisible(isBing);
    this.colImg.setVisible(isBing);
    this.silEmoji.setVisible(!isBing);
    this.colEmoji.setVisible(!isBing);
    this.figure = this.add.container(W / 2, FIG.y, [this.silImg, this.colImg, this.silEmoji, this.colEmoji]);

    // Tapping the shadow asks the question again (and wiggles it).
    const figZone = this.add.zone(W / 2, FIG.y, FIG.w + 20, FIG.h).setInteractive({ cursor: 'pointer' });
    figZone.on('pointerdown', () => {
      if (this.answered) return;
      this.askPrompt();
      this.wiggleFigure();
    });

    this.prompt = this.buildPrompt();

    if (this.mode.roundMs > 0) {
      this.barTrack = this.add.graphics();
      this.barTrack.fillStyle(0xf3e5f5, 1);
      this.barTrack.fillRoundedRect(BAR.x, BAR.y, BAR.w, BAR.h, BAR.h / 2);
      this.bar = this.add.graphics();
    }

    // Name banner — pops up over the card's bottom edge on reveal.
    this.bannerBg = this.add.graphics();
    this.bannerTxt = this.add.text(0, -1, '', {
      fontFamily: F.head, fontSize: '28px', color: T.white,
    }).setOrigin(0.5).setPadding(4);
    this.banner = this.add.container(W / 2, BANNER_Y, [this.bannerBg, this.bannerTxt])
      .setDepth(5).setVisible(false);
  }

  private buildPrompt(): Phaser.GameObjects.Container {
    const label = this.gameMode === 'bing' ? "Who's that?  🔊" : 'Which animal?  🔊';
    const txt = this.add.text(0, 0, label, {
      fontFamily: F.head, fontSize: '19px', color: T.main,
    }).setOrigin(0.5).setPadding(4);
    const w = txt.width + 32, h = 42;
    const bg = this.add.graphics();
    bg.fillStyle(C.bg1, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    bg.lineStyle(2, C.lavender, 0.55);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    const c = this.add.container(W / 2, PROMPT_Y, [bg, txt]).setDepth(3);
    c.setSize(w, h).setInteractive({ cursor: 'pointer' });
    c.on('pointerdown', () => { if (!this.answered) this.askPrompt(); });
    return c;
  }

  private askPrompt(): void {
    say(this.gameMode === 'bing' ? "Who's that?" : 'Which animal is it?');
    this.tweens.add({ targets: this.prompt, scale: { from: 1, to: 1.08 }, yoyo: true, duration: 160 });
  }

  private wiggleFigure(): void {
    this.tweens.killTweensOf(this.figure);
    this.figure.setAngle(0).setScale(1).setAlpha(1);
    this.tweens.add({
      targets: this.figure, angle: { from: -5, to: 5 },
      yoyo: true, repeat: 1, duration: 120, ease: 'Sine.InOut',
      onComplete: () => this.figure.setAngle(0),
    });
  }

  // ─── Picture choices ───────────────────────────────────────────────────

  private buildTiles(options: Item[]): void {
    this.tiles.forEach(t => { t.container.destroy(); t.zone.destroy(); });
    this.tiles = [];

    const n = options.length;
    const slots: { cx: number; cy: number; w: number; h: number }[] = [];
    if (n <= 3) {
      // One row of tall tiles.
      const w = 122, h = 224, gap = 12;
      const startX = W / 2 - (n * w + (n - 1) * gap) / 2 + w / 2;
      for (let i = 0; i < n; i++) slots.push({ cx: startX + i * (w + gap), cy: 638, w, h });
    } else {
      // 2×2 grid.
      const w = 186, h = 136, gx = 12, gy = 12;
      const top = 504;
      for (let i = 0; i < n; i++) {
        const col = i % 2, row = Math.floor(i / 2);
        slots.push({
          cx: W / 2 + (col === 0 ? -(w + gx) / 2 : (w + gx) / 2),
          cy: top + h / 2 + row * (h + gy),
          w, h,
        });
      }
    }

    options.forEach((item, i) => {
      const { cx, cy, w, h } = slots[i];
      const tall = h > 180;
      const bg = this.add.graphics();
      const labelY = h / 2 - (tall ? 24 : 18);
      const picY = tall ? -14 : -12;
      let pic: Phaser.GameObjects.Image | Phaser.GameObjects.Text;
      if (item.emoji) {
        pic = this.add.text(0, picY, item.emoji, {
          fontFamily: F.body, fontSize: tall ? '78px' : '70px',
        }).setOrigin(0.5).setPadding(6);
      } else {
        const ph = tall ? 160 : 108;
        pic = this.add.image(0, picY, item.key).setDisplaySize(ph * 2 / 3, ph);
      }
      const label = this.add.text(0, labelY, item.name, {
        fontFamily: F.head, fontSize: tall ? '18px' : '17px', color: T.main,
      }).setOrigin(0.5).setPadding(2);
      const badge = this.add.text(w / 2 - 20, -h / 2 + 20, '✅', { fontSize: '24px' })
        .setOrigin(0.5).setPadding(4).setVisible(false);

      const container = this.add.container(cx, cy, [bg, pic, label, badge]);
      const zone = this.add.zone(cx, cy, w + 6, h + 6).setInteractive({ cursor: 'pointer' });
      const tile: Tile = { item, w, h, container, bg, badge, zone, state: 'idle' };
      zone.on('pointerdown', () => this.onPick(tile));
      this.paintTile(tile, 'idle');
      this.tiles.push(tile);

      // Pop in, staggered.
      container.setScale(0.6).setAlpha(0);
      this.tweens.add({
        targets: container, scale: 1, alpha: 1,
        delay: 120 + i * 90, duration: 320, ease: 'Back.Out',
      });
    });
  }

  private paintTile(t: Tile, state: TileState): void {
    t.state = state;
    const g = t.bg;
    const { w, h } = t;
    const r = 24;
    g.clear();
    if (state !== 'wrong') {
      g.fillStyle(C.shadow, 0.12);
      g.fillRoundedRect(-w / 2, -h / 2 + 5, w, h, r);
    }
    switch (state) {
      case 'idle':
        g.fillStyle(C.white, 1);
        g.lineStyle(3, 0xe1bee7, 1);
        break;
      case 'hint':
        g.fillStyle(C.cream, 1);
        g.lineStyle(4, C.pink, 1);
        break;
      case 'correct':
        g.fillStyle(C.mintBg, 1);
        g.lineStyle(4, MINT_DEEP, 1);
        break;
      case 'wrong':
        g.fillStyle(0xf6f0f8, 1);
        g.lineStyle(2, 0xe8dcef, 1);
        break;
    }
    g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    t.badge.setVisible(state === 'correct');
  }

  // ─── Round flow ────────────────────────────────────────────────────────

  private loadRound(): void {
    this.answered = false;
    this.firstTry = true;
    this.beatClock = true;
    this.wrongCount = 0;
    this.renderDots();

    const item = this.roundItems[this.roundIndex];

    // Silhouette + hidden colour copy.
    if (item.emoji) {
      this.silEmoji.setText(item.emoji).setAlpha(1);
      this.silEmoji.setTint(this.mode.tintFill).setTintMode(Phaser.TintModes.FILL);
      this.colEmoji.setText(item.emoji).setAlpha(0);
    } else {
      this.silImg.setTexture(item.key).setDisplaySize(FIG.w, FIG.h).setAlpha(1);
      this.silImg.setTint(this.mode.tintFill).setTintMode(Phaser.TintModes.FILL);
      this.colImg.setTexture(item.key).setDisplaySize(FIG.w, FIG.h).setAlpha(0);
    }
    this.glow.setAlpha(0);
    this.banner.setVisible(false);
    this.prompt.setVisible(true).setAlpha(1);

    this.tweens.killTweensOf(this.figure);
    this.figure.setAngle(0).setScale(0.5).setAlpha(0).setY(FIG.y);
    this.tweens.add({ targets: this.figure, scale: 1, alpha: 1, duration: 420, ease: 'Back.Out' });

    // Distractors: random, but never a look-alike of the answer or of each other.
    const usedGroups = new Set<string>(item.group ? [item.group] : []);
    const wrong: Item[] = [];
    for (const cand of shuffle(this.pool)) {
      if (wrong.length >= this.mode.optionCount - 1) break;
      if (cand.key === item.key) continue;
      if (cand.group && usedGroups.has(cand.group)) continue;
      if (cand.group) usedGroups.add(cand.group);
      wrong.push(cand);
    }
    this.buildTiles(shuffle([item, ...wrong]));

    this.time.delayedCall(350, () => { if (!this.answered) this.askPrompt(); });
    this.startClock();
    this.armIdleHint();
  }

  private startClock(): void {
    if (!this.bar || this.mode.roundMs <= 0) return;
    this.barTrack?.setAlpha(1);
    this.bar.setAlpha(1);
    const state = { ratio: 1 };
    this.drawBar(1);
    this.barTween = this.tweens.add({
      targets: state, ratio: 0, duration: this.mode.roundMs, ease: 'Linear',
      onUpdate: () => this.drawBar(state.ratio),
      onComplete: () => this.onClockOut(),
    });
  }

  private drawBar(ratio: number): void {
    if (!this.bar) return;
    this.bar.clear();
    const w = BAR.w * ratio;
    if (w < BAR.h) return;
    this.bar.fillStyle(ratio > 0.3 ? C.pink : 0xffb74d, 1);
    this.bar.fillRoundedRect(BAR.x, BAR.y, w, BAR.h, BAR.h / 2);
  }

  private stopClock(): void {
    this.barTween?.stop();
    this.barTween = undefined;
  }

  /** Clock ran out: no star this round, but the round keeps going (D-007). */
  private onClockOut(): void {
    this.barTween = undefined;
    if (this.answered) return;
    this.beatClock = false;
    this.tweens.add({ targets: [this.bar, this.barTrack], alpha: 0, duration: 300 });
    this.showHint();
  }

  private armIdleHint(): void {
    this.idleTimer?.remove();
    this.idleTimer = undefined;
    // Quick mode nudges when the clock runs out instead.
    if (this.mode.roundMs > 0) return;
    this.idleTimer = this.time.delayedCall(IDLE_HINT_MS, () => {
      if (this.answered) return;
      this.askPrompt();
      this.wiggleFigure();
      this.showHint();
    });
  }

  /** Softly point at the right picture. */
  private showHint(): void {
    if (this.answered) return;
    const t = this.tiles.find(x => x.item.key === this.roundItems[this.roundIndex].key);
    if (!t) return;
    this.paintTile(t, 'hint');
    this.tweens.add({
      targets: t.container, scale: { from: 1, to: 1.07 },
      yoyo: true, repeat: 3, duration: 260, ease: 'Sine.InOut',
    });
  }

  private onPick(t: Tile): void {
    if (this.answered || t.state === 'wrong') return;
    unlockAudio();
    const answer = this.roundItems[this.roundIndex];
    if (t.item.key === answer.key) this.onCorrect(t, answer);
    else this.onWrong(t);
  }

  private onWrong(t: Tile): void {
    this.firstTry = false;
    this.wrongCount++;
    sounds.wrong();
    say(`That's ${t.item.spoken}. Try again!`);
    this.paintTile(t, 'wrong');
    t.zone.disableInteractive();
    // A gentle "no-no" shake, then it settles faded so it's out of the way.
    this.tweens.add({
      targets: t.container, angle: { from: -6, to: 6 },
      yoyo: true, repeat: 1, duration: 90,
      onComplete: () => {
        t.container.setAngle(0);
        this.tweens.add({ targets: t.container, alpha: 0.45, scale: 0.94, duration: 250 });
      },
    });
    this.wiggleFigure();
    this.armIdleHint();
    // With four pictures, two misses earns a nudge.
    if (this.wrongCount >= 2) this.time.delayedCall(700, () => this.showHint());
  }

  private onCorrect(t: Tile, answer: Item): void {
    this.answered = true;
    this.stopClock();
    this.idleTimer?.remove();
    this.tiles.forEach(x => x.zone.disableInteractive());

    const star = this.firstTry && this.beatClock;
    if (star) {
      this.score++;
      this.scoreTxt.setText(`⭐ ${this.score}`);
      this.tweens.add({ targets: this.scoreTxt, scale: { from: 1.5, to: 1 }, duration: 400, ease: 'Back.Out' });
    }
    this.results.push(star);

    // Winner glows + bounces, the rest step back.
    this.tweens.killTweensOf(t.container);
    t.container.setScale(1).setAlpha(1);
    this.paintTile(t, 'correct');
    this.tweens.add({ targets: t.container, scale: 1.08, yoyo: true, duration: 220, ease: 'Sine.Out' });
    this.tiles.forEach(x => {
      if (x !== t) this.tweens.add({ targets: x.container, alpha: 0.3, duration: 250 });
    });
    if (this.bar) this.tweens.add({ targets: [this.bar, this.barTrack], alpha: 0, duration: 200 });

    this.reveal(answer);

    if (star && this.results.length >= 3 && this.results.slice(-3).every(Boolean)) sounds.streak();
    else sounds.correct();
    say(`Yay! It's ${answer.spoken}!`);

    this.time.delayedCall(REVEAL_MS, () => this.nextRound());
  }

  /** The silhouette fills with colour, pops, sparkles, and gets its name. */
  private reveal(answer: Item): void {
    const sil = answer.emoji ? this.silEmoji : this.silImg;
    const col = answer.emoji ? this.colEmoji : this.colImg;

    this.tweens.add({ targets: this.prompt, alpha: 0, duration: 200 });
    this.tweens.add({ targets: col, alpha: 1, duration: 550, ease: 'Sine.Out' });
    this.tweens.add({ targets: sil, alpha: 0, duration: 550, ease: 'Sine.In' });
    this.tweens.add({ targets: this.glow, alpha: 1, duration: 400 });
    this.tweens.killTweensOf(this.figure);
    this.figure.setAngle(0).setScale(1).setAlpha(1).setY(FIG.y);
    this.tweens.add({
      targets: this.figure, scale: { from: 1, to: 1.12 },
      yoyo: true, duration: 300, ease: 'Sine.Out', delay: 150,
    });
    this.tweens.add({
      targets: this.figure, y: FIG.y - 14,
      yoyo: true, repeat: 1, duration: 240, ease: 'Sine.Out', delay: 800,
    });
    this.sparkles();

    // Name banner.
    this.bannerTxt.setText(`It's ${answer.emoji ? answer.spoken : answer.name}!`);
    const bw = this.bannerTxt.width + 48, bh = 56;
    this.bannerBg.clear();
    this.bannerBg.fillStyle(C.shadow, 0.2);
    this.bannerBg.fillRoundedRect(-bw / 2, -bh / 2 + 5, bw, bh, bh / 2);
    this.bannerBg.fillStyle(C.pink, 1);
    this.bannerBg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, bh / 2);
    this.bannerBg.lineStyle(4, C.white, 1);
    this.bannerBg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, bh / 2);
    this.banner.setVisible(true).setScale(0).setAngle(-4);
    this.tweens.add({
      targets: this.banner, scale: 1, angle: 0,
      delay: 250, duration: 420, ease: 'Back.Out',
    });
  }

  private sparkles(): void {
    const marks = ['✨', '⭐', '💖', '🌟', '✨', '🌸', '⭐', '✨', '💖', '🌟'];
    const cy = FIG.y - 10;
    marks.forEach((m, i) => {
      const a = (i / marks.length) * Math.PI * 2 + Math.random() * 0.3;
      const s = this.add.text(W / 2, cy, m, { fontSize: `${22 + (i % 3) * 6}px` })
        .setOrigin(0.5).setPadding(4).setDepth(4).setScale(0.3);
      const dist = 125 + Math.random() * 35;
      this.tweens.add({
        targets: s,
        x: W / 2 + Math.cos(a) * dist,
        y: cy + Math.sin(a) * dist,
        scale: 1, duration: 650, ease: 'Cubic.Out',
        onComplete: () => this.tweens.add({
          targets: s, alpha: 0, scale: 0.6, duration: 500, delay: 350,
          onComplete: () => s.destroy(),
        }),
      });
    });
  }

  private nextRound(): void {
    this.roundIndex++;
    if (this.roundIndex >= this.mode.rounds) {
      this.scene.start('ResultScene', {
        score: this.score,
        total: this.mode.rounds,
        difficulty: this.difficulty,
        gameMode: this.gameMode,
      });
      return;
    }
    // Clear the stage, then bring on the next shadow.
    this.tweens.add({ targets: this.banner, scale: 0, duration: 180, ease: 'Back.In' });
    this.tweens.add({ targets: this.glow, alpha: 0, duration: 200 });
    this.tiles.forEach(t => this.tweens.add({ targets: t.container, alpha: 0, scale: 0.8, duration: 200 }));
    this.tweens.add({
      targets: this.figure, scale: 0.6, alpha: 0, duration: 220, ease: 'Sine.In',
      onComplete: () => this.loadRound(),
    });
  }
}
