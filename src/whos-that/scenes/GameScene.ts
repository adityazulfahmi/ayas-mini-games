import Phaser from 'phaser';
import { drawBg, panel, statBox, outlineBtn } from '@shared/phaserUtils';
import { C, T, F } from '@shared/theme';
import { sounds } from '@shared/audio';
import { shuffle } from '@shared/utils';
import { CHARACTERS, type Character } from '../data';

const W = 420, H = 800;
const ROUNDS = 3;
const ROUND_MS = 10000;

const CARD = { x: 20, y: 150, w: W - 40, h: 340 };
const SILHOUETTE_Y = 300;
const BAR = { x: CARD.x + 24, y: CARD.y + CARD.h - 34, w: CARD.w - 48, h: 10 };

const OPTION_GRID_Y = 540;
const OPTION_W = (W - 60) / 2;
const OPTION_H = 62;
const OPTION_GAP = 12;

export class GameScene extends Phaser.Scene {
  private roundChars: Character[] = [];
  private questionIndex = 0;
  private score = 0;
  private answered = false;

  private scoreTxt!: Phaser.GameObjects.Text;
  private silhouette!: Phaser.GameObjects.Image;
  private countdownBar!: Phaser.GameObjects.Graphics;
  private countdownTween?: Phaser.Tweens.Tween;
  private countdownTimer?: Phaser.Time.TimerEvent;
  private progressDots: Phaser.GameObjects.Graphics[] = [];
  private optionButtons: {
    bg: Phaser.GameObjects.Graphics;
    txt: Phaser.GameObjects.Text;
    zone: Phaser.GameObjects.Zone;
    name: string;
  }[] = [];

  constructor() { super('GameScene'); }

  create(): void {
    drawBg(this);
    this.score = 0;
    this.questionIndex = 0;
    this.roundChars = shuffle(CHARACTERS).slice(0, ROUNDS);

    this.buildHeader();
    this.buildProgressDots();
    this.buildSilhouetteCard();
    this.buildOptionGrid();

    this.loadQuestion();
  }

  private buildHeader(): void {
    this.add.text(20, 28, "🐰 Who's That?", {
      fontFamily: F.head, fontSize: '18px', color: T.main,
    }).setOrigin(0, 0.5);

    const score = statBox(this, W - 180, 28, '⭐ 0');
    this.scoreTxt = score.txt;

    outlineBtn(this, W - 62, 28, 100, 36, '↩ Menu', () => this.goToMenu());
  }

  private buildProgressDots(): void {
    this.add.text(24, 76, 'Round', {
      fontFamily: F.head, fontSize: '14px', color: T.sub,
    }).setOrigin(0, 0.5);

    this.progressDots = Array.from({ length: ROUNDS }, (_, i) => {
      const g = this.add.graphics().setPosition(82 + i * 18, 76);
      return g;
    });
    this.renderDots();
  }

  private renderDots(): void {
    this.progressDots.forEach((g, i) => {
      g.clear();
      if (i < this.questionIndex) {
        g.fillStyle(C.pink, 1);
        g.fillCircle(0, 0, 6);
      } else if (i === this.questionIndex) {
        g.fillStyle(C.lavender, 0.35);
        g.fillCircle(0, 0, 10);
        g.fillStyle(C.lavender, 1);
        g.fillCircle(0, 0, 6);
      } else {
        g.fillStyle(0xe1bee7, 1);
        g.fillCircle(0, 0, 6);
      }
    });
  }

  private buildSilhouetteCard(): void {
    panel(this, CARD.x, CARD.y, CARD.w, CARD.h, 24);

    this.add.text(W / 2, CARD.y + 28, 'WHO IS THIS BING CHARACTER?', {
      fontFamily: F.body, fontSize: '11px', color: T.sub,
      fontStyle: 'bold', letterSpacing: 1.5,
    }).setOrigin(0.5);

    this.silhouette = this.add.image(W / 2, SILHOUETTE_Y, CHARACTERS[0].key)
      .setDisplaySize(170, 200);

    this.add.graphics()
      .fillStyle(0xf3e5f5, 1)
      .fillRoundedRect(BAR.x, BAR.y, BAR.w, BAR.h, BAR.h / 2);

    this.countdownBar = this.add.graphics();
  }

  private drawCountdown(ratio: number): void {
    this.countdownBar.clear();
    this.countdownBar.fillStyle(C.pink, 1);
    const w = Math.max(0, BAR.w * ratio);
    if (w > 0) this.countdownBar.fillRoundedRect(BAR.x, BAR.y, w, BAR.h, BAR.h / 2);
  }

