import Phaser from 'phaser';
import { drawBg, launchConfetti } from '@shared/phaserUtils';
import { createEndPopup } from '@shared/endPopup';
import { C, T, F } from '@shared/theme';
import { playTone } from '@shared/audio';
import {
  W, H, P, Player, Cell, Mode, BOT_NAME,
  findWin, pickBotMove, say, placeSound, cheerSound, tieSound, sparkle, softCard,
} from './helpers';

// Board geometry (logical 420×780 canvas).
const BOARD = 392;
const BX = (W - BOARD) / 2;
const BY = 272;
const PAD = 12;
const GAP = 10;
const CELL = (BOARD - PAD * 2 - GAP * 2) / 3; // 116
const CARD_W = 176, CARD_H = 104, CARD_Y = 138;
const CARD_X: Record<Player, number> = { 1: W / 2 - 102, 2: W / 2 + 102 };
const BANNER_Y = 234;
const IDLE_HINT_MS = 7000;
const BOT_THINK_MS = 1000;

const CONFETTI = ['🐱', '🐰', '🎀', '✨', '🌟', '💖', '🎊'];
const TIE_CONFETTI = ['🙌', '💖', '✨', '🐱', '🐰'];

type CellLook = 'empty' | 'hint' | 1 | 2 | 'win';

interface PlayerCard {
  box: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  emoji: Phaser.GameObjects.Text;
  score: Phaser.GameObjects.Text;
}

export class GameScene extends Phaser.Scene {
  private names: [string, string] = [P[1].animal, P[2].animal];
  private mode: Mode = 'duo';
  private board: Cell[] = Array(9).fill(null);
  private current: Player = 1;
  private starter: Player = 1;
  private scores: [number, number] = [0, 0];
  private gameOver = false;
  private busy = false;
  /** Bumped on every new round so stale delayed callbacks can bail out. */
  private round = 0;
  private hintSpoken = false;

  private centers: { x: number; y: number }[] = [];
  private cellBgs: Phaser.GameObjects.Graphics[] = [];
  private ghosts: Phaser.GameObjects.Text[] = [];
  private pieces: (Phaser.GameObjects.Container | null)[] = [];
  private cards: PlayerCard[] = [];
  private bannerBox!: Phaser.GameObjects.Container;
  private bannerBg!: Phaser.GameObjects.Graphics;
  private bannerTxt!: Phaser.GameObjects.Text;
  private winLine!: Phaser.GameObjects.Graphics;
  private idleTimer: Phaser.Time.TimerEvent | null = null;
  private botTimer: Phaser.Time.TimerEvent | null = null;
  private endOverlay!: ReturnType<typeof createEndPopup>;

  constructor() { super('GameScene'); }

  init(data: { names?: [string, string]; mode?: Mode }): void {
    if (data?.names) this.names = data.names;
    this.mode = data?.mode ?? 'duo';
  }

  create(): void {
    drawBg(this);
    // D-005: Phaser reuses the scene instance — reset every accumulating field.
    this.centers = [];
    this.cellBgs = [];
    this.ghosts = [];
    this.pieces = [];
    this.cards = [];
    this.scores = [0, 0];
    this.starter = 1;
    this.round = 0;
    this.idleTimer = null;
    this.botTimer = null;

    this.buildHeader();
    this.buildCards();
    this.buildBanner();
    this.buildBoard();
    this.buildFooter();
    this.endOverlay = createEndPopup(this, W, H, {
      onPlayAgain: () => { this.endOverlay.hide(); this.newRound(); },
      onHome: () => this.scene.start('TitleScene'),
      onAllGames: () => { window.location.href = '../'; },
    });

    this.newRound();
  }

  private isBot(p: Player): boolean {
    return this.mode === 'bot' && p === 2;
  }

  // ================================================================ layout

  private buildHeader(): void {
    this.add.text(W / 2, 44, 'Tic-Tac-Toe', {
      fontFamily: F.head, fontSize: '28px', color: T.main,
      shadow: { offsetX: 1, offsetY: 2, color: '#f8bbd0', fill: true },
    }).setOrigin(0.5);
    this.roundBtn(42, 44, '🏠', () => this.scene.start('TitleScene'));
    this.roundBtn(W - 42, 44, '🔄', () => {
      if (this.endOverlay.overlay.visible) return;
      this.newRound(true);
    });
  }

