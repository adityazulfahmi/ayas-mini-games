import Phaser from 'phaser';
import { drawBg, launchConfetti } from '@shared/phaserUtils';
import { createEndPopup } from '@shared/endPopup';
import { C, T, F } from '@shared/theme';
import { sounds } from '@shared/audio';

const W = 440, H = 720;
const BOARD_SIZE = 340;
const BOARD_X = (W - BOARD_SIZE) / 2;
const BOARD_Y = 270;
const CELL = (BOARD_SIZE - 2 * 10) / 3; // gap=10

const WINNING_LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];

type Player = 1 | 2;
type Cell = Player | null;
const CONFETTI = ['🐱','🐰','🎀','✨','🌟','💖','🎊'];

export class GameScene extends Phaser.Scene {
  private names: [string, string] = ['Player 1', 'Player 2'];
  private board: Cell[] = Array(9).fill(null);
  private currentPlayer: Player = 1;
  private scores: [number, number] = [0, 0];
  private gameOver = false;

  private cellBgs: Phaser.GameObjects.Graphics[] = [];
  private cellTxts: Phaser.GameObjects.Text[] = [];
  private statusTxt!: Phaser.GameObjects.Text;
  private statusBg!: Phaser.GameObjects.Graphics;
  private scoreTxts: [Phaser.GameObjects.Text, Phaser.GameObjects.Text] = [] as unknown as [Phaser.GameObjects.Text, Phaser.GameObjects.Text];
  private scoreCards: [Phaser.GameObjects.Graphics, Phaser.GameObjects.Graphics] = [] as unknown as [Phaser.GameObjects.Graphics, Phaser.GameObjects.Graphics];
  private endOverlay!: ReturnType<typeof createEndPopup>;

  constructor() { super('GameScene'); }

  init(data: { names?: [string, string] }): void {
    if (data?.names) this.names = data.names;
  }

  create(): void {
    drawBg(this);
    this.board = Array(9).fill(null);
    this.currentPlayer = 1;
    this.scores = [0, 0];
    this.gameOver = false;
    // Phaser reuses the scene instance, so .push()-populated fields must be
    // cleared here — otherwise a Menu → GameScene round-trip leaves stale
    // destroyed Graphics/Text in the arrays and later setText crashes.
    this.cellBgs = [];
    this.cellTxts = [];

    this.buildHeader();
    this.buildScoreboard();
    this.buildStatus();
    this.buildBoard();
    this.endOverlay = createEndPopup(this, W, H, {
      onPlayAgain: () => { this.endOverlay.hide(); this.newGame(); },
      onHome:      () => this.scene.start('TitleScene'),
      onAllGames:  () => { window.location.href = '../'; },
    });
  }

  private buildHeader(): void {
    this.add.text(W / 2, 30, '🐱 Tic-Tac-Toe', {
      fontFamily: F.head, fontSize: '24px', color: T.main,
    }).setOrigin(0.5);

    // Restart button
    const bg = this.add.graphics();
    bg.lineStyle(2, C.pink, 1);
    bg.fillStyle(C.white, 1);
    bg.fillRoundedRect(-45, -15, 90, 30, 12);
    bg.strokeRoundedRect(-45, -15, 90, 30, 12);
    const txt = this.add.text(0, 0, '↩ Restart', {
      fontFamily: F.head, fontSize: '15px', color: T.main,
    }).setOrigin(0.5);
    const btn = this.add.container(W - 58, 30, [bg, txt]);
    btn.setSize(90, 30).setInteractive({ cursor: 'pointer' });
    btn.on('pointerdown', () => this.newGame());
  }

