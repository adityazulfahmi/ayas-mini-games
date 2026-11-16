import Phaser from 'phaser';
import { drawBg, launchConfetti } from '@shared/phaserUtils';
import { createEndPopup } from '@shared/endPopup';
import { C, T, F } from '@shared/theme';
import { sounds } from '@shared/audio';
import { shuffle } from '@shared/utils';
import {
  COLOUR_POOL, CONFETTI_EMOJIS, NEIGHBOURS, ROUNDS, SPEED_SECONDS,
  type ColourGroup, type HuntItem, type Mode,
} from '../data';
import { css, say, shade } from '../speech';

const W = 420, H = 780;

const HEADER_Y = 34;
const PROGRESS_Y = 76;

// ─── Question card ──
const CARD = { x: 24, y: 96, w: W - 48, h: 234, r: 30 };
const BLOB = { x: W / 2, y: CARD.y + 90, r: 56 };
const SPEAKER = { x: CARD.x + CARD.w - 36, y: CARD.y + 36, r: 22 };
const PROMPT_Y = CARD.y + 194;

// ─── Answer grid (2×2) ──
const GRID_TOP = CARD.y + CARD.h + 22;
const GAP = 16;
const TILE = { w: (W - 48 - GAP) / 2, h: 156, r: 26 };
const FOOTER_Y = GRID_TOP + TILE.h * 2 + GAP + 40;

const SPEED_TIERS = { gold: 60, silver: 40, bronze: 20 };

type TileState = 'idle' | 'hover' | 'correct' | 'out';

interface Option { colour: ColourGroup; item: HuntItem }

interface Tile {
  x: number;
  y: number;
  box: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  emoji: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
  opt?: Option;
  out: boolean;
}

export class GameScene extends Phaser.Scene {
  private mode: Mode = 'relaxed';
  private round = 0;
  private found = 0;
  private firstTry = 0;
  private missed = false;
  private score = 0;
  private streak = 0;
  private timeLeft = SPEED_SECONDS;
  private busy = false;
  private ended = false;
  private deck: number[] = [];
  private lastColour = -1;
  private target!: ColourGroup;

  private tiles: Tile[] = [];
  private dots: Phaser.GameObjects.Graphics[] = [];
  private card!: Phaser.GameObjects.Graphics;
  private blob!: Phaser.GameObjects.Container;
  private blobG!: Phaser.GameObjects.Graphics;
  private promptTxt!: Phaser.GameObjects.Text;
  private footerTxt!: Phaser.GameObjects.Text;
  private scoreTxt!: Phaser.GameObjects.Text;
  private timerTxt?: Phaser.GameObjects.Text;
  private progressFill?: Phaser.GameObjects.Graphics;
  private timerEvent?: Phaser.Time.TimerEvent;
  private idleTimer?: Phaser.Time.TimerEvent;
  private hand?: Phaser.GameObjects.Text;
  private pulse?: Phaser.Tweens.Tween;
  private endOverlay!: ReturnType<typeof createEndPopup>;

  constructor() { super('GameScene'); }

  init(data: { mode?: Mode }): void {
    this.mode = data?.mode ?? 'relaxed';
  }

  create(): void {
    drawBg(this);
    // D-005: scene instances are reused, so reset every piece of state here.
    this.round = 0;
    this.found = 0;
    this.firstTry = 0;
    this.score = 0;
    this.streak = 0;
    this.timeLeft = SPEED_SECONDS;
    this.busy = false;
    this.ended = false;
    this.deck = [];
    this.lastColour = -1;
    this.tiles = [];
    this.dots = [];
    this.timerTxt = undefined;
    this.progressFill = undefined;
    this.timerEvent = undefined;
    this.idleTimer = undefined;
    this.hand = undefined;
    this.pulse = undefined;

    this.buildHeader();
    this.buildCard();
    this.buildGrid();

    this.footerTxt = this.add.text(W / 2, FOOTER_Y, '', {
      fontFamily: F.head, fontSize: '16px', color: T.sub, align: 'center',
    }).setOrigin(0.5);
    this.setFooter();

    this.endOverlay = createEndPopup(this, W, H, {
      onPlayAgain: () => this.scene.restart({ mode: this.mode }),
      onHome:      () => this.scene.start('TitleScene'),
      onAllGames:  () => { window.location.href = '../'; },
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    });

    if (this.mode === 'speed') {
      this.timerEvent = this.time.addEvent({
        delay: 1000, callback: this.tick, callbackScope: this, repeat: SPEED_SECONDS - 1,
      });
    }

    this.nextRound();
  }