  private roundBtn(x: number, y: number, label: string, onTap: () => void): void {
    const r = 26;
    const g = this.add.graphics();
    g.fillStyle(C.shadow, 0.14);
    g.fillCircle(0, 4, r);
    g.fillStyle(C.white, 1);
    g.fillCircle(0, 0, r);
    g.lineStyle(2.5, C.lavender, 1);
    g.strokeCircle(0, 0, r);
    const t = this.add.text(0, 1, label, { fontSize: '24px' }).setOrigin(0.5);
    const c = this.add.container(x, y, [g, t]);
    c.setSize(r * 2 + 8, r * 2 + 8).setInteractive({ cursor: 'pointer' });
    c.on('pointerdown', () => {
      this.tweens.add({ targets: c, scale: 0.88, yoyo: true, duration: 90 });
      onTap();
    });
  }

  private buildCards(): void {
    ([1, 2] as const).forEach(p => {
      const bg = this.add.graphics();
      const emoji = this.add.text(-46, 2, P[p].emoji, { fontSize: '50px' }).setOrigin(0.5);
      const name = this.add.text(26, -18, this.names[p - 1], {
        fontFamily: F.head, fontSize: '18px', color: T.main,
      }).setOrigin(0.5);
      if (name.width > 96) name.setScale(96 / name.width);
      const score = this.add.text(26, 20, '⭐ 0', {
        fontFamily: F.head, fontSize: '24px', color: P[p].text,
      }).setOrigin(0.5);
      const parts: Phaser.GameObjects.GameObject[] = [bg, emoji, name, score];
      if (this.isBot(p)) parts.push(this.add.text(-24, 28, '🤖', { fontSize: '22px' }).setOrigin(0.5));
      const box = this.add.container(CARD_X[p], CARD_Y, parts);
      this.cards[p] = { box, bg, emoji, score };
    });

    const vs = this.add.graphics();
    vs.fillStyle(C.white, 1);
    vs.fillCircle(W / 2, CARD_Y, 19);
    vs.lineStyle(2, C.lavender, 1);
    vs.strokeCircle(W / 2, CARD_Y, 19);
    this.add.text(W / 2, CARD_Y + 1, 'vs', {
      fontFamily: F.head, fontSize: '16px', color: T.sub,
    }).setOrigin(0.5);
  }

  private drawCard(p: Player, active: boolean): void {
    const card = this.cards[p];
    const g = card.bg;
    g.clear();
    if (active) {
      softCard(g, -CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 24, P[p].fill, P[p].edge, 4, 0.2);
    } else {
      softCard(g, -CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 24, C.white, undefined, 0, 0.08);
    }
    this.tweens.killTweensOf(card.box);
    this.tweens.killTweensOf(card.emoji);
    card.emoji.setY(2).setAngle(0);
    this.tweens.add({
      targets: card.box, scale: active ? 1.06 : 0.92, alpha: active ? 1 : 0.7,
      duration: 260, ease: 'Back.Out',
    });
    if (active) {
      this.tweens.add({
        targets: card.emoji, y: -6, yoyo: true, repeat: -1, duration: 520, ease: 'Sine.InOut',
      });
    }
  }

  private buildBanner(): void {
    this.bannerBg = this.add.graphics();
    this.bannerTxt = this.add.text(0, 1, '', {
      fontFamily: F.head, fontSize: '24px', color: T.main,
    }).setOrigin(0.5);
    this.bannerBox = this.add.container(W / 2, BANNER_Y, [this.bannerBg, this.bannerTxt]);
  }

  private setBanner(text: string, fill: number, edge: number, color: string): void {
    this.bannerTxt.setText(text).setColor(color).setScale(1);
    if (this.bannerTxt.width > 330) this.bannerTxt.setScale(330 / this.bannerTxt.width);
    const w = Math.max(250, Math.min(370, this.bannerTxt.displayWidth + 56)), h = 54;
    this.bannerBg.clear();
    softCard(this.bannerBg, -w / 2, -h / 2, w, h, h / 2, fill, edge, 3, 0.14);
    this.tweens.killTweensOf(this.bannerBox);
    this.bannerBox.setScale(0.85);
    this.tweens.add({ targets: this.bannerBox, scale: 1, duration: 320, ease: 'Back.Out' });
  }

