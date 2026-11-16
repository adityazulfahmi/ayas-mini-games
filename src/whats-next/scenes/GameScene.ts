import Phaser from 'phaser';
import { drawBg, launchConfetti } from '@shared/phaserUtils';
import { createEndPopup } from '@shared/endPopup';
import { C, T, F } from '@shared/theme';
import { sounds } from '@shared/audio';
import { shuffle } from '@shared/utils';
import {
  COLOUR_FAMILY, CONFETTI_EMOJIS, MUSIC_FAMILY, PATTERN_LEVELS, STORIES, THING_FAMILIES,
  TOTAL_ROUNDS, VOICE_FAMILY, makeSizeFamily, saveLevel,
  type GameMode, type PatternFamily, type PatternItem, type Sfx, type Story,
} from '../data';
import { askNote, beatNote, boing, hush, playSfx, say, softNo } from '../speech';

const W = 420, H = 780;

// ── Layout (logical 420×780) ──────────────────────────────────────────────
const HEADER_Y = 40;
const DOTS_Y = 80;

// The "row" panel: a soft white card that holds the path + the prompt.
const PANEL_X = 6, PANEL_Y = 104, PANEL_W = W - 12, PANEL_H = 290;
const ROW_INNER_W = PANEL_W - 8;
const PATTERN_ROW_Y = 254;
const STORY_ROW_Y = 236;
const PROMPT_Y = 350;
const PROMPT_W = 262, PROMPT_H = 52;

const PICK_LABEL_Y = 424;

// Answer cards: two huge ones on the first level, three after that.
const OPT_Y = 566;
const OPT_H = 216;

// Stepping-stone geometry (pattern mode).
const GAP_IN = 3;      // between stones of one unit
const TRAY_PAD = 4;    // tray border around a unit
const GAP_UNIT = 6;    // between two trays

// Beat timing (ms of game time).
const PATTERN_BEAT = 760;
const UNIT_PAUSE = 260;   // a breath between repeats: "apple, banana… apple, banana…"
const STORY_BEAT = 1750;
const HOP_MS = 230;
const IDLE_HINT_MS = 9000;

const HOPPER = '🐥';

/** One picture in the row or on an answer card. */
interface Cell {
  key: string;
  e: string;
  say: string;
  label: string;
  note: number;
  scale: number;
  bg: number;
  sfx?: Sfx;
}

interface RoundData {
  title?: string;
  cells: Cell[];
  answer: Cell;
  options: Cell[];
  /** Length of the repeating unit (0 in story mode: no grouping). */
  unitLen: number;
}

type SlotState = 'idle' | 'lit' | 'question' | 'reveal' | 'twin';
interface Slot {
  c: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  txt: Phaser.GameObjects.Text;
  w: number;
  h: number;
  isQuestion: boolean;
  cell?: Cell;
  emojiPx: number;
}

type CardState = 'idle' | 'hint' | 'correct' | 'wrong';
interface OptionCard {
  c: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  txt: Phaser.GameObjects.Text;
  label: Phaser.GameObjects.Text;
  cx: number;
  w: number;
  emojiPx: number;
  cell: Cell;
  state: CardState;
}

interface SceneInit { mode?: GameMode; level?: number }

export class GameScene extends Phaser.Scene {
  private mode: GameMode = 'pattern';
  private startLevel = 1;

  private level = 1;
  private streak = 0;
  private roundIndex = 0;
  private score = 0;
  private firstTry = true;
  private answered = false;
  private playing = false;
  private optionsOpen = false;
  private locked = false;
  private current!: RoundData;
  private storyQueue: Story[] = [];
  private familyQueue: PatternFamily[] = [];
  private spareThings!: PatternFamily;
  private rowY = PATTERN_ROW_Y;

  private headerTxt!: Phaser.GameObjects.Text;
  private scoreTxt!: Phaser.GameObjects.Text;
  private progressDots: Phaser.GameObjects.Graphics[] = [];
  private slots: Slot[] = [];
  private rowExtras: Phaser.GameObjects.GameObject[] = [];
  private optionCards: OptionCard[] = [];
  private beatTimers: Phaser.Time.TimerEvent[] = [];
  private idleTimer?: Phaser.Time.TimerEvent;
  private qTween?: Phaser.Tweens.Tween;
  private chick?: Phaser.GameObjects.Text;
  private chickTween?: Phaser.Tweens.Tween;
  private chickY = 0;
  private prompt!: Phaser.GameObjects.Container;
  private promptTxt!: Phaser.GameObjects.Text;
  private pickLabel!: Phaser.GameObjects.Text;
  private storyTitle!: Phaser.GameObjects.Text;

  private endOverlay!: ReturnType<typeof createEndPopup>;

  constructor() { super('GameScene'); }

  init(data: SceneInit): void {
    this.mode = data?.mode ?? 'pattern';
    this.startLevel = Phaser.Math.Clamp(data?.level ?? 1, 1, PATTERN_LEVELS.length);
  }

