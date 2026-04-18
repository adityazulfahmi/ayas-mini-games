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

const CARD    = { x: 20, y: 96, w: W - 40, h: 380, r: 28 };
const SILH    = { y: CARD.y + 190, w: 180, h: 230 };
const BAR_INSET = 40;
const BAR       = { x: CARD.x + BAR_INSET, y: CARD.y + CARD.h - 36, w: CARD.w - BAR_INSET * 2, h: 10 };
const STREAK_Y = CARD.y + CARD.h + 22;

interface OptionBtn {
  bg: Phaser.GameObjects.Graphics;
  dot: Phaser.GameObjects.Graphics;
  icon: Phaser.GameObjects.Text;
  txt: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
  y: number;
  key: string;
  dotR: number;
}

interface RoundItem {
  /** Unique id used to match the chosen option against the correct answer. */
  key: string;
  /** Display name shown next to the emoji dot in option buttons. */
  label: string;
  /** Optional emoji prefix (animal mode) for the left side of option rows. */
  emoji?: string;
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
  private roundBadge!: Phaser.GameObjects.Container;
  private roundBadgeTxt!: Phaser.GameObjects.Text;
  private silhouetteImg!: Phaser.GameObjects.Image;
  private silhouetteEmoji!: Phaser.GameObjects.Text;
  private spotlight!: Phaser.GameObjects.Graphics;
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
    CHARACTERS.forEach(c => this.load.image(c.key, c.url));
  }

  create(): void {
    drawBg(this);
    this.score = 0;
    this.streak = 0;
    this.questionIndex = 0;

    const pool: RoundItem[] = this.gameMode === 'bing'
      ? CHARACTERS.map((c: Character) => ({ key: c.key, label: c.name }))
      : ANIMALS.map((a: Animal) => ({ key: a.name, label: a.name, emoji: a.emoji }));
    this.roundItems = shuffle(pool).slice(0, this.mode.rounds);

    // Scene is reused across scene.start() — clear arrays populated in
    // build* so stale objects from a previous run don't leak.
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
      : ANIMALS.map(a => ({ key: a.name, label: a.name, emoji: a.emoji }));
  }

  // ─── Header ─────────────────────────────────────────────────────────────

  private buildHeader(): void {
    const modeDot = this.difficulty === 'hard' ? '🔥' : '🌱';
    const titleIcon = this.gameMode === 'animal' ? '🐾' : '🐰';
    this.add.text(22, 32, `${titleIcon} Who's That? ${modeDot}`, {
      fontFamily: F.head, fontSize: '17px', color: T.main,
    }).setOrigin(0, 0.5);

    // Score pill
    this.pill(W - 70, 32, 104, 32);
    this.scoreTxt = this.add.text(W - 70, 32, `⭐ 0/${this.mode.rounds}`, {
      fontFamily: F.head, fontSize: '15px', color: T.main,
    }).setOrigin(0.5);

    // Progress dots (center-aligned under the title row)
    const n = this.mode.rounds;
    const dotGap = 14;
    const dotW = 12;
    const totalW = n * dotW + (n - 1) * dotGap;
    const startX = W / 2 - totalW / 2 + dotW / 2;
    this.progressDots = Array.from({ length: n }, (_, i) =>
      this.add.graphics().setPosition(startX + i * (dotW + dotGap), 64),
    );
  }

  private pill(cx: number, cy: number, w: number, h: number): void {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
    g.lineStyle(1.5, C.lavender, 0.4);
    g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
  }

  private renderDots(): void {
    // Active dot is pink (brand accent) — the previous lavender-on-lavender
    // combo blended into the inactive dots.
    this.progressDots.forEach((g, i) => {
      g.clear();
      if (i < this.questionIndex) {
        g.fillStyle(C.pink, 1);
        g.fillCircle(0, 0, 5);
      } else if (i === this.questionIndex) {
        g.fillStyle(C.pink, 0.22);
        g.fillCircle(0, 0, 11);
        g.fillStyle(C.pink, 1);
        g.fillCircle(0, 0, 6);
      } else {
        g.fillStyle(0xe1bee7, 1);
        g.fillCircle(0, 0, 5);
      }
    });
  }

  // ─── Silhouette card ───────────────────────────────────────────────────

  private buildCard(): void {
    // Card base with a soft drop shadow — the previous flat white card felt
    // like a placeholder; a lifted shadow lets it read as the primary focal
    // surface.
    const shadow = this.add.graphics();
    shadow.fillStyle(C.shadow, 0.12);
    shadow.fillRoundedRect(CARD.x, CARD.y + 8, CARD.w, CARD.h, CARD.r);

    const g = this.add.graphics();
    g.fillStyle(C.white, 1);
    g.fillRoundedRect(CARD.x, CARD.y, CARD.w, CARD.h, CARD.r);

    // Spotlight — two stacked soft ellipses behind the silhouette, so the
    // figure appears to stand on a lit stage instead of floating.
    this.spotlight = this.add.graphics();
    this.drawSpotlight();

    // Round pill badge — replaces the plain "ROUND X OF Y" text. A chip at
    // the top of the card floats half-over the card edge so it reads as a
    // "tag" marking this round.
    this.roundBadge = this.buildRoundBadge(W / 2, CARD.y);

    // Both silhouette renderers exist simultaneously; we only show the one
    // matching the current mode.
    this.silhouetteImg = this.add.image(W / 2, SILH.y, CHARACTERS[0].key).setDisplaySize(SILH.w, SILH.h);
    this.silhouetteEmoji = this.add.text(W / 2, SILH.y, '', {
      fontFamily: F.body, fontSize: '180px',
    }).setOrigin(0.5);
    this.silhouetteImg.setVisible(this.gameMode === 'bing');
    this.silhouetteEmoji.setVisible(this.gameMode === 'animal');

    // Countdown track + fill — simple pink→red bar, no extra chrome.
    this.add.graphics()
      .fillStyle(0xf3e5f5, 1)
      .fillRoundedRect(BAR.x, BAR.y, BAR.w, BAR.h, BAR.h / 2);
    this.countdownBar = this.add.graphics();
    this.drawCountdown(1);
  }

  private drawSpotlight(): void {
    const g = this.spotlight;
    g.clear();
    // Outer soft glow
    g.fillStyle(C.lavender, 0.14);
    g.fillEllipse(W / 2, SILH.y + 10, 260, 260);
    // Inner warm plate
    g.fillStyle(C.bg1, 0.9);
    g.fillEllipse(W / 2, SILH.y + 10, 200, 210);
    // Ground shadow directly beneath the figure
    g.fillStyle(C.shadow, 0.16);
    g.fillEllipse(W / 2, SILH.y + 108, 160, 22);
  }

  private buildRoundBadge(cx: number, cy: number): Phaser.GameObjects.Container {
    const w = 132, h = 30;
    const bg = this.add.graphics();
    bg.fillStyle(C.pink, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    bg.lineStyle(3, C.white, 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    this.roundBadgeTxt = this.add.text(0, 0, '', {
      fontFamily: F.head, fontSize: '13px', color: T.white,
    }).setOrigin(0.5);
    const c = this.add.container(cx, cy, [bg, this.roundBadgeTxt]);
    c.setDepth(2);
    return c;
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
    // Animal mode makes the emoji the hero — Aya is 2 and picks by image,
    // so buttons (and the emoji inside them) are sized up aggressively.
    // Bing mode keeps the tighter layout since the name is the key signal.
    const isAnimal = this.gameMode === 'animal';
    const btnH = isAnimal
      ? (n >= 4 ? 60 : 70)
      : (n >= 4 ? 50 : 60);
    const gap = isAnimal
      ? (n >= 4 ? 8 : 12)
      : (n >= 4 ? 10 : 12);
    const dotR = isAnimal
      ? (n >= 4 ? 24 : 28)
      : 18;
    const iconSize = isAnimal
      ? (n >= 4 ? '38px' : '44px')
      : '26px';
    const txtSize = isAnimal
      ? (n >= 4 ? '20px' : '22px')
      : '18px';
    // Tighten the card-to-options gap for animal mode so the bigger
    // buttons still fit comfortably above the safe-area.
    const cardGap = isAnimal ? 40 : 62;
    const dotCx   = isAnimal ? 42 : 34;
    const startY  = (CARD.y + CARD.h + cardGap) + btnH / 2;

    for (let i = 0; i < n; i++) {
      const cx = W / 2;
      const cy = startY + i * (btnH + gap);

      const bg = this.add.graphics().setPosition(cx, cy);
      // Left-side circular "dot" — emoji in animal mode, numbered index in
      // bing mode. In animal mode the dot is sized up so the emoji inside
      // reads instantly from across a small phone.
      const dot = this.add.graphics().setPosition(cx - btnW / 2 + dotCx, cy);
      const icon = this.add.text(cx - btnW / 2 + dotCx, cy, '', {
        fontFamily: F.body, fontSize: iconSize, color: T.main,
      }).setOrigin(0.5);
      // Name text is centered within the horizontal space that remains
      // to the right of the dot — gives the button a balanced feel without
      // having to guess at label width.
      const dotRightEdge = (cx - btnW / 2 + dotCx) + dotR;
      const txtX = (dotRightEdge + (cx + btnW / 2 - 16)) / 2;
      const txt = this.add.text(txtX, cy, '', {
        fontFamily: F.head, fontSize: txtSize, color: T.main,
      }).setOrigin(0.5);

      const zone = this.add.zone(cx, cy, btnW, btnH).setInteractive({ cursor: 'pointer' });
      zone.on('pointerover', () => { if (!this.answered) this.drawOptionBg(bg, btnW, btnH, 'hover'); });
      zone.on('pointerout',  () => { if (!this.answered) this.drawOptionBg(bg, btnW, btnH, 'idle'); });
      zone.on('pointerdown', () => this.onAnswer(i));

      this.drawOptionBg(bg, btnW, btnH, 'idle');
      this.optionBtns.push({ bg, dot, icon, txt, zone, y: cy, key: '', dotR });
      // keep btnW/btnH references for redraws
      (bg as unknown as { _w: number; _h: number })._w = btnW;
      (bg as unknown as { _w: number; _h: number })._h = btnH;
    }
  }

  private drawOptionBg(
    g: Phaser.GameObjects.Graphics,
    w: number, h: number,
    state: 'idle' | 'hover' | 'correct' | 'wrong',
  ): void {
    g.clear();
    // Soft shadow under every option — gives the column a stacked,
    // tactile feel instead of looking like thin outlined boxes.
    g.fillStyle(C.shadow, 0.10);
    g.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 20);
    switch (state) {
      case 'idle':
        g.fillStyle(C.white, 1);
        g.lineStyle(2.5, 0xe1bee7, 1);
        break;
      case 'hover':
        g.fillStyle(C.cream, 1);
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
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 20);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 20);
  }

  private drawOptionDot(
    g: Phaser.GameObjects.Graphics,
    r: number,
    state: 'idle' | 'hover' | 'correct' | 'wrong',
  ): void {
    g.clear();
    let fill: number = C.bg1;
    if (state === 'correct') fill = 0xc8e6c9;
    else if (state === 'wrong') fill = 0xffcdd2;
    else if (state === 'hover') fill = 0xfce4ec;
    g.fillStyle(fill, 1);
    g.fillCircle(0, 0, r);
    g.lineStyle(1.5, C.lavender, 0.5);
    g.strokeCircle(0, 0, r);
  }

  private paintOption(i: number, state: 'idle' | 'hover' | 'correct' | 'wrong'): void {
    const btn = this.optionBtns[i];
    const { _w: w, _h: h } = btn.bg as unknown as { _w: number; _h: number };
    this.drawOptionBg(btn.bg, w, h, state);
    this.drawOptionDot(btn.dot, btn.dotR, state);
  }

  // ─── Round logic ───────────────────────────────────────────────────────

  private loadQuestion(): void {
    this.answered = false;
    this.stopCountdown();

    const item = this.roundItems[this.questionIndex];
    this.roundBadgeTxt.setText(`ROUND ${this.questionIndex + 1} / ${this.mode.rounds}`);
    this.renderDots();

    // Show the mode-appropriate silhouette renderer.
    if (this.gameMode === 'bing') {
      this.silhouetteImg.setTexture(item.key).setDisplaySize(SILH.w, SILH.h);
      this.silhouetteImg.setTintFill(this.mode.tintFill);
    } else {
      this.silhouetteEmoji.setText(item.emoji ?? item.label);
      this.silhouetteEmoji.setTintFill(this.mode.tintFill);
    }

    // Build options: correct + N-1 distractors pulled from the same pool.
    const wrong = shuffle(this.allItems.filter(c => c.key !== item.key))
      .slice(0, this.mode.optionCount - 1);
    const options = shuffle([item, ...wrong]);

    this.optionBtns.forEach((btn, i) => {
      const opt = options[i];
      btn.key = opt.key;
      if (this.gameMode === 'animal') {
        btn.icon.setText(opt.emoji ?? '');
        btn.txt.setText(opt.label);
      } else {
        // Bing mode: no emoji available for each character, use a
        // numbered indicator so the left-side dot still reads as a
        // structural element rather than an empty circle.
        btn.icon.setText(`${i + 1}`);
        btn.icon.setStyle({ fontFamily: F.head, fontSize: '16px', color: T.sub });
        btn.txt.setText(opt.label);
      }
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