  private buildBoard(): void {
    const g = this.add.graphics();
    softCard(g, BX, BY, BOARD, BOARD, 30, C.white, C.lavender, 3, 0.16);

    for (let i = 0; i < 9; i++) {
      const col = i % 3, row = Math.floor(i / 3);
      const cx = BX + PAD + col * (CELL + GAP) + CELL / 2;
      const cy = BY + PAD + row * (CELL + GAP) + CELL / 2;
      this.centers.push({ x: cx, y: cy });

      const bg = this.add.graphics().setPosition(cx, cy);
      this.cellBgs.push(bg);
      this.drawCell(i, 'empty');

      const ghost = this.add.text(cx, cy + 2, '', { fontSize: '62px' }).setOrigin(0.5).setAlpha(0);
      this.ghosts.push(ghost);
      this.pieces.push(null);

      // Hit zone covers the cell plus half the gutter on each side — forgiving taps.
      const zone = this.add.zone(cx, cy, CELL + GAP, CELL + GAP).setInteractive({ cursor: 'pointer' });
      zone.on('pointerover', () => {
        if (this.canHumanTap() && !this.board[i]) {
          ghost.setText(P[this.current].emoji).setAlpha(0.3).setScale(1);
          this.drawCell(i, 'hint');
        }
      });
      zone.on('pointerout', () => {
        if (!this.board[i]) {
          ghost.setAlpha(0);
          this.drawCell(i, 'empty');
        }
      });
      zone.on('pointerdown', () => {
        if (!this.canHumanTap()) return;
        if (this.board[i]) {
          // Gentle "already taken" wiggle, no error sound.
          const piece = this.pieces[i];
          if (piece) this.tweens.add({ targets: piece, angle: { from: -8, to: 8 }, yoyo: true, repeat: 1, duration: 70, onComplete: () => piece.setAngle(0) });
          return;
        }
        this.place(i);
      });
    }

    this.winLine = this.add.graphics().setDepth(15);
  }

  private drawCell(i: number, look: CellLook): void {
    const g = this.cellBgs[i];
    const r = 22, s = CELL;
    g.clear();
    let fill: number = 0xfff3f8, edge: number = 0xf3e5f5, edgeW = 2;
    if (look === 'hint') { fill = P[this.current].fill; edge = P[this.current].edge; edgeW = 3; }
    else if (look === 1 || look === 2) { fill = P[look].fill; edge = P[look].disc; edgeW = 3; }
    else if (look === 'win') { fill = C.mintBg; edge = C.mint; edgeW = 4; }
    g.fillStyle(fill, 1);
    g.fillRoundedRect(-s / 2, -s / 2, s, s, r);
    // Soft glossy highlight on the top half so empty cells don't read as flat blanks.
    g.fillStyle(0xffffff, look === 'empty' ? 0.55 : 0.3);
    g.fillRoundedRect(-s / 2 + 10, -s / 2 + 6, s - 20, s * 0.2, 12);
    g.lineStyle(edgeW, edge, 1);
    g.strokeRoundedRect(-s / 2, -s / 2, s, s, r);
    if (look === 'empty') {
      // A tiny paw-dot cluster as a "tap me" texture.
      g.fillStyle(0xf8bbd0, 0.45);
      g.fillCircle(0, 10, 7);
      g.fillCircle(-9, -2, 3.5);
      g.fillCircle(0, -6, 3.5);
      g.fillCircle(9, -2, 3.5);
    }
  }