  // ─── Header ────────────────────────────────────────────────────────────

  private buildHeader(): void {
    this.add.text(22, HEADER_Y, '🎨 Colour Hunt', {
      fontFamily: F.head, fontSize: '18px', color: T.main,
    }).setOrigin(0, 0.5);

    if (this.mode === 'relaxed') {
      this.pill(W - 70, HEADER_Y, 108);
      this.scoreTxt = this.add.text(W - 70, HEADER_Y, '', {
        fontFamily: F.head, fontSize: '16px', color: T.main,
      }).setOrigin(0.5);

      const gap = 26, startX = W / 2 - ((ROUNDS - 1) * gap) / 2;
      this.dots = Array.from({ length: ROUNDS }, (_, i) => this.add.graphics().setPosition(startX + i * gap, PROGRESS_Y));
    } else {
      this.pill(W - 166, HEADER_Y, 84);
      this.scoreTxt = this.add.text(W - 166, HEADER_Y, '', {
        fontFamily: F.head, fontSize: '16px', color: T.main,
      }).setOrigin(0.5);
      this.pill(W - 66, HEADER_Y, 96);
      this.timerTxt = this.add.text(W - 66, HEADER_Y, `⏱ ${SPEED_SECONDS}s`, {
        fontFamily: F.head, fontSize: '16px', color: T.main,
      }).setOrigin(0.5);

      const track = this.add.graphics();
      track.fillStyle(C.lavender, 0.25);
      track.fillRoundedRect(24, PROGRESS_Y - 4, W - 48, 8, 4);
      this.progressFill = this.add.graphics();
      this.drawProgress(1);
    }
    this.updateHeader();
  }

  private pill(cx: number, cy: number, w: number): void {
    const h = 34;
    const g = this.add.graphics();
    g.fillStyle(C.white, 1);
    g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
    g.lineStyle(1.5, C.lavender, 0.4);
    g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
  }

  private updateHeader(): void {
    if (this.mode === 'relaxed') {
      this.scoreTxt.setText(`⭐ ${this.found}/${ROUNDS}`);
      this.dots.forEach((g, i) => {
        g.clear();
        if (i < this.found) { g.fillStyle(C.pink, 1); g.fillCircle(0, 0, 6); }
        else if (i === this.round && !this.ended) {
          g.fillStyle(C.pink, 0.22); g.fillCircle(0, 0, 11);
          g.fillStyle(C.pink, 1); g.fillCircle(0, 0, 6);
        } else { g.fillStyle(0xe1bee7, 1); g.fillCircle(0, 0, 6); }
      });
    } else {
      this.scoreTxt.setText(`⭐ ${this.score}`);
    }
  }

  private drawProgress(ratio: number): void {
    if (!this.progressFill) return;
    this.progressFill.clear();
    this.progressFill.fillStyle(C.pink, 1);
    this.progressFill.fillRoundedRect(24, PROGRESS_Y - 4, Math.max(8, (W - 48) * ratio), 8, 4);
  }

  private setFooter(text?: string, color: string = T.sub): void {
    const fallback = this.mode === 'relaxed'
      ? 'Tap the paint to hear the colour again 🔊'
      : 'Three in a row = bonus stars! 🔥';
    this.footerTxt.setText(text ?? fallback).setColor(color)
      .setFontFamily(text ? F.head : F.body).setFontSize(text ? 18 : 13)
      .setFontStyle(text ? 'normal' : 'bold');
  }

