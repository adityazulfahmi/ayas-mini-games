import Phaser from 'phaser';
import { drawBg, launchConfetti } from '@shared/phaserUtils';
import { createEndPopup } from '@shared/endPopup';
import { C, T, F } from '@shared/theme';
import { sounds } from '@shared/audio';
import { shuffle } from '@shared/utils';
import {
  CONFETTI_EMOJIS, PATTERN_FAMILIES, PATTERN_LEVELS, STORIES, TOTAL_ROUNDS,
  type GameMode, type PatternFamily, type PatternItem, type Story,
} from '../data';
import { askNote, beatNote, hush, say, softNo } from '../speech';

const W = 420, H = 780;

// ── Layout (logical 420×780) ──────────────────────────────────────────────
const HEADER_Y = 36;
const DOTS_Y = 76;

// The "row" panel: a soft white card that holds the sequence + the prompt.
const PANEL_X = 8, PANEL_Y = 100, PANEL_W = W - 16, PANEL_H = 290;
const ROW_Y = 210;
const ROW_INNER_W = PANEL_W - 20;
const PROMPT_Y = 342;
const PROMPT_W = 262, PROMPT_H = 52;

const PICK_LABEL_Y = 440;

// Answer cards — three big, thumb-friendly targets.
const OPT_Y = 578;
const OPT_W = 124;
const OPT_H = 176;
const OPT_GAP = 12;
const OPT_EMOJI_PX = 80;

// Beat timing (ms of game time).
const PATTERN_BEAT = 720;
const STORY_BEAT = 1750;
const IDLE_HINT_MS = 9000;

/** One picture in the row or on an answer card. */
interface Cell {
  e: string;
  say: string;
  note: number;
  scale?: number;
}

interface RoundData {
  title?: string;
  cells: Cell[];
  answer: Cell;
  options: Cell[];
}

interface Slot {
  c: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  txt: Phaser.GameObjects.Text;
  w: number;
  h: number;
  isQuestion: boolean;
  cell?: Cell;
  baseScale: number;
  emojiPx: number;
}

type CardState = 'idle' | 'hint' | 'correct' | 'wrong';
interface OptionCard {
  c: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  txt: Phaser.GameObjects.Text;
  label: Phaser.GameObjects.Text;
  cx: number;
  cell: Cell;
  state: CardState;
}


interface SceneInit { mode?: GameMode }

export class GameScene extends Phaser.Scene {
  private mode: GameMode = 'pattern';

  private roundIndex = 0;
  private score = 0;
  private firstTry = true;
  private answered = false;
  private playing = false;
  private current!: RoundData;
  private storyQueue: Story[] = [];
  private familyQueue: PatternFamily[] = [];

  private scoreTxt!: Phaser.GameObjects.Text;
  private progressDots: Phaser.GameObjects.Graphics[] = [];
  private slots: Slot[] = [];
  private rowExtras: Phaser.GameObjects.GameObject[] = [];
  private optionCards: OptionCard[] = [];
  private beatTimers: Phaser.Time.TimerEvent[] = [];
  private idleTimer?: Phaser.Time.TimerEvent;
  private qTween?: Phaser.Tweens.Tween;
  private prompt!: Phaser.GameObjects.Container;
  private promptTxt!: Phaser.GameObjects.Text;
  private pickLabel!: Phaser.GameObjects.Text;
  private storyTitle!: Phaser.GameObjects.Text;

  private endOverlay!: ReturnType<typeof createEndPopup>;

  constructor() { super('GameScene'); }

  init(data: SceneInit): void {
    this.mode = data?.mode ?? 'pattern';
  }

  create(): void {
    drawBg(this);

    // D-005: Phaser reuses scene instances, so reset every pushed-into field.
    this.roundIndex = 0;
    this.score = 0;
    this.progressDots = [];
    this.slots = [];
    this.rowExtras = [];
    this.optionCards = [];
    this.beatTimers = [];
    this.idleTimer = undefined;
    this.qTween = undefined;
    this.playing = false;
    this.answered = false;
    // D-006: shuffle once per game so a playthrough never repeats.
    this.storyQueue = shuffle(STORIES).slice(0, TOTAL_ROUNDS);
    this.familyQueue = shuffle(PATTERN_FAMILIES);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => hush());

