import Phaser from 'phaser';
import { drawBg, primaryBtn } from '@shared/phaserUtils';
import { C, T, F } from '@shared/theme';
import { ANIMALS, CHARACTERS, MODE, type Difficulty, type GameMode } from '../data';

export class TitleScene extends Phaser.Scene {
  private difficulty: Difficulty = 'easy';
  private gameMode: GameMode = 'bing';
  private easyBtn!: Phaser.GameObjects.Container;
  private hardBtn!: Phaser.GameObjects.Container;
  private bingModeBtn!: Phaser.GameObjects.Container;
  private animalModeBtn!: Phaser.GameObjects.Container;
  private heroBing!: Phaser.GameObjects.Image;
  private heroAnimal!: Phaser.GameObjects.Text;
  private subtitleTxt!: Phaser.GameObjects.Text;
  private hintTxt!: Phaser.GameObjects.Text;

  constructor() { super('TitleScene'); }

  preload(): void {
    CHARACTERS.forEach(c => this.load.image(c.key, c.url));
  }

  create(): void {
    const { width: W, height: H } = this.scale;
    drawBg(this);

    this.add.text(W / 2, 96, "🐰 Who's That, Aya?", {
      fontFamily: F.head, fontSize: '32px', color: T.main, align: 'center',
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);

    this.subtitleTxt = this.add.text(W / 2, 144, '', {
      fontFamily: F.body, fontSize: '14px', color: T.sub,
      align: 'center', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Hero silhouette — Bing image OR darkened animal emoji, swapped on mode change
    this.heroBing = this.add.image(W / 2, 252, 'bing').setDisplaySize(120, 155);
    this.heroBing.setTintFill(0x2d1b3d);
    this.heroAnimal = this.add.text(W / 2, 252, '🐼', {
      fontFamily: F.body, fontSize: '120px',
    }).setOrigin(0.5);
    this.heroAnimal.setTintFill(0x2d1b3d);

    this.tweens.add({
      targets: [this.heroBing, this.heroAnimal],
      scale: '+=0.06', yoyo: true, repeat: -1, duration: 1250, ease: 'Sine.InOut',
    });

    // Mode picker
    this.add.text(W / 2, 348, 'CHOOSE GAME', {
      fontFamily: F.body, fontSize: '12px', color: T.sub,
      fontStyle: 'bold', letterSpacing: 1.5,
    }).setOrigin(0.5);

    const modeW = 150, modeH = 62, modeGap = 16;
    this.bingModeBtn = this.buildPickerBtn(
      W / 2 - modeW / 2 - modeGap / 2, 392, modeW, modeH,
      '🐰 Bing', 'Guess the friend',
      () => this.selectMode('bing'),
    );
    this.animalModeBtn = this.buildPickerBtn(
      W / 2 + modeW / 2 + modeGap / 2, 392, modeW, modeH,
      '🐾 Animal', 'Guess the emoji',
      () => this.selectMode('animal'),
    );

    // Difficulty picker
    this.add.text(W / 2, 462, 'CHOOSE DIFFICULTY', {
      fontFamily: F.body, fontSize: '12px', color: T.sub,
      fontStyle: 'bold', letterSpacing: 1.5,
    }).setOrigin(0.5);

    const diffW = 150, diffH = 62, diffGap = 16;
    this.easyBtn = this.buildPickerBtn(
      W / 2 - diffW / 2 - diffGap / 2, 506, diffW, diffH,
      'Easy',
      `${MODE.easy.optionCount} choices · ${MODE.easy.roundMs / 1000}s`,
      () => this.selectDifficulty('easy'),
    );
    this.hardBtn = this.buildPickerBtn(
      W / 2 + diffW / 2 + diffGap / 2, 506, diffW, diffH,
      'Hard',
      `${MODE.hard.optionCount} choices · ${MODE.hard.roundMs / 1000}s`,
      () => this.selectDifficulty('hard'),
    );

    this.hintTxt = this.add.text(W / 2, 596, '', {
      fontFamily: F.body, fontSize: '13px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);

    this.selectMode('bing');
    this.selectDifficulty('easy');

    primaryBtn(this, W / 2, H - 100, 340, 62, "Let's Guess! 🎉", () => {
      this.scene.start('GameScene', { difficulty: this.difficulty, gameMode: this.gameMode });
    });
  }

  private buildPickerBtn(
    cx: number, cy: number, w: number, h: number,
    title: string, subtitle: string,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const bg = this.add.graphics();
    const titleTxt = this.add.text(0, -10, title, {
      fontFamily: F.head, fontSize: '18px', color: T.main,
    }).setOrigin(0.5);
    const subTxt = this.add.text(0, 14, subtitle, {
      fontFamily: F.body, fontSize: '10px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);
    const container = this.add.container(cx, cy, [bg, titleTxt, subTxt]);
    container.setSize(w, h).setInteractive({ cursor: 'pointer' });
    container.on('pointerdown', onClick);

    const refs = container as unknown as PickerRefs;
    refs.bg = bg; refs.titleTxt = titleTxt; refs.subTxt = subTxt; refs.w = w; refs.h = h;
    return container;
  }

  private drawPickerBg(c: Phaser.GameObjects.Container, active: boolean): void {
    const { bg, titleTxt, subTxt, w, h } = c as unknown as PickerRefs;
    bg.clear();
    if (active) {
      bg.fillStyle(C.pink, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
      titleTxt.setColor(T.white);
      subTxt.setColor('rgba(255,255,255,0.85)');
    } else {
      bg.fillStyle(C.white, 1);
      bg.lineStyle(2.5, C.lavender, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);
      titleTxt.setColor(T.main);
      subTxt.setColor(T.sub);
    }
  }

  private selectDifficulty(d: Difficulty): void {
    this.difficulty = d;
    this.drawPickerBg(this.easyBtn, d === 'easy');
    this.drawPickerBg(this.hardBtn, d === 'hard');
  }

  private selectMode(m: GameMode): void {
    this.gameMode = m;
    this.drawPickerBg(this.bingModeBtn, m === 'bing');
    this.drawPickerBg(this.animalModeBtn, m === 'animal');
    this.heroBing.setVisible(m === 'bing');
    this.heroAnimal.setVisible(m === 'animal');
    if (m === 'bing') {
      this.subtitleTxt.setText('Guess the Bing character\nfrom their shadow! 🌟');
      this.hintTxt.setText(`${MODE.easy.rounds} mystery friends await! 🕵️`);
    } else {
      // Pick a fresh animal preview each time Animal is tapped so the user
      // gets a feel for the silhouette-guessing flow before starting.
      const preview = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
      this.heroAnimal.setText(preview.emoji);
      this.heroAnimal.setTintFill(0x2d1b3d);
      this.subtitleTxt.setText('Guess the animal\nfrom its shadow! 🐾');
      this.hintTxt.setText(`${MODE.easy.rounds} mystery critters await! 🔍`);
    }
  }
}

interface PickerRefs {
  bg: Phaser.GameObjects.Graphics;
  titleTxt: Phaser.GameObjects.Text;
  subTxt: Phaser.GameObjects.Text;
  w: number; h: number;
}
