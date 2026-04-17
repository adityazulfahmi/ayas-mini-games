import Phaser from 'phaser';
import { drawBg, launchConfetti } from '@shared/phaserUtils';
import { createEndPopup } from '@shared/endPopup';
import { C, T, F, GAME_DURATION } from '@shared/theme';
import { sounds } from '@shared/audio';
import { shuffle, randomOtherIdx } from '@shared/utils';
import { CATEGORIES, CONFETTI_EMOJIS, type Difficulty } from '../data';

const W = 420, H = 780;
const TIERS = { gold: 60, silver: 40, bronze: 20 };

// Grid layout per difficulty
const LAYOUT = {
  easy: { rows: 2, cols: 2, cell: 164, gap: 14, emoji: '64px', top: 300 },
  hard: { rows: 3, cols: 3, cell: 106, gap: 10, emoji: '44px', top: 300 },
} as const;

interface Cell {
  bg: Phaser.GameObjects.Graphics;
  txt: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
  emoji: string;
}

export class GameScene extends Phaser.Scene {
  private difficulty: Difficulty = 'easy';
  private score = 0;
  private streak = 0;
  private timeLeft = GAME_DURATION;
  private answering = false;
  private lastGroupIdx = -1;
  private correctEmoji = '';

  private scoreTxt!: Phaser.GameObjects.Text;
  private timerTxt!: Phaser.GameObjects.Text;
  private progressFill!: Phaser.GameObjects.Graphics;
  private streakTxt!: Phaser.GameObjects.Text;
  private hintTxt?: Phaser.GameObjects.Text;
  private hintBg?: Phaser.GameObjects.Graphics;
  private cells: Cell[] = [];
  private endOverlay!: ReturnType<typeof createEndPopup>;
  private timerEvent!: Phaser.Time.TimerEvent;

  constructor() { super('GameScene'); }

  init(data: { difficulty?: Difficulty }): void {
    this.difficulty = data?.difficulty ?? 'easy';
  }

  create(): void {
    drawBg(this);
    this.score = 0;
    this.streak = 0;
    this.timeLeft = GAME_DURATION;
    this.answering = false;
    this.lastGroupIdx = -1;

    this.buildHeader();
    this.buildHint();
    this.buildStreakLine();
    this.buildGrid();
    this.buildEndOverlay();

    this.timerEvent = this.time.addEvent({
      delay: 1000, callback: this.tick, callbackScope: this,
      repeat: GAME_DURATION - 1,
    });

    this.nextQuestion();
  }

  // ─── Header ─────────────────────────────────────────────────────────────

  private buildHeader(): void {
    const modeDot = this.difficulty === 'hard' ? '🔥' : '🌱';
    this.add.text(24, 34, `🤔 Odd One Out ${modeDot}`, {
      fontFamily: F.head, fontSize: '18px', color: T.main,
    }).setOrigin(0, 0.5);

    this.pill(W - 178, 34, 88, 34);
    this.scoreTxt = this.add.text(W - 178, 34, '⭐ 0', {
      fontFamily: F.head, fontSize: '16px', color: T.main,
    }).setOrigin(0.5);

    this.pill(W - 74, 34, 100, 34);
    this.timerTxt = this.add.text(W - 74, 34, `⏱ ${GAME_DURATION}s`, {
      fontFamily: F.head, fontSize: '16px', color: T.main,
    }).setOrigin(0.5);

    const track = this.add.graphics();
    track.fillStyle(0xce93d8, 0.25);
    track.fillRoundedRect(24, 62, W - 48, 6, 3);
    this.progressFill = this.add.graphics();
    this.drawProgress(1);
  }

  private pill(cx: number, cy: number, w: number, h: number): void {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
    g.lineStyle(1.5, C.lavender, 0.35);
    g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
  }

  private drawProgress(ratio: number): void {
    this.progressFill.clear();
    this.progressFill.fillStyle(C.pink, 1);
    this.progressFill.fillRoundedRect(24, 62, Math.max(0, (W - 48) * ratio), 6, 3);
  }

  // ─── Hint card (easy mode only) ────────────────────────────────────────