  private buildFooter(): void {
    const label = this.mode === 'bot'
      ? `🤖 1 player · ${BOT_NAME} is Bunny 🐰`
      : '👫 2 players · take turns!';
    const w = 300, h = 38, y = 718;
    const g = this.add.graphics();
    g.fillStyle(C.white, 0.75);
    g.fillRoundedRect(W / 2 - w / 2, y - h / 2, w, h, h / 2);
    g.lineStyle(1.5, C.lavender, 0.6);
    g.strokeRoundedRect(W / 2 - w / 2, y - h / 2, w, h, h / 2);
    this.add.text(W / 2, y, label, {
      fontFamily: F.body, fontSize: '15px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  // ================================================================ flow

  private canHumanTap(): boolean {
    return !this.gameOver && !this.busy && !this.isBot(this.current) && !this.endOverlay.overlay.visible;
  }

  private newRound(manual = false): void {
    this.round++;
    this.botTimer?.remove();
    this.idleTimer?.remove();
    this.botTimer = null;
    this.idleTimer = null;
    this.board = Array(9).fill(null);
    this.gameOver = false;
    this.busy = false;
    this.hintSpoken = false;
    this.winLine.clear();
    this.pieces.forEach(pc => pc?.destroy());
    this.pieces = Array(9).fill(null);
    this.ghosts.forEach(g => { this.tweens.killTweensOf(g); g.setAlpha(0); });
    for (let i = 0; i < 9; i++) {
      this.drawCell(i, 'empty');
      this.cellBgs[i].setScale(1);
    }
    // Two players take turns going first; vs Papa-bot the child always starts.
    // A manual restart keeps the same starter for the replayed round.
    if (this.mode === 'duo' && !manual && this.round > 1) this.starter = this.starter === 1 ? 2 : 1;
    this.current = this.mode === 'bot' ? 1 : this.starter;
    this.startTurn(true);
  }

  private startTurn(first = false): void {
    const p = this.current;
    this.drawCard(1, p === 1);
    this.drawCard(2, p === 2);
    this.idleTimer?.remove();
    this.idleTimer = null;

    if (this.isBot(p)) {
      this.setBanner(`🤖 ${BOT_NAME} is thinking…`, P[2].fill, P[2].edge, P[2].text);
      this.busy = true;
      const round = this.round;
      this.tweens.add({ targets: this.cards[2].emoji, angle: { from: -10, to: 10 }, yoyo: true, repeat: 3, duration: 140 });
      this.botTimer = this.time.delayedCall(BOT_THINK_MS, () => {
        if (round !== this.round || this.gameOver) return;
        this.busy = false;
        this.place(pickBotMove(this.board, 2, 1));
      });
      return;
    }

    const name = this.names[p - 1];
    const solo = this.mode === 'bot';
    this.setBanner(
      solo ? `${P[p].emoji} Your turn, ${name}!` : `${P[p].emoji} ${name}'s turn!`,
      P[p].fill, P[p].edge, P[p].text,
    );
    if (!first || this.mode === 'duo') say(solo ? 'Your turn!' : `${name}'s turn!`);
    this.scheduleIdleHint();
  }

  /** If nobody taps for a while, the empty cells glow with a faint ghost piece. */
  private scheduleIdleHint(): void {
    const round = this.round;
    this.idleTimer = this.time.addEvent({
      delay: IDLE_HINT_MS, loop: true,
      callback: () => {
        if (round !== this.round || !this.canHumanTap()) return;
        const emoji = P[this.current].emoji;
        this.board.forEach((v, i) => {
          if (v) return;
          const gh = this.ghosts[i];
          gh.setText(emoji).setAlpha(0).setScale(0.7);
          this.tweens.add({
            targets: gh, alpha: 0.45, scale: 1, yoyo: true, hold: 500,
            duration: 380, delay: i * 50, ease: 'Sine.Out',
          });
        });
        if (!this.hintSpoken) {
          this.hintSpoken = true;
          say(`Tap a square, ${this.names[this.current - 1]}!`);
        }
      },
    });
  }

  private place(i: number): void {
    if (this.gameOver || this.board[i]) return;
    const p = this.current;
    this.board[i] = p;
    this.idleTimer?.remove();
    this.idleTimer = null;

    const { x, y } = this.centers[i];
    const ghost = this.ghosts[i];
    this.tweens.killTweensOf(ghost);
    ghost.setAlpha(0);
    this.drawCell(i, p);

    const disc = this.add.graphics();
    disc.fillStyle(P[p].disc, 1);
    disc.fillCircle(0, 4, 46);
    disc.fillStyle(0xffffff, 0.45);
    disc.fillCircle(0, 0, 42);
    const face = this.add.text(0, 2, P[p].emoji, { fontSize: '66px' }).setOrigin(0.5);
    const piece = this.add.container(x, y, [disc, face]).setDepth(10).setScale(0);
    this.pieces[i] = piece;

    // Drop-in bounce with a little squash on landing.
    piece.y = y - 30;
    this.tweens.add({ targets: piece, y, scale: 1, duration: 360, ease: 'Back.Out' });
    this.tweens.add({
      targets: piece, scaleX: 1.14, scaleY: 0.88, delay: 360, duration: 90, yoyo: true, ease: 'Sine.Out',
    });
    this.tweens.add({ targets: this.cellBgs[i], scale: 0.94, yoyo: true, duration: 110, delay: 300 });
    placeSound(p);
    this.time.delayedCall(300, () => sparkle(this, x, y, P[p].edge, 8, 72));

    const line = findWin(this.board);
    if (line) { this.onWin(p, line); return; }
    if (this.board.every(v => v !== null)) { this.onTie(); return; }

    this.current = p === 1 ? 2 : 1;
    // Small pause so the piece lands before the turn indicator swaps.
    const round = this.round;
    this.busy = true;
    this.time.delayedCall(380, () => {
      if (round !== this.round) return;
      this.busy = false;
      this.startTurn();
    });
  }

  // ================================================================ endings

  private onWin(p: Player, line: number[]): void {
    this.gameOver = true;
    this.busy = true;
    const round = this.round;
    const name = this.names[p - 1];
    const botWon = this.isBot(p);
    const loser: Player = p === 1 ? 2 : 1;

    this.scores[p - 1]++;
    this.drawCard(p, true);
    this.drawCard(loser, false);

    this.time.delayedCall(420, () => {
      if (round !== this.round) return;
      this.drawWinLine(line, p);
      line.forEach((i, n) => {
        this.drawCell(i, 'win');
        const pc = this.pieces[i];
        if (!pc) return;
        this.tweens.add({
          targets: pc, y: this.centers[i].y - 16, yoyo: true, repeat: 3,
          duration: 200, delay: 260 + n * 110, ease: 'Sine.Out',
        });
      });
      this.pieces.forEach((pc, i) => {
        if (pc && !line.includes(i)) this.tweens.add({ targets: pc, alpha: 0.4, duration: 300 });
      });

      const sc = this.cards[p].score;
      sc.setText(`⭐ ${this.scores[p - 1]}`);
      this.tweens.add({ targets: sc, scale: 1.5, yoyo: true, duration: 220, ease: 'Back.Out' });
      sparkle(this, CARD_X[p] + 26, CARD_Y + 20, 0xffd54f, 10, 60);

      if (botWon) {
        this.setBanner(`🐰 ${BOT_NAME} got three!`, P[2].fill, P[2].edge, P[2].text);
        playTone(587, 0.16, 'triangle', 0.14);
        playTone(784, 0.24, 'triangle', 0.14, 0.16);
        say(`${BOT_NAME} got three in a row! Good try, ${this.names[0]}!`);
      } else {
        this.setBanner(`🎉 ${name} wins! 🎉`, C.mintBg, C.mint, T.mint);
        cheerSound();
        say(`Yay! ${name} wins!`);
        launchConfetti(this, CONFETTI);
      }
    });

    this.time.delayedCall(2600, () => {
      if (round !== this.round) return;
      this.endOverlay.show({
        emoji: botWon ? '🤖' : P[p].emoji,
        title: botWon ? `${BOT_NAME} wins!` : `${name} wins!`,
        subtitle: botWon ? 'Good try! Let\'s play again 💖' : 'Three in a row — amazing! 🌟',
        score: this.scorePill(),
      });
    });
  }

  private drawWinLine(line: number[], p: Player): void {
    const a = this.centers[line[0]], b = this.centers[line[2]];
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len;
    const ext = 44;
    const sx = a.x - ux * ext, sy = a.y - uy * ext;
    const total = len + ext * 2;
    this.tweens.addCounter({
      from: 0, to: 1, duration: 520, ease: 'Cubic.Out',
      onUpdate: tw => {
        const v = tw.getValue() ?? 0;
        const ex = sx + ux * total * v, ey = sy + uy * total * v;
        const g = this.winLine;
        g.clear();
        g.lineStyle(22, C.shadow, 0.18);
        g.lineBetween(sx, sy + 4, ex, ey + 4);
        g.lineStyle(18, P[p].edge, 0.92);
        g.lineBetween(sx, sy, ex, ey);
        g.fillStyle(P[p].edge, 0.92);
        g.fillCircle(sx, sy, 9);
        g.fillCircle(ex, ey, 9);
        g.lineStyle(6, C.white, 0.6);
        g.lineBetween(sx, sy, ex, ey);
      },
    });
  }

  private onTie(): void {
    this.gameOver = true;
    this.busy = true;
    const round = this.round;
    this.time.delayedCall(420, () => {
      if (round !== this.round) return;
      this.setBanner('🙌 It\'s a tie! High five!', C.mintBg, C.mint, T.mint);
      tieSound();
      say('It\'s a tie! High five!');
      // Everyone hops together — a tie is a happy ending too.
      this.pieces.forEach((pc, i) => {
        if (!pc) return;
        this.tweens.add({
          targets: pc, y: this.centers[i].y - 14, yoyo: true, repeat: 2,
          duration: 220, delay: (i % 3) * 70, ease: 'Sine.Out',
        });
      });
      ([1, 2] as const).forEach(p => {
        this.drawCard(p, true);
      });
      launchConfetti(this, TIE_CONFETTI);
    });
    this.time.delayedCall(2100, () => {
      if (round !== this.round) return;
      this.endOverlay.show({
        emoji: '🙌',
        title: "It's a Tie!",
        subtitle: `${this.names[0]} and ${this.names[1]} both played great! 💖`,
        score: this.scorePill(),
      });
    });
  }

  private scorePill(): { value: string; label: string } {
    const n1 = this.names[0];
    const n2 = this.names[1];
    return { value: `${this.scores[0]} – ${this.scores[1]}`, label: `${n1} vs ${n2}` };
  }
}
