import Phaser from 'phaser';
import { drawBg, launchConfetti } from '@shared/phaserUtils';
import { createEndPopup } from '@shared/endPopup';
import { C, T, F, GAME_DURATION } from '@shared/theme';
import { sounds } from '@shared/audio';
import { shuffle, randomOtherIdx } from '@shared/utils';
import { COLOUR_POOL, CONFETTI_EMOJIS, type ColourGroup } from '../data';

const W = 420, H = 780;

// ─── Header ──
const HEADER_Y = 34;

// ─── Question card ──
const CARD    = { x: 24, y: 92, w: W - 48, h: 260, r: 28 };
const SWATCH  = { y: CARD.y + 70, w: 200, h: 96, r: 22 };
const PROMPT  = { y: CARD.y + 190 };
const HINT    = { y: CARD.y + 220 };

// ─── Answer grid ──
const GRID_TOP = CARD.y + CARD.h + 28;    // y=380
const TILE     = { w: (W - 24 * 2 - 16) / 2, h: 130, r: 22 };  // 2 cols with 16 gap, 24 side
const GAP_X    = 16;
const GAP_Y    = 16;

// ─── Streak ribbon ──
const STREAK_Y = CARD.y + CARD.h + 12;

// Score thresholds (used for stars)
const TIER_THRESHOLDS = { gold: 60, silver: 40, bronze: 20 };

interface AnswerTile {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  emoji: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
  colour: string;
}

export class GameScene extends Phaser.Scene {
  private score = 0;
  private streak = 0;
  private timeLeft = GAME_DURATION;
  private answering = false;
  private lastColourIdx = -1;
  private currentColour!: ColourGroup;

  private scoreTxt!: Phaser.GameObjects.Text;
  private timerTxt!: Phaser.GameObjects.Text;
  private progressFill!: Phaser.GameObjects.Graphics;
  private streakTxt!: Phaser.GameObjects.Text;
  private swatch!: Phaser.GameObjects.Graphics;
  private promptTxt!: Phaser.GameObjects.Text;
  private tiles: AnswerTile[] = [];
  private endOverlay!: ReturnType<typeof createEndPopup>;
  private timerEvent!: Phaser.Time.TimerEvent;

  constructor() { super('GameScene'); }

  create(): void {
    drawBg(this);
    this.score = 0;
    this.streak = 0;
    this.timeLeft = GAME_DURATION;
    this.answering = false;
    this.lastColourIdx = -1;

    this.buildHeader();
    this.buildQuestionCard();
    this.buildAnswerGrid();
    this.buildStreakRibbon();
    this.buildEndOverlay();

    this.timerEvent = this.time.addEvent({
      delay: 1000, callback: this.tick, callbackScope: this,
      repeat: GAME_DURATION - 1,
    });

    this.nextQuestion();
  }

  // ─── Header (title, score, timer, progress bar) ──────────────────────────

  private buildHeader(): void {
    this.add.text(24, HEADER_Y, '🎨 Colour Hunt', {
      fontFamily: F.head, fontSize: '20px', color: T.main,
    }).setOrigin(0, 0.5);

    const scorePill = this.pill(W - 178, HEADER_Y, 88, 34, '#ffffff');
    this.scoreTxt = this.add.text(W - 178, HEADER_Y, '⭐ 0', {
      fontFamily: F.head, fontSize: '16px', color: T.main,
    }).setOrigin(0.5);
    scorePill.setDepth(0);
    this.scoreTxt.setDepth(1);

    this.pill(W - 74, HEADER_Y, 100, 34, '#ffffff');
    this.timerTxt = this.add.text(W - 74, HEADER_Y, `⏱ ${GAME_DURATION}s`, {
      fontFamily: F.head, fontSize: '16px', color: T.main,
    }).setOrigin(0.5).setDepth(1);

    // Progress bar
    const track = this.add.graphics();
    track.fillStyle(0xce93d8, 0.25);
    track.fillRoundedRect(24, HEADER_Y + 28, W - 48, 6, 3);
    this.progressFill = this.add.graphics();
    this.drawProgress(1);
  }