  create(): void {
    drawBg(this);

    // D-005: Phaser reuses scene instances, so reset every pushed-into field.
    this.roundIndex = 0;
    this.score = 0;
    this.streak = 0;
    this.level = this.mode === 'pattern' ? this.startLevel : 1;
    this.progressDots = [];
    this.slots = [];
    this.rowExtras = [];
    this.optionCards = [];
    this.beatTimers = [];
    this.idleTimer = undefined;
    this.qTween = undefined;
    this.chick = undefined;
    this.chickTween = undefined;
    this.playing = false;
    this.answered = false;
    this.optionsOpen = false;
    this.locked = false;
    this.rowY = this.mode === 'pattern' ? PATTERN_ROW_Y : STORY_ROW_Y;

    // D-006: shuffle once per game so a playthrough never repeats. Pattern
    // rounds alternate everyday things with the "special" kinds (colours,
    // animal voices, big/little, music) so the logic stays the same while
    // what she sees and hears keeps changing.
    this.storyQueue = shuffle(STORIES).slice(0, TOTAL_ROUNDS);
    const things = shuffle(THING_FAMILIES);
    const specials = shuffle([COLOUR_FAMILY, VOICE_FAMILY, MUSIC_FAMILY, makeSizeFamily()]);
    this.familyQueue = [things[0], specials[0], things[1], specials[1], specials[2]];
    this.spareThings = things[2];

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => hush());

    this.buildHeader();
    this.buildPanel();

    this.endOverlay = createEndPopup(this, W, H, {
      onPlayAgain: () => this.scene.restart({ mode: this.mode, level: this.level }),
      onHome:      () => this.scene.start('TitleScene'),
      onAllGames:  () => { window.location.href = '../'; },
    });