  // ─── Question card ────────────────────────────────────────────────────

  private buildCard(): void {
    const shadow = this.add.graphics();
    shadow.fillStyle(C.shadow, 0.12);
    shadow.fillRoundedRect(CARD.x, CARD.y + 8, CARD.w, CARD.h, CARD.r);
    this.card = this.add.graphics();

    this.blobG = this.add.graphics();
    this.blob = this.add.container(BLOB.x, BLOB.y, [this.blobG]);
    this.blob.setSize(BLOB.r * 2 + 50, BLOB.r * 2 + 30).setInteractive({ cursor: 'pointer' });
    this.blob.on('pointerdown', () => this.repeatPrompt());

    const sp = this.add.graphics();
    sp.fillStyle(C.white, 1);
    sp.fillCircle(0, 0, SPEAKER.r);
    sp.lineStyle(2, C.lavender, 0.6);
    sp.strokeCircle(0, 0, SPEAKER.r);
    const spTxt = this.add.text(0, 1, '🔊', { fontSize: '20px' }).setOrigin(0.5);
    const speaker = this.add.container(SPEAKER.x, SPEAKER.y, [sp, spTxt]);
    speaker.setSize(SPEAKER.r * 2 + 24, SPEAKER.r * 2 + 24).setInteractive({ cursor: 'pointer' });
    speaker.on('pointerdown', () => {
      this.tweens.add({ targets: speaker, scale: { from: 1.2, to: 1 }, duration: 260, ease: 'Back.Out' });
      this.repeatPrompt();
    });

    this.promptTxt = this.add.text(W / 2, PROMPT_Y, '', {
      fontFamily: F.head, fontSize: '34px', color: T.main,
    }).setOrigin(0.5);
  }

  private drawCard(c: ColourGroup): void {
    const g = this.card;
    g.clear();
    g.fillStyle(shade(c.phex, 0.88), 1);
    g.fillRoundedRect(CARD.x, CARD.y, CARD.w, CARD.h, CARD.r);
    g.lineStyle(3, shade(c.phex, 0.55), 1);
    g.strokeRoundedRect(CARD.x, CARD.y, CARD.w, CARD.h, CARD.r);

    // A soft paint splat: one big drop with a few friends around it.
    const b = this.blobG;
    b.clear();
    const dark = shade(c.phex, -0.22);
    const drops: [number, number, number][] = [[-70, -26, 13], [72, -34, 10], [-62, 40, 9], [68, 34, 14], [0, -66, 8]];
    b.fillStyle(dark, 1);
    b.fillCircle(0, 5, BLOB.r);
    drops.forEach(([x, y, r]) => b.fillCircle(x, y + 3, r));
    b.fillStyle(c.phex, 1);
    b.fillCircle(0, 0, BLOB.r);
    drops.forEach(([x, y, r]) => b.fillCircle(x, y, r));
    b.fillStyle(0xffffff, 0.4);
    b.fillEllipse(-18, -24, 34, 18);
    b.fillCircle(66, 30, 4);
  }

  private repeatPrompt(): void {
    if (this.ended || !this.target) return;
    this.wobbleBlob();
    if (!this.busy) say(this.promptSpeech());
  }

  private wobbleBlob(): void {
    this.tweens.add({ targets: this.blob, scale: { from: 1.15, to: 1 }, duration: 380, ease: 'Back.Out' });
  }

  private promptSpeech(): string {
    return `Find something ${this.target.prompt.toLowerCase()}!`;
  }

  // ─── Answer tiles ─────────────────────────────────────────────────────