  private buildHint(): void {
    if (this.difficulty === 'hard') {
      // Hard mode: single centred question, no category hint
      this.add.text(W / 2, 150, "Spot the odd one out! 🔍", {
        fontFamily: F.head, fontSize: '22px', color: T.main,
      }).setOrigin(0.5);
      this.add.text(W / 2, 186, "Which one doesn't fit with the rest?", {
        fontFamily: F.body, fontSize: '13px', color: T.sub, fontStyle: 'bold',
      }).setOrigin(0.5);
      return;
    }

    const cardX = 24, cardY = 90, cardW = W - 48, cardH = 170;
    this.hintBg = this.add.graphics();
    this.hintBg.fillStyle(C.white, 1);
    this.hintBg.fillRoundedRect(cardX, cardY, cardW, cardH, 22);

    this.add.text(W / 2, cardY + 30, 'LOOK FOR THE THEME', {
      fontFamily: F.body, fontSize: '11px', color: T.sub,
      fontStyle: 'bold', letterSpacing: 1.5,
    }).setOrigin(0.5);

    this.hintTxt = this.add.text(W / 2, cardY + 70, '', {
      fontFamily: F.head, fontSize: '22px', color: T.main,
    }).setOrigin(0.5);

    // Mnemonic row (static emojis) rebuilt every question via setText
    this.mnemonicTxt = this.add.text(W / 2, cardY + 112, '', {
      fontFamily: F.body, fontSize: '32px',
    }).setOrigin(0.5);

    this.add.text(W / 2, cardY + 150, '… one of them is sneaking in!', {
      fontFamily: F.body, fontSize: '12px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);
  }
  private mnemonicTxt?: Phaser.GameObjects.Text;

  // ─── Streak line ───────────────────────────────────────────────────────

  private buildStreakLine(): void {
    const y = this.difficulty === 'hard' ? 218 : 278;
    this.streakTxt = this.add.text(W / 2, y, '', {
      fontFamily: F.head, fontSize: '14px', color: T.sub,
    }).setOrigin(0.5);
  }

  // ─── Grid ──────────────────────────────────────────────────────────────

  private buildGrid(): void {
    const layout = LAYOUT[this.difficulty];
    const gridW = layout.cols * layout.cell + (layout.cols - 1) * layout.gap;
    const startX = W / 2 - gridW / 2 + layout.cell / 2;
    const startY = layout.top + layout.cell / 2;
    const total = layout.rows * layout.cols;

    this.cells = Array.from({ length: total }, (_, i) => {
      const col = i % layout.cols;
      const row = Math.floor(i / layout.cols);
      const cx = startX + col * (layout.cell + layout.gap);
      const cy = startY + row * (layout.cell + layout.gap);

      const bg = this.add.graphics().setPosition(cx, cy);
      this.drawCellBg(bg, 'idle', layout.cell);

      const txt = this.add.text(cx, cy, '', { fontSize: layout.emoji }).setOrigin(0.5);

      const zone = this.add.zone(cx, cy, layout.cell, layout.cell).setInteractive({ cursor: 'pointer' });
      zone.on('pointerdown', () => this.onAnswer(i));
      zone.on('pointerover', () => {
        if (!this.answering) this.drawCellBg(bg, 'hover', layout.cell);
      });
      zone.on('pointerout', () => {
        if (!this.answering) this.drawCellBg(bg, 'idle', layout.cell);
      });

      return { bg, txt, zone, emoji: '' };
    });
  }

  private drawCellBg(
    g: Phaser.GameObjects.Graphics,
    state: 'idle' | 'hover' | 'correct' | 'wrong',
    size: number,
  ): void {
    g.clear();
    const radius = size >= 140 ? 20 : 14;
    switch (state) {
      case 'idle':
        g.fillStyle(C.white, 1);
        g.lineStyle(3, 0xce93d8, 0.35);
        break;
      case 'hover':
        g.fillStyle(0xfff0f7, 1);
        g.lineStyle(3, C.pink, 0.85);
        break;
      case 'correct':
        g.fillStyle(C.mintBg, 1);
        g.lineStyle(3.5, C.mint, 1);
        break;
      case 'wrong':
        g.fillStyle(0xffebee, 1);
        g.lineStyle(3.5, 0xef5350, 1);
        break;
    }
    g.fillRoundedRect(-size / 2, -size / 2, size, size, radius);
    g.strokeRoundedRect(-size / 2, -size / 2, size, size, radius);
  }

  /**
   * Return a category that has at least `minSize` unique emojis. Walks the
   * list from `startIdx` onward so we don't silently duplicate emojis inside
   * a single round when hard mode needs 8 picks from a short category.
   */
  private pickCategoryWithSize(startIdx: number, minSize: number) {
    for (let i = 0; i < CATEGORIES.length; i++) {
      const idx = (startIdx + i) % CATEGORIES.length;
      if (CATEGORIES[idx].emojis.length >= minSize) {
        this.lastGroupIdx = idx;
        return CATEGORIES[idx];
      }
    }
    return CATEGORIES[startIdx]; // fallback — shouldn't happen in practice
  }

  // ─── Round logic ───────────────────────────────────────────────────────

  private nextQuestion(): void {
    this.answering = false;
    const layout = LAYOUT[this.difficulty];
    const total = layout.rows * layout.cols;

    // Pick a category, avoiding immediate repeat
    let groupIdx: number;
    do { groupIdx = Math.floor(Math.random() * CATEGORIES.length); }
    while (groupIdx === this.lastGroupIdx);
    this.lastGroupIdx = groupIdx;

    const sameCount = total - 1;
    const group = this.pickCategoryWithSize(groupIdx, sameCount);
    const sames = shuffle([...group.emojis]).slice(0, sameCount);

    const oddIdx = randomOtherIdx(groupIdx, CATEGORIES.length);
    const oddGroup = CATEGORIES[oddIdx];
    const odd = oddGroup.emojis[Math.floor(Math.random() * oddGroup.emojis.length)];

    this.correctEmoji = odd;
    const ordered = shuffle([...sames, odd]);

    this.cells.forEach((c, i) => {
      c.emoji = ordered[i];
      c.txt.setText(ordered[i]).setScale(1);
      this.drawCellBg(c.bg, 'idle', layout.cell);
      c.zone.setInteractive({ cursor: 'pointer' });
    });

    // Easy-mode hint
    if (this.difficulty === 'easy') {
      this.hintTxt?.setText(group.prompt);
      this.mnemonicTxt?.setText(group.mnemonic);
    }
  }

  private onAnswer(idx: number): void {
    if (this.answering) return;
    this.answering = true;
    const layout = LAYOUT[this.difficulty];

    const cell = this.cells[idx];
    const isCorrect = cell.emoji === this.correctEmoji;
    this.cells.forEach(c => c.zone.disableInteractive());

    if (isCorrect) {
      this.drawCellBg(cell.bg, 'correct', layout.cell);
      this.tweens.add({
        targets: cell.bg, scale: { from: 1, to: 1.07 },
        yoyo: true, duration: 180, ease: 'Sine.InOut',
      });
      this.streak++;
      this.score += this.streak >= 3 ? 15 : 10;
      this.scoreTxt.setText(`⭐ ${this.score}`);

      if (this.streak >= 3) {
        sounds.streak();
        this.streakTxt.setText(`🔥 ${this.streak} in a row!  +15`).setColor('#f06292');
      } else if (this.streak === 2) {
        sounds.correct();
        this.streakTxt.setText('✨ One more for a streak!').setColor(T.sub);
      } else {
        sounds.correct();
        this.streakTxt.setText('').setColor(T.sub);
      }

      this.time.delayedCall(700, () => this.nextQuestion());
    } else {
      this.drawCellBg(cell.bg, 'wrong', layout.cell);
      this.streak = 0;
      sounds.wrong();
      this.streakTxt.setText('').setColor(T.sub);

      // Highlight the correct cell(s)
      this.cells.forEach(c => {
        if (c.emoji === this.correctEmoji) this.drawCellBg(c.bg, 'correct', layout.cell);
      });
      this.tweens.add({ targets: cell.bg, x: cell.bg.x - 6, yoyo: true, repeat: 3, duration: 55 });

      this.time.delayedCall(1000, () => this.nextQuestion());
    }
  }

  // ─── Timer / end ───────────────────────────────────────────────────────

  private tick(): void {
    this.timeLeft--;
    this.timerTxt.setText(`⏱ ${this.timeLeft}s`);
    if (this.timeLeft <= 10) this.timerTxt.setColor(T.red);
    this.drawProgress(this.timeLeft / GAME_DURATION);
    if (this.timeLeft <= 0) this.endGame();
  }

  private buildEndOverlay(): void {
    this.endOverlay = createEndPopup(this, W, H, {
      onPlayAgain: () => this.scene.restart({ difficulty: this.difficulty }),
      onHome: () => this.scene.start('TitleScene'),
      homeLabel: '🏠 Menu',
    });
  }

  private endGame(): void {
    this.timerEvent.remove();
    this.cells.forEach(c => c.zone.disableInteractive());
    sounds.end();

    const s = this.score;
    let emoji: string, title: string, subtitle: string, stars: number;
    if (s >= TIERS.gold)        { emoji = '🏆'; title = 'Super Spotter!';  subtitle = 'Aya finds every odd one out! 🌈✨'; stars = 3; }
    else if (s >= TIERS.silver) { emoji = '🌟'; title = 'Brilliant, Aya!'; subtitle = "You've got a great eye! 🔍";        stars = 3; }
    else if (s >= TIERS.bronze) { emoji = '🎀'; title = 'Well done, Aya!'; subtitle = 'Great spotting! 💖';                 stars = 2; }
    else                        { emoji = '🌸'; title = 'Nice try, Aya!';  subtitle = "Let's play again! 🌺";               stars = 1; }

    this.endOverlay.show({
      emoji, title, subtitle,
      score: { value: s, label: `Points · ${this.difficulty}` },
      stars: { earned: stars },
    });
    if (s >= TIERS.silver) launchConfetti(this, CONFETTI_EMOJIS);
  }
}
