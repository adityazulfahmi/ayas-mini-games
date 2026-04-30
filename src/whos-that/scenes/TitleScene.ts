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
  private heroPedestal!: Phaser.GameObjects.Graphics;
  private subtitleTxt!: Phaser.GameObjects.Text;
  private hintTxt!: Phaser.GameObjects.Text;
  private hintChip!: Phaser.GameObjects.Graphics;

  constructor() { super('TitleScene'); }

  preload(): void {
    CHARACTERS.forEach(c => this.load.image(c.key, c.url));
  }

  create(): void {
    const { width: W, height: H } = this.scale;
    drawBg(this);
    this.decorateBg(W, H);

    this.add.text(W / 2, 96, "🐰 Who's That, Aya?", {
      fontFamily: F.head, fontSize: '32px', color: T.main, align: 'center',
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);

    this.subtitleTxt = this.add.text(W / 2, 142, '', {
      fontFamily: F.body, fontSize: '14px', color: T.sub,
      align: 'center', fontStyle: 'bold',
      lineSpacing: 3,
    }).setOrigin(0.5);

    // Soft pedestal grounds the silhouette so it doesn't float on a blank
    // canvas — two stacked ellipses read as a spotlight beneath the figure.
    this.heroPedestal = this.add.graphics();
    this.drawPedestal(W / 2, 322);

    // Hero silhouette — Bing image OR darkened animal emoji, swapped on mode change
    this.heroBing = this.add.image(W / 2, 250, 'bing').setDisplaySize(120, 155);
    this.heroBing.setTint(0x2d1b3d).setTintMode(Phaser.TintModes.FILL);
    this.heroAnimal = this.add.text(W / 2, 250, '🐼', {
      fontFamily: F.body, fontSize: '120px',
    }).setOrigin(0.5);
    this.heroAnimal.setTint(0x2d1b3d).setTintMode(Phaser.TintModes.FILL);

    this.tweens.add({
      targets: [this.heroBing, this.heroAnimal],
      scale: '+=0.06', yoyo: true, repeat: -1, duration: 1250, ease: 'Sine.InOut',
    });

    // Mode picker — section chip instead of plain all-caps label
    this.sectionLabel(W / 2, 368, 'CHOOSE GAME');

    const modeW = 150, modeH = 62, modeGap = 16;
    this.bingModeBtn = this.buildPickerBtn(
      W / 2 - modeW / 2 - modeGap / 2, 412, modeW, modeH,
      '🐰 Bing', 'Guess the friend',
      () => this.selectMode('bing'),
    );
    this.animalModeBtn = this.buildPickerBtn(
      W / 2 + modeW / 2 + modeGap / 2, 412, modeW, modeH,
      '🐾 Animal', 'Guess the emoji',
      () => this.selectMode('animal'),
    );

    // Difficulty picker
    this.sectionLabel(W / 2, 486, 'CHOOSE DIFFICULTY');

    const diffW = 150, diffH = 62, diffGap = 16;
    this.easyBtn = this.buildPickerBtn(
      W / 2 - diffW / 2 - diffGap / 2, 530, diffW, diffH,
      'Easy',
      `${MODE.easy.optionCount} choices · ${MODE.easy.roundMs / 1000}s`,
      () => this.selectDifficulty('easy'),
    );
    this.hardBtn = this.buildPickerBtn(
      W / 2 + diffW / 2 + diffGap / 2, 530, diffW, diffH,
      'Hard',
      `${MODE.hard.optionCount} choices · ${MODE.hard.roundMs / 1000}s`,
      () => this.selectDifficulty('hard'),
    );

    // Hint chip — a small pill wraps the hint so it reads as a footer, not
    // orphaned text floating above the CTA.
    this.hintChip = this.add.graphics();
    this.hintTxt = this.add.text(W / 2, 616, '', {
      fontFamily: F.body, fontSize: '13px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);

    this.selectMode('bing');
    this.selectDifficulty('easy');

    primaryBtn(this, W / 2, H - 90, 340, 62, "Let's Guess! 🎉", () => {
      this.scene.start('GameScene', { difficulty: this.difficulty, gameMode: this.gameMode });
    });
  }

  private decorateBg(W: number, H: number): void {
    // Scattered magnifying-glass + paw marks echo the "detective/who's that"
    // motif without competing with the hero silhouette.
    const marks = [
      { x: 42,      y: 180, c: '🔍', s: 28, r: -14, a: 0.12 },
      { x: W - 48,  y: 160, c: '🐾', s: 30, r: 12,  a: 0.12 },
      { x: 34,      y: H - 220, c: '🐾', s: 26, r: -8, a: 0.10 },
      { x: W - 42,  y: H - 240, c: '🔍', s: 26, r: 6, a: 0.10 },
      { x: 32,      y: 326, c: '✨', s: 22, r: 0, a: 0.18 },
      { x: W - 34,  y: 326, c: '✨', s: 22, r: 0, a: 0.18 },
    ];
    marks.forEach(m => {
      this.add.text(m.x, m.y, m.c, {
        fontFamily: F.body, fontSize: `${m.s}px`,
      }).setOrigin(0.5).setAlpha(m.a).setRotation(m.r * Math.PI / 180);
    });
  }

  private drawPedestal(cx: number, cy: number): void {
    const g = this.heroPedestal;
    g.clear();
    g.fillStyle(C.lavender, 0.16);
    g.fillEllipse(cx, cy, 220, 34);
    g.fillStyle(C.lavender, 0.28);
    g.fillEllipse(cx, cy, 160, 22);
  }

  private sectionLabel(cx: number, cy: number, text: string): void {
    // A small pill chip gives sections a polished, labeled feel — plain
    // all-caps text looked like placeholder content.
    const w = 170, h = 22;
    const bg = this.add.graphics();
    bg.fillStyle(C.white, 0.85);
    bg.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
    bg.lineStyle(1.5, C.lavender, 0.5);
    bg.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
    this.add.text(cx, cy, text, {
      fontFamily: F.body, fontSize: '11px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);
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
      // Subtle lift shadow + pink fill — the active state should feel
      // distinctly pressed in.
      bg.fillStyle(C.shadow, 0.18);
      bg.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 18);
      bg.fillStyle(C.pink, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
      titleTxt.setColor(T.white);
      subTxt.setColor('rgba(255,255,255,0.85)');
    } else {
      bg.fillStyle(C.white, 1);
      bg.lineStyle(2.5, C.lavender, 0.9);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);
      titleTxt.setColor(T.main);
      subTxt.setColor(T.sub);
    }
  }

  private drawHintChip(text: string): void {
    this.hintTxt.setText(text);
    const chipPadX = 14, chipH = 28;
    const w = this.hintTxt.width + chipPadX * 2;
    const cx = this.hintTxt.x, cy = this.hintTxt.y;
    this.hintChip.clear();
    this.hintChip.fillStyle(C.white, 0.7);
    this.hintChip.fillRoundedRect(cx - w / 2, cy - chipH / 2, w, chipH, chipH / 2);
    this.hintChip.lineStyle(1.5, C.lavender, 0.5);
    this.hintChip.strokeRoundedRect(cx - w / 2, cy - chipH / 2, w, chipH, chipH / 2);
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
      this.drawHintChip(`${MODE.easy.rounds} mystery friends await 🕵️`);
    } else {
      // Pick a fresh animal preview each time Animal is tapped so the user
      // gets a feel for the silhouette-guessing flow before starting.
      const preview = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
      this.heroAnimal.setText(preview.emoji);
      this.heroAnimal.setTint(0x2d1b3d).setTintMode(Phaser.TintModes.FILL);
      this.subtitleTxt.setText('Guess the animal\nfrom its shadow! 🐾');
      this.drawHintChip(`${MODE.easy.rounds} mystery critters await 🔍`);
    }
  }
}

interface PickerRefs {
  bg: Phaser.GameObjects.Graphics;
  titleTxt: Phaser.GameObjects.Text;
  subTxt: Phaser.GameObjects.Text;
  w: number; h: number;
}