  private buildScoreboard(): void {
    const cardW = 150, cardH = 80, cY = 105;

    this.scoreCards = [0, 1].map(p => {
      const x = p === 0 ? W / 2 - 90 : W / 2 + 90;
      const g = this.add.graphics().setPosition(x, cY);
      this.drawScoreCard(g, cardW, cardH, p === 0 ? 1 : 0);
      return g;
    }) as [Phaser.GameObjects.Graphics, Phaser.GameObjects.Graphics];

    const syms = ['🐱', '🐰'];
    this.scoreTxts = [0, 1].map(p => {
      const x = p === 0 ? W / 2 - 90 : W / 2 + 90;
      this.add.text(x, cY - 22, syms[p], { fontSize: '22px' }).setOrigin(0.5);
      const nameTxt = this.add.text(x, cY - 2, this.names[p].substring(0, 10), {
        fontFamily: F.body, fontSize: '11px', color: T.sub, fontStyle: 'bold',
      }).setOrigin(0.5);
      void nameTxt;
      return this.add.text(x, cY + 22, '0', {
        fontFamily: F.head, fontSize: '26px', color: T.main,
      }).setOrigin(0.5);
    }) as [Phaser.GameObjects.Text, Phaser.GameObjects.Text];

    this.add.text(W / 2, cY, 'VS', {
      fontFamily: F.head, fontSize: '18px', color: T.sub,
    }).setOrigin(0.5);
  }

  private drawScoreCard(g: Phaser.GameObjects.Graphics, w: number, h: number, border: 0 | 1): void {
    g.clear();
    if (border === 1) {
      g.lineStyle(2.5, C.pink, 1);
    } else {
      g.lineStyle(2.5, C.white, 0);
    }
    g.fillStyle(C.white, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
    if (border) g.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
  }

  private buildStatus(): void {
    this.statusBg = this.add.graphics().setPosition(W / 2, 175);
    this.statusTxt = this.add.text(W / 2, 175, '', {
      fontFamily: F.head, fontSize: '20px', color: T.main,
    }).setOrigin(0.5);
    this.updateStatus();
  }

  private updateStatus(): void {
    const sym = this.currentPlayer === 1 ? '🐱' : '🐰';
    const color = this.currentPlayer === 1 ? 0xfce4ec : 0xede7f6;
    const txtColor = this.currentPlayer === 1 ? '#f06292' : '#9c4dcc';
    const text = `${sym} ${this.names[this.currentPlayer - 1]}'s turn`;

    const w = Math.max(240, text.length * 13 + 40), h = 40;
    this.statusBg.clear();
    this.statusBg.fillStyle(color, 1);
    this.statusBg.fillRoundedRect(-w / 2, -h / 2, w, h, 20);
    this.statusTxt.setText(text).setColor(txtColor);
  }

  private setStatusWin(name: string, sym: string): void {
    const w = 280, h = 40;
    this.statusBg.clear();
    this.statusBg.fillStyle(C.mintBg, 1);
    this.statusBg.fillRoundedRect(-w / 2, -h / 2, w, h, 20);
    this.statusTxt.setText(`${sym} ${name} wins!`).setColor('#00897b');
  }

  private setStatusDraw(): void {
    const w = 240, h = 40;
    this.statusBg.clear();
    this.statusBg.fillStyle(0xf5f5f5, 1);
    this.statusBg.fillRoundedRect(-w / 2, -h / 2, w, h, 20);
    this.statusTxt.setText("It's a draw! 🤝").setColor('#757575');
  }

  private buildBoard(): void {
    const gap = 10;
    for (let i = 0; i < 9; i++) {
      const col = i % 3, row = Math.floor(i / 3);
      const cx = BOARD_X + col * (CELL + gap) + CELL / 2;
      const cy = BOARD_Y + row * (CELL + gap) + CELL / 2;

      const bg = this.add.graphics().setPosition(cx, cy);
      bg.fillStyle(C.white, 1);
      bg.fillRoundedRect(-CELL / 2, -CELL / 2, CELL, CELL, 18);
      this.cellBgs.push(bg);

      const txt = this.add.text(cx, cy, '', { fontSize: '56px' }).setOrigin(0.5);
      this.cellTxts.push(txt);

      const zone = this.add.zone(cx, cy, CELL, CELL).setInteractive({ cursor: 'pointer' });
      zone.on('pointerover', () => {
        if (!this.board[i] && !this.gameOver) {
          bg.clear();
          bg.fillStyle(this.currentPlayer === 1 ? 0xfce4ec : 0xede7f6, 1);
          bg.fillRoundedRect(-CELL / 2, -CELL / 2, CELL, CELL, 18);
        }
      });
      zone.on('pointerout', () => {
        if (!this.board[i]) {
          bg.clear();
          bg.fillStyle(C.white, 1);
          bg.fillRoundedRect(-CELL / 2, -CELL / 2, CELL, CELL, 18);
        }
      });
      zone.on('pointerdown', () => this.onCellClick(i, cx, cy));
    }
  }

  private onCellClick(i: number, cx: number, cy: number): void {
    if (this.gameOver || this.board[i]) return;

    this.board[i] = this.currentPlayer;
    const sym = this.currentPlayer === 1 ? '🐱' : '🐰';
    this.cellTxts[i].setText(sym);

    const bg = this.cellBgs[i];
    bg.clear();
    bg.fillStyle(this.currentPlayer === 1 ? 0xfce4ec : 0xede7f6, 1);
    bg.fillRoundedRect(-CELL / 2, -CELL / 2, CELL, CELL, 18);

    // Pop animation
    this.tweens.add({ targets: this.cellTxts[i], scaleX: 1.3, scaleY: 1.3, yoyo: true, duration: 150 });
    sounds.place();

    const winLine = this.checkWin();
    if (winLine) {
      this.highlightWin(winLine);
      this.scores[this.currentPlayer - 1]++;
      this.scoreTxts[this.currentPlayer - 1].setText(String(this.scores[this.currentPlayer - 1]));
      this.time.delayedCall(500, () => this.showWinOverlay(false));
      return;
    }

    if (this.board.every(v => v !== null)) {
      this.gameOver = true;
      sounds.draw();
      this.setStatusDraw();
      this.time.delayedCall(500, () => this.showWinOverlay(true));
      return;
    }

    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
    this.updateStatus();
    this.updateActiveCard();
  }

  private checkWin(): number[] | null {
    for (const line of WINNING_LINES) {
      const [a, b, c] = line;
      if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) return line;
    }
    return null;
  }

