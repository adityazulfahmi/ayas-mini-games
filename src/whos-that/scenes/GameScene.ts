import Phaser from 'phaser';
import { drawBg } from '@shared/phaserUtils';
import { C, T, F } from '@shared/theme';
import { sounds } from '@shared/audio';
import { shuffle } from '@shared/utils';
import {
  ANIMALS, CHARACTERS, MODE,
  type Animal, type Character, type Difficulty, type GameMode,
} from '../data';

const W = 420, H = 800;

const CARD    = { x: 20, y: 90, w: W - 40, h: 380, r: 28 };
const SILH    = { y: CARD.y + 172, w: 180, h: 230 };
const BAR     = { x: CARD.x + 30, y: CARD.y + CARD.h - 42, w: CARD.w - 60, h: 12 };
const STREAK_Y = CARD.y + CARD.h + 20;

interface OptionBtn {
  bg: Phaser.GameObjects.Graphics;
  txt: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
  y: number;
  key: string;
}

interface RoundItem {
  /** Unique id used to match the chosen option against the correct answer. */
  key: string;
  /** Label shown on option buttons — name for bing mode, emoji for animal mode. */
  label: string;
}

type ModeConfig = (typeof MODE)[Difficulty];

export class GameScene extends Phaser.Scene {
  private difficulty: Difficulty = 'easy';
  private gameMode: GameMode = 'bing';
  private mode: ModeConfig = MODE.easy;

  private roundItems: RoundItem[] = [];
  private questionIndex = 0;
  private score = 0;
  private streak = 0;
  private answered = false;

  private scoreTxt!: Phaser.GameObjects.Text;
  private roundTxt!: Phaser.GameObjects.Text;
  private silhouetteImg!: Phaser.GameObjects.Image;
  private silhouetteEmoji!: Phaser.GameObjects.Text;
  private countdownBar!: Phaser.GameObjects.Graphics;
  private countdownTween?: Phaser.Tweens.Tween;
  private countdownTimer?: Phaser.Time.TimerEvent;
  private progressDots: Phaser.GameObjects.Graphics[] = [];
  private streakTxt!: Phaser.GameObjects.Text;
  private optionBtns: OptionBtn[] = [];

  constructor() { super('GameScene'); }

  init(data: { difficulty?: Difficulty; gameMode?: GameMode }): void {
    this.difficulty = data?.difficulty ?? 'easy';
    this.gameMode = data?.gameMode ?? 'bing';
    this.mode = MODE[this.difficulty];
  }

  preload(): void {
    // Character PNGs are preloaded by TitleScene on first boot, but if the
    // player comes here directly from ResultScene (Play Again) we re-request
    // them. Phaser's Loader is a no-op for keys already in the TextureManager
    // cache, so this is free — it just guarantees the textures are ready
    // before create() runs and keeps the flow self-contained.
    CHARACTERS.forEach(c => this.load.image(c.key, c.url));
  }

  create(): void {
    drawBg(this);
    this.score = 0;
    this.streak = 0;
    this.questionIndex = 0;

    // Build the round list from whichever pool matches the chosen mode.
    const pool: RoundItem[] = this.gameMode === 'bing'
      ? CHARACTERS.map((c: Character) => ({ key: c.key, label: c.name }))
      : ANIMALS.map((a: Animal) => ({ key: a.name, label: a.emoji }));
    this.roundItems = shuffle(pool).slice(0, this.mode.rounds);

    // Phaser reuses the scene instance across scene.start(). Class-field
    // array initialisers only run in the constructor, so we must clear the
    // arrays that are push()-populated in buildXxx() — otherwise destroyed
    // game objects from the previous run stay in the array and blow up the
    // next loadQuestion's setText().
    this.optionBtns = [];
    this.progressDots = [];

    this.buildHeader();
    this.buildCard();
    this.buildStreakLine();
    this.buildOptions();

    this.loadQuestion();
  }

