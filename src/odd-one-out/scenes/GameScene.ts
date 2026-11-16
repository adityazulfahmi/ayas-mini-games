import Phaser from 'phaser';
import { drawBg, launchConfetti } from '@shared/phaserUtils';
import { createEndPopup } from '@shared/endPopup';
import { C, T, F } from '@shared/theme';
import { sounds } from '@shared/audio';
import { shuffle } from '@shared/utils';
import {
  CATEGORIES, CONFETTI_EMOJIS, GRID, ROUNDS, TIMED_SECONDS, oddCandidates, settings,
  type Category, type Difficulty, type Item, type PlayMode,
} from '../data';
import { say, hush, softNope, drawSpeakerBtn } from '../speech';

const W = 420, H = 780;

/** Prompt card that holds the spoken question. */
const CARD = { x: 18, y: 92, w: W - 36, h: 150 };
const SPEAKER = { x: CARD.x + 52, y: CARD.y + CARD.h / 2, r: 30 };
const TEXT_X = CARD.x + 100;
const TEXT_W = CARD.w - 116;

/** Grid cells: big, forgiving targets. */
const LAYOUT = {
  easy: { cell: 184, gap: 14, emoji: 108, top: 266 },
  hard: { cell: 120, gap: 12, emoji: 70, top: 270 },
} as const;
const FOOTER_Y = 706;
const IDLE_HINT_MS = 8000;

type CellState = 'idle' | 'correct' | 'nope';

interface Cell {
  x: number;
  y: number;
  bg: Phaser.GameObjects.Graphics;
  txt: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
  item?: Item;
  odd: boolean;
  tried: boolean;
}

export class GameScene extends Phaser.Scene {
  private difficulty: Difficulty = 'easy';
  private mode: PlayMode = 'relaxed';

  private round = 0;
  private solved = 0;
  private firstTry = 0;
  private missesThisRound = 0;
  private busy = true;
  private over = false;
  private roundToken = 0;
  private timeLeft = TIMED_SECONDS;

  private majorityQueue: Category[] = [];
  private majority!: Category;
  private oddCat!: Category;
  private oddItem!: Item;
  private lastOddId = '';

  private cells: Cell[] = [];
  private dots: Phaser.GameObjects.Graphics[] = [];
  private starTxt!: Phaser.GameObjects.Text;
  private timerTxt?: Phaser.GameObjects.Text;
  private timerBar?: Phaser.GameObjects.Graphics;
  private headTxt!: Phaser.GameObjects.Text;
  private questionTxt!: Phaser.GameObjects.Text;
  private speaker!: Phaser.GameObjects.Container;
  private footer!: Phaser.GameObjects.Text;
  private hand?: Phaser.GameObjects.Text;
  private idleTimer?: Phaser.Time.TimerEvent;
  private clock?: Phaser.Time.TimerEvent;
  private endOverlay!: ReturnType<typeof createEndPopup>;

  constructor() { super('GameScene'); }

  init(data: { difficulty?: Difficulty; mode?: PlayMode }): void {
    this.difficulty = data?.difficulty ?? settings.difficulty;
    this.mode = data?.mode ?? settings.mode;
  }