    this.loadRound();
  }

  // ─── Header ────────────────────────────────────────────────────────────

  private buildHeader(): void {
    this.headerTxt = this.add.text(22, HEADER_Y, '', {
      fontFamily: F.head, fontSize: '19px', color: T.main,
    }).setOrigin(0, 0.5);
    this.renderHeader();

    const pw = 104, ph = 36, px = W - 22 - pw / 2;
    const g = this.add.graphics();
    g.fillStyle(C.white, 1);
    g.fillRoundedRect(px - pw / 2, HEADER_Y - ph / 2, pw, ph, ph / 2);
    g.lineStyle(1.5, C.lavender, 0.5);
    g.strokeRoundedRect(px - pw / 2, HEADER_Y - ph / 2, pw, ph, ph / 2);
    this.scoreTxt = this.add.text(px, HEADER_Y, `⭐ 0/${TOTAL_ROUNDS}`, {
      fontFamily: F.head, fontSize: '16px', color: T.main,
    }).setOrigin(0.5);

    const dotGap = 12, dotSize = 14;
    const totalW = TOTAL_ROUNDS * dotSize + (TOTAL_ROUNDS - 1) * dotGap;
    const startX = W / 2 - totalW / 2 + dotSize / 2;
    this.progressDots = Array.from({ length: TOTAL_ROUNDS }, (_, i) =>
      this.add.graphics().setPosition(startX + i * (dotSize + dotGap), DOTS_Y),
    );
    this.renderDots();
  }

  private renderHeader(): void {
    this.headerTxt.setText(this.mode === 'pattern' ? `🎶 Level ${this.level}` : '📖 Story');
  }

  private renderDots(): void {
    this.progressDots.forEach((g, i) => {
      g.clear();
      if (i < this.roundIndex) {
        g.fillStyle(C.mint, 1);
        g.fillCircle(0, 0, 7);
      } else if (i === this.roundIndex) {
        g.fillStyle(C.pink, 1);
        g.fillCircle(0, 0, 8);
      } else {
        g.fillStyle(C.lavender, 0.45);
        g.fillCircle(0, 0, 6);
      }
    });
  }

  // ─── Panel + prompt ────────────────────────────────────────────────────

  private buildPanel(): void {
    const g = this.add.graphics();
    g.fillStyle(C.shadow, 0.1);
    g.fillRoundedRect(PANEL_X + 2, PANEL_Y + 6, PANEL_W, PANEL_H, 30);
    g.fillStyle(C.white, 0.78);
    g.fillRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 30);
    g.lineStyle(2, C.lavender, 0.35);
    g.strokeRoundedRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 30);

    // Prompt pill doubles as a big "listen again" button.
    const bg = this.add.graphics();
    bg.fillStyle(C.shadow, 0.14);
    bg.fillRoundedRect(-PROMPT_W / 2, -PROMPT_H / 2 + 4, PROMPT_W, PROMPT_H, PROMPT_H / 2);
    bg.fillStyle(C.cream, 1);
    bg.fillRoundedRect(-PROMPT_W / 2, -PROMPT_H / 2, PROMPT_W, PROMPT_H, PROMPT_H / 2);
    bg.lineStyle(2, C.lavender, 0.8);
    bg.strokeRoundedRect(-PROMPT_W / 2, -PROMPT_H / 2, PROMPT_W, PROMPT_H, PROMPT_H / 2);
    const txt = this.add.text(8, 0, 'What comes next?', {
      fontFamily: F.head, fontSize: '19px', color: T.main,
    }).setOrigin(0.5);
    this.promptTxt = txt;
    const icon = this.add.text(-PROMPT_W / 2 + 28, 0, '🔊', {
      fontFamily: F.body, fontSize: '22px',
    }).setOrigin(0.5);
    this.prompt = this.add.container(W / 2, PROMPT_Y, [bg, txt, icon]);
    this.prompt.setSize(PROMPT_W + 20, PROMPT_H + 16).setInteractive({ cursor: 'pointer' });
    this.prompt.on('pointerdown', () => this.replay());

    // Story mode: the story's name sits at the top of the panel (for Papa).
    this.storyTitle = this.add.text(W / 2, PANEL_Y + 30, '', {
      fontFamily: F.head, fontSize: '16px', color: T.sub,
    }).setOrigin(0.5);

    this.pickLabel = this.add.text(W / 2, PICK_LABEL_Y, '👇  Tap the one that comes next', {
      fontFamily: F.body, fontSize: '15px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);
  }

  // ─── Sequence row ──────────────────────────────────────────────────────

  private buildRow(): void {
    this.slots.forEach(s => s.c.destroy());
    this.rowExtras.forEach(o => o.destroy());
    this.slots = [];
    this.rowExtras = [];
    this.chickTween?.stop();
    this.chick?.destroy();
    this.chick = undefined;

    const n = this.current.cells.length + 1;
    const story = this.mode === 'story';
    const L = this.current.unitLen;
    const units = story ? 0 : n / L;

    // Work out every slot's centre x.
    let w: number, h: number;
    const xs: number[] = [];
    if (story) {
      const gap = 20;
      w = Math.min(82, (ROW_INNER_W - gap * (n - 1)) / n);
      h = 116;
      const startX = W / 2 - (w * n + gap * (n - 1)) / 2 + w / 2;
      for (let i = 0; i < n; i++) xs.push(startX + i * (w + gap));
    } else {
      // Stones of one repeat sit together on a tray; trays are spaced apart,
      // so the "chunk that repeats" is something she can see.
      const fixed = units * 2 * TRAY_PAD + (units - 1) * GAP_UNIT + units * (L - 1) * GAP_IN;
      w = Math.min(84, (ROW_INNER_W - fixed) / n);
      h = Math.round(w * 1.36);
      const total = w * n + fixed;
      let x = W / 2 - total / 2;
      for (let u = 0; u < units; u++) {
        const trayX = x;
        x += TRAY_PAD;
        for (let k = 0; k < L; k++) {
          xs.push(x + w / 2);
          x += w + (k < L - 1 ? GAP_IN : 0);
        }
        x += TRAY_PAD;
        const trayW = x - trayX;
        const tg = this.add.graphics();
        const ty = this.rowY - h / 2 - TRAY_PAD - 1, th = h + TRAY_PAD * 2 + 2;
        tg.fillStyle(C.shadow, 0.14);
        tg.fillRoundedRect(trayX + 1, ty + 6, trayW, th, 20);
        tg.fillStyle(0xf1e3f7, 1);
        tg.fillRoundedRect(trayX, ty, trayW, th, 20);
        tg.lineStyle(2, C.lavender, 0.55);
        tg.strokeRoundedRect(trayX, ty, trayW, th, 20);
        this.rowExtras.push(tg);
        x += GAP_UNIT;
      }
    }
    const emojiPx = Math.round(Math.min(story ? 54 : 62, w * 0.76));

    for (let i = 0; i < n; i++) {
      const cx = xs[i];
      const isQuestion = i === n - 1;
      const cell = isQuestion ? undefined : this.current.cells[i];
      const bg = this.add.graphics();
      const txt = this.add.text(0, 0, isQuestion ? '?' : cell!.e, {
        fontFamily: isQuestion ? F.head : F.body,
        fontSize: isQuestion ? `${Math.round(emojiPx * 1.05)}px` : `${emojiPx}px`,
        color: isQuestion ? '#f06292' : T.main,
        padding: { top: 6, bottom: 6 },
      }).setOrigin(0.5);
      const c = this.add.container(cx, this.rowY, [bg, txt]);
      const slot: Slot = { c, bg, txt, w, h, isQuestion, cell, emojiPx };
      this.paintSlot(slot, isQuestion ? 'question' : 'idle');
      txt.setScale(0);
      this.slots.push(slot);

      // Poking a picture says its name: free exploration, never an answer.
      c.setSize(w, h + 30).setInteractive({ cursor: 'pointer' });
      c.on('pointerdown', () => this.pokeSlot(slot));

      // Story frames read as a little comic strip: arrows between frames.
      if (story && i < n - 1) {
        const ar = this.add.text(cx + w / 2 + 10, this.rowY, '›', {
          fontFamily: F.head, fontSize: '26px', color: T.sub,
        }).setOrigin(0.5).setAlpha(0.55);
        this.rowExtras.push(ar);
      }
    }

    // A little chick hops along the stones on the beat, like a finger
    // pointing at each one while you chant the pattern.
    if (!story) {
      this.chickY = this.rowY - h / 2 - 24;
      this.chick = this.add.text(-40, this.chickY, HOPPER, {
        fontFamily: F.body, fontSize: '42px', padding: { top: 6, bottom: 6 },
      }).setOrigin(0.5).setDepth(12);
    }
  }

  private paintSlot(slot: Slot, state: SlotState): void {
    const { bg, w, h } = slot;
    const r = Math.min(18, w * 0.28);
    const fill = slot.cell && this.mode === 'pattern' ? slot.cell.bg : C.white;
    bg.clear();
    bg.fillStyle(C.shadow, 0.12);
    bg.fillRoundedRect(-w / 2 + 1, -h / 2 + 4, w, h, r);
    if (state === 'question') {
      bg.fillStyle(0xfff0f6, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, r);
      bg.lineStyle(3.5, C.pink, 0.9);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
      return;
    }
    bg.fillStyle(fill, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    if (state === 'reveal') bg.lineStyle(4, C.mint, 1);
    else if (state === 'lit') bg.lineStyle(4, 0xffb300, 1);
    else if (state === 'twin') bg.lineStyle(5, C.pink, 1);
    else bg.lineStyle(2, C.white, 0.9);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
  }

  private get question(): Slot { return this.slots[this.slots.length - 1]; }

  /** The stone in the previous repeat that the "?" has to copy. */
  private get twin(): Slot | undefined {
    const L = this.current.unitLen;
    return L ? this.slots[this.slots.length - 1 - L] : undefined;
  }

  private voice(cell: Cell, queue: boolean, rate = 1.0, vol?: number): void {
    if (cell.sfx) {
      playSfx(cell.sfx);
    } else {
      beatNote(cell.note, vol);
      say(cell.say, { queue, rate });
    }
  }

  private pokeSlot(slot: Slot): void {
    if (this.answered || this.playing || this.locked || !slot.cell || slot.txt.scale === 0) return;
    this.voice(slot.cell, false);
    this.bounceSlot(slot, 14);
    this.armIdle();
  }

  // ─── Option cards ─────────────────────────────────────────────────────

  private buildOptionCards(): void {
    this.optionCards.forEach(c => c.c.destroy());
    this.optionCards = [];
    const opts = this.current.options;
    const n = opts.length;
    const cw = n === 2 ? 186 : 126;
    const gap = n === 2 ? 16 : 10;
    const emojiPx = n === 2 ? 100 : 80;
    const total = cw * n + gap * (n - 1);
    const startX = W / 2 - total / 2 + cw / 2;
    const labelled = this.mode === 'pattern';

    opts.forEach((cell, i) => {
      const cx = startX + i * (cw + gap);
      const bg = this.add.graphics();
      const txt = this.add.text(0, labelled ? -14 : 0, cell.e, {
        fontFamily: F.body, fontSize: `${emojiPx}px`, padding: { top: 8, bottom: 8 },
      }).setOrigin(0.5).setScale(0);
      const label = this.add.text(0, OPT_H / 2 - 26, labelled ? cell.label : '', {
        fontFamily: F.head, fontSize: n === 2 ? '20px' : '16px', color: T.sub,
      }).setOrigin(0.5).setAlpha(0);
      const c = this.add.container(cx, OPT_Y, [bg, txt, label]);
      c.setSize(cw, OPT_H).setInteractive({ cursor: 'pointer' });
      const card: OptionCard = { c, bg, txt, label, cx, w: cw, emojiPx, cell, state: 'idle' };
      this.optionCards.push(card);
      this.paintCard(card, 'idle');
      c.setAlpha(0.55);
      c.on('pointerdown', () => this.onOptionTap(card));
    });
  }

  private paintCard(card: OptionCard, state: CardState): void {
    card.state = state;
    const g = card.bg;
    const cw = card.w;
    const x = -cw / 2, y = -OPT_H / 2, r = 28;
    g.clear();
    if (state === 'wrong') {
      g.fillStyle(C.white, 0.45);
      g.fillRoundedRect(x, y, cw, OPT_H, r);
      g.lineStyle(2, C.lavender, 0.3);
      g.strokeRoundedRect(x, y, cw, OPT_H, r);
      return;
    }
    g.fillStyle(C.shadow, 0.16);
    g.fillRoundedRect(x + 2, y + 8, cw, OPT_H, r);
    const fill = state === 'correct' ? C.mintBg : state === 'hint' ? 0xfff8e1 : C.white;
    g.fillStyle(fill, 1);
    g.fillRoundedRect(x, y, cw, OPT_H, r);
    // A soft disc in the item's own colour ties the card to its stones.
    if (this.mode === 'pattern') {
      g.fillStyle(card.cell.bg, state === 'idle' ? 0.75 : 0.55);
      g.fillCircle(0, -14, Math.min(cw, OPT_H) * 0.36);
    }
    if (state === 'correct') g.lineStyle(4, C.mint, 1);
    else if (state === 'hint') g.lineStyle(5, 0xffb300, 1);
    else g.lineStyle(3, C.lavender, 0.85);
    g.strokeRoundedRect(x, y, cw, OPT_H, r);
  }

  // ─── Round setup ──────────────────────────────────────────────────────

  private loadRound(): void {
    this.answered = false;
    this.firstTry = true;
    this.optionsOpen = false;
    this.locked = false;
    this.current = this.mode === 'pattern' ? this.makePatternRound() : this.makeStoryRound();
    this.renderDots();
    this.renderHeader();
    this.buildRow();
    this.buildOptionCards();

    this.prompt.setAlpha(0.5);
    this.promptTxt.setText('What comes next?');
    this.storyTitle.setText(this.current.title ? `“${this.current.title}”` : '');
    this.pickLabel.setAlpha(0);
    this.time.delayedCall(350, () => this.playRow('intro'));
  }

  private makePatternRound(): RoundData {
    const level = PATTERN_LEVELS[this.level - 1];
    const shape = level.shapes[Math.floor(Math.random() * level.shapes.length)];
    const letters = new Set(shape).size;
    let family = this.familyQueue[this.roundIndex % this.familyQueue.length];
    if (family.items.length < letters) family = this.spareThings;

    // Items with clearly different main colours (unless it is a size pattern).
    const want = Math.min(family.items.length, Math.max(letters, level.choices));
    const picked: PatternItem[] = [];
    for (const item of shuffle(family.items)) {
      if (family.sameHue || picked.every(p => p.hue !== item.hue)) picked.push(item);
      if (picked.length === want) break;
    }
    const toCell = (p: PatternItem, idx: number): Cell => ({
      key: `${p.e}|${p.scale ?? 1}`, e: p.e, say: p.say, label: p.label ?? p.say,
      note: idx, scale: p.scale ?? 1, bg: p.bg, sfx: p.sfx,
    });
    const all = picked.map(toCell);
    const total = shape.length * level.units;
    const seq = Array.from({ length: total }, (_, i) => all[shape.charCodeAt(i % shape.length) - 65]);
    return {
      cells: seq.slice(0, total - 1),
      answer: seq[total - 1],
      options: shuffle(all),
      unitLen: shape.length,
    };
  }

  private makeStoryRound(): RoundData {
    const story = this.storyQueue[this.roundIndex];
    const mk = (f: { e: string; say: string; scale?: number }, note: number): Cell => ({
      key: f.e, e: f.e, say: f.say, label: '', note, scale: f.scale ?? 1, bg: C.white,
    });
    const cells = story.frames.map((f, i) => mk(f, i));
    const answer = mk(story.end, 3);
    // Level 1 offers two endings, level 2 three. Wrong ones are other
    // stories' endings, so they are clearly off-topic.
    const others = shuffle(STORIES.filter(s => s !== story))
      .map(s => s.end)
      .filter(e => !story.frames.some(f => f.e === e.e))
      .slice(0, this.level >= 2 ? 2 : 1)
      .map(e => mk(e, 3));
    return { title: story.title, cells, answer, options: shuffle([answer, ...others]), unitLen: 0 };
  }

  // ─── The beat ─────────────────────────────────────────────────────────

  /**
   * Play the row left to right on a steady beat: the chick hops onto each
   * stone, which plays its note and is named aloud, with a short breath
   * after every repeat; then the "?" stone asks the question.
   * 'intro' pops the pictures in as they are named; 'replay' / 'hint'
   * replay the beat over the visible row ('hint' then shows which stone
   * the "?" copies and nudges the right card).
   */
  private playRow(kind: 'intro' | 'replay' | 'hint'): void {
    this.cancelBeat();
    this.idleTimer?.remove();
    this.playing = true;
    const story = this.mode === 'story';
    const L = this.current.unitLen;
    const cells = this.slots.filter(s => !s.isQuestion);
    const q = this.question;
    const at = (i: number): number =>
      story ? i * STORY_BEAT : i * PATTERN_BEAT + Math.floor(i / L) * UNIT_PAUSE;

    if (kind === 'intro') {
      q.txt.setScale(0);
      this.qTween?.stop();
    }
    if (this.chick) {
      this.chick.setPosition(Math.min(-30, cells[0].c.x - 70), this.chickY).setAngle(0);
    }

    cells.forEach((slot, i) => {
      this.beatTimers.push(this.time.delayedCall(at(i), () => {
        if (this.answered) return;
        const land = (): void => {
          if (this.answered) return;
          const cell = slot.cell!;
          this.voice(cell, i > 0, story ? 0.9 : 1.0);
          this.paintSlot(slot, 'lit');
          if (kind === 'intro') {
            this.tweens.add({ targets: slot.txt, scale: cell.scale, duration: 300, ease: 'Back.Out' });
          } else {
            this.tweens.add({
              targets: slot.txt, scale: cell.scale * 1.2,
              duration: 150, yoyo: true, ease: 'Sine.Out',
            });
          }
          this.bounceSlot(slot, story ? 14 : 8);
          this.beatTimers.push(this.time.delayedCall(story ? 1100 : 480, () => {
            if (!this.answered) this.paintSlot(slot, 'idle');
          }));
        };
        if (this.chick) this.hopChick(slot.c.x, HOP_MS, land);
        else land();
      }));
    });

    // The question beat.
    const tq = at(cells.length) + (story ? 0 : HOP_MS);
    this.beatTimers.push(this.time.delayedCall(tq, () => {
      if (this.answered) return;
      askNote();
      say('What comes next?', { queue: true });
      this.tweens.killTweensOf(q.txt);
      q.txt.setScale(0);
      this.tweens.add({
        targets: q.txt, scale: 1, duration: 360, ease: 'Back.Out',
        onComplete: () => this.bobQuestion(),
      });
      this.bounceSlot(q, 16);
      if (this.chick) {
        // The chick wants to hop on, but the stone is empty: it leans over.
        this.tweens.add({
          targets: this.chick, angle: 16, duration: 180, yoyo: true, repeat: 1, ease: 'Sine.InOut',
        });
      }
      this.tweens.add({ targets: this.prompt, alpha: 1, duration: 240 });
      this.tweens.add({ targets: this.prompt, scale: 1.06, duration: 160, yoyo: true });

      if (!this.optionsOpen) this.revealOptions();
    }));

    this.beatTimers.push(this.time.delayedCall(tq + 700, () => {
      this.playing = false;
      if (this.answered) return;
      if (kind === 'hint') this.showHint();
      this.armIdle();
    }));
  }

  private hopChick(toX: number, dur: number, onLand?: () => void, height = 30): void {
    const chick = this.chick;
    if (!chick) { onLand?.(); return; }
    this.chickTween?.stop();
    const fromX = chick.x;
    this.chickTween = this.tweens.addCounter({
      from: 0, to: 1, duration: dur, ease: 'Sine.InOut',
      onUpdate: tw => {
        const t = tw.getValue() ?? 0;
        chick.x = fromX + (toX - fromX) * t;
        chick.y = this.chickY - Math.sin(Math.PI * t) * height;
      },
      onComplete: () => {
        chick.setPosition(toX, this.chickY);
        this.tweens.add({ targets: chick, scaleY: 0.82, scaleX: 1.12, duration: 70, yoyo: true });
        onLand?.();
      },
    });
  }

  private bobQuestion(): void {
    const q = this.question;
    if (!q || this.answered) return;
    this.qTween?.stop();
    q.txt.setScale(1);
    this.qTween = this.tweens.add({
      targets: q.txt, scale: 1.18, yoyo: true, repeat: -1,
      duration: 620, ease: 'Sine.InOut',
    });
  }

  /** The stone dips as if something landed on it, then springs back. */
  private bounceSlot(slot: Slot, dy: number): void {
    this.tweens.killTweensOf(slot.c);
    slot.c.y = this.rowY;
    this.tweens.add({ targets: slot.c, y: this.rowY - dy, duration: 150, yoyo: true, ease: 'Sine.Out' });
  }

  private cancelBeat(): void {
    this.beatTimers.forEach(t => t.remove());
    this.beatTimers = [];
    this.chickTween?.stop();
    if (this.chick) {
      this.tweens.killTweensOf(this.chick);
      this.chick.setScale(1).setAngle(0);
      this.chick.y = this.chickY;
    }
    this.slots.forEach(s => {
      if (s.isQuestion) return;
      this.tweens.killTweensOf([s.c, s.txt]);
      s.c.y = this.rowY;
      // Pictures the intro has not reached yet stay hidden until their beat.
      if (s.txt.scale > 0) s.txt.setScale(s.cell!.scale);
      if (!this.answered) this.paintSlot(s, 'idle');
    });
  }

  /** The answer cards wake up only when the question is asked. */
  private revealOptions(): void {
    this.optionsOpen = true;
    this.optionCards.forEach((card, i) => {
      this.tweens.add({ targets: card.c, alpha: 1, delay: 60 + i * 110, duration: 200 });
      this.tweens.add({
        targets: card.txt, scale: card.cell.scale,
        delay: 120 + i * 110, duration: 320, ease: 'Back.Out',
      });
      this.tweens.add({ targets: card.label, alpha: 1, delay: 220 + i * 110, duration: 260 });
    });
    this.tweens.add({ targets: this.pickLabel, alpha: 1, delay: 500, duration: 300 });
  }

  private replay(): void {
    if (this.answered || this.playing || this.locked) return;
    this.playRow('replay');
  }

  private armIdle(): void {
    this.idleTimer?.remove();
    this.idleTimer = this.time.delayedCall(IDLE_HINT_MS, () => {
      if (this.answered || this.playing || this.locked) return;
      this.playRow('hint');
    });
  }

  /**
   * "It repeats": light up the stone in the previous repeat that the "?"
   * copies, together with the matching card (glow + wiggle).
   */
  private showHint(): void {
    const twin = this.twin;
    if (twin?.cell) {
      this.paintSlot(twin, 'twin');
      this.tweens.add({
        targets: twin.txt, scale: twin.cell.scale * 1.25,
        duration: 260, yoyo: true, repeat: 2, ease: 'Sine.InOut',
      });
      this.voice(twin.cell, true, 1.0, 0.1);
    }
    const card = this.optionCards.find(c => c.cell.key === this.current.answer.key);
    if (!card || card.state !== 'idle' && card.state !== 'hint') return;
    this.paintCard(card, 'hint');
    this.tweens.killTweensOf(card.txt);
    card.txt.setAngle(0);
    this.tweens.add({
      targets: card.txt, angle: { from: -10, to: 10 },
      duration: 140, yoyo: true, repeat: 3, ease: 'Sine.InOut',
      onComplete: () => card.txt.setAngle(0),
    });
    this.tweens.add({ targets: card.c, scale: 1.06, duration: 260, yoyo: true, repeat: 1 });
  }

  // ─── Tap handling ─────────────────────────────────────────────────────

  private onOptionTap(card: OptionCard): void {
    if (this.answered || this.locked || !this.optionsOpen) return;
    if (card.state === 'wrong' || card.state === 'correct') return;
    if (card.cell.key === this.current.answer.key) this.handleCorrect(card);
    else this.handleWrong(card);
  }

  private makeFlyer(card: OptionCard): Phaser.GameObjects.Text {
    return this.add.text(card.cx, OPT_Y + card.txt.y, card.cell.e, {
      fontFamily: F.body, fontSize: `${card.emojiPx}px`, padding: { top: 8, bottom: 8 },
    }).setOrigin(0.5).setDepth(20).setScale(card.cell.scale);
  }

  /**
   * Gentle "not this one": the picture floats up to the "?" stone, shakes
   * its head and drifts back to its (now faded) card. Then the row plays
   * again and shows which stone to copy.
   */
  private handleWrong(card: OptionCard): void {
    this.firstTry = false;
    this.cancelBeat();
    this.playing = false;
    this.locked = true;
    this.idleTimer?.remove();
    softNo();
    say(this.mode === 'pattern' && !card.cell.sfx
      ? `${card.cell.say}? Hmm, not this time. Listen!`
      : 'Hmm, not that one. Listen!');
    this.paintCard(card, 'wrong');
    card.c.disableInteractive();
    this.tweens.add({ targets: card.label, alpha: 0.4, duration: 300 });

    const q = this.question;
    const flyer = this.makeFlyer(card);
    const small = (q.emojiPx / card.emojiPx) * card.cell.scale;
    card.txt.setAlpha(0);
    this.tweens.chain({
      targets: flyer,
      tweens: [
        { x: q.c.x, y: this.rowY - q.h / 2 - 30, scale: small, duration: 380, ease: 'Cubic.Out' },
        { angle: { from: -14, to: 14 }, duration: 110, yoyo: true, repeat: 2, ease: 'Sine.InOut' },
        { x: card.cx, y: OPT_Y + card.txt.y, scale: card.cell.scale, angle: 0, alpha: 0.4, duration: 380, ease: 'Cubic.In' },
      ],
      onComplete: () => {
        flyer.destroy();
        card.txt.setAlpha(0.4);
      },
    });

    this.beatTimers.push(this.time.delayedCall(this.mode === 'pattern' ? 2100 : 1800, () => {
      this.locked = false;
      if (!this.answered) this.playRow('hint');
    }));
  }

  private handleCorrect(card: OptionCard): void {
    this.answered = true;
    this.cancelBeat();
    this.idleTimer?.remove();
    this.qTween?.stop();
    hush();
    if (this.firstTry) this.score++;
    this.scoreTxt.setText(`⭐ ${this.score}/${TOTAL_ROUNDS}`);
    this.slots.forEach(s => { if (!s.isQuestion) this.paintSlot(s, 'idle'); });

    this.optionCards.forEach(c => {
      c.c.disableInteractive();
      if (c === card) this.paintCard(c, 'correct');
      else this.tweens.add({ targets: c.c, alpha: 0.35, duration: 240 });
    });
    this.tweens.add({ targets: this.pickLabel, alpha: 0, duration: 200 });

    // The picture flies from the card onto the "?" stone.
    const q = this.question;
    const answer = this.current.answer;
    const flyer = this.makeFlyer(card);
    card.txt.setAlpha(0.25);
    this.tweens.add({ targets: q.txt, scale: 0, duration: 160, ease: 'Sine.In' });
    this.tweens.add({
      targets: flyer, x: q.c.x, y: this.rowY, scale: (q.emojiPx / card.emojiPx) * answer.scale,
      duration: 520, ease: 'Cubic.InOut',
      onComplete: () => {
        flyer.destroy();
        q.txt.setText(answer.e).setFontFamily(F.body).setColor(T.main).setFontSize(q.emojiPx);
        q.cell = answer;
        this.paintSlot(q, 'reveal');
        this.tweens.add({ targets: q.txt, scale: { from: answer.scale * 1.5, to: answer.scale }, duration: 380, ease: 'Back.Out' });
        this.bounceSlot(q, 20);
        sounds.correct();
        card.txt.setAlpha(1);
        this.promptTxt.setText(this.mode === 'pattern' ? 'Yes! You got it! 🎉' : 'Yay! 🎉');
        this.tweens.add({ targets: this.prompt, scale: 1.08, duration: 180, yoyo: true });
        this.sparkleBurst(q.c.x, this.rowY);
        const praise = ['Yes!', 'Yay!', 'Well done!', 'You got it!'][this.roundIndex % 4];
        if (this.mode === 'story') say(answer.say);
        else if (answer.sfx) { say(praise); this.time.delayedCall(500, () => playSfx(answer.sfx!)); }
        else say(`${praise} ${answer.say}!`);
        // Now the path is whole, the chick can finally hop onto the last stone.
        this.time.delayedCall(420, () => this.hopChick(q.c.x, 300, () => boing(), 44));
        this.time.delayedCall(this.mode === 'pattern' ? 1300 : 1700, () => this.celebrateRow());
      },
    });
  }

  /**
   * The finished row "sings" once more, quickly: every stone bounces in
   * turn, repeat by repeat, and then the chick hops happily away.
   */
  private celebrateRow(): void {
    const quick = this.mode === 'pattern' ? 250 : 340;
    const L = this.current.unitLen || 1;
    const at = (i: number): number => i * quick + (this.mode === 'pattern' ? Math.floor(i / L) * 120 : 0);
    this.slots.forEach((s, i) => {
      this.time.delayedCall(at(i), () => {
        if (s.cell?.sfx) playSfx(s.cell.sfx);
        else beatNote(s.cell?.note ?? 0, 0.11);
        this.paintSlot(s, 'reveal');
        this.bounceSlot(s, 18);
        const base = s.cell?.scale ?? 1;
        this.tweens.add({ targets: s.txt, scale: base * 1.2, duration: 130, yoyo: true });
      });
    });
    const waveEnd = at(this.slots.length);
    if (this.chick) {
      this.time.delayedCall(waveEnd + 100, () => {
        const x0 = this.chick!.x;
        this.hopChick(x0 + 46, 240, () => this.hopChick(W + 50, 320, undefined, 40), 36);
      });
    }
    this.time.delayedCall(waveEnd + 950, () => this.nextRound());
  }

  private sparkleBurst(cx: number, cy: number): void {
    const sparkles = ['✨', '⭐', '🌟', '💖'];
    for (let i = 0; i < 8; i++) {
      const s = this.add.text(cx, cy, sparkles[i % sparkles.length], {
        fontFamily: F.body, fontSize: '24px',
      }).setOrigin(0.5).setDepth(15);
      const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 62 + Math.random() * 30;
      this.tweens.add({
        targets: s,
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        alpha: 0,
        scale: { from: 0.5, to: 1.4 },
        duration: 760, ease: 'Cubic.Out',
        onComplete: () => s.destroy(),
      });
    }
  }

  // ─── Flow ─────────────────────────────────────────────────────────────

  /**
   * Keep her in the sweet spot: two first-try answers in a row step up a
   * level, a round that needed more than one tap steps down. The level is
   * remembered for next time (pattern mode).
   */
  private adapt(): void {
    const max = this.mode === 'pattern' ? PATTERN_LEVELS.length : 2;
    const before = this.level;
    if (this.firstTry) {
      this.streak++;
      if (this.streak >= 2 && this.level < max) { this.level++; this.streak = 0; }
    } else {
      this.streak = 0;
      if (this.level > 1) this.level--;
    }
    if (this.mode === 'pattern' && this.level !== before) {
      saveLevel(this.level);
      if (this.level > before && this.roundIndex < TOTAL_ROUNDS - 1) this.levelUpToast();
    }
  }

  private levelUpToast(): void {
    const t = this.add.text(this.headerTxt.x + this.headerTxt.width + 10, HEADER_Y, '⬆️', {
      fontFamily: F.body, fontSize: '20px',
    }).setOrigin(0, 0.5).setAlpha(0);
    this.tweens.add({
      targets: t, alpha: 1, y: HEADER_Y - 4, duration: 300, yoyo: true, hold: 1600,
      onComplete: () => t.destroy(),
    });
    this.tweens.add({ targets: this.headerTxt, scale: 1.12, duration: 180, yoyo: true, delay: 100 });
  }

  private nextRound(): void {
    this.adapt();
    this.roundIndex++;
    if (this.roundIndex >= TOTAL_ROUNDS) {
      this.endGame();
      return;
    }
    this.loadRound();
  }

  private endGame(): void {
    this.renderDots();
    this.renderHeader();
    sounds.end();
    launchConfetti(this, CONFETTI_EMOJIS);
    say('You did it, Aya!');
    const stars = this.score >= 5 ? 3 : this.score >= 3 ? 2 : 1;
    const label = this.mode === 'pattern' ? 'First-Try Patterns' : 'First-Try Stories';
    const pattern = this.mode === 'pattern';
    this.endOverlay.show({
      emoji: this.score === TOTAL_ROUNDS ? '🏆' : pattern ? '🐥' : '📖',
      title: this.score === TOTAL_ROUNDS ? 'Brilliant!' : this.score >= 3 ? 'Lovely!' : 'Well done!',
      subtitle: pattern ? 'Aya finished every pattern! 💖' : 'Aya finished every story! 💖',
      score: { value: `${this.score}/${TOTAL_ROUNDS}`, label },
      stars: { earned: stars, total: 3 },
    });
  }
}