  private get allItems(): RoundItem[] {
    return this.gameMode === 'bing'
      ? CHARACTERS.map(c => ({ key: c.key, label: c.name }))
      : ANIMALS.map(a => ({ key: a.name, label: a.emoji }));
  }

  // ─── Header ─────────────────────────────────────────────────────────────

  private buildHeader(): void {
    const modeDot = this.difficulty === 'hard' ? '🔥' : '🌱';
    const titleIcon = this.gameMode === 'animal' ? '🐾' : '🐰';
    this.add.text(24, 34, `${titleIcon} Who's That? ${modeDot}`, {
      fontFamily: F.head, fontSize: '18px', color: T.main,
    }).setOrigin(0, 0.5);

    // Score pill
    this.pill(W - 72, 34, 96, 34);
    this.scoreTxt = this.add.text(W - 72, 34, `⭐ 0/${this.mode.rounds}`, {
      fontFamily: F.head, fontSize: '16px', color: T.main,
    }).setOrigin(0.5);

    // Progress dots (center-aligned under the title row)
    const n = this.mode.rounds;
    const dotGap = 16;
    const totalW = n * 12 + (n - 1) * dotGap;
    const startX = W / 2 - totalW / 2 + 6;
    this.progressDots = Array.from({ length: n }, (_, i) =>
      this.add.graphics().setPosition(startX + i * (12 + dotGap), 62),
    );
  }

  private pill(cx: number, cy: number, w: number, h: number): void {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
    g.lineStyle(1.5, C.lavender, 0.35);
    g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
  }

  private renderDots(): void {
    this.progressDots.forEach((g, i) => {
      g.clear();
      if (i < this.questionIndex) {
        g.fillStyle(C.pink, 1);
        g.fillCircle(0, 0, 6);
      } else if (i === this.questionIndex) {
        g.fillStyle(C.lavender, 0.35);
        g.fillCircle(0, 0, 11);
        g.fillStyle(C.lavender, 1);
        g.fillCircle(0, 0, 6);
      } else {
        g.fillStyle(0xe1bee7, 1);
        g.fillCircle(0, 0, 6);
      }
    });
  }

  // ─── Silhouette card ───────────────────────────────────────────────────

  private buildCard(): void {
    const g = this.add.graphics();
    g.fillStyle(C.white, 1);
    g.fillRoundedRect(CARD.x, CARD.y, CARD.w, CARD.h, CARD.r);

    // Round label lives on the card, so add it after the card graphic
    this.roundTxt = this.add.text(W / 2, CARD.y + 28, '', {
      fontFamily: F.body, fontSize: '13px', color: T.sub,
      fontStyle: 'bold', letterSpacing: 1.5,
    }).setOrigin(0.5);

    // Both silhouette renderers exist simultaneously; we only show the one
    // matching the current mode. This keeps loadQuestion() simple — no
    // create/destroy on every round.
    this.silhouetteImg = this.add.image(W / 2, SILH.y, CHARACTERS[0].key).setDisplaySize(SILH.w, SILH.h);
    this.silhouetteEmoji = this.add.text(W / 2, SILH.y, '', {
      fontFamily: F.body, fontSize: '180px',
    }).setOrigin(0.5);
    this.silhouetteImg.setVisible(this.gameMode === 'bing');
    this.silhouetteEmoji.setVisible(this.gameMode === 'animal');

    // Countdown track + fill
    this.add.graphics()
      .fillStyle(0xf3e5f5, 1)
      .fillRoundedRect(BAR.x, BAR.y, BAR.w, BAR.h, BAR.h / 2);
    this.countdownBar = this.add.graphics();
    this.drawCountdown(1);
  }

  private drawCountdown(ratio: number): void {
    this.countdownBar.clear();
    const w = Math.max(0, BAR.w * ratio);
    if (w <= 0) return;
    const colour = ratio > 0.4 ? C.pink : 0xe53935;
    this.countdownBar.fillStyle(colour, 1);
    this.countdownBar.fillRoundedRect(BAR.x, BAR.y, w, BAR.h, BAR.h / 2);
  }