  create(): void {
    drawBg(this);
    // D-005: scene instances are reused, so reset everything here.
    this.cells = [];
    this.dots = [];
    this.round = 0;
    this.solved = 0;
    this.firstTry = 0;
    this.busy = true;
    this.over = false;
    this.roundToken = 0;
    this.lastOddId = '';
    this.timeLeft = TIMED_SECONDS;
    this.hand = undefined;
    this.timerTxt = undefined;
    this.timerBar = undefined;
    this.clock = undefined;

    const sameCount = GRID[this.difficulty].cols * GRID[this.difficulty].rows - 1;
    this.majorityQueue = this.buildMajorityQueue(sameCount);

    this.buildHeader();
    this.buildPromptCard();
    this.buildGrid();
    this.footer = this.add.text(W / 2, FOOTER_Y, '', {
      fontFamily: F.body, fontSize: '15px', color: T.sub, fontStyle: 'bold', align: 'center',
      wordWrap: { width: W - 60 },
    }).setOrigin(0.5).setAlpha(0.9);

    this.endOverlay = createEndPopup(this, W, H, {
      onPlayAgain: () => this.scene.restart({ difficulty: this.difficulty, mode: this.mode }),
      onHome:      () => this.scene.start('TitleScene'),
      onAllGames:  () => { window.location.href = '../'; },
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => hush());

    if (this.mode === 'timed') {
      this.clock = this.time.addEvent({ delay: 1000, loop: true, callback: this.tick, callbackScope: this });
    }
    this.time.delayedCall(250, () => this.startRound());
  }

  // ─── Round planning ────────────────────────────────────────────────────

  /**
   * D-006: shuffle the majority groups up front so a game cycles through
   * different groups instead of repeating one. Long enough for a fast
   * timed run too; never the same group twice in a row.
   */
  private buildMajorityQueue(sameCount: number): Category[] {
    const pool = CATEGORIES.filter(c => c.items.length >= sameCount);
    const queue: Category[] = [];
    while (queue.length < 40) {
      let batch = shuffle(pool);
      if (queue.length && batch[0] === queue[queue.length - 1]) batch = [...batch.slice(1), batch[0]];
      queue.push(...batch);
    }
    return queue;
  }

  // ─── Header ────────────────────────────────────────────────────────────

  private buildHeader(): void {
    this.add.text(20, 34, '🤔 Odd One Out', { fontFamily: F.head, fontSize: '18px', color: T.main }).setOrigin(0, 0.5);

    if (this.mode === 'timed') {
      this.pill(W - 160, 34, 76);
      this.starTxt = this.add.text(W - 160, 34, '', { fontFamily: F.head, fontSize: '16px', color: T.main }).setOrigin(0.5);
      this.pill(W - 66, 34, 92);
      this.timerTxt = this.add.text(W - 66, 34, `⏱ ${TIMED_SECONDS}s`, { fontFamily: F.head, fontSize: '16px', color: T.main }).setOrigin(0.5);
      const track = this.add.graphics();
      track.fillStyle(C.lavender, 0.25);
      track.fillRoundedRect(20, 66, W - 40, 8, 4);
      this.timerBar = this.add.graphics();
      this.drawTimerBar();
    } else {
      this.pill(W - 62, 34, 92);
      this.starTxt = this.add.text(W - 62, 34, '', { fontFamily: F.head, fontSize: '16px', color: T.main }).setOrigin(0.5);
      const gap = 24;
      const startX = W / 2 - ((ROUNDS - 1) * gap) / 2;
      this.dots = Array.from({ length: ROUNDS }, (_, i) => this.add.graphics().setPosition(startX + i * gap, 70));
      this.renderDots();
    }
    this.updateStars();
  }

  private pill(cx: number, cy: number, w: number): void {
    const h = 34;
    const g = this.add.graphics();
    g.fillStyle(C.white, 1);
    g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
    g.lineStyle(1.5, C.lavender, 0.4);
    g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
  }

  private updateStars(): void {
    this.starTxt.setText(`⭐ ${this.mode === 'timed' ? this.solved : this.firstTry}`);
  }

  private renderDots(): void {
    this.dots.forEach((g, i) => {
      g.clear();
      if (i < this.round) { g.fillStyle(C.pink, 1); g.fillCircle(0, 0, 6); }
      else if (i === this.round) { g.fillStyle(C.pink, 0.22); g.fillCircle(0, 0, 11); g.fillStyle(C.pink, 1); g.fillCircle(0, 0, 6); }
      else { g.fillStyle(0xe1bee7, 1); g.fillCircle(0, 0, 6); }
    });
  }

  private drawTimerBar(): void {
    if (!this.timerBar) return;
    const ratio = Math.max(0, this.timeLeft / TIMED_SECONDS);
    this.timerBar.clear();
    this.timerBar.fillStyle(this.timeLeft <= 10 ? 0xffb74d : C.pink, 1);
    if (ratio > 0) this.timerBar.fillRoundedRect(20, 66, Math.max(8, (W - 40) * ratio), 8, 4);
  }

  // ─── Prompt card ───────────────────────────────────────────────────────

  private buildPromptCard(): void {
    const g = this.add.graphics();
    g.fillStyle(C.shadow, 0.1);
    g.fillRoundedRect(CARD.x + 3, CARD.y + 7, CARD.w, CARD.h, 26);
    g.fillStyle(C.white, 1);
    g.fillRoundedRect(CARD.x, CARD.y, CARD.w, CARD.h, 26);
    g.lineStyle(2, C.lavender, 0.45);
    g.strokeRoundedRect(CARD.x, CARD.y, CARD.w, CARD.h, 26);

    const sg = this.add.graphics();
    drawSpeakerBtn(sg, SPEAKER.r);
    this.speaker = this.add.container(SPEAKER.x, SPEAKER.y, [sg]);
    this.speaker.setSize(SPEAKER.r * 2 + 24, SPEAKER.r * 2 + 24).setInteractive({ cursor: 'pointer' });
    this.speaker.on('pointerdown', () => {
      this.tweens.add({ targets: this.speaker, scale: { from: 0.88, to: 1 }, duration: 220, ease: 'Back.Out' });
      if (!this.busy) { say(this.spokenQuestion()); this.armIdleHint(); }
    });

    this.headTxt = this.add.text(TEXT_X, CARD.y + 42, '', {
      fontFamily: F.body, fontSize: '15px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.questionTxt = this.add.text(TEXT_X, CARD.y + 94, '', {
      fontFamily: F.head, fontSize: '25px', color: T.main,
      wordWrap: { width: TEXT_W }, lineSpacing: 2,
    }).setOrigin(0, 0.5);
  }

  private spokenQuestion(): string {
    return this.difficulty === 'easy' ? this.majority.question : "Which one doesn't belong?";
  }

  private setPrompt(head: string, question: string, color: string = T.main): void {
    this.headTxt.setText(head);
    this.questionTxt.setText(question).setColor(color);
    // Shrink long sentences so they always fit two lines inside the card.
    for (const size of [25, 23, 21, 19]) {
      this.questionTxt.setFontSize(size);
      if (this.questionTxt.height <= 72) break;
    }
  }

  // ─── Grid ──────────────────────────────────────────────────────────────

  private buildGrid(): void {
    const { cols, rows } = GRID[this.difficulty];
    const L = LAYOUT[this.difficulty];
    const gridW = cols * L.cell + (cols - 1) * L.gap;
    const startX = W / 2 - gridW / 2 + L.cell / 2;
    const startY = L.top + L.cell / 2;

    for (let i = 0; i < cols * rows; i++) {
      const x = startX + (i % cols) * (L.cell + L.gap);
      const y = startY + Math.floor(i / cols) * (L.cell + L.gap);
      const bg = this.add.graphics().setPosition(x, y);
      const txt = this.add.text(x, y + 2, '', {
        fontFamily: F.body, fontSize: `${L.emoji}px`, padding: { x: 6, y: 10 },
      }).setOrigin(0.5);
      // Hit zone covers the gutter too: toddler taps land near edges.
      const zone = this.add.zone(x, y, L.cell + L.gap, L.cell + L.gap).setInteractive({ cursor: 'pointer' });
      const cell: Cell = { x, y, bg, txt, zone, odd: false, tried: false };
      zone.on('pointerdown', () => this.onTap(cell));
      this.drawCell(cell, 'idle');
      this.cells.push(cell);
    }
  }

  private drawCell(cell: Cell, state: CellState): void {
    const s = LAYOUT[this.difficulty].cell;
    const r = s >= 150 ? 30 : 22;
    const g = cell.bg;
    g.clear();
    g.fillStyle(C.shadow, state === 'nope' ? 0.05 : 0.12);
    g.fillRoundedRect(-s / 2 + 2, -s / 2 + 6, s, s, r);
    if (state === 'correct') {
      g.fillStyle(C.mintBg, 1);
      g.fillRoundedRect(-s / 2, -s / 2, s, s, r);
      g.lineStyle(5, C.mint, 1);
    } else if (state === 'nope') {
      g.fillStyle(0xf6f0fa, 1);
      g.fillRoundedRect(-s / 2, -s / 2, s, s, r);
      g.lineStyle(2, C.lavender, 0.3);
    } else {
      g.fillStyle(C.white, 1);
      g.fillRoundedRect(-s / 2, -s / 2, s, s, r);
      g.lineStyle(3, C.lavender, 0.45);
    }
    g.strokeRoundedRect(-s / 2, -s / 2, s, s, r);
  }

  // ─── Round flow ────────────────────────────────────────────────────────

  private startRound(): void {
    if (this.over) return;
    const token = ++this.roundToken;
    this.busy = true;
    this.missesThisRound = 0;
    this.hideHand();
    this.renderDots();

    const { cols, rows } = GRID[this.difficulty];
    const total = cols * rows;
    this.majority = this.majorityQueue[this.round % this.majorityQueue.length];
    let cands = oddCandidates(this.majority, this.difficulty);
    const fresh = cands.filter(c => c.id !== this.lastOddId);
    if (fresh.length) cands = fresh;
    this.oddCat = cands[Math.floor(Math.random() * cands.length)];
    this.lastOddId = this.oddCat.id;
    this.oddItem = this.oddCat.items[Math.floor(Math.random() * this.oddCat.items.length)];

    const sames = shuffle(this.majority.items).slice(0, total - 1);
    const items = shuffle([...sames, this.oddItem]);

    this.cells.forEach((cell, i) => {
      this.tweens.killTweensOf([cell.bg, cell.txt]);
      cell.item = items[i];
      cell.odd = items[i] === this.oddItem;
      cell.tried = false;
      this.drawCell(cell, 'idle');
      cell.bg.setScale(1);
      cell.txt.setText(items[i].emoji).setPosition(cell.x, cell.y + 2).setAlpha(1).setAngle(0).setScale(0);
      this.tweens.add({ targets: cell.txt, scale: 1, duration: 340, delay: 60 * i, ease: 'Back.Out' });
    });

    if (this.difficulty === 'easy') {
      this.setPrompt(`Three are ${this.majority.plural}`, this.majority.question);
      this.footer.setText('Tap the one that is different 👆');
    } else {
      this.setPrompt('Eight go together…', "Which one doesn't belong?");
      this.footer.setText('Look closely! One is not like the others 🔍');
    }
    this.tweens.add({ targets: this.questionTxt, scale: { from: 0.9, to: 1 }, duration: 260, ease: 'Back.Out' });

    say(this.spokenQuestion());
    this.time.delayedCall(60 * total + 200, () => {
      if (token !== this.roundToken || this.over) return;
      this.busy = false;
      this.armIdleHint();
    });
  }

  private onTap(cell: Cell): void {
    if (this.busy || this.over || cell.tried || !cell.item) return;
    if (cell.odd) this.onCorrect(cell);
    else this.onNope(cell);
  }

  private onCorrect(cell: Cell): void {
    this.busy = true;
    this.idleTimer?.remove();
    this.hideHand();
    const token = this.roundToken;
    const clean = this.missesThisRound === 0;
    this.solved++;
    if (clean) this.firstTry++;
    this.updateStars();

    this.drawCell(cell, 'correct');
    this.tweens.killTweensOf(cell.txt);
    cell.txt.setScale(1).setAngle(0);
    this.tweens.add({ targets: cell.txt, scale: { from: 1, to: 1.22 }, yoyo: true, duration: 220, ease: 'Sine.Out' });
    this.tweens.add({ targets: cell.bg, scale: { from: 1, to: 1.05 }, yoyo: true, duration: 220, ease: 'Sine.Out' });
    this.sparkles(cell.x, cell.y);
    this.ring(cell.x, cell.y);
    // The ones that belong together do a little happy hop.
    this.cells.filter(c => !c.odd).forEach((c, i) => {
      this.tweens.add({ targets: c.txt, alpha: 1, duration: 200 });
      this.tweens.add({ targets: c.txt, y: c.y - 8, yoyo: true, duration: 180, delay: 80 + i * 40, ease: 'Sine.Out' });
    });
    if (this.solved % 3 === 0) sounds.streak(); else sounds.correct();

    const answer = this.oddCat.about(this.oddItem.name);
    this.setPrompt(
      this.difficulty === 'easy' ? 'Yes! You found it! 🎉' : `The others are ${this.majority.plural}`,
      answer, T.mint,
    );
    this.footer.setText('');

    const isLast = this.mode === 'relaxed' && this.round + 1 >= ROUNDS;
    const minWait = this.mode === 'timed' ? 900 : 1800;
    let spoken = false, waited = false;
    const advance = () => {
      if (!spoken || !waited || token !== this.roundToken || this.over) return;
      this.roundToken++;
      this.round++;
      if (isLast) this.endGame(); else this.startRound();
    };
    say(`Yes! ${answer}`, () => { spoken = true; this.time.delayedCall(250, advance); });
    this.time.delayedCall(minWait, () => { waited = true; advance(); });
    // Safety net in case speech never reports that it ended.
    this.time.delayedCall(minWait + 4000, () => { spoken = true; advance(); });
  }

  private onNope(cell: Cell): void {
    cell.tried = true;
    this.missesThisRound++;
    softNope();
    this.drawCell(cell, 'nope');
    this.tweens.add({
      targets: cell.txt, angle: { from: -9, to: 9 }, yoyo: true, repeat: 1, duration: 110,
      onComplete: () => { cell.txt.setAngle(0); this.tweens.add({ targets: cell.txt, alpha: 0.45, duration: 250 }); },
    });
    const name = cell.item!.name;
    say(`That's the ${name}. ${this.majority.about(name)} Try another one.`);
    this.footer.setText(`${this.majority.about(name)} Try another 💕`);
    if (this.missesThisRound >= 2) this.showHand();
    else this.armIdleHint();
  }

  // ─── Hints & effects ───────────────────────────────────────────────────

  private armIdleHint(): void {
    this.idleTimer?.remove();
    this.idleTimer = this.time.delayedCall(IDLE_HINT_MS, () => this.showHand());
  }

  /** A little hand bobs next to the odd one, after a pause or two misses. */
  private showHand(): void {
    if (this.busy || this.over || this.hand) return;
    const target = this.cells.find(c => c.odd);
    if (!target) return;
    const off = LAYOUT[this.difficulty].cell * 0.36;
    this.hand = this.add.text(target.x + off, target.y + off + 10, '👆', { fontFamily: F.body, fontSize: '46px' })
      .setOrigin(0.5).setDepth(20);
    this.tweens.add({ targets: this.hand, y: target.y + off - 6, yoyo: true, repeat: -1, duration: 420, ease: 'Sine.InOut' });
    this.tweens.add({ targets: target.txt, scale: { from: 1, to: 1.12 }, yoyo: true, repeat: 2, duration: 300, ease: 'Sine.InOut' });
  }

  private hideHand(): void {
    this.hand?.destroy();
    this.hand = undefined;
  }

  private ring(x: number, y: number): void {
    const g = this.add.graphics().setDepth(5);
    const base = LAYOUT[this.difficulty].cell / 2;
    const s = { r: base * 0.7, a: 0.8 };
    this.tweens.add({
      targets: s, r: base * 1.35, a: 0, duration: 600, ease: 'Sine.Out',
      onUpdate: () => { g.clear(); g.lineStyle(5, C.mint, s.a); g.strokeCircle(x, y, s.r); },
      onComplete: () => g.destroy(),
    });
  }

  private sparkles(x: number, y: number): void {
    const emojis = ['✨', '⭐', '🌟', '💖'];
    for (let i = 0; i < 7; i++) {
      const a = (Math.PI * 2 * i) / 7 + Math.random() * 0.4;
      const d = LAYOUT[this.difficulty].cell * 0.55 + Math.random() * 24;
      const e = this.add.text(x, y, emojis[i % emojis.length], { fontFamily: F.body, fontSize: '24px' }).setOrigin(0.5).setDepth(15);
      this.tweens.add({ targets: e, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, duration: 700, ease: 'Sine.Out',
        onComplete: () => e.destroy() });
    }
  }

  // ─── Timer / end ───────────────────────────────────────────────────────

  private tick(): void {
    if (this.over) return;
    this.timeLeft--;
    this.timerTxt?.setText(`⏱ ${Math.max(0, this.timeLeft)}s`);
    this.drawTimerBar();
    if (this.timeLeft <= 0) this.endGame();
  }

  private endGame(): void {
    if (this.over) return;
    this.over = true;
    this.busy = true;
    this.clock?.remove();
    this.idleTimer?.remove();
    this.hideHand();
    this.renderDots();
    this.cells.forEach(c => c.zone.disableInteractive());
    sounds.end();

    let stars: number, scoreValue: string, scoreLabel: string, subtitle: string;
    if (this.mode === 'timed') {
      const n = this.solved;
      const [three, two] = this.difficulty === 'easy' ? [6, 3] : [5, 2];
      stars = n >= three ? 3 : n >= two ? 2 : 1;
      scoreValue = `${n}`;
      scoreLabel = `Found in ${TIMED_SECONDS}s · ${this.difficulty}`;
      subtitle = n === 1 ? 'You found 1 odd one out! 💖' : `You found ${n} odd ones out! 💖`;
      say(n > 0 ? `Time's up! You found ${n}!` : "Time's up! Let's play again!");
    } else {
      const ratio = this.firstTry / ROUNDS;
      stars = ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1;
      scoreValue = `${this.firstTry}/${ROUNDS}`;
      scoreLabel = `First-try finds · ${this.difficulty}`;
      subtitle = 'You found every odd one out! 💖';
      say('You did it, Aya! Super spotting!');
    }
    const title = stars === 3 ? 'Super Spotter!' : stars === 2 ? 'Great spotting!' : 'Well done, Aya!';
    this.endOverlay.show({
      emoji: stars === 3 ? '🏆' : '🌟', title, subtitle,
      score: { value: scoreValue, label: scoreLabel },
      stars: { earned: stars, total: 3 },
    });
    if (this.mode === 'relaxed' || stars >= 2) launchConfetti(this, CONFETTI_EMOJIS);
  }
}
