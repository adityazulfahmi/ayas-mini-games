import Phaser from 'phaser';
import { drawBg, statBox, launchConfetti } from '@shared/phaserUtils';
import { createEndPopup } from '@shared/endPopup';
import { C, T, F, GAME_DURATION } from '@shared/theme';
import { sounds } from '@shared/audio';
import { shuffle, randomOtherIdx } from '@shared/utils';
import { CATEGORIES, CONFETTI_EMOJIS } from '../data';

const W = 420, H = 740;
const CELL = 168, GAP = 14;
const GRID_CX = W / 2, GRID_CY = 480;

export class GameScene extends Phaser.Scene {
  private score = 0;
  private streak = 0;
  private timeLeft = GAME_DURATION;
  private answering = false;
  private lastGroupIdx = -1;
  private correctEmoji = '';

  private timerEvent!: Phaser.Time.TimerEvent;
  private timerTxt!: Phaser.GameObjects.Text;
  private scoreTxt!: Phaser.GameObjects.Text;
  private progressFill!: Phaser.GameObjects.Graphics;
  private streakTxt!: Phaser.GameObjects.Text;
  private cellBgs: Phaser.GameObjects.Graphics[] = [];
  private cellTxts: Phaser.GameObjects.Text[] = [];
  private hitZones: Phaser.GameObjects.Zone[] = [];
  private cellEmojis: string[] = [];
  private endOverlay!: ReturnType<typeof createEndPopup>;

  constructor() { super('GameScene'); }

  create(): void {
    drawBg(this);
    this.score = 0; this.streak = 0;
    this.timeLeft = GAME_DURATION; this.answering = false; this.lastGroupIdx = -1;

    this.buildHeader();
    this.buildProgressBar();
    this.buildGrid();
    this.buildEndOverlay();

    this.timerEvent = this.time.addEvent({
      delay: 1000, callback: this.tick, callbackScope: this, repeat: GAME_DURATION - 1,
    });

    this.nextQuestion();
  }

