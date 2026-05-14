import Phaser from 'phaser';
import { drawBg, launchConfetti } from '@shared/phaserUtils';
import { createEndPopup } from '@shared/endPopup';
import { C, T, F } from '@shared/theme';
import { sounds } from '@shared/audio';
import { shuffle } from '@shared/utils';
import { POOL, CONFETTI_EMOJIS, type CrosswordWord } from '../data';
import { generatePuzzle, GRID_SIZE, type Placement, type Puzzle } from '../generator';

const W = 480, H = 820;
const PAD = 14;

const HEADER_TOP = 14;
const HEADER_H = 60;

const HINT_TOP = HEADER_TOP + HEADER_H + 12;
const HINT_H = 118;

const GRID_TOP = HINT_TOP + HINT_H + 16;
const CELL = 54;
const CELL_GAP = 4;
const GRID_W = GRID_SIZE * CELL + (GRID_SIZE - 1) * CELL_GAP;
const GRID_LEFT = (W - GRID_W) / 2;

const BANK_TOP = GRID_TOP + GRID_W + 24;
const TILE_W = 56;
const TILE_H = 60;
const TILE_GAP = 8;

interface CellNode {
  row: number;
  col: number;
  expected: string;
  filled: string | null;
  bg: Phaser.GameObjects.Graphics;
  letterTxt: Phaser.GameObjects.Text;
  /** Words this cell belongs to — referenced for solved-state styling. */
  words: WordState[];
}

interface WordState {
  placement: Placement;
  cells: CellNode[];
  solved: boolean;
  everWrong: boolean;
}

interface BankTile {
  letter: string;
  container: Phaser.GameObjects.Container;
  /** Stable invisible hit-target. Kept separate from `container` so that
   * scale/shake tweens on the visual never disturb input hit-testing —
   * matches the zone-on-top pattern used by flip-matching and
   * colour-match, which is what makes their taps reliable. */
  zone: Phaser.GameObjects.Zone;
  bg: Phaser.GameObjects.Graphics;
  homeX: number;
  homeY: number;
  used: boolean;
}

export class GameScene extends Phaser.Scene {
  private puzzle!: Puzzle;
  private cellGrid: (CellNode | null)[][] = [];
  private words: WordState[] = [];
  private activeIdx = 0;
  private bankTiles: BankTile[] = [];
  private bankContainer!: Phaser.GameObjects.Container;
  private firstTrySolved = 0;

  private hintEmojiTxt!: Phaser.GameObjects.Text;
  private hintIdTxt!: Phaser.GameObjects.Text;
  private hintWordTxt!: Phaser.GameObjects.Text;
  private hintLenTxt!: Phaser.GameObjects.Text;
  private scoreTxt!: Phaser.GameObjects.Text;

  private endOverlay!: ReturnType<typeof createEndPopup>;
  private locked = false;

  constructor() { super('GameScene'); }

  create(): void {
    // D-005: reset every class-field array on each create() since Phaser
    // reuses the scene instance across scene.start() calls.
    this.cellGrid = [];
    this.words = [];
    this.bankTiles = [];
    this.activeIdx = 0;
    this.firstTrySolved = 0;
    this.locked = false;

    drawBg(this);
    this.puzzle = generatePuzzle(POOL, 3, 5);
    this.buildHeader();
    this.buildHintCard();
    this.buildGrid();
    this.buildBankContainer();
    this.buildEndOverlay();
    this.activateWord(0, /* instant */ true);
  }

  // ───────────────────────────────── HEADER ─────────────────────────────────

  private buildHeader(): void {
    const bg = this.add.graphics();
    bg.fillStyle(C.white, 1);
    bg.fillRoundedRect(PAD, HEADER_TOP, W - PAD * 2, HEADER_H, 18);

    this.add.text(PAD + 18, HEADER_TOP + HEADER_H / 2, "🧩 Aya's Crossword", {
      fontFamily: F.head, fontSize: '21px', color: T.main,
    }).setOrigin(0, 0.5);

    // Restart pill
    const rcx = W - PAD - 22;
    const rcy = HEADER_TOP + HEADER_H / 2;
    const restartBg = this.add.graphics();
    restartBg.lineStyle(2, C.pink, 1);
    restartBg.fillStyle(C.bg1, 1);
    restartBg.fillCircle(rcx, rcy, 18);
    restartBg.strokeCircle(rcx, rcy, 18);
    this.add.text(rcx, rcy, '↻', {
      fontFamily: F.head, fontSize: '22px', color: T.main,
    }).setOrigin(0.5);
    const zone = this.add.zone(rcx, rcy, 40, 40).setInteractive({ cursor: 'pointer' });
    zone.on('pointerdown', () => this.scene.restart());

    // Score pill (centred between title and restart)
    this.scoreTxt = this.add.text(rcx - 56, rcy, this.scoreLabel(), {
      fontFamily: F.head, fontSize: '15px', color: T.sub,
    }).setOrigin(1, 0.5);
  }

