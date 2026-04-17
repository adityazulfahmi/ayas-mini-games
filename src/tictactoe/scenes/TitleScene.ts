import Phaser from 'phaser';
import { drawBg, primaryBtn, bounceLoop } from '@shared/phaserUtils';
import { C, T, F } from '@shared/theme';

const W = 440, H = 720;

export class TitleScene extends Phaser.Scene {
  private input1!: Phaser.GameObjects.DOMElement;
  private input2!: Phaser.GameObjects.DOMElement;

  constructor() { super('TitleScene'); }

  create(): void {
    drawBg(this);

    this.add.text(W / 2, 100, '🌸 Aya\'s\nTic-Tac-Toe', {
      fontFamily: F.head, fontSize: '44px', color: T.main,
      align: 'center',
      shadow: { offsetX: 2, offsetY: 3, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);

    this.add.text(W / 2, 185, 'Two players, one winner! Ready to play? 🎀', {
      fontFamily: F.body, fontSize: '17px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);

    // Preview board (3x3 grid of small cells)
    const boardCX = W / 2, boardCY = 300;
    const cellSz = 52, gap = 6;
    const preview = [['', '🐱', ''], ['🐰', '🐱', '🐰'], ['', '🐰', '']];
    const items: Phaser.GameObjects.Container[] = [];
    preview.flat().forEach((sym, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const x = boardCX - cellSz - gap + col * (cellSz + gap);
      const y = boardCY - cellSz - gap + row * (cellSz + gap);
      const bg = this.add.graphics();
      bg.fillStyle(C.white, 0.95);
      bg.fillRoundedRect(-cellSz / 2, -cellSz / 2, cellSz, cellSz, 10);
      const txt = this.add.text(0, 0, sym, { fontSize: '24px' }).setOrigin(0.5);
      items.push(this.add.container(x, y, [bg, txt]));
    });
    // Only animate filled cells
    bounceLoop(this, [items[1], items[4], items[7]]);

    // Player name section
    this.add.text(W / 2, 418, 'PLAYER NAMES', {
      fontFamily: F.body, fontSize: '13px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);

    // Labels
    this.add.text(W / 2 - 95, 445, '🐱 Player 1', {
      fontFamily: F.body, fontSize: '13px', color: '#f06292', fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    this.add.text(W / 2 + 95, 445, '🐰 Player 2', {
      fontFamily: F.body, fontSize: '13px', color: '#9c4dcc', fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    // DOM inputs (inline style so the pastel look survives Phaser's wrapper)
    const inputStyle = [
      "font-family: 'Nunito', sans-serif",
      'font-size: 16px',
      'font-weight: 600',
      'color: #6a1b9a',
      'padding: 10px 12px',
      'border: 2.5px solid #e1bee7',
      'border-radius: 12px',
      'background: white',
      'outline: none',
      'width: 170px',
      'box-shadow: 0 2px 8px rgba(156,77,204,0.1)',
      'transition: border-color 0.2s',
    ].join(';');

    this.input1 = this.add.dom(W / 2 - 95, 468, 'input', inputStyle).setOrigin(0.5, 0);
    const el1 = this.input1.node as HTMLInputElement;
    el1.placeholder = 'Aya'; el1.maxLength = 12;
    el1.addEventListener('focus', () => { el1.style.borderColor = '#f06292'; });
    el1.addEventListener('blur',  () => { el1.style.borderColor = '#e1bee7'; });

    this.input2 = this.add.dom(W / 2 + 95, 468, 'input', inputStyle).setOrigin(0.5, 0);
    const el2 = this.input2.node as HTMLInputElement;
    el2.placeholder = 'Friend'; el2.maxLength = 12;
    el2.addEventListener('focus', () => { el2.style.borderColor = '#f06292'; });
    el2.addEventListener('blur',  () => { el2.style.borderColor = '#e1bee7'; });

    // Enter key shortcut
    [el1, el2].forEach(el => el.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') this.startGame();
    }));

    primaryBtn(this, W / 2, H - 90, 380, 62, "Let's Play! 🎉", () => this.startGame());
  }

  private startGame(): void {
    const el1 = this.input1.node as HTMLInputElement;
    const el2 = this.input2.node as HTMLInputElement;
    const names: [string, string] = [
      el1.value.trim() || 'Player 1',
      el2.value.trim() || 'Player 2',
    ];
    this.scene.start('GameScene', { names });
  }
}
