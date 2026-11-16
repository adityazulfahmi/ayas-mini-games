import Phaser from 'phaser';
import { drawBg, launchConfetti } from '@shared/phaserUtils';
import { createEndPopup } from '@shared/endPopup';
import { C, T, F } from '@shared/theme';
import { playTone, sounds } from '@shared/audio';
import { buildRound, CONFETTI_EMOJIS, loadSave, storeSave, type BinDef, type ItemDef } from '../data';
import { binSlot, makeBin, pileTop, type BinView } from './bins';
import { makeArt } from './toys';
import { hush, say } from '../speech';

const W = 420, H = 780;
/** Where the toy waits. */
const HOME = { x: W / 2, y: 268 };
/** Baskets stand on this line. */
const FLOOR = 706;
/** Let go below this line and the toy drops into the nearest basket. Generous on purpose. */
const DROP_LINE = 400;
/** Room between baskets (their handles stick out). */
const gapFor = (n: number): number => (n > 2 ? 34 : 44);

interface Bin extends BinView {
  def: BinDef;
  x: number;
  count: number;
  capacity: number;
  hot: boolean;
  sorted: { c: Phaser.GameObjects.Container; cheer: (on: boolean) => void }[];
}

interface Toy {
  def: ItemDef;
  c: Phaser.GameObjects.Container;
  cheer: (on: boolean) => void;
}

const chime = (step: number): void => {
  const scale = [523, 587, 659, 698, 784, 880, 988, 1047, 1175];
  playTone(scale[Math.min(step, scale.length - 1)], 0.2, 'triangle', 0.12);
  playTone(scale[Math.min(step, scale.length - 1)] * 2, 0.16, 'sine', 0.05, 0.05);
};
const boop = (): void => {
  playTone(330, 0.12, 'sine', 0.09);
  playTone(262, 0.18, 'sine', 0.08, 0.1);
};
const plop = (): void => {
  playTone(196, 0.12, 'triangle', 0.18);
  playTone(147, 0.16, 'sine', 0.12, 0.03);
};

export class GameScene extends Phaser.Scene {
  private level = loadSave().level;
  private bins: Bin[] = [];
  private queue: ItemDef[] = [];
  private total = 0;
  private placed = 0;
  private firstTry = 0;
  private missed = false;
  private busy = true;
  private dragging = false;
  private toy?: Toy;

  private prompt!: Phaser.GameObjects.Text;
  private starTxt!: Phaser.GameObjects.Text;
  private dots: Phaser.GameObjects.Graphics[] = [];
  private hand?: Phaser.GameObjects.Text;
  private handChain?: Phaser.Tweens.TweenChain;
  private arrow?: Phaser.GameObjects.Text;
  private hintBin?: Bin;
  private idleTimer?: Phaser.Time.TimerEvent;
  private endOverlay!: ReturnType<typeof createEndPopup>;

  constructor() { super('GameScene'); }

  init(data: { level?: number }): void {
    // "Again" restarts without data and keeps the level that was being played.
    if (typeof data?.level === 'number') this.level = data.level;
  }