  private scoreLabel(): string {
    const total = this.puzzle?.placements.length ?? 0;
    return `${this.firstTrySolved}/${total} ⭐`;
  }

  // ───────────────────────────────── HINT CARD ──────────────────────────────

  private buildHintCard(): void {
    const x = PAD, y = HINT_TOP, w = W - PAD * 2, h = HINT_H;

    // Soft shadow
    const shadow = this.add.graphics();
    shadow.fillStyle(C.shadow, 0.18);
    shadow.fillRoundedRect(x + 2, y + 8, w, h, 22);

    // White card body with a lavender outline so the top edge stays
    // visible against the page's pink-top gradient (the previous pink
    // accent strip blended with the bg and made PETUNJUK look like it
    // was floating above the card).
    const card = this.add.graphics();
    card.fillStyle(C.white, 1);
    card.fillRoundedRect(x, y, w, h, 22);
    card.lineStyle(2, C.lavender, 0.8);
    card.strokeRoundedRect(x, y, w, h, 22);

    // Small pink "PETUNJUK" badge anchored to the top-left of the card
    // — gives the label visual weight without relying on a full-width
    // accent strip in a colour that matches the page background.
    const badgeW = 86, badgeH = 22;
    const badge = this.add.graphics();
    badge.fillStyle(C.pink, 1);
    badge.fillRoundedRect(x + 14, y + 14, badgeW, badgeH, 11);
    this.add.text(x + 14 + badgeW / 2, y + 14 + badgeH / 2, 'PETUNJUK', {
      fontFamily: F.head, fontSize: '11px', color: T.white,
    }).setOrigin(0.5);

    this.hintIdTxt = this.add.text(x + w - 18, y + 14 + badgeH / 2, '', {
      fontFamily: F.head, fontSize: '11px', color: T.sub,
    }).setOrigin(1, 0.5);

    // Emoji
    this.hintEmojiTxt = this.add.text(x + 50, y + 78, '', { fontSize: '46px' }).setOrigin(0.5);

    // Indonesian word (Bahasa)
    this.hintWordTxt = this.add.text(x + 96, y + 68, '', {
      fontFamily: F.head, fontSize: '26px', color: T.main,
    }).setOrigin(0, 0.5);

    // English length hint, e.g. "5 huruf · English"
    this.hintLenTxt = this.add.text(x + 96, y + 96, '', {
      fontFamily: F.body, fontSize: '13px', color: T.sub, fontStyle: 'bold',
    }).setOrigin(0, 0.5);
  }

  // ───────────────────────────────── GRID ───────────────────────────────────