  private buildOptionGrid(): void {
    for (let i = 0; i < 4; i++) {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 20 + col * (OPTION_W + OPTION_GAP) + OPTION_W / 2;
      const y = OPTION_GRID_Y + row * (OPTION_H + OPTION_GAP) + OPTION_H / 2;

      const bg = this.add.graphics().setPosition(x, y);
      const txt = this.add.text(x, y, '', {
        fontFamily: F.head, fontSize: '18px', color: T.main,
      }).setOrigin(0.5);

      const zone = this.add.zone(x, y, OPTION_W, OPTION_H).setInteractive({ cursor: 'pointer' });
      zone.on('pointerover', () => {
        if (this.answered) return;
        this.drawOptionBg(bg, 'hover');
      });
      zone.on('pointerout', () => {
        if (this.answered) return;
        this.drawOptionBg(bg, 'idle');
      });
      zone.on('pointerdown', () => this.onAnswer(i));

      this.optionButtons.push({ bg, txt, zone, name: '' });
    }
  }

  private drawOptionBg(g: Phaser.GameObjects.Graphics, state: 'idle' | 'hover' | 'correct' | 'wrong'): void {
    g.clear();
    const w = OPTION_W, h = OPTION_H;
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
        g.lineStyle(2.5, 0x66bb6a, 1);
        break;
      case 'wrong':
        g.fillStyle(0xffebee, 1);
        g.lineStyle(2.5, 0xef5350, 1);
        break;
    }
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
  }

  private loadQuestion(): void {
    this.answered = false;
    this.stopCountdown();

    const char = this.roundChars[this.questionIndex];
    this.renderDots();

    // Silhouette: fill-tint so texture detail is replaced with a flat dark shape
    this.silhouette.setTexture(char.key).setDisplaySize(170, 200);
    this.silhouette.setTintFill(0x2d1b3d);

    // Build 4 options
    const wrong = shuffle(CHARACTERS.filter(c => c.name !== char.name)).slice(0, 3);
    const options = shuffle([char, ...wrong]);

    this.optionButtons.forEach((btn, i) => {
      btn.name = options[i].name;
      btn.txt.setText(options[i].name);
      this.drawOptionBg(btn.bg, 'idle');
      btn.zone.setInteractive({ cursor: 'pointer' });
    });

    this.startCountdown(char.name);
  }

  private startCountdown(correctName: string): void {
    this.drawCountdown(1);
    const state = { ratio: 1 };
    this.countdownTween = this.tweens.add({
      targets: state,
      ratio: 0,
      duration: ROUND_MS,
      ease: 'Linear',
      onUpdate: () => this.drawCountdown(state.ratio),
    });
    this.countdownTimer = this.time.delayedCall(ROUND_MS, () => this.onTimeout(correctName));
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

    const chosen = this.optionButtons[idx];
    const correctName = this.roundChars[this.questionIndex].name;
    this.silhouette.clearTint();
    this.disableOptions();

    if (chosen.name === correctName) {
      this.drawOptionBg(chosen.bg, 'correct');
      this.tweens.add({ targets: chosen.bg, scaleX: 1.05, scaleY: 1.05, yoyo: true, duration: 170 });
      this.score++;
      this.scoreTxt.setText(`⭐ ${this.score}`);
      sounds.correct();
    } else {
      this.drawOptionBg(chosen.bg, 'wrong');
      this.tweens.add({ targets: chosen.bg, x: chosen.bg.x - 5, yoyo: true, repeat: 2, duration: 55 });
      this.highlightCorrect(correctName);
      sounds.wrong();
    }

    this.time.delayedCall(950, () => this.nextQuestion());
  }

  private onTimeout(correctName: string): void {
    if (this.answered) return;
    this.answered = true;
    this.silhouette.clearTint();
    this.disableOptions();
    this.highlightCorrect(correctName);
    sounds.timeout();
    this.time.delayedCall(950, () => this.nextQuestion());
  }

  private highlightCorrect(correctName: string): void {
    this.optionButtons.forEach(btn => {
      if (btn.name === correctName) this.drawOptionBg(btn.bg, 'correct');
    });
  }

  private disableOptions(): void {
    this.optionButtons.forEach(btn => btn.zone.disableInteractive());
  }

  private nextQuestion(): void {
    this.questionIndex++;
    if (this.questionIndex >= ROUNDS) {
      this.scene.start('ResultScene', { score: this.score, total: ROUNDS });
    } else {
      this.loadQuestion();
    }
  }

  private goToMenu(): void {
    this.stopCountdown();
    this.scene.start('TitleScene');
  }
}