  private pill(cx: number, cy: number, w: number, h: number, fill: string): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();
    g.fillStyle(Phaser.Display.Color.HexStringToColor(fill).color, 1);
    g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
    g.lineStyle(1.5, C.lavender, 0.35);
    g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
    return g;
  }

  private drawProgress(ratio: number): void {
    this.progressFill.clear();
    this.progressFill.fillStyle(C.pink, 1);
    this.progressFill.fillRoundedRect(24, HEADER_Y + 28, Math.max(0, (W - 48) * ratio), 6, 3);
  }

  // ─── Question card ──────────────────────────────────────────────────────

  private buildQuestionCard(): void {
    // Card
    const card = this.add.graphics();
    card.fillStyle(C.white, 1);
    card.fillRoundedRect(CARD.x, CARD.y, CARD.w, CARD.h, CARD.r);

    // Subtle inner shadow for the swatch well
    const well = this.add.graphics();
    well.fillStyle(0xfaf2f7, 1);
    well.fillRoundedRect(W / 2 - SWATCH.w / 2 - 10, SWATCH.y - SWATCH.h / 2 - 10,
                         SWATCH.w + 20, SWATCH.h + 20, SWATCH.r + 6);

    this.swatch = this.add.graphics();

    this.promptTxt = this.add.text(W / 2, PROMPT.y, '', {
      fontFamily: F.head, fontSize: '28px', color: T.main,
    }).setOrigin(0.5);

    this.add.text(W / 2, HINT.y, 'Find something this colour!', {
      fontFamily: F.body, fontSize: '12px', color: T.sub,
      fontStyle: 'bold', letterSpacing: 0.5,
    }).setOrigin(0.5);
  }

  private drawSwatch(phex: number): void {
    this.swatch.clear();
    this.swatch.fillStyle(phex, 1);
    this.swatch.fillRoundedRect(W / 2 - SWATCH.w / 2, SWATCH.y - SWATCH.h / 2, SWATCH.w, SWATCH.h, SWATCH.r);
    this.swatch.lineStyle(3, 0xffffff, 0.6);
    this.swatch.strokeRoundedRect(W / 2 - SWATCH.w / 2, SWATCH.y - SWATCH.h / 2, SWATCH.w, SWATCH.h, SWATCH.r);
  }

  // ─── Streak ribbon ──────────────────────────────────────────────────────

  private buildStreakRibbon(): void {
    this.streakTxt = this.add.text(W / 2, STREAK_Y, '', {
      fontFamily: F.head, fontSize: '15px', color: T.sub,
    }).setOrigin(0.5);
  }

  // ─── Answer grid (2×2 emoji-only tiles) ─────────────────────────────────

  private buildAnswerGrid(): void {
    this.tiles = [0, 1, 2, 3].map(i => {
      const col = i % 2, row = Math.floor(i / 2);
      const cx = 24 + col * (TILE.w + GAP_X) + TILE.w / 2;
      const cy = GRID_TOP + row * (TILE.h + GAP_Y) + TILE.h / 2;

      const bg = this.add.graphics();
      bg.setPosition(cx, cy);
      this.drawTileBg(bg, 'idle');

      const emoji = this.add.text(cx, cy, '', { fontSize: '64px' })
        .setOrigin(0.5);

      const zone = this.add.zone(cx, cy, TILE.w, TILE.h).setInteractive({ cursor: 'pointer' });
      zone.on('pointerdown', () => this.onAnswer(i));
      zone.on('pointerover', () => {
        if (this.answering) return;
        this.drawTileBg(bg, 'hover');
      });
      zone.on('pointerout', () => {
        if (this.answering) return;
        this.drawTileBg(bg, 'idle');
      });

      return {
        container: this.add.container(0, 0, [bg, emoji]),
        bg, emoji, zone, colour: '',
      };
    });
  }

  private drawTileBg(g: Phaser.GameObjects.Graphics, state: 'idle' | 'hover' | 'correct' | 'wrong'): void {
    g.clear();
    const w = TILE.w, h = TILE.h, r = TILE.r;
    switch (state) {
      case 'idle':
        g.fillStyle(C.white, 1);
        g.lineStyle(3, 0xce93d8, 0.4);
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
    g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
  }

  // ─── Rounds ─────────────────────────────────────────────────────────────

  private nextQuestion(): void {
    this.answering = false;

    const targetIdx = this.lastColourIdx < 0
      ? Math.floor(Math.random() * COLOUR_POOL.length)
      : randomOtherIdx(this.lastColourIdx, COLOUR_POOL.length);
    this.lastColourIdx = targetIdx;
    this.currentColour = COLOUR_POOL[targetIdx];

    this.drawSwatch(this.currentColour.phex);
    this.promptTxt.setText(this.currentColour.prompt);

    // Pick 1 correct emoji + 3 distractors from *other* colour groups
    const correctEmoji = pickRandom(this.currentColour.emojis);
    const otherGroups = shuffle(COLOUR_POOL.filter((_, i) => i !== targetIdx)).slice(0, 3);
    const distractors = otherGroups.map(g => ({ colour: g.name, emoji: pickRandom(g.emojis) }));

    const options = shuffle([
      { colour: this.currentColour.name, emoji: correctEmoji },
      ...distractors,
    ]);

    this.tiles.forEach((t, i) => {
      t.colour = options[i].colour;
      t.emoji.setText(options[i].emoji).setScale(1);
      this.drawTileBg(t.bg, 'idle');
      t.zone.setInteractive({ cursor: 'pointer' });
    });
  }

  private onAnswer(idx: number): void {
    if (this.answering) return;
    this.answering = true;

    const tile = this.tiles[idx];
    const isCorrect = tile.colour === this.currentColour.name;
    this.tiles.forEach(t => t.zone.disableInteractive());

    if (isCorrect) {
      this.drawTileBg(tile.bg, 'correct');
      this.tweens.add({
        targets: tile.emoji,
        scale: { from: 1, to: 1.25 },
        yoyo: true, duration: 180, ease: 'Sine.InOut',
      });

      this.streak++;
      const award = this.streak >= 3 ? 15 : 10;
      this.score += award;
      this.scoreTxt.setText(`⭐ ${this.score}`);

      if (this.streak >= 3) {
        sounds.streak();
        this.streakTxt.setText(`🔥 ${this.streak} in a row!  +${award}`).setColor('#f06292');
      } else if (this.streak === 2) {
        sounds.correct();
        this.streakTxt.setText('✨ One more for a streak!').setColor(T.sub);
      } else {
        sounds.correct();
        this.streakTxt.setText('').setColor(T.sub);
      }

      this.time.delayedCall(700, () => this.nextQuestion());
    } else {
      this.drawTileBg(tile.bg, 'wrong');
      this.streak = 0;
      sounds.wrong();
      this.streakTxt.setText('').setColor(T.sub);

      // Highlight any correct tile(s)
      this.tiles.forEach(t => {
        if (t.colour === this.currentColour.name) this.drawTileBg(t.bg, 'correct');
      });
      this.tweens.add({ targets: tile.bg, x: tile.bg.x - 6, yoyo: true, repeat: 3, duration: 55 });

      this.time.delayedCall(1000, () => this.nextQuestion());
    }
  }

  // ─── Timer / end ────────────────────────────────────────────────────────

  private tick(): void {
    this.timeLeft--;
    this.timerTxt.setText(`⏱ ${this.timeLeft}s`);
    if (this.timeLeft <= 10) this.timerTxt.setColor(T.red);
    this.drawProgress(this.timeLeft / GAME_DURATION);
    if (this.timeLeft <= 0) this.endGame();
  }

  private buildEndOverlay(): void {
    this.endOverlay = createEndPopup(this, W, H, {
      onPlayAgain: () => this.scene.restart(),
      onHome:      () => this.scene.start('TitleScene'),
      onAllGames:  () => { window.location.href = '../'; },
    });
  }

  private endGame(): void {
    this.timerEvent.remove();
    this.tiles.forEach(t => t.zone.disableInteractive());
    sounds.end();

    const s = this.score;
    const t = TIER_THRESHOLDS;
    let emoji: string, title: string, subtitle: string, stars: number;
    if (s >= t.gold)        { emoji = '🏆'; title = 'Colour Champion!'; subtitle = 'Aya spots every colour! 🌈✨';       stars = 3; }
    else if (s >= t.silver) { emoji = '🌟'; title = 'Brilliant, Aya!';  subtitle = "You're a colour superstar! 🔍";     stars = 3; }
    else if (s >= t.bronze) { emoji = '🎀'; title = 'Well done, Aya!';  subtitle = 'Great colour spotting! 💖';         stars = 2; }
    else                    { emoji = '🌸'; title = 'Nice try, Aya!';   subtitle = "Let's hunt more colours! 🌺";       stars = 1; }

    this.endOverlay.show({
      emoji, title, subtitle,
      score: { value: s, label: 'Points' },
      stars: { earned: stars },
    });
    if (s >= t.silver) launchConfetti(this, CONFETTI_EMOJIS);
  }
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