  private buildGrid(): void {
    this.cellGrid = Array.from({ length: GRID_SIZE }, () =>
      Array<CellNode | null>(GRID_SIZE).fill(null),
    );

    // Create cells for every letter position in the puzzle.
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const expected = this.puzzle.letters[r][c];
        if (!expected) continue;
        const cx = GRID_LEFT + c * (CELL + CELL_GAP) + CELL / 2;
        const cy = GRID_TOP + r * (CELL + CELL_GAP) + CELL / 2;

        const bg = this.add.graphics().setPosition(cx, cy);
        const letterTxt = this.add.text(cx, cy, '', {
          fontFamily: F.head, fontSize: '28px', color: T.main,
        }).setOrigin(0.5);

        const node: CellNode = {
          row: r, col: c,
          expected,
          filled: null,
          bg, letterTxt,
          words: [],
        };
        this.cellGrid[r][c] = node;
        this.drawCell(node, 'idle');
      }
    }

    // Build word states and link cells back to their words.
    this.words = this.puzzle.placements.map(placement => {
      const cells: CellNode[] = [];
      const { row, col, dir, word } = placement;
      for (let i = 0; i < word.english.length; i++) {
        const r = row + (dir === 'down'   ? i : 0);
        const c = col + (dir === 'across' ? i : 0);
        const cell = this.cellGrid[r][c]!;
        cells.push(cell);
      }
      const state: WordState = { placement, cells, solved: false, everWrong: false };
      cells.forEach(cell => cell.words.push(state));
      return state;
    });
  }

  /** Per-cell painter. Mode is derived from word membership + active word + solved flags. */
  private drawCell(cell: CellNode, mode: 'idle' | 'active' | 'next' | 'solved' | 'wrong'): void {
    const g = cell.bg;
    g.clear();
    const r = CELL / 2;
    const radius = 12;
    let fill: number = C.cream;
    let border: number = C.lavender;
    let borderWidth = 2;
    if (mode === 'active') { border = C.pink;     borderWidth = 3; }
    if (mode === 'next')   { border = C.pink;     borderWidth = 3; fill = C.bg1; }
    if (mode === 'solved') { border = C.mint;     borderWidth = 2.5; fill = C.mintBg; }
    if (mode === 'wrong')  { border = C.red;      borderWidth = 3; fill = C.bg1; }

    g.fillStyle(fill, 1);
    g.fillRoundedRect(-r, -r, CELL, CELL, radius);
    g.lineStyle(borderWidth, border, 1);
    g.strokeRoundedRect(-r, -r, CELL, CELL, radius);
  }

  // ──────────────────────────────── BANK ────────────────────────────────────

  private buildBankContainer(): void {
    this.bankContainer = this.add.container(0, 0);
  }

  private rebuildBank(word: WordState): void {
    // Tear down previous tiles.
    this.bankContainer.removeAll(true);
    this.bankTiles = [];

    // Letters needed = expected letters of cells that aren't filled yet.
    const needed = word.cells.filter(c => c.filled === null).map(c => c.expected);
    const scrambled = shuffle(needed);
    const n = scrambled.length;
    if (n === 0) return; // word fully solved at activate-time

    const totalW = n * TILE_W + (n - 1) * TILE_GAP;
    const startX = (W - totalW) / 2 + TILE_W / 2;
    const y = BANK_TOP + TILE_H / 2;

    scrambled.forEach((letter, i) => {
      const x = startX + i * (TILE_W + TILE_GAP);
      const bg = this.add.graphics();
      this.drawTileBg(bg, false);
      const txt = this.add.text(0, 0, letter, {
        fontFamily: F.head, fontSize: '30px', color: T.white,
      }).setOrigin(0.5);

      const container = this.add.container(x, y, [bg, txt]);

      // Separate zone for input — never tweened, so hit-testing is
      // never racing against a moving/scaling target.
      const zone = this.add.zone(x, y, TILE_W, TILE_H).setInteractive({ cursor: 'pointer' });

      const tile: BankTile = { letter, container, zone, bg, homeX: x, homeY: y, used: false };
      zone.on('pointerdown', () => this.onBankTap(tile));
      zone.on('pointerover', () => {
        if (tile.used) return;
        this.tweens.add({ targets: container, scale: 1.06, duration: 120 });
      });
      zone.on('pointerout', () => {
        if (tile.used) return;
        this.tweens.add({ targets: container, scale: 1, duration: 120 });
      });

      this.bankContainer.add([container, zone]);
      this.bankTiles.push(tile);
    });
  }

  private drawTileBg(g: Phaser.GameObjects.Graphics, pressed: boolean): void {
    g.clear();
    // Drop shadow
    g.fillStyle(C.shadow, 0.22);
    g.fillRoundedRect(-TILE_W / 2 + 2, -TILE_H / 2 + 6, TILE_W, TILE_H, 16);
    // Body — gradient simulated by overlaying two rounded rects
    g.fillStyle(C.pink, 1);
    g.fillRoundedRect(-TILE_W / 2, -TILE_H / 2, TILE_W, TILE_H, 16);
    g.fillStyle(C.lavender, pressed ? 0.55 : 0.32);
    g.fillRoundedRect(-TILE_W / 2, -TILE_H / 2, TILE_W, TILE_H / 2, { tl: 16, tr: 16, bl: 0, br: 0 });
  }

  // ─────────────────────────── ACTIVE-WORD FLOW ─────────────────────────────

  private activateWord(idx: number, instant = false): void {
    this.activeIdx = idx;
    const word = this.words[idx];
    this.refreshAllCellStyles();
    this.refreshHint(word);
    // If a word's cells are already entirely filled (all intersections),
    // count it as auto-solved.
    if (word.cells.every(c => c.filled !== null)) {
      this.bankContainer.removeAll(true);
      this.bankTiles = [];
      this.markWordSolved(word, /* fromAuto */ true);
      return;
    }
    this.rebuildBank(word);
    if (!instant) sounds.flip();
  }

  private refreshHint(word: WordState): void {
    const { english, indonesian, emoji } = word.placement.word;
    this.hintEmojiTxt.setText(emoji);
    this.hintWordTxt.setText(indonesian);
    this.hintLenTxt.setText(`${english.length} huruf · English`);
    const total = this.words.length;
    this.hintIdTxt.setText(`Kata ${this.activeIdx + 1} / ${total}`);
  }

  private refreshAllCellStyles(): void {
    const activeWord = this.words[this.activeIdx];
    const activeSet = new Set(activeWord.cells);
    const nextCell = activeWord.cells.find(c => c.filled === null) ?? null;

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = this.cellGrid[r][c];
        if (!cell) continue;
        // Solved styling wins when every owning word is solved.
        const allWordsSolved = cell.words.every(w => w.solved);
        if (allWordsSolved) {
          this.drawCell(cell, 'solved');
        } else if (activeSet.has(cell)) {
          this.drawCell(cell, cell === nextCell ? 'next' : 'active');
        } else {
          this.drawCell(cell, 'idle');
        }
      }
    }
  }

  private onBankTap(tile: BankTile): void {
    if (this.locked || tile.used) return;
    const word = this.words[this.activeIdx];
    const nextCell = word.cells.find(c => c.filled === null);
    if (!nextCell) return;

    if (nextCell.expected === tile.letter) {
      this.placeLetter(nextCell, tile);
      sounds.place();
      // Check if word is fully filled.
      if (word.cells.every(c => c.filled !== null)) {
        this.markWordSolved(word);
      } else {
        this.refreshAllCellStyles();
      }
    } else {
      // Wrong tap — shake tile, flash the next cell red briefly.
      word.everWrong = true;
      sounds.wrong();
      this.shakeTile(tile);
      this.flashWrong(nextCell);
    }
  }

  private placeLetter(cell: CellNode, tile: BankTile): void {
    cell.filled = tile.letter;
    cell.letterTxt.setText(tile.letter).setScale(0);
    this.tweens.add({
      targets: cell.letterTxt, scale: 1, duration: 220, ease: 'Back.Out',
    });
    tile.used = true;
    tile.zone.disableInteractive();
    this.tweens.add({
      targets: tile.container, alpha: 0, scale: 0.5,
      duration: 220, ease: 'Back.In',
      onComplete: () => tile.container.setVisible(false),
    });
  }

  private shakeTile(tile: BankTile): void {
    // No input lock — the shake is feedback, not a penalty. The user
    // should be able to tap another letter immediately, which matters
    // a lot for a 6yo who's experimenting to find the right letter.
    this.tweens.killTweensOf(tile.container);
    this.tweens.add({
      targets: tile.container,
      x: { from: tile.homeX - 6, to: tile.homeX + 6 },
      yoyo: true, repeat: 1, duration: 50, ease: 'Sine.InOut',
      onComplete: () => tile.container.setX(tile.homeX),
    });
  }

  private flashWrong(cell: CellNode): void {
    this.drawCell(cell, 'wrong');
    this.time.delayedCall(280, () => this.refreshAllCellStyles());
  }

  private markWordSolved(word: WordState, fromAuto = false): void {
    word.solved = true;
    if (!word.everWrong) this.firstTrySolved++;
    this.scoreTxt.setText(this.scoreLabel());

    // Brief mint pulse on each cell of the solved word.
    if (!fromAuto) {
      sounds.match();
      word.cells.forEach((cell, i) => {
        this.tweens.add({
          targets: [cell.bg, cell.letterTxt], scale: 1.15,
          delay: i * 40, duration: 160, yoyo: true, ease: 'Back.Out',
        });
      });
    }

    // Advance.
    this.time.delayedCall(fromAuto ? 0 : 520, () => {
      const nextIdx = this.words.findIndex(w => !w.solved);
      if (nextIdx === -1) {
        this.onComplete();
      } else {
        this.activateWord(nextIdx);
      }
    });
  }

  // ──────────────────────────── END / RESET ─────────────────────────────────

  private buildEndOverlay(): void {
    this.endOverlay = createEndPopup(this, W, H, {
      onPlayAgain: () => this.scene.restart(),
      onHome:      () => this.scene.start('TitleScene'),
      onAllGames:  () => { window.location.href = '../'; },
    });
  }

  private onComplete(): void {
    sounds.win();
    const total = this.words.length;
    const sub = this.firstTrySolved === total
      ? 'Sekali coba semua benar! 🌟'
      : `${this.firstTrySolved} dari ${total} kata sekali coba`;
    this.endOverlay.show({
      emoji: '🎊',
      title: 'Hebat, Aya!',
      subtitle: sub,
      score: { value: `${this.firstTrySolved} / ${total}`, label: 'sekali coba ⭐' },
      stars: { earned: starsFor(this.firstTrySolved, total) },
    });
    launchConfetti(this, CONFETTI_EMOJIS);
  }
}

function starsFor(firstTry: number, total: number): number {
  const ratio = total === 0 ? 0 : firstTry / total;
  if (ratio >= 0.95) return 3;
  if (ratio >= 0.6)  return 2;
  return 1;
}

// Re-export so the data module's type is reachable from main.ts if ever needed.
export type { CrosswordWord };