  // ─── Streak ribbon ─────────────────────────────────────────────────────

  private buildStreakLine(): void {
    this.streakTxt = this.add.text(W / 2, STREAK_Y, '', {
      fontFamily: F.head, fontSize: '14px', color: T.sub,
    }).setOrigin(0.5);
  }

  // ─── Options (stacked buttons, count depends on difficulty) ────────────

  private buildOptions(): void {
    const n = this.mode.optionCount;
    const btnW = 340;
    const btnH = n >= 4 ? 48 : 58;
    const gap  = n >= 4 ? 10 : 12;
    const totalH = n * btnH + (n - 1) * gap;
    const startY = (CARD.y + CARD.h + 60) + btnH / 2;    // below streak line
    // Emoji options render visibly larger than name text; bump the font size
    // only for the animal mode so the glyphs actually dominate the pill.
    const txtSize = this.gameMode === 'animal' ? (btnH >= 56 ? '30px' : '26px')
                                               : (btnH >= 56 ? '20px' : '18px');

    for (let i = 0; i < n; i++) {
      const cx = W / 2;
      const cy = startY + i * (btnH + gap);

      const bg = this.add.graphics().setPosition(cx, cy);
      const txt = this.add.text(cx, cy, '', {
        fontFamily: F.head, fontSize: txtSize, color: T.main,
      }).setOrigin(0.5);

      const zone = this.add.zone(cx, cy, btnW, btnH).setInteractive({ cursor: 'pointer' });
      zone.on('pointerover', () => { if (!this.answered) this.drawOptionBg(bg, btnW, btnH, 'hover'); });
      zone.on('pointerout',  () => { if (!this.answered) this.drawOptionBg(bg, btnW, btnH, 'idle'); });
      zone.on('pointerdown', () => this.onAnswer(i));

      this.drawOptionBg(bg, btnW, btnH, 'idle');
      this.optionBtns.push({ bg, txt, zone, y: cy, key: '' });
      // keep btnW/btnH local references to redraw per-state later
      (bg as unknown as { _w: number; _h: number })._w = btnW;
      (bg as unknown as { _w: number; _h: number })._h = btnH;
    }

    // Ensure the column fits — abort if we'd overflow the canvas
    void totalH;
  }