  private highlightWin(line: number[]): void {
    this.gameOver = true;
    sounds.win();
    const sym = this.currentPlayer === 1 ? '🐱' : '🐰';
    this.setStatusWin(this.names[this.currentPlayer - 1], sym);

    line.forEach(i => {
      const bg = this.cellBgs[i];
      bg.clear();
      bg.lineStyle(3, C.mint, 1);
      bg.fillStyle(C.mintBg, 1);
      bg.fillRoundedRect(-CELL / 2, -CELL / 2, CELL, CELL, 18);
      bg.strokeRoundedRect(-CELL / 2, -CELL / 2, CELL, CELL, 18);
      this.tweens.add({ targets: bg, scaleX: 1.1, scaleY: 1.1, yoyo: true, duration: 250 });
    });
  }

  private updateActiveCard(): void {
    [0, 1].forEach(p => {
      this.drawScoreCard(this.scoreCards[p], 150, 80, this.currentPlayer - 1 === p ? 1 : 0);
    });
  }

  private showWinOverlay(isDraw: boolean): void {
    if (isDraw) {
      this.endOverlay.show({
        emoji: '🤝',
        title: "It's a Draw!",
        subtitle: 'Great game, both of you! 💖',
      });
    } else {
      const winner = this.currentPlayer - 1;
      const sym = this.currentPlayer === 1 ? '🐱' : '🐰';
      this.endOverlay.show({
        emoji: sym,
        title: `${this.names[winner]} wins!`,
        subtitle: "Incredible! You're amazing! 🌟",
        score: {
          value: `${this.scores[0]} – ${this.scores[1]}`,
          label: `${this.names[0]} vs ${this.names[1]}`,
        },
      });
      launchConfetti(this, CONFETTI);
    }
  }

  private newGame(): void {
    this.board = Array(9).fill(null);
    this.currentPlayer = 1;
    this.gameOver = false;

    this.cellTxts.forEach(t => t.setText(''));
    this.cellBgs.forEach(bg => {
      bg.clear();
      bg.fillStyle(C.white, 1);
      bg.fillRoundedRect(-CELL / 2, -CELL / 2, CELL, CELL, 18);
    });

    this.updateStatus();
    this.updateActiveCard();
  }
}
