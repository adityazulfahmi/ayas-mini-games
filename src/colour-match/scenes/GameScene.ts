import Phaser from 'phaser';
import { drawBg, statBox, launchConfetti } from '@shared/phaserUtils';
import { createEndPopup } from '@shared/endPopup';
import { C, T, F, GAME_DURATION } from '@shared/theme';
import { sounds } from '@shared/audio';
import { shuffle } from '@shared/utils';
import { COLORS, CONFETTI_EMOJIS, type Colour } from '../data';

const W = 420, H = 780;
const BTN_W = 182, BTN_H = 86;
const LEFT_X = 107, RIGHT_X = 313;
const ROW1_Y = 550, ROW2_Y = 650;

export class GameScene extends Phaser.Scene {
  private score = 0;
  private streak = 0;
  private timeLeft = GAME_DURATION;
  private answering = false;
  private currentCorrect!: Colour;

  private timerEvent!: Phaser.Time.TimerEvent;
  private timerTxt!: Phaser.GameObjects.Text;
  private scoreTxt!: Phaser.GameObjects.Text;
  private progressFill!: Phaser.GameObjects.Graphics;
  private streakTxt!: Phaser.GameObjects.Text;
  private blob!: Phaser.GameObjects.Arc;
  private answerBgs: Phaser.GameObjects.Graphics[] = [];
  private answerColors: Colour[] = [];
  private hitZones: Phaser.GameObjects.Zone[] = [];
  private endOverlay!: ReturnType<typeof createEndPopup>;

  constructor() { super('GameScene'); }