  private drawOptionBg(
    g: Phaser.GameObjects.Graphics,
    w: number, h: number,
    state: 'idle' | 'hover' | 'correct' | 'wrong',
  ): void {
    g.clear();
    switch (state) {
      case 'idle':
        g.fillStyle(C.white, 1);
        g.lineStyle(2.5, 0xe1bee7, 1);
        break;
      case 'hover':
        g.fillStyle(C.bg1, 1);
        g.lineStyle(2.5, C.pink, 1);
        break;
      case 'correct':
        g.fillStyle(0xe8f5e9, 1);
        g.lineStyle(3, 0x66bb6a, 1);
        break;
      case 'wrong':
        g.fillStyle(0xffebee, 1);
        g.lineStyle(3, 0xef5350, 1);
        break;
    }
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);
  }

  private paintOption(i: number, state: 'idle' | 'hover' | 'correct' | 'wrong'): void {
    const bg = this.optionBtns[i].bg;
    const { _w: w, _h: h } = bg as unknown as { _w: number; _h: number };
    this.drawOptionBg(bg, w, h, state);
  }

  // ─── Round logic ───────────────────────────────────────────────────────

  private loadQuestion(): void {
    this.answered = false;
    this.stopCountdown();

    const item = this.roundItems[this.questionIndex];
    this.roundTxt.setText(`ROUND ${this.questionIndex + 1} OF ${this.mode.rounds}`);
    this.renderDots();

    // Show the mode-appropriate silhouette renderer.
    if (this.gameMode === 'bing') {
      this.silhouetteImg.setTexture(item.key).setDisplaySize(SILH.w, SILH.h);
      this.silhouetteImg.setTintFill(this.mode.tintFill);
    } else {
      this.silhouetteEmoji.setText(item.label);
      this.silhouetteEmoji.setTintFill(this.mode.tintFill);
    }

    // Build options: correct + N-1 distractors pulled from the same pool.
    const wrong = shuffle(this.allItems.filter(c => c.key !== item.key))
      .slice(0, this.mode.optionCount - 1);
    const options = shuffle([item, ...wrong]);

    this.optionBtns.forEach((btn, i) => {
      btn.key = options[i].key;
      btn.txt.setText(options[i].label);
      this.paintOption(i, 'idle');
      btn.zone.setInteractive({ cursor: 'pointer' });
    });

    this.startCountdown(item.key);
  }

  private startCountdown(correctKey: string): void {
    this.drawCountdown(1);
    const state = { ratio: 1 };
    this.countdownTween = this.tweens.add({
      targets: state, ratio: 0, duration: this.mode.roundMs, ease: 'Linear',
      onUpdate: () => this.drawCountdown(state.ratio),
    });
    this.countdownTimer = this.time.delayedCall(this.mode.roundMs, () => this.onTimeout(correctKey));
  }

  private stopCountdown(): void {
    this.countdownTween?.stop();
    this.countdownTimer?.remove();
    this.countdownTween = undefined;
    this.countdownTimer = undefined;
  }

  private onAnswer(idx: number): void {
    if (this.answered) return;
    this.answered = true;
    this.stopCountdown();
    this.disableOptions();

    const chosen = this.optionBtns[idx];
    const correctKey = this.roundItems[this.questionIndex].key;

    // Reveal the answer in full colour
    if (this.gameMode === 'bing') this.silhouetteImg.clearTint();
    else                          this.silhouetteEmoji.clearTint();

    if (chosen.key === correctKey) {
      this.paintOption(idx, 'correct');
      this.tweens.add({ targets: chosen.bg, scaleX: 1.04, scaleY: 1.04, yoyo: true, duration: 170 });
      this.streak++;
      this.score++;
      this.scoreTxt.setText(`⭐ ${this.score}/${this.mode.rounds}`);

      if (this.streak >= 3) {
        sounds.streak();
        this.streakTxt.setText(`🔥 ${this.streak} in a row!`).setColor('#f06292');
      } else if (this.streak === 2) {
        sounds.correct();
        this.streakTxt.setText('✨ One more for a streak!').setColor(T.sub);
      } else {
        sounds.correct();
        this.streakTxt.setText('').setColor(T.sub);
      }
    } else {
      this.paintOption(idx, 'wrong');
      this.tweens.add({ targets: chosen.bg, x: chosen.bg.x - 5, yoyo: true, repeat: 3, duration: 55 });
      this.highlightCorrect(correctKey);
      this.streak = 0;
      this.streakTxt.setText('').setColor(T.sub);
      sounds.wrong();
    }

    this.time.delayedCall(950, () => this.nextQuestion());
  }

  private onTimeout(correctKey: string): void {
    if (this.answered) return;
    this.answered = true;
    this.disableOptions();
    if (this.gameMode === 'bing') this.silhouetteImg.clearTint();
    else                          this.silhouetteEmoji.clearTint();
    this.highlightCorrect(correctKey);
    this.streak = 0;
    this.streakTxt.setText("⏰ Time's up!").setColor(T.sub);
    sounds.timeout();
    this.time.delayedCall(950, () => this.nextQuestion());
  }

  private highlightCorrect(correctKey: string): void {
    this.optionBtns.forEach((btn, i) => {
      if (btn.key === correctKey) this.paintOption(i, 'correct');
    });
  }

  private disableOptions(): void {
    this.optionBtns.forEach(btn => btn.zone.disableInteractive());
  }

  private nextQuestion(): void {
    this.questionIndex++;
    if (this.questionIndex >= this.mode.rounds) {
      this.stopCountdown();
      this.scene.start('ResultScene', {
        score: this.score,
        total: this.mode.rounds,
        difficulty: this.difficulty,
        gameMode: this.gameMode,
      });
    } else {
      this.loadQuestion();
    }
  }
}