  private buildGrid(): void {
    this.tiles = [0, 1, 2, 3].map(i => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 24 + col * (TILE.w + GAP) + TILE.w / 2;
      const y = GRID_TOP + row * (TILE.h + GAP) + TILE.h / 2;

      const shadow = this.add.graphics();
      shadow.fillStyle(C.shadow, 0.1);
      shadow.fillRoundedRect(-TILE.w / 2, -TILE.h / 2 + 6, TILE.w, TILE.h, TILE.r);
      const bg = this.add.graphics();
      const emoji = this.add.text(0, 0, '', { fontSize: '86px' }).setOrigin(0.5);
      const box = this.add.container(x, y, [shadow, bg, emoji]);

      const zone = this.add.zone(x, y, TILE.w + GAP, TILE.h + GAP).setInteractive({ cursor: 'pointer' });
      const tile: Tile = { x, y, box, bg, emoji, zone, out: false };
      zone.on('pointerdown', () => this.onTap(tile));
      zone.on('pointerover', () => { if (!this.busy && !tile.out) this.drawTile(tile, 'hover'); });
      zone.on('pointerout',  () => { if (!this.busy && !tile.out) this.drawTile(tile, 'idle'); });
      this.drawTile(tile, 'idle');
      return tile;
    });
  }

  private drawTile(t: Tile, state: TileState): void {
    const g = t.bg, w = TILE.w, h = TILE.h, r = TILE.r;
    g.clear();
    switch (state) {
      case 'idle':    g.fillStyle(C.white, 1);  g.lineStyle(3, C.lavender, 0.45); break;
      case 'hover':   g.fillStyle(0xfff0f7, 1); g.lineStyle(3, C.pink, 0.85); break;
      case 'correct': g.fillStyle(C.mintBg, 1); g.lineStyle(5, C.mint, 1); break;
      case 'out':     g.fillStyle(0xf6f1f8, 1); g.lineStyle(2, 0xe1bee7, 0.6); break;
    }
    g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
  }

  // ─── Rounds ───────────────────────────────────────────────────────────

  private drawColour(): number {
    if (this.deck.length === 0) {
      this.deck = shuffle(COLOUR_POOL.map((_, i) => i));
      if (this.deck[0] === this.lastColour) this.deck.push(this.deck.shift()!);
    }
    const idx = this.deck.shift()!;
    this.lastColour = idx;
    return idx;
  }

  private buildOptions(target: ColourGroup): Option[] {
    const near = NEIGHBOURS[target.name] ?? [];
    const others = shuffle(COLOUR_POOL.filter(c => c !== target && !near.includes(c.name))).slice(0, 3);
    const used = new Set<string>();
    const pick = (c: ColourGroup): Option => {
      // No two tiles share an object name (e.g. two hearts or two apples).
      const fresh = c.items.filter(it => !used.has(it.name));
      const item = Phaser.Utils.Array.GetRandom(fresh.length ? fresh : c.items) as HuntItem;
      used.add(item.name);
      return { colour: c, item };
    };
    const opts = [pick(target), ...others.map(pick)];
    return shuffle(opts);
  }

  private nextRound(): void {
    if (this.ended) return;
    if (this.mode === 'relaxed' && this.round >= ROUNDS) { this.endGame(); return; }

    this.busy = false;
    this.missed = false;
    this.target = COLOUR_POOL[this.drawColour()];
    this.updateHeader();
    this.drawCard(this.target);
    this.wobbleBlob();

    this.promptTxt.setText(`Find ${this.target.prompt.toLowerCase()}!`)
      .setColor(css(shade(this.target.phex, this.target.name === 'yellow' ? -0.4 : -0.2)));
    this.tweens.add({ targets: this.promptTxt, scale: { from: 0.8, to: 1 }, duration: 300, ease: 'Back.Out' });

    const opts = this.buildOptions(this.target);
    this.tiles.forEach((t, i) => {
      this.tweens.killTweensOf(t.box);
      t.opt = opts[i];
      t.out = false;
      t.emoji.setText(opts[i].item.e).setAlpha(1).setScale(1);
      t.box.setPosition(t.x, t.y).setAlpha(1).setScale(0.6);
      this.drawTile(t, 'idle');
      t.zone.setInteractive({ cursor: 'pointer' });
      this.tweens.add({ targets: t.box, scale: 1, duration: 320, delay: 50 * i, ease: 'Back.Out' });
    });

    say(this.mode === 'relaxed' ? this.promptSpeech() : `${this.target.prompt}!`);
    this.armIdleHint(8000);
  }

  private onTap(t: Tile): void {
    if (this.busy || this.ended || t.out || !t.opt) return;
    this.hideHint();
    if (t.opt.colour === this.target) this.onCorrect(t);
    else this.onWrong(t);
  }

  private onCorrect(t: Tile): void {
    this.busy = true;
    this.idleTimer?.remove();
    this.tiles.forEach(o => o.zone.disableInteractive());
    if (!this.missed) this.firstTry++;
    this.found++;
    this.round++;

    this.drawTile(t, 'correct');
    this.tiles.forEach(o => {
      if (o !== t) this.tweens.add({ targets: o.box, alpha: 0.3, scale: 0.94, duration: 240 });
    });
    t.box.setDepth(5);
    this.tweens.add({ targets: t.box, scale: { from: 1, to: 1.1 }, yoyo: true, duration: 220, ease: 'Sine.Out',
      onComplete: () => t.box.setDepth(0) });
    this.tweens.add({ targets: t.emoji, angle: { from: -10, to: 10 }, yoyo: true, repeat: 1, duration: 110,
      onComplete: () => t.emoji.setAngle(0) });
    this.ring(t.x, t.y, this.target.phex);
    this.sparkles(t.x, t.y);

    const phrase = `${this.target.prompt} ${t.opt!.item.name}!`;
    this.promptTxt.setText(phrase);
    this.tweens.add({ targets: this.promptTxt, scale: { from: 1.2, to: 1 }, duration: 320, ease: 'Back.Out' });
    say(phrase);

    if (this.mode === 'relaxed') {
      sounds.correct();
      this.updateHeader();
      this.time.delayedCall(1900, () => this.nextRound());
    } else {
      this.streak++;
      const award = this.streak >= 3 ? 15 : 10;
      this.score += award;
      this.updateHeader();
      if (this.streak >= 3) { sounds.streak(); this.setFooter(`🔥 ${this.streak} in a row!  +${award}`, '#f06292'); }
      else { sounds.correct(); this.setFooter(this.streak === 2 ? '✨ One more for a streak!' : undefined); }
      this.time.delayedCall(1000, () => this.nextRound());
    }
  }

  private onWrong(t: Tile): void {
    this.missed = true;
    t.out = true;
    t.zone.disableInteractive();
    sounds.wrong();
    this.drawTile(t, 'out');
    this.tweens.add({ targets: t.emoji, alpha: 0.35, duration: 300 });
    this.tweens.add({ targets: t.box, x: { from: t.x - 7, to: t.x + 7 }, yoyo: true, repeat: 2, duration: 60,
      onComplete: () => t.box.setX(t.x) });
    say(`That's ${t.opt!.colour.prompt.toLowerCase()}. Find ${this.target.prompt.toLowerCase()}!`);
    this.wobbleBlob();
    if (this.mode === 'speed') { this.streak = 0; this.setFooter(); }
    // After a miss, help sooner.
    this.armIdleHint(4000);
  }

  // ─── Hints & effects ──────────────────────────────────────────────────

  private armIdleHint(delay: number): void {
    this.idleTimer?.remove();
    if (this.mode !== 'relaxed') return;
    this.idleTimer = this.time.delayedCall(delay, () => {
      if (this.busy || this.ended) return;
      const t = this.tiles.find(o => o.opt?.colour === this.target);
      if (!t) return;
      say(this.promptSpeech());
      this.wobbleBlob();
      this.hideHint();
      this.hand = this.add.text(t.x + 34, t.y + 58, '👆', { fontSize: '46px' }).setOrigin(0.5).setDepth(20);
      this.tweens.add({ targets: this.hand, y: t.y + 40, yoyo: true, repeat: -1, duration: 420, ease: 'Sine.InOut' });
      this.pulse = this.tweens.add({ targets: t.box, scale: 1.06, yoyo: true, repeat: -1, duration: 500, ease: 'Sine.InOut' });
    });
  }

  private hideHint(): void {
    this.hand?.destroy();
    this.hand = undefined;
    if (this.pulse) {
      const targets = this.pulse.targets as Phaser.GameObjects.Container[];
      this.pulse.remove();
      targets.forEach(c => c.setScale(1));
      this.pulse = undefined;
    }
  }

  private ring(x: number, y: number, color: number): void {
    const g = this.add.graphics().setDepth(6);
    const s = { r: 50, a: 0.9 };
    this.tweens.add({
      targets: s, r: 110, a: 0, duration: 650, ease: 'Sine.Out',
      onUpdate: () => { g.clear(); g.lineStyle(6, color, s.a); g.strokeCircle(x, y, s.r); },
      onComplete: () => g.destroy(),
    });
  }

  private sparkles(x: number, y: number): void {
    const emojis = ['✨', '⭐', '🌟', '💖'];
    for (let i = 0; i < 7; i++) {
      const a = (Math.PI * 2 * i) / 7 + Math.random() * 0.4;
      const d = 70 + Math.random() * 30;
      const e = this.add.text(x, y, emojis[i % emojis.length], { fontSize: '24px' }).setOrigin(0.5).setDepth(15);
      this.tweens.add({ targets: e, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, duration: 750, ease: 'Sine.Out',
        onComplete: () => e.destroy() });
    }
  }

  // ─── Timer (speed mode) / end ─────────────────────────────────────────

  private tick(): void {
    if (this.ended) return;
    this.timeLeft--;
    this.timerTxt?.setText(`⏱ ${this.timeLeft}s`);
    if (this.timeLeft <= 10) this.timerTxt?.setColor(T.red);
    this.drawProgress(this.timeLeft / SPEED_SECONDS);
    if (this.timeLeft <= 0) this.endGame();
  }

  private endGame(): void {
    if (this.ended) return;
    this.ended = true;
    this.busy = true;
    this.timerEvent?.remove();
    this.idleTimer?.remove();
    this.hideHint();
    this.tiles.forEach(t => t.zone.disableInteractive());
    this.blob.disableInteractive();
    this.updateHeader();
    sounds.end();

    if (this.mode === 'relaxed') {
      const stars = this.firstTry >= 7 ? 3 : 2;
      say('You found all the colours, Aya!');
      launchConfetti(this, CONFETTI_EMOJIS);
      this.endOverlay.show({
        emoji: stars === 3 ? '🏆' : '🌈',
        title: stars === 3 ? 'Colour Champion!' : 'Great hunting, Aya!',
        subtitle: `You found ${ROUNDS} colours! 💖`,
        score: { value: `${this.firstTry}/${ROUNDS}`, label: 'First-Try Finds' },
        stars: { earned: stars, total: 3 },
      });
      return;
    }

    const s = this.score, t = SPEED_TIERS;
    let emoji: string, title: string, subtitle: string, stars: number;
    if (s >= t.gold)        { emoji = '🏆'; title = 'Colour Champion!'; subtitle = 'Aya spots every colour! 🌈'; stars = 3; }
    else if (s >= t.silver) { emoji = '🌟'; title = 'Brilliant, Aya!';  subtitle = "You're a colour superstar! 🔍"; stars = 3; }
    else if (s >= t.bronze) { emoji = '🎀'; title = 'Well done, Aya!';  subtitle = 'Great colour spotting! 💖'; stars = 2; }
    else                    { emoji = '🌸'; title = 'Nice try, Aya!';   subtitle = "Let's hunt more colours! 🌺"; stars = 1; }
    say(title);
    this.endOverlay.show({
      emoji, title, subtitle,
      score: { value: s, label: 'Points' },
      stars: { earned: stars },
    });
    if (s >= t.silver) launchConfetti(this, CONFETTI_EMOJIS);
  }
}