  create(): void {
    drawBg(this);
    this.score = 0; this.streak = 0;
    this.timeLeft = GAME_DURATION; this.answering = false;

    this.buildHeader();
    this.buildProgressBar();
    this.buildQuestion();
    this.buildAnswerGrid();
    this.buildEndOverlay();

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: this.tick,
      callbackScope: this,
      repeat: GAME_DURATION - 1,
    });

    this.nextQuestion();
  }

  private buildHeader(): void {
    this.add.text(W / 2, 28, '🎨 Colour Match', {
      fontFamily: F.head, fontSize: '22px', color: T.main,
    }).setOrigin(0.5);

    const timer = statBox(this, W - 70, 28, `⏱ ${GAME_DURATION}s`);
    this.timerTxt = timer.txt;
    const score = statBox(this, W - 195, 28, '⭐ 0');
    this.scoreTxt = score.txt;
  }

  private buildProgressBar(): void {
    const track = this.add.graphics();
    track.fillStyle(0xce93d8, 0.25);
    track.fillRoundedRect(10, 50, W - 20, 8, 4);
    this.progressFill = this.add.graphics();
    this.drawProgress(1);

    this.streakTxt = this.add.text(W / 2, 74, '', {
      fontFamily: F.head, fontSize: '17px', color: T.sub,
    }).setOrigin(0.5);
  }

  private drawProgress(ratio: number): void {
    this.progressFill.clear();
    this.progressFill.fillStyle(C.pink, 1);
    this.progressFill.fillRoundedRect(10, 50, Math.max(0, (W - 20) * ratio), 8, 4);
  }

  private buildQuestion(): void {
    this.add.text(W / 2, 110, 'Find the matching colour! 👇', {
      fontFamily: F.head, fontSize: '18px', color: T.sub,
    }).setOrigin(0.5);

    const ring2 = this.add.graphics();
    ring2.lineStyle(10, 0xce93d8, 0.3);
    ring2.strokeCircle(W / 2, 230, 82);
    const ring = this.add.graphics();
    ring.lineStyle(7, C.white, 1);
    ring.strokeCircle(W / 2, 230, 75);
    this.blob = this.add.arc(W / 2, 230, 74, 0, 360, false, C.pink, 1);
  }

  private buildAnswerGrid(): void {
    const positions = [
      { x: LEFT_X,  y: ROW1_Y },
      { x: RIGHT_X, y: ROW1_Y },
      { x: LEFT_X,  y: ROW2_Y },
      { x: RIGHT_X, y: ROW2_Y },
    ];

    this.answerBgs = positions.map(pos => {
      const g = this.add.graphics();
      g.setPosition(pos.x, pos.y);
      this.drawSwatchBg(g, C.white, false, false);
      return g;
    });

    this.hitZones = positions.map((pos, i) => {
      const zone = this.add.zone(pos.x, pos.y, BTN_W, BTN_H).setInteractive({ cursor: 'pointer' });
      zone.on('pointerdown', () => this.onAnswer(i));
      zone.on('pointerover', () => {
        if (!this.answering) {
          this.answerBgs[i].clear();
          this.answerBgs[i].lineStyle(4, C.pink, 0.5);
          this.answerBgs[i].fillStyle(this.answerColors[i]?.phex ?? C.pink, 1);
          this.answerBgs[i].fillRoundedRect(-BTN_W / 2, -BTN_H / 2, BTN_W, BTN_H, 18);
          this.answerBgs[i].strokeRoundedRect(-BTN_W / 2, -BTN_H / 2, BTN_W, BTN_H, 18);
        }
      });
      zone.on('pointerout', () => {
        if (!this.answering && this.answerColors[i]) {
          this.drawSwatchBg(this.answerBgs[i], this.answerColors[i].phex, false, false);
        }
      });
      return zone;
    });
  }

  private drawSwatchBg(g: Phaser.GameObjects.Graphics, fill: number, correct: boolean, wrong: boolean): void {
    g.clear();
    if (correct) {
      g.lineStyle(5, C.mint, 1);
    } else if (wrong) {
      g.lineStyle(5, C.pink, 1);
    } else {
      g.lineStyle(5, C.white, 1);
    }
    g.fillStyle(fill, 1);
    g.fillRoundedRect(-BTN_W / 2, -BTN_H / 2, BTN_W, BTN_H, 18);
    g.strokeRoundedRect(-BTN_W / 2, -BTN_H / 2, BTN_W, BTN_H, 18);
  }

  private nextQuestion(): void {
    this.answering = false;

    const correctIdx = Math.floor(Math.random() * COLORS.length);
    this.currentCorrect = COLORS[correctIdx];

    const distractors = shuffle(COLORS.filter(c => c.phex !== this.currentCorrect.phex)).slice(0, 3);
    const options = shuffle([this.currentCorrect, ...distractors]);

    this.blob.setFillStyle(this.currentCorrect.phex);

    this.answerColors = options;
    this.answerBgs.forEach((bg, i) => {
      bg.setData('name', options[i].name);
      this.drawSwatchBg(bg, options[i].phex, false, false);
    });
  }

  private onAnswer(idx: number): void {
    if (this.answering) return;
    this.answering = true;

    const chosen = this.answerColors[idx];
    const isCorrect = chosen.name === this.currentCorrect.name;

    if (isCorrect) {
      this.drawSwatchBg(this.answerBgs[idx], chosen.phex, true, false);
      this.streak++;
      this.score += this.streak >= 3 ? 15 : 10;
      this.scoreTxt.setText(`⭐ ${this.score}`);
      this.tweens.add({ targets: this.blob, scaleX: 1.1, scaleY: 1.1, yoyo: true, duration: 150 });

      if (this.streak >= 3) {
        sounds.streak();
        this.streakTxt.setText(`🔥 ${this.streak} in a row! +15`).setColor('#f06292');
      } else {
        sounds.correct();
        this.streakTxt.setText(this.streak === 2 ? '✨ One more for a streak!' : '').setColor(T.sub);
      }
      this.time.delayedCall(850, () => this.nextQuestion());
    } else {
      this.drawSwatchBg(this.answerBgs[idx], chosen.phex, false, true);
      this.streak = 0;
      sounds.wrong();
      this.streakTxt.setText('').setColor(T.sub);
      this.answerColors.forEach((c, i) => {
        if (c.name === this.currentCorrect.name) this.drawSwatchBg(this.answerBgs[i], c.phex, true, false);
      });
      this.tweens.add({ targets: this.answerBgs[idx], x: this.answerBgs[idx].x - 7, yoyo: true, repeat: 2, duration: 60 });
      this.time.delayedCall(1100, () => this.nextQuestion());
    }
  }

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
      onHome: () => { window.location.href = '../'; },
    });
  }

  private endGame(): void {
    this.timerEvent.remove();
    sounds.end();

    const s = this.score;
    let emoji: string, title: string, subtitle: string, stars: number;
    if (s >= 60)      { emoji = '🏆'; title = 'Colour Champion!';  subtitle = 'Aya knows ALL the colours! 🌈✨';        stars = 3; }
    else if (s >= 40) { emoji = '🌟'; title = 'Brilliant, Aya!';   subtitle = "You're a colour superstar! 🎨";          stars = 3; }
    else if (s >= 20) { emoji = '🎀'; title = 'Well done, Aya!';   subtitle = 'Great colour matching! 💖';              stars = 2; }
    else              { emoji = '🌸'; title = 'Nice try, Aya!';    subtitle = "Let's play again and learn more! 🌺";    stars = 1; }

    this.endOverlay.show({
      emoji, title, subtitle,
      score: { value: s, label: 'Points' },
      stars: { earned: stars },
    });
    if (s >= 40) launchConfetti(this, CONFETTI_EMOJIS);
  }
}