  create(): void {
    // Scene instances are reused across restarts (D-005): reset everything.
    this.bins = [];
    this.queue = [];
    this.dots = [];
    this.placed = 0;
    this.firstTry = 0;
    this.missed = false;
    this.busy = true;
    this.dragging = false;
    this.toy = undefined;
    this.hand = undefined;
    this.handChain = undefined;
    this.arrow = undefined;
    this.hintBin = undefined;
    this.idleTimer = undefined;

    const round = buildRound(this.level, loadSave().plays[this.level] ?? 0);
    this.queue = [...round.items];
    this.total = round.items.length;

    drawBg(this);
    this.buildHeader();

    this.prompt = this.add.text(W / 2, 122, '', {
      fontFamily: F.head, fontSize: '27px', color: T.main,
    }).setOrigin(0.5);

    this.add.text(W / 2, 752, 'Drag it to its basket, or tap the basket', {
      fontFamily: F.body, fontSize: '13px', color: T.sub, fontStyle: 'bold', align: 'center',
    }).setOrigin(0.5).setAlpha(0.75);

    // A soft rug so the baskets stand on something.
    const rug = this.add.graphics();
    rug.fillStyle(C.white, 0.5);
    rug.fillEllipse(W / 2, FLOOR + 2, W - 24, 46);

    this.buildBins(round.bins);

    this.endOverlay = createEndPopup(this, W, H, {
      onPlayAgain: () => this.scene.restart(),
      onHome:      () => this.scene.start('TitleScene'),
      onAllGames:  () => { window.location.href = '../'; },
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => hush());

    this.intro();
  }

  // ─── Header ────────────────────────────────────────────────────────────

  private buildHeader(): void {
    this.add.text(22, 34, 'Tidy Up!', { fontFamily: F.head, fontSize: '19px', color: T.main }).setOrigin(0, 0.5);
    const g = this.add.graphics();
    g.fillStyle(C.white, 1);
    g.fillRoundedRect(W - 124, 17, 108, 34, 17);
    g.lineStyle(1.5, C.lavender, 0.4);
    g.strokeRoundedRect(W - 124, 17, 108, 34, 17);
    this.starTxt = this.add.text(W - 70, 34, '', { fontFamily: F.head, fontSize: '15px', color: T.main }).setOrigin(0.5);

    const gap = 26;
    const startX = W / 2 - ((this.total - 1) * gap) / 2;
    for (let i = 0; i < this.total; i++) this.dots.push(this.add.graphics().setPosition(startX + i * gap, 76));
    this.renderProgress();
  }

  /** One dot per toy; it takes the colour of the basket the toy went into. */
  private renderProgress(color?: number): void {
    this.starTxt.setText(`⭐ ${this.placed}/${this.total}`);
    this.dots.forEach((g, i) => {
      if (i < this.placed - 1 || (i === this.placed - 1 && color === undefined)) return;
      g.clear();
      if (i === this.placed - 1) {
        g.fillStyle(color!, 1); g.fillCircle(0, 0, 8);
        g.lineStyle(2, C.white, 1); g.strokeCircle(0, 0, 8);
        this.tweens.add({ targets: g, scale: { from: 1.9, to: 1 }, duration: 320, ease: 'Back.Out' });
      } else {
        g.fillStyle(C.white, 0.9); g.fillCircle(0, 0, 6);
        g.lineStyle(1.5, C.lavender, 0.6); g.strokeCircle(0, 0, 6);
      }
    });
  }

  // ─── Baskets ───────────────────────────────────────────────────────────

  private buildBins(defs: BinDef[]): void {
    const BIN_GAP = gapFor(defs.length);
    const totalW = defs.reduce((a, d) => a + d.w, 0) + (defs.length - 1) * BIN_GAP;
    let cursor = W / 2 - totalW / 2;
    defs.forEach((def, i) => {
      const x = cursor + def.w / 2;
      const view = makeBin(this, def, x, FLOOR + 340);
      view.c.setDepth(2);
      const bin: Bin = {
        ...view, def, x, count: 0, hot: false, sorted: [],
        capacity: this.queue.filter(it => it.bin === def.key).length,
      };
      // A generous tap column: from above the pile down to the floor, gap included.
      const left = i === 0 ? 0 : cursor - BIN_GAP / 2;
      const right = i === defs.length - 1 ? W : cursor + def.w + BIN_GAP / 2;
      const zone = this.add.zone((left + right) / 2, (DROP_LINE + 40 + FLOOR + 24) / 2, right - left, FLOOR + 24 - DROP_LINE - 40)
        .setInteractive({ cursor: 'pointer' });
      zone.on('pointerdown', () => this.onBinTap(bin));
      this.bins.push(bin);
      cursor += def.w + BIN_GAP;
    });
  }

  /** The basket whose column the point is in (edges count, so there is always one). */
  private binAt(x: number): Bin {
    let best = this.bins[0], bestD = Infinity;
    for (const b of this.bins) {
      const d = Math.abs(x - b.x) - b.def.w / 2;
      if (d < bestD) { best = b; bestD = d; }
    }
    return best;
  }

  private setHot(bin?: Bin): void {
    for (const b of this.bins) {
      const on = b === bin;
      if (b.hot === on) continue;
      b.hot = on;
      this.tweens.killTweensOf(b.c);
      this.tweens.killTweensOf(b.glow);
      this.tweens.add({ targets: b.c, scaleX: on ? 1.05 : 1, scaleY: on ? 1.05 : 1, x: b.x, y: FLOOR, angle: 0, duration: 140, ease: 'Sine.Out' });
      this.tweens.add({ targets: b.glow, alpha: on ? 1 : 0, duration: 140 });
    }
  }

  private hop(bin: Bin, height = 18): void {
    this.tweens.killTweensOf(bin.c);
    bin.c.setPosition(bin.x, FLOOR).setScale(1).setAngle(0);
    this.tweens.chain({
      targets: bin.c,
      tweens: [
        { scaleY: 0.93, scaleX: 1.05, duration: 90, ease: 'Sine.Out' },
        { y: FLOOR - height, scaleY: 1.05, scaleX: 0.97, duration: 170, ease: 'Sine.Out' },
        { y: FLOOR, scaleY: 1, scaleX: 1, duration: 260, ease: 'Bounce.Out' },
      ],
    });
  }

  /** Baskets roll in one by one and each says what belongs in it. */
  private intro(): void {
    const step = 1650;
    this.bins.forEach((bin, i) => {
      this.tweens.add({ targets: bin.c, y: FLOOR, duration: 560, delay: i * 140, ease: 'Back.Out',
        onStart: () => playTone(392 + i * 98, 0.1, 'sine', 0.08) });
      this.time.delayedCall(650 + i * step, () => {
        say(bin.def.rule, i === 0);
        this.hop(bin, 26);
        this.pulseGlow(bin);
      });
    });
    this.time.delayedCall(650 + this.bins.length * step, () => this.nextToy());
  }

  private pulseGlow(bin: Bin, times = 1): void {
    this.tweens.killTweensOf(bin.glow);
    bin.glow.setAlpha(0);
    this.tweens.add({ targets: bin.glow, alpha: 1, yoyo: true, repeat: times - 1, duration: 420, ease: 'Sine.InOut',
      onComplete: () => bin.glow.setAlpha(bin.hot ? 1 : 0) });
  }

  // ─── The toy to put away ───────────────────────────────────────────────

  private nextToy(): void {
    const def = this.queue.shift();
    if (!def) return;
    this.missed = false;

    const { node, cheer } = makeArt(this, def.art, def.size);
    const c = this.add.container(HOME.x, HOME.y, [node]).setDepth(10).setScale(0);
    const hit = Math.max(def.size + 44, 150);
    c.setSize(hit, hit).setInteractive({ draggable: true, cursor: 'grab' });
    const toy: Toy = { def, c, cheer };
    this.toy = toy;
    this.wireToy(toy);

    playTone(520, 0.1, 'sine', 0.1);
    this.tweens.add({
      targets: c, scale: 1, duration: 420, ease: 'Back.Out',
      onComplete: () => { if (this.toy === toy) { this.busy = false; this.bob(); } },
    });
    this.prompt.setText(def.label);
    this.tweens.add({ targets: this.prompt, scale: { from: 0.8, to: 1 }, duration: 260, ease: 'Back.Out' });
    say(def.say, false);
    this.armIdleHint();
  }

  private wireToy(toy: Toy): void {
    const c = toy.c;
    let downAt = { x: 0, y: 0 };
    c.on('pointerdown', (p: Phaser.Input.Pointer) => { downAt = { x: p.x, y: p.y }; });
    c.on('pointerup', (p: Phaser.Input.Pointer) => {
      // A tap (not a drag) says the name again.
      if (!this.busy && this.toy === toy && Math.hypot(p.x - downAt.x, p.y - downAt.y) < 12) {
        say(toy.def.say);
        this.tweens.add({ targets: c, angle: { from: -10, to: 10 }, yoyo: true, repeat: 1, duration: 90, onComplete: () => c.setAngle(0) });
        this.armIdleHint(5000);
      }
    });
    c.on('dragstart', () => {
      if (this.busy || this.toy !== toy) return;
      this.dragging = true;
      this.tweens.killTweensOf(c);
      c.setAngle(0);
      this.hideHint();
      this.idleTimer?.remove();
      this.tweens.add({ targets: c, scale: 1.08, duration: 120 });
    });
    c.on('drag', (_p: Phaser.Input.Pointer, x: number, y: number) => {
      if (!this.dragging || this.toy !== toy) return;
      c.setPosition(Phaser.Math.Clamp(x, 20, W - 20), Phaser.Math.Clamp(y, 60, H - 40));
      this.setHot(c.y > DROP_LINE ? this.binAt(c.x) : undefined);
    });
    c.on('dragend', () => {
      if (!this.dragging || this.toy !== toy) return;
      this.dragging = false;
      this.setHot(undefined);
      if (c.y <= DROP_LINE) { this.returnHome(); this.armIdleHint(); return; }
      const bin = this.binAt(c.x);
      if (bin.def.key === toy.def.bin) this.place(bin);
      else this.wrong(bin);
    });
  }

  private bob(): void {
    if (!this.toy) return;
    this.tweens.add({ targets: this.toy.c, y: HOME.y - 9, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.InOut' });
  }

  private returnHome(): void {
    if (!this.toy) return;
    const c = this.toy.c;
    this.tweens.killTweensOf(c);
    this.tweens.add({
      targets: c, x: HOME.x, y: HOME.y, scale: 1, angle: 0, duration: 420, ease: 'Back.Out',
      onComplete: () => this.bob(),
    });
  }

  // ─── Answers ───────────────────────────────────────────────────────────

  private onBinTap(bin: Bin): void {
    if (this.busy || this.dragging || !this.toy) return;
    this.hideHint();
    if (bin.def.key === this.toy.def.bin) this.place(bin);
    else this.wrong(bin);
  }

  private rightBin(): Bin | undefined {
    return this.bins.find(b => b.def.key === this.toy?.def.bin);
  }

  private wrong(bin: Bin): void {
    const toy = this.toy;
    const right = this.rightBin();
    if (!toy || !right) return;
    this.missed = true;
    this.hideHint();
    boop();
    // "That one is blue. Blue goes here!"
    say(`${toy.def.is} ${right.def.here}`);

    // The basket shakes its head, the toy hops back home.
    this.tweens.killTweensOf(bin.c);
    bin.c.setPosition(bin.x, FLOOR).setScale(1);
    this.tweens.add({ targets: bin.c, angle: { from: -4, to: 4 }, yoyo: true, repeat: 2, duration: 70,
      onComplete: () => bin.c.setAngle(0) });

    const c = toy.c;
    this.tweens.killTweensOf(c);
    const fromBin = c.y > DROP_LINE;
    this.tweens.chain({
      targets: c,
      tweens: fromBin
        ? [
          { y: c.y - 40, duration: 140, ease: 'Sine.Out' },
          { x: HOME.x, y: HOME.y, scale: 1, angle: 0, duration: 420, ease: 'Back.Out' },
        ]
        : [
          { x: HOME.x + (bin.x - HOME.x) * 0.25, y: HOME.y + 34, duration: 150, ease: 'Sine.Out' },
          { x: HOME.x, y: HOME.y, scale: 1, angle: 0, duration: 320, ease: 'Back.Out' },
        ],
      onComplete: () => { if (this.toy === toy && !this.busy) this.bob(); },
    });

    // Show the right place straight away, then again with the hand if she waits.
    this.pointAt(right);
    this.armIdleHint(5000);
  }

  /** A bouncing arrow over the right basket. */
  private pointAt(bin: Bin): void {
    this.arrow?.destroy();
    const top = FLOOR - pileTop(bin.def, bin.count) - 52;
    const arrow = this.add.text(bin.x, top, '👇', { fontSize: '44px', padding: { top: 6, bottom: 6 } }).setOrigin(0.5).setDepth(40).setAlpha(0);
    this.arrow = arrow;
    this.pulseGlow(bin, 3);
    this.tweens.add({ targets: arrow, alpha: 1, duration: 160 });
    this.tweens.add({ targets: arrow, y: top + 14, yoyo: true, repeat: 4, duration: 280, ease: 'Sine.InOut',
      onComplete: () => { if (this.arrow === arrow) this.arrow = undefined; arrow.destroy(); } });
  }

  private place(bin: Bin): void {
    const toy = this.toy;
    if (!toy) return;
    this.busy = true;
    this.toy = undefined;
    this.idleTimer?.remove();
    this.hideHint();
    this.arrow?.destroy();
    this.arrow = undefined;
    this.setHot(undefined);

    const c = toy.c;
    c.disableInteractive();
    this.tweens.killTweensOf(c);
    this.tweens.killTweensOf(bin.c);
    this.tweens.killTweensOf(bin.glow);
    bin.c.setPosition(bin.x, FLOOR).setScale(1).setAngle(0);
    bin.glow.setAlpha(0);
    bin.hot = false;

    const slot = binSlot(bin.def, bin.count, bin.capacity);
    const fit = bin.def.mini / toy.def.size;
    bin.count++;
    this.placed++;
    if (!this.missed) this.firstTry++;

    // Fly up over the basket, then drop in behind the rim.
    const overY = FLOOR + slot.y - 70;
    this.tweens.add({ targets: c, x: bin.x + slot.x, duration: 380, ease: 'Sine.InOut' });
    this.tweens.add({ targets: c, scale: fit * 1.12, angle: 0, duration: 380, ease: 'Sine.Out' });
    this.tweens.add({
      targets: c, y: overY, duration: 380, ease: c.y > overY ? 'Back.Out' : 'Sine.In',
      onComplete: () => {
        this.tweens.killTweensOf(c);
        bin.items.add(c);
        c.setPosition(slot.x, overY - FLOOR).setScale(fit * 1.12);
        this.tweens.add({ targets: c, scale: fit, duration: 200 });
        this.tweens.add({
          targets: c, y: slot.y, angle: Phaser.Math.Between(-9, 9), duration: 420, ease: 'Bounce.Out',
        });
        this.time.delayedCall(150, () => this.landed(bin, toy));
      },
    });
  }

  private landed(bin: Bin, toy: Toy): void {
    bin.sorted.push({ c: toy.c, cheer: toy.cheer });
    plop();
    chime(this.placed - 1);
    say(toy.def.yes);
    this.renderProgress(bin.def.color);
    this.tweens.chain({
      targets: bin.c,
      tweens: [
        { scaleY: 0.94, scaleX: 1.04, duration: 90, ease: 'Sine.Out' },
        { scaleY: 1, scaleX: 1, duration: 260, ease: 'Back.Out' },
      ],
    });
    this.sparkles(bin.x, FLOOR - pileTop(bin.def, bin.count) + bin.def.mini * 0.4);
    this.tweens.add({ targets: this.starTxt, scale: { from: 1.25, to: 1 }, duration: 260, ease: 'Back.Out' });

    const done = this.queue.length === 0;
    this.time.delayedCall(done ? 900 : 1150, () => (done ? this.allTidy() : this.nextToy()));
  }

  // ─── Everything in its place ───────────────────────────────────────────

  private allTidy(): void {
    this.prompt.setText('All tidy! 🎉');
    this.tweens.add({ targets: this.prompt, scale: { from: 0.7, to: 1 }, duration: 380, ease: 'Back.Out' });
    sounds.streak();
    say('All tidy! Everything is in its place!', false);

    // Each basket hops in turn and its toys cheer.
    this.bins.forEach((bin, i) => {
      this.time.delayedCall(i * 260, () => {
        this.hop(bin, 30);
        this.pulseGlow(bin);
        bin.sorted.forEach((s, k) => {
          s.cheer(true);
          this.tweens.add({ targets: s.c, y: s.c.y - 18, yoyo: true, repeat: 2, duration: 190, delay: k * 70, ease: 'Sine.Out' });
        });
        this.sparkles(bin.x, FLOOR - pileTop(bin.def, bin.count));
      });
    });

    const save = loadSave();
    save.level = this.level;
    save.plays[this.level] = (save.plays[this.level] ?? 0) + 1;
    storeSave(save);

    this.time.delayedCall(2600, () => this.endGame());
  }

  private endGame(): void {
    sounds.end();
    launchConfetti(this, CONFETTI_EMOJIS);
    say('You did it, Aya!', false);
    const ratio = this.firstTry / this.total;
    const stars = ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1;
    this.endOverlay.show({
      emoji: stars === 3 ? '🎉' : '🌟',
      title: stars === 3 ? 'Super sorter!' : 'All tidy!',
      subtitle: 'Everything is in its place, Aya! 💖',
      score: { value: `${this.firstTry}/${this.total}`, label: 'First-Try Toys' },
      stars: { earned: stars, total: 3 },
    });
  }

  // ─── Hints & effects ───────────────────────────────────────────────────

  /** After a pause a little hand shows the way: from the toy to its basket. */
  private armIdleHint(delay = 7000): void {
    this.idleTimer?.remove();
    this.idleTimer = this.time.delayedCall(delay, () => this.showHint());
  }

  private showHint(): void {
    const target = this.rightBin();
    if (!target || this.busy || this.dragging || !this.toy) return;
    this.hideHint();
    this.hintBin = target;
    this.tweens.add({ targets: target.glow, alpha: 1, yoyo: true, repeat: -1, duration: 460, ease: 'Sine.InOut' });
    say(target.def.here);

    const to = { x: target.x, y: FLOOR - target.def.bodyH - 14 };
    // The fingertip of 👆 is near its top-left; offset so it points at the spot.
    this.hand = this.add.text(HOME.x, HOME.y, '👆', { fontSize: '54px', padding: { top: 6, bottom: 6 } })
      .setOrigin(0.32, 0.14).setDepth(40).setAlpha(0);
    this.handChain = this.tweens.chain({
      targets: this.hand,
      loop: -1,
      tweens: [
        { alpha: 1, x: HOME.x, y: HOME.y + 10, duration: 220 },
        { x: to.x, y: to.y, duration: 1100, ease: 'Sine.InOut', hold: 380 },
        { alpha: 0, duration: 250 },
        { alpha: 0, duration: 450 },
      ],
    });
  }

  private hideHint(): void {
    this.handChain?.stop();
    this.handChain = undefined;
    if (this.hand) {
      this.tweens.killTweensOf(this.hand);
      this.hand.destroy();
      this.hand = undefined;
    }
    if (this.hintBin) {
      this.tweens.killTweensOf(this.hintBin.glow);
      this.hintBin.glow.setAlpha(this.hintBin.hot ? 1 : 0);
      this.hintBin = undefined;
    }
  }

  private sparkles(x: number, y: number): void {
    const emojis = ['✨', '⭐', '🌟', '💖'];
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI + (Math.PI * i) / 5 + (Math.random() - 0.5) * 0.3;
      const d = 62 + Math.random() * 28;
      const e = this.add.text(x, y, emojis[i % emojis.length], { fontFamily: F.body, fontSize: '24px' }).setOrigin(0.5).setDepth(15);
      this.tweens.add({ targets: e, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, duration: 720, ease: 'Sine.Out',
        onComplete: () => e.destroy() });
    }
  }
}