    this.buildHeader();
    this.buildPanel();
    this.buildOptionCards();

    this.endOverlay = createEndPopup(this, W, H, {
      onPlayAgain: () => this.scene.restart({ mode: this.mode }),
      onHome:      () => this.scene.start('TitleScene'),
      onAllGames:  () => { window.location.href = '../'; },
    });

    this.loadRound();
  }

  // ─── Header ────────────────────────────────────────────────────────────

  private buildHeader(): void {
    const label = this.mode === 'pattern' ? '🎨 Pattern' : '📖 Story';
    this.add.text(22, HEADER_Y, label, {
      fontFamily: F.head, fontSize: '19px', color: T.main,
    }).setOrigin(0, 0.5);

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

    // Tapping anywhere on the row replays it ("say it again!").
    const rowZone = this.add.zone(W / 2, ROW_Y, PANEL_W, 170).setInteractive({ cursor: 'pointer' });
    rowZone.on('pointerdown', () => this.replay());

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
    this.prompt.setSize(PROMPT_W, PROMPT_H).setInteractive({ cursor: 'pointer' });
    this.prompt.on('pointerdown', () => this.replay());

    // Story mode: the story's name sits at the top of the panel (for Papa).
    this.storyTitle = this.add.text(W / 2, PANEL_Y + 24, '', {
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

    const n = this.current.cells.length + 1;
    const story = this.mode === 'story';
    const gap = story ? 20 : n >= 6 ? 7 : 10;
    const w = Math.min(story ? 82 : 76, (ROW_INNER_W - gap * (n - 1)) / n);
    const h = story ? 116 : Math.min(118, w * 1.6);
    const startX = W / 2 - (w * n + gap * (n - 1)) / 2 + w / 2;
    const emojiPx = Math.round(Math.min(story ? 54 : 50, w * 0.74));

    for (let i = 0; i < n; i++) {
      const cx = startX + i * (w + gap);
      const isQuestion = i === n - 1;
      const cell = isQuestion ? undefined : this.current.cells[i];
      const bg = this.add.graphics();
      const txt = this.add.text(0, 0, isQuestion ? '?' : cell!.e, {
        fontFamily: isQuestion ? F.head : F.body,
        fontSize: isQuestion ? `${Math.round(emojiPx * 1.05)}px` : `${emojiPx}px`,
        color: isQuestion ? '#f06292' : T.main,
        padding: { top: 6, bottom: 6 },
      }).setOrigin(0.5);
      const c = this.add.container(cx, ROW_Y, [bg, txt]);
      const slot: Slot = { c, bg, txt, w, h, isQuestion, cell, baseScale: cell?.scale ?? 1, emojiPx };
      this.paintSlot(slot, isQuestion ? 'question' : 'idle');
      txt.setScale(0);
      this.slots.push(slot);

      // Story frames read as a little comic strip: arrows between frames.
      if (story && i < n - 1) {
        const ar = this.add.text(cx + w / 2 + gap / 2, ROW_Y, '›', {
          fontFamily: F.head, fontSize: '26px', color: T.sub,
        }).setOrigin(0.5).setAlpha(0.55);
        this.rowExtras.push(ar);
      }
    }
  }

  private paintSlot(slot: Slot, state: 'idle' | 'lit' | 'question' | 'reveal'): void {
    const { bg, w, h } = slot;
    const r = Math.min(18, w * 0.28);
    bg.clear();
    bg.fillStyle(C.shadow, 0.12);
    bg.fillRoundedRect(-w / 2 + 1, -h / 2 + 5, w, h, r);
    if (state === 'question') {
      bg.fillStyle(0xfff0f6, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, r);
      bg.lineStyle(3.5, C.pink, 0.9);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    } else if (state === 'reveal') {
      bg.fillStyle(C.mintBg, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, r);
      bg.lineStyle(3.5, C.mint, 1);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    } else if (state === 'lit') {
      bg.fillStyle(0xfff8e1, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, r);
      bg.lineStyle(3, 0xffca28, 0.9);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    } else {
      bg.fillStyle(C.white, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, r);
      bg.lineStyle(2, C.lavender, 0.45);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    }
  }

  // ─── Option cards ─────────────────────────────────────────────────────

  private buildOptionCards(): void {
    const total = OPT_W * 3 + OPT_GAP * 2;
    const startX = W / 2 - total / 2 + OPT_W / 2;
    for (let i = 0; i < 3; i++) {
      const cx = startX + i * (OPT_W + OPT_GAP);
      const bg = this.add.graphics();
      const txt = this.add.text(0, -12, '', {
        fontFamily: F.body, fontSize: `${OPT_EMOJI_PX}px`, padding: { top: 8, bottom: 8 },
      }).setOrigin(0.5);
      const label = this.add.text(0, OPT_H / 2 - 24, '', {
        fontFamily: F.body, fontSize: '14px', color: T.sub, fontStyle: 'bold',
      }).setOrigin(0.5);
      const c = this.add.container(cx, OPT_Y, [bg, txt, label]);
      c.setSize(OPT_W, OPT_H).setInteractive({ cursor: 'pointer' });
      const card: OptionCard = { c, bg, txt, label, cx, cell: { e: '', say: '', note: 0 }, state: 'idle' };
      this.optionCards.push(card);
      this.paintCard(card, 'idle');
      c.on('pointerdown', () => this.onOptionTap(card));
    }
  }

  private paintCard(card: OptionCard, state: CardState): void {
    card.state = state;
    const g = card.bg;
    const x = -OPT_W / 2, y = -OPT_H / 2, r = 26;
    g.clear();
    if (state === 'wrong') {
      g.fillStyle(C.white, 0.45);
      g.fillRoundedRect(x, y, OPT_W, OPT_H, r);
      g.lineStyle(2, C.lavender, 0.3);
      g.strokeRoundedRect(x, y, OPT_W, OPT_H, r);
      return;
    }
    g.fillStyle(C.shadow, 0.16);
    g.fillRoundedRect(x + 2, y + 8, OPT_W, OPT_H, r);
    if (state === 'correct') {
      g.fillStyle(C.mintBg, 1);
      g.fillRoundedRect(x, y, OPT_W, OPT_H, r);
      g.lineStyle(4, C.mint, 1);
      g.strokeRoundedRect(x, y, OPT_W, OPT_H, r);
    } else if (state === 'hint') {
      g.fillStyle(0xfff8e1, 1);
      g.fillRoundedRect(x, y, OPT_W, OPT_H, r);
      g.lineStyle(4, 0xffca28, 1);
      g.strokeRoundedRect(x, y, OPT_W, OPT_H, r);
    } else {
      g.fillStyle(C.white, 1);
      g.fillRoundedRect(x, y, OPT_W, OPT_H, r);
      g.lineStyle(3, C.lavender, 0.85);
      g.strokeRoundedRect(x, y, OPT_W, OPT_H, r);
    }
  }

  // ─── Round setup ──────────────────────────────────────────────────────

  private loadRound(): void {
    this.answered = false;
    this.firstTry = true;
    this.current = this.mode === 'pattern' ? this.makePatternRound() : this.makeStoryRound();
    this.renderDots();
    this.buildRow();

    this.optionCards.forEach((card, i) => {
      this.tweens.killTweensOf([card.c, card.txt]);
      card.cell = this.current.options[i];
      card.txt.setText(card.cell.e).setScale(0).setAlpha(1).setAngle(0);
      card.label.setText(this.mode === 'pattern' ? card.cell.say : '').setAlpha(0);
      card.txt.y = this.mode === 'pattern' ? -12 : 0;
      card.c.setPosition(card.cx, OPT_Y).setAlpha(1).setScale(1);
      this.paintCard(card, 'idle');
      card.c.setInteractive({ cursor: 'pointer' });
    });

    this.prompt.setAlpha(0.5);
    this.promptTxt.setText('What comes next?');
    this.storyTitle.setText(this.current.title ? `“${this.current.title}”` : '');
    this.pickLabel.setAlpha(0);
    this.time.delayedCall(350, () => this.playRow('intro'));
  }

  private makePatternRound(): RoundData {
    const level = PATTERN_LEVELS[this.roundIndex] ?? PATTERN_LEVELS[PATTERN_LEVELS.length - 1];
    const family = this.familyQueue[this.roundIndex % this.familyQueue.length];
    // Three items with clearly different main colours.
    const picked: PatternItem[] = [];
    for (const it of shuffle(family.items)) {
      if (picked.every(p => p.tint !== it.tint)) picked.push(it);
      if (picked.length === 3) break;
    }
    const cellFor = (letter: string): Cell => {
      const idx = letter.charCodeAt(0) - 65;
      return { e: picked[idx].e, say: picked[idx].name, note: idx };
    };
    const cells = Array.from({ length: level.shown }, (_, i) => cellFor(level.shape[i % level.shape.length]));
    const answer = cellFor(level.shape[level.shown % level.shape.length]);
    const options = shuffle(picked.map((p, idx) => ({ e: p.e, say: p.name, note: idx })));
    return { cells, answer, options };
  }

  private makeStoryRound(): RoundData {
    const story = this.storyQueue[this.roundIndex];
    const cells: Cell[] = story.frames.map((f, i) => ({ e: f.e, say: f.say, note: i, scale: f.scale }));
    const answer: Cell = { e: story.end.e, say: story.end.say, note: 3 };
    const others = shuffle(STORIES.filter(s => s !== story))
      .map(s => s.end)
      .filter(e => !story.frames.some(f => f.e === e.e))
      .slice(0, 2)
      .map(e => ({ e: e.e, say: e.say, note: 3 }));
    return { title: story.title, cells, answer, options: shuffle([answer, ...others]) };
  }

  // ─── The beat ─────────────────────────────────────────────────────────

  /**
   * Play the row left to right on a steady beat: each picture hops, plays
   * its own note and is named aloud, then the "?" slot asks the question.
   * 'intro' pops the pictures in as they are named; 'replay' / 'hint'
   * replay the beat over the visible row ('hint' then nudges the answer).
   */
  private playRow(kind: 'intro' | 'replay' | 'hint'): void {
    this.cancelBeat();
    this.idleTimer?.remove();
    this.playing = true;
    const story = this.mode === 'story';
    const beat = story ? STORY_BEAT : PATTERN_BEAT;
    const cells = this.slots.filter(s => !s.isQuestion);
    const q = this.slots[this.slots.length - 1];

    if (kind === 'intro') {
      q.txt.setScale(0);
      this.qTween?.stop();
    }

    cells.forEach((slot, i) => {
      this.beatTimers.push(this.time.delayedCall(i * beat, () => {
        if (this.answered) return;
        const cell = slot.cell!;
        beatNote(cell.note);
        say(cell.say, { queue: i > 0, rate: story ? 0.9 : 1.0 });
        this.paintSlot(slot, 'lit');
        if (kind === 'intro') {
          this.tweens.add({ targets: slot.txt, scale: slot.baseScale, duration: 320, ease: 'Back.Out' });
        } else {
          this.tweens.add({
            targets: slot.txt, scale: slot.baseScale * 1.22,
            duration: 150, yoyo: true, ease: 'Sine.Out',
          });
        }
        this.hop(slot.c, 16);
        this.time.delayedCall(Math.min(beat - 80, story ? 1100 : 560), () => {
          if (!this.answered) this.paintSlot(slot, 'idle');
        });
      }));
    });

    // The question beat.
    this.beatTimers.push(this.time.delayedCall(cells.length * beat, () => {
      if (this.answered) return;
      askNote();
      say('What comes next?', { queue: true });
      this.tweens.killTweensOf(q.txt);
      q.txt.setScale(0);
      this.tweens.add({
        targets: q.txt, scale: 1, duration: 360, ease: 'Back.Out',
        onComplete: () => this.bobQuestion(),
      });
      this.hop(q.c, 22);
      this.tweens.add({ targets: this.prompt, alpha: 1, duration: 240 });
      this.tweens.add({ targets: this.prompt, scale: 1.06, duration: 160, yoyo: true });

      if (kind === 'intro') this.revealOptions();
    }));

    this.beatTimers.push(this.time.delayedCall(cells.length * beat + 700, () => {
      this.playing = false;
      if (this.answered) return;
      if (kind === 'hint') this.nudgeAnswer();
      this.armIdle();
    }));
  }

  private bobQuestion(): void {
    const q = this.slots[this.slots.length - 1];
    if (!q || this.answered) return;
    this.qTween?.stop();
    q.txt.setScale(1);
    this.qTween = this.tweens.add({
      targets: q.txt, scale: 1.18, yoyo: true, repeat: -1,
      duration: 620, ease: 'Sine.InOut',
    });
  }

  private hop(target: Phaser.GameObjects.Container, dy: number): void {
    this.tweens.killTweensOf(target);
    target.y = ROW_Y;
    this.tweens.add({ targets: target, y: ROW_Y - dy, duration: 150, yoyo: true, ease: 'Sine.Out' });
  }

  private cancelBeat(): void {
    this.beatTimers.forEach(t => t.remove());
    this.beatTimers = [];
    this.slots.forEach(s => {
      if (!s.isQuestion) {
        this.tweens.killTweensOf([s.c, s.txt]);
        s.c.y = ROW_Y;
        if (s.txt.scale !== 0 || s.cell) s.txt.setScale(s.baseScale);
        if (!this.answered) this.paintSlot(s, 'idle');
      }
    });
  }

  private revealOptions(): void {
    this.optionCards.forEach((card, i) => {
      this.tweens.add({
        targets: card.txt, scale: 1,
        delay: 120 + i * 110, duration: 320, ease: 'Back.Out',
      });
      this.tweens.add({ targets: card.label, alpha: 1, delay: 220 + i * 110, duration: 260 });
    });
    this.tweens.add({ targets: this.pickLabel, alpha: 1, delay: 500, duration: 300 });
  }

  /** Show all option pictures right away (if she taps before the beat ends). */
  private ensureOptionsVisible(): void {
    this.optionCards.forEach(card => {
      if (card.txt.scale < 1 && card.state !== 'correct') {
        this.tweens.killTweensOf(card.txt);
        card.txt.setScale(1);
      }
      card.label.setAlpha(card.state === 'wrong' ? 0.4 : 1);
    });
    this.pickLabel.setAlpha(1);
    const q = this.slots[this.slots.length - 1];
    if (q.txt.scale === 0) this.bobQuestion();
    this.slots.forEach(s => { if (!s.isQuestion && s.txt.scale === 0) s.txt.setScale(s.baseScale); });
  }

  private replay(): void {
    if (this.answered || this.playing) return;
    this.playRow('replay');
  }

  private armIdle(): void {
    this.idleTimer?.remove();
    this.idleTimer = this.time.delayedCall(IDLE_HINT_MS, () => {
      if (this.answered || this.playing) return;
      this.playRow('hint');
    });
  }

  /** Gently point at the right answer: glow + wiggle. */
  private nudgeAnswer(): void {
    const card = this.optionCards.find(c => c.cell.e === this.current.answer.e);
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
    if (this.answered || card.state === 'wrong' || card.state === 'correct') return;
    this.ensureOptionsVisible();
    if (card.cell.e === this.current.answer.e) this.handleCorrect(card);
    else this.handleWrong(card);
  }

  private handleWrong(card: OptionCard): void {
    this.firstTry = false;
    this.cancelBeat();
    this.playing = false;
    this.idleTimer?.remove();
    softNo();
    say(this.mode === 'pattern' ? `${card.cell.say}? Hmm, not this time. Listen!` : 'Hmm, not that one. Listen!');
    this.paintCard(card, 'wrong');
    card.c.disableInteractive();
    this.tweens.add({
      targets: card.c, x: card.cx + 7,
      duration: 70, yoyo: true, repeat: 2, ease: 'Sine.InOut',
      onComplete: () => { card.c.x = card.cx; },
    });
    this.tweens.add({ targets: [card.txt, card.label], alpha: 0.4, duration: 300 });

    // Then play the row again and point at the answer.
    this.beatTimers.push(this.time.delayedCall(this.mode === 'pattern' ? 2200 : 1800, () => {
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

    this.optionCards.forEach(c => {
      c.c.disableInteractive();
      if (c === card) this.paintCard(c, 'correct');
      else this.tweens.add({ targets: c.c, alpha: 0.35, duration: 240 });
    });
    this.tweens.add({ targets: this.pickLabel, alpha: 0, duration: 200 });

    // The picture flies from the card into the "?" slot.
    const q = this.slots[this.slots.length - 1];
    const emojiPx = q.emojiPx;
    const flyer = this.add.text(card.cx, OPT_Y + card.txt.y, card.cell.e, {
      fontFamily: F.body, fontSize: `${OPT_EMOJI_PX}px`, padding: { top: 8, bottom: 8 },
    }).setOrigin(0.5).setDepth(20);
    card.txt.setAlpha(0.25);
    this.tweens.add({ targets: q.txt, scale: 0, duration: 160, ease: 'Sine.In' });
    this.tweens.add({
      targets: flyer, x: q.c.x, y: ROW_Y, scale: emojiPx / OPT_EMOJI_PX,
      duration: 520, ease: 'Cubic.InOut',
      onComplete: () => {
        flyer.destroy();
        q.txt.setText(this.current.answer.e).setFontFamily(F.body).setColor(T.main).setFontSize(emojiPx);
        q.cell = this.current.answer;
        this.paintSlot(q, 'reveal');
        this.tweens.add({ targets: q.txt, scale: { from: 1.5, to: 1 }, duration: 380, ease: 'Back.Out' });
        this.hop(q.c, 24);
        sounds.correct();
        card.txt.setAlpha(1);
        this.promptTxt.setText(this.mode === 'pattern' ? 'Yes! You got it! 🎉' : 'Yay! 🎉');
        this.tweens.add({ targets: this.prompt, scale: 1.08, duration: 180, yoyo: true });
        this.sparkleBurst(q.c.x, ROW_Y);
        const praise = ['Yes!', 'Yay!', 'Well done!', 'You got it!'][this.roundIndex % 4];
        say(this.mode === 'pattern' ? `${praise} ${this.current.answer.say}!` : this.current.answer.say);
        this.time.delayedCall(this.mode === 'pattern' ? 1100 : 1700, () => this.celebrateRow());
      },
    });
  }

  /** The finished row "sings" once more, quickly, every slot hopping in turn. */
  private celebrateRow(): void {
    const quick = this.mode === 'pattern' ? 260 : 340;
    this.slots.forEach((s, i) => {
      this.time.delayedCall(i * quick, () => {
        beatNote(s.cell?.note ?? 0, 0.11);
        this.paintSlot(s, 'reveal');
        this.hop(s.c, 20);
        const base = s.baseScale;
        this.tweens.add({ targets: s.txt, scale: base * 1.2, duration: 130, yoyo: true });
      });
    });
    const done = this.slots.length * quick + 900;
    this.time.delayedCall(done, () => this.nextRound());
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

  private nextRound(): void {
    this.roundIndex++;
    if (this.roundIndex >= TOTAL_ROUNDS) {
      this.endGame();
      return;
    }
    this.loadRound();
  }

  private endGame(): void {
    this.renderDots();
    sounds.end();
    launchConfetti(this, CONFETTI_EMOJIS);
    say('You did it, Aya!');
    const stars = this.score >= 5 ? 3 : this.score >= 3 ? 2 : 1;
    const label = this.mode === 'pattern' ? 'First-Try Patterns' : 'First-Try Stories';
    const pattern = this.mode === 'pattern';
    this.endOverlay.show({
      emoji: this.score === TOTAL_ROUNDS ? '🏆' : pattern ? '🎶' : '📖',
      title: this.score === TOTAL_ROUNDS ? 'Brilliant!' : this.score >= 3 ? 'Lovely!' : 'Well done!',
      subtitle: pattern ? 'Aya finished every pattern! 💖' : 'Aya finished every story! 💖',
      score: { value: `${this.score}/${TOTAL_ROUNDS}`, label },
      stars: { earned: stars, total: 3 },
    });
  }
}