  private buildHeader(): void {
    this.add.text(W / 2, 28, '🤔 Odd One Out', {
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

    this.add.text(W / 2, 104, "Which one doesn't belong? 🤔", {
      fontFamily: F.head, fontSize: '22px', color: T.main,
    }).setOrigin(0.5);
  }

  private drawProgress(ratio: number): void {
    this.progressFill.clear();
    this.progressFill.fillStyle(C.pink, 1);
    this.progressFill.fillRoundedRect(10, 50, Math.max(0, (W - 20) * ratio), 8, 4);
  }

  private buildGrid(): void {
    const positions = this.gridPositions();

    this.cellBgs = positions.map(pos => {
      const g = this.add.graphics().setPosition(pos.x, pos.y);
      this.drawCellBg(g, false, false);
      return g;
    });

    this.cellTxts = positions.map(pos =>
      this.add.text(pos.x, pos.y, '', { fontSize: '60px' }).setOrigin(0.5)
    );

    this.hitZones = positions.map((pos, i) => {
      const zone = this.add.zone(pos.x, pos.y, CELL, CELL).setInteractive({ cursor: 'pointer' });
      zone.on('pointerdown', () => this.onAnswer(i));
      zone.on('pointerover', () => {
        if (!this.answering) {
          this.cellBgs[i].clear();
          this.cellBgs[i].lineStyle(3.5, C.pink, 0.5);
          this.cellBgs[i].fillStyle(0xfff0f4, 1);
          this.cellBgs[i].fillRoundedRect(-CELL/2, -CELL/2, CELL, CELL, 20);
          this.cellBgs[i].strokeRoundedRect(-CELL/2, -CELL/2, CELL, CELL, 20);
        }
      });
      zone.on('pointerout', () => {
        if (!this.answering) this.drawCellBg(this.cellBgs[i], false, false);
      });
      return zone;
    });
  }

  private gridPositions(): { x: number; y: number }[] {
    return [0, 1, 2, 3].map(i => ({
      x: GRID_CX - CELL / 2 - GAP / 2 + (i % 2) * (CELL + GAP),
      y: GRID_CY - CELL / 2 - GAP / 2 + Math.floor(i / 2) * (CELL + GAP),
    }));
  }

  private drawCellBg(g: Phaser.GameObjects.Graphics, correct: boolean, wrong: boolean): void {
    g.clear();
    if (correct) {
      g.fillStyle(C.mintBg, 1);
      g.lineStyle(3.5, C.mint, 1);
    } else if (wrong) {
      g.fillStyle(0xfff0f4, 1);
      g.lineStyle(3.5, C.pink, 1);
    } else {
      g.fillStyle(C.white, 1);
      g.lineStyle(3.5, 0xce93d8, 0.3);
    }
    g.fillRoundedRect(-CELL/2, -CELL/2, CELL, CELL, 20);
    g.strokeRoundedRect(-CELL/2, -CELL/2, CELL, CELL, 20);
  }

  private nextQuestion(): void {
    this.answering = false;

    let groupIdx: number;
    do { groupIdx = Math.floor(Math.random() * CATEGORIES.length); }
    while (groupIdx === this.lastGroupIdx);
    this.lastGroupIdx = groupIdx;

    const group = CATEGORIES[groupIdx];
    const groupThree = shuffle([...group.emojis]).slice(0, 3);
    const oddIdx = randomOtherIdx(groupIdx, CATEGORIES.length);
    const odd = CATEGORIES[oddIdx].emojis[Math.floor(Math.random() * CATEGORIES[oddIdx].emojis.length)];

    this.correctEmoji = odd;
    this.cellEmojis = shuffle([...groupThree, odd]);

    this.cellTxts.forEach((t, i) => t.setText(this.cellEmojis[i]));
    this.cellBgs.forEach(g => this.drawCellBg(g, false, false));
  }

  private onAnswer(idx: number): void {
    if (this.answering) return;
    this.answering = true;

    const isCorrect = this.cellEmojis[idx] === this.correctEmoji;

    if (isCorrect) {
      this.drawCellBg(this.cellBgs[idx], true, false);
      this.streak++;
      this.score += this.streak >= 3 ? 15 : 10;
      this.scoreTxt.setText(`⭐ ${this.score}`);
      this.tweens.add({ targets: this.cellBgs[idx], scaleX: 1.06, scaleY: 1.06, yoyo: true, duration: 150 });

      if (this.streak >= 3) {
        sounds.streak();
        this.streakTxt.setText(`🔥 ${this.streak} in a row! +15`).setColor('#f06292');
      } else {
        sounds.correct();
        this.streakTxt.setText(this.streak === 2 ? '✨ One more for a streak!' : '').setColor(T.sub);
      }
      this.time.delayedCall(900, () => this.nextQuestion());
    } else {
      this.drawCellBg(this.cellBgs[idx], false, true);
      this.streak = 0;
      sounds.wrong();
      this.streakTxt.setText('').setColor(T.sub);
      this.cellEmojis.forEach((e, i) => {
        if (e === this.correctEmoji) this.drawCellBg(this.cellBgs[i], true, false);
      });
      this.tweens.add({ targets: this.cellBgs[idx], x: this.cellBgs[idx].x - 7, yoyo: true, repeat: 2, duration: 60 });
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
    if (s >= 60)      { emoji = '🏆'; title = 'Super Spotter!';  subtitle = 'Aya finds every odd one out! 🌈✨'; stars = 3; }
    else if (s >= 40) { emoji = '🌟'; title = 'Brilliant, Aya!'; subtitle = "You've got a great eye! 🔍";       stars = 3; }
    else if (s >= 20) { emoji = '🎀'; title = 'Well done, Aya!'; subtitle = 'Great spotting! 💖';               stars = 2; }
    else              { emoji = '🌸'; title = 'Nice try, Aya!';  subtitle = "Let's play again! 🌺";             stars = 1; }

    this.endOverlay.show({
      emoji, title, subtitle,
      score: { value: s, label: 'Points' },
      stars: { earned: stars },
    });
    if (s >= 40) launchConfetti(this, CONFETTI_EMOJIS);
  }
}
