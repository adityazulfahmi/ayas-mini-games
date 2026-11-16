import Phaser from 'phaser';
import { drawBg, launchConfetti } from '@shared/phaserUtils';
import { createEndPopup } from '@shared/endPopup';
import { C, T, F } from '@shared/theme';
import { sounds } from '@shared/audio';
import { shuffle } from '@shared/utils';
import { POOL, CONFETTI_EMOJIS, SPARKLES, CHEERS_ID, type CrosswordWord } from '../data';
import { generatePuzzle, GRID_SIZE, type Placement, type Puzzle } from '../generator';
import { say, stopSpeech } from '../speech';

const W = 420, H = 780;
const PAD = 16;

// ── Header: home · word chips · restart ──
const HEADER_CY = 44;
const ICON_R = 24;
const CHIP_R = 23;
const CHIP_GAP = 10;

// ── Hint card ──
const CARD_X = PAD;
const CARD_Y = 86;
const CARD_W = W - PAD * 2;
const CARD_H = 150;
const CARD_CY = CARD_Y + CARD_H / 2;
const EMOJI_CX = CARD_X + 72;
const EMOJI_R = 54;
const TEXT_X = CARD_X + 146;
const SPEAK_CX = CARD_X + CARD_W - 50;
const SPEAK_R = 32;
const SLOT = 24;
const SLOT_GAP = 5;

// ── Grid area (cells are sized to fit the puzzle's used rows/cols) ──
const GRID_TOP = 254;
const GRID_BOTTOM = 596;
const GRID_MAX_W = W - PAD * 2;
const CELL_GAP = 6;
const CELL_MAX = 74;

// ── Letter tray ──
const TRAY_Y = 614;
const TRAY_H = 144;
const TILE_W = 70;
const TILE_H = 86;
const TILE_GAP = 9;
const TILE_CY = TRAY_Y + TRAY_H / 2;

/** Milliseconds of no tapping before the next letter is gently shown. */
const IDLE_HINT_MS = 9000;
/** Wrong taps on one square before the next letter is gently shown. */
const WRONG_HINT_AFTER = 2;

/** Words from the last round, kept out of the next one for variety. */
let lastRoundWords = new Set<string>();

interface CellNode {
  row: number;
  col: number;
  cx: number;
  cy: number;
  expected: string;
  filled: string | null;
  bg: Phaser.GameObjects.Graphics;
  letterTxt: Phaser.GameObjects.Text;
  ghostTxt: Phaser.GameObjects.Text;
  numTxt: Phaser.GameObjects.Text | null;
  words: WordState[];
  wrongs: number;
}

interface WordState {
  placement: Placement;
  cells: CellNode[];
  solved: boolean;
  everWrong: boolean;
  chip: Phaser.GameObjects.Container;
  chipBg: Phaser.GameObjects.Graphics;
}

interface BankTile {
  letter: string;
  container: Phaser.GameObjects.Container;
  /** Stable invisible hit-target, never tweened (taps stay reliable). */
  zone: Phaser.GameObjects.Zone;
  glow: Phaser.GameObjects.Graphics;
  homeX: number;
  homeY: number;
  used: boolean;
}

type CellMode = 'idle' | 'active' | 'next' | 'solved' | 'oops';

export class GameScene extends Phaser.Scene {
  private puzzle!: Puzzle;
  private cellGrid: (CellNode | null)[][] = [];
  private words: WordState[] = [];
  private activeIdx = 0;
  private bankTiles: BankTile[] = [];
  private bankContainer!: Phaser.GameObjects.Container;
  private firstTrySolved = 0;
  private cell = 64;
  private chipR = CHIP_R;

  private band!: Phaser.GameObjects.Graphics;
  private cursor!: Phaser.GameObjects.Graphics;
  private cardBorder!: Phaser.GameObjects.Graphics;
  private hintEmojiTxt!: Phaser.GameObjects.Text;
  private hintNumBg!: Phaser.GameObjects.Graphics;
  private hintNumTxt!: Phaser.GameObjects.Text;
  private hintDirTxt!: Phaser.GameObjects.Text;
  private hintWordTxt!: Phaser.GameObjects.Text;
  private slotGfx!: Phaser.GameObjects.Graphics;
  private slotTxts: Phaser.GameObjects.Text[] = [];
  private cheerTxt!: Phaser.GameObjects.Text;
  private trayWordTxt!: Phaser.GameObjects.Text;
  private speakBtn!: Phaser.GameObjects.Container;

  private endOverlay!: ReturnType<typeof createEndPopup>;
  private locked = false;
  private idleTimer: Phaser.Time.TimerEvent | null = null;
  private hintShown = false;

  constructor() { super('GameScene'); }

  create(): void {
    // D-005: reset every class-field array on each create() since Phaser
    // reuses the scene instance across scene.start() calls.
    this.cellGrid = [];
    this.words = [];
    this.bankTiles = [];
    this.slotTxts = [];
    this.activeIdx = 0;
    this.firstTrySolved = 0;
    this.locked = false;
    this.idleTimer = null;
    this.hintShown = false;

    drawBg(this);
    const fresh = POOL.filter(w => !lastRoundWords.has(w.english));
    this.puzzle = generatePuzzle(fresh.length >= 30 ? fresh : POOL, 3, 5, 80, 4);
    lastRoundWords = new Set(this.puzzle.placements.map(p => p.word.english));

    this.buildHintCard();
    this.buildGrid();
    this.buildHeader();
    this.buildTray();
    this.buildEndOverlay();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => stopSpeech());
    if (new URLSearchParams(window.location.search).has('debug')) {
      (window as unknown as { __cw: GameScene }).__cw = this;
    }

    this.activateWord(0, true);
  }

  // ───────────────────────────────── HEADER ─────────────────────────────────

  private buildHeader(): void {
    this.iconButton(PAD + ICON_R + 2, HEADER_CY, '🏠', () => this.scene.start('TitleScene'));
    this.iconButton(W - PAD - ICON_R - 2, HEADER_CY, '🔄', () => this.scene.restart());

    // One chip per word — a picture progress bar the child can also tap
    // to jump to a word.
    const n = this.words.length;
    this.chipR = n >= 5 ? CHIP_R - 2 : CHIP_R;
    const gap = n >= 5 ? CHIP_GAP - 4 : CHIP_GAP;
    const totalW = n * this.chipR * 2 + (n - 1) * gap;
    const startX = W / 2 - totalW / 2 + this.chipR;
    this.words.forEach((word, i) => {
      const x = startX + i * (this.chipR * 2 + gap);
      const chipBg = this.add.graphics();
      const emoji = this.add.text(0, 1, word.placement.word.emoji, { fontSize: '26px' }).setOrigin(0.5);
      word.chip = this.add.container(x, HEADER_CY, [chipBg, emoji]);
      word.chipBg = chipBg;
      const zone = this.add.zone(x, HEADER_CY, this.chipR * 2 + gap, 64).setInteractive({ cursor: 'pointer' });
      zone.on('pointerdown', () => this.onChipTap(i));
    });
  }

  private iconButton(x: number, y: number, icon: string, onTap: () => void): void {
    const g = this.add.graphics();
    g.fillStyle(C.shadow, 0.14);
    g.fillCircle(x, y + 3, ICON_R);
    g.fillStyle(C.white, 1);
    g.fillCircle(x, y, ICON_R);
    g.lineStyle(2, C.lavender, 0.7);
    g.strokeCircle(x, y, ICON_R);
    const t = this.add.text(x, y + 1, icon, { fontSize: '22px' }).setOrigin(0.5);
    const zone = this.add.zone(x, y, 64, 64).setInteractive({ cursor: 'pointer' });
    zone.on('pointerdown', () => {
      this.tweens.add({ targets: t, scale: 0.85, duration: 80, yoyo: true });
      onTap();
    });
  }

  private drawChips(): void {
    this.words.forEach((w, i) => {
      const g = w.chipBg;
      g.clear();
      const active = i === this.activeIdx && !w.solved;
      if (w.solved) {
        g.fillStyle(C.mintBg, 1);
        g.fillCircle(0, 0, this.chipR);
        g.lineStyle(3, C.mint, 1);
        g.strokeCircle(0, 0, this.chipR);
      } else if (active) {
        g.fillStyle(C.white, 1);
        g.fillCircle(0, 0, this.chipR);
        g.lineStyle(4, C.pink, 1);
        g.strokeCircle(0, 0, this.chipR);
      } else {
        g.fillStyle(C.white, 0.75);
        g.fillCircle(0, 0, this.chipR);
        g.lineStyle(2, C.lavender, 0.8);
        g.strokeCircle(0, 0, this.chipR);
      }
      w.chip.setScale(active ? 1.12 : 1);
      w.chip.setAlpha(w.solved || active ? 1 : 0.8);
    });
  }

  // ───────────────────────────────── HINT CARD ──────────────────────────────

  private buildHintCard(): void {
    const shadow = this.add.graphics();
    shadow.fillStyle(C.shadow, 0.16);
    shadow.fillRoundedRect(CARD_X + 2, CARD_Y + 8, CARD_W, CARD_H, 28);

    const card = this.add.graphics();
    card.fillStyle(C.white, 1);
    card.fillRoundedRect(CARD_X, CARD_Y, CARD_W, CARD_H, 28);
    this.cardBorder = this.add.graphics();
    this.paintCardBorder(C.pink, 3);

    // Emoji bubble
    const bubble = this.add.graphics();
    bubble.fillStyle(C.bg1, 1);
    bubble.fillCircle(EMOJI_CX, CARD_CY, EMOJI_R);
    bubble.lineStyle(2, C.lavender, 0.5);
    bubble.strokeCircle(EMOJI_CX, CARD_CY, EMOJI_R);
    this.hintEmojiTxt = this.add.text(EMOJI_CX, CARD_CY + 2, '', { fontSize: '62px' }).setOrigin(0.5);
    const emojiZone = this.add.zone(EMOJI_CX, CARD_CY, EMOJI_R * 2, EMOJI_R * 2).setInteractive({ cursor: 'pointer' });
    emojiZone.on('pointerdown', () => { this.speakHint(true); this.resetIdle(); });

    // Number + direction — the same number sits in the word's first square.
    const numY = CARD_Y + 32;
    this.hintNumBg = this.add.graphics();
    this.hintNumTxt = this.add.text(TEXT_X + 14, numY + 1, '', {
      fontFamily: F.head, fontSize: '16px', color: T.white,
    }).setOrigin(0.5);
    this.hintDirTxt = this.add.text(TEXT_X + 36, numY, '', {
      fontFamily: F.head, fontSize: '16px', color: T.sub,
    }).setOrigin(0, 0.5);

    // Bahasa word
    this.hintWordTxt = this.add.text(TEXT_X, CARD_CY - 2, '', {
      fontFamily: F.head, fontSize: '36px', color: T.main,
    }).setOrigin(0, 0.5);

    // Mini answer slots — fill in step with the grid.
    this.slotGfx = this.add.graphics();

    // Cheer (shown on word solve, in place of the speaker)
    this.cheerTxt = this.add.text(SPEAK_CX - 8, CARD_CY + 10, '', {
      fontFamily: F.head, fontSize: '22px', color: T.mint,
    }).setOrigin(0.5).setAlpha(0);

    // Speaker button — Bahasa hint, then the English word.
    const sbg = this.add.graphics();
    sbg.fillStyle(C.shadow, 0.2);
    sbg.fillCircle(0, 4, SPEAK_R);
    sbg.fillStyle(C.pink, 1);
    sbg.fillCircle(0, 0, SPEAK_R);
    sbg.fillStyle(C.white, 0.22);
    sbg.fillCircle(0, -6, SPEAK_R - 8);
    const stxt = this.add.text(0, 1, '🔊', { fontSize: '28px' }).setOrigin(0.5);
    this.speakBtn = this.add.container(SPEAK_CX, CARD_CY + 10, [sbg, stxt]);
    const speakZone = this.add.zone(SPEAK_CX, CARD_CY + 10, 84, 100).setInteractive({ cursor: 'pointer' });
    speakZone.on('pointerdown', () => {
      if (this.locked) return;
      this.tweens.add({ targets: this.speakBtn, scale: 0.88, duration: 90, yoyo: true });
      this.speakHint(true);
      this.resetIdle();
    });
  }

  private paintCardBorder(color: number, width: number): void {
    this.cardBorder.clear();
    this.cardBorder.lineStyle(width, color, 1);
    this.cardBorder.strokeRoundedRect(CARD_X, CARD_Y, CARD_W, CARD_H, 28);
  }

  private refreshHint(word: WordState): void {
    const { indonesian, emoji } = word.placement.word;
    this.hintEmojiTxt.setText(emoji);
    this.hintWordTxt.setText(indonesian).setFontSize(36);
    const maxW = SPEAK_CX - SPEAK_R - 12 - TEXT_X;
    for (let fs = 34; this.hintWordTxt.width > maxW && fs >= 20; fs -= 2) this.hintWordTxt.setFontSize(fs);

    const numY = CARD_Y + 32;
    this.hintNumBg.clear();
    this.hintNumBg.fillStyle(C.pink, 1);
    this.hintNumBg.fillCircle(TEXT_X + 14, numY, 14);
    this.hintNumTxt.setText(String(word.placement.label));
    this.hintDirTxt.setText(word.placement.dir === 'across' ? '➜  mendatar' : '⬇  menurun');

    this.paintCardBorder(C.pink, 3);
    this.refreshSlots(word);
  }

  private refreshSlots(word: WordState): void {
    this.slotTxts.forEach(t => t.destroy());
    this.slotTxts = [];
    const g = this.slotGfx;
    g.clear();
    const y = CARD_Y + CARD_H - 32;
    word.cells.forEach((cell, i) => {
      const x = TEXT_X + i * (SLOT + SLOT_GAP);
      const filled = cell.filled !== null;
      g.fillStyle(word.solved ? C.mintBg : filled ? C.white : C.bg1, 1);
      g.fillRoundedRect(x, y - SLOT / 2, SLOT, SLOT, 7);
      g.lineStyle(2, word.solved ? C.mint : C.lavender, 1);
      g.strokeRoundedRect(x, y - SLOT / 2, SLOT, SLOT, 7);
      if (filled) {
        this.slotTxts.push(this.add.text(x + SLOT / 2, y + 1, cell.filled!, {
          fontFamily: F.head, fontSize: '15px', color: word.solved ? T.mint : T.main,
        }).setOrigin(0.5));
      }
    });
  }

  private speakHint(withEnglish: boolean, interrupt = true): void {
    const w = this.words[this.activeIdx]?.placement.word;
    if (!w) return;
    say(w.indonesian, 'id-ID', { interrupt });
    if (withEnglish) say(w.english.toLowerCase(), 'en-US', { interrupt: false });
  }

  // ───────────────────────────────── GRID ───────────────────────────────────

  private buildGrid(): void {
    this.cellGrid = Array.from({ length: GRID_SIZE }, () =>
      Array<CellNode | null>(GRID_SIZE).fill(null),
    );

    // Size + centre the grid on the rows/cols the puzzle actually uses,
    // so a narrow puzzle gets bigger squares instead of empty margins.
    let minR = GRID_SIZE, maxR = -1, minC = GRID_SIZE, maxC = -1;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!this.puzzle.letters[r][c]) continue;
        minR = Math.min(minR, r); maxR = Math.max(maxR, r);
        minC = Math.min(minC, c); maxC = Math.max(maxC, c);
      }
    }
    const rows = maxR - minR + 1, cols = maxC - minC + 1;
    const availH = GRID_BOTTOM - GRID_TOP;
    this.cell = Math.floor(Math.min(
      CELL_MAX,
      (GRID_MAX_W - (cols - 1) * CELL_GAP) / cols,
      (availH - (rows - 1) * CELL_GAP) / rows,
    ));
    const step = this.cell + CELL_GAP;
    const gridW = cols * this.cell + (cols - 1) * CELL_GAP;
    const gridH = rows * this.cell + (rows - 1) * CELL_GAP;
    const left = (W - gridW) / 2;
    const top = GRID_TOP + (availH - gridH) / 2;

    // Active-word band sits behind the squares.
    this.band = this.add.graphics();

    const startLabels = new Map<string, number>();
    this.puzzle.placements.forEach(p => startLabels.set(`${p.row},${p.col}`, p.label));

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const expected = this.puzzle.letters[r][c];
        if (!expected) continue;
        const cx = left + (c - minC) * step + this.cell / 2;
        const cy = top + (r - minR) * step + this.cell / 2;

        const bg = this.add.graphics().setPosition(cx, cy);
        const fs = Math.round(this.cell * 0.56);
        const ghostTxt = this.add.text(cx, cy + 2, expected, {
          fontFamily: F.head, fontSize: `${fs}px`, color: T.sub,
        }).setOrigin(0.5).setAlpha(0);
        const letterTxt = this.add.text(cx, cy + 2, '', {
          fontFamily: F.head, fontSize: `${fs}px`, color: T.main,
        }).setOrigin(0.5);
        const label = startLabels.get(`${r},${c}`);
        const numTxt = label === undefined ? null : this.add.text(
          cx - this.cell / 2 + 7, cy - this.cell / 2 + 4, String(label), {
            fontFamily: F.head, fontSize: '13px', color: T.sub,
          });

        const node: CellNode = {
          row: r, col: c, cx, cy, expected, filled: null,
          bg, letterTxt, ghostTxt, numTxt, words: [], wrongs: 0,
        };
        this.cellGrid[r][c] = node;

        const zone = this.add.zone(cx, cy, step, step).setInteractive({ cursor: 'pointer' });
        zone.on('pointerdown', () => this.onCellTap(node));
      }
    }

    this.cursor = this.add.graphics();
    this.tweens.add({ targets: this.cursor, alpha: 0.25, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

    this.words = this.puzzle.placements.map(placement => {
      const cells: CellNode[] = [];
      const { row, col, dir, word } = placement;
      for (let i = 0; i < word.english.length; i++) {
        const r = row + (dir === 'down' ? i : 0);
        const c = col + (dir === 'across' ? i : 0);
        cells.push(this.cellGrid[r][c]!);
      }
      // chip/chipBg are assigned in buildHeader().
      const state = { placement, cells, solved: false, everWrong: false } as WordState;
      cells.forEach(cell => cell.words.push(state));
      return state;
    });
  }

  private drawCell(cell: CellNode, mode: CellMode): void {
    const g = cell.bg;
    g.clear();
    const s = this.cell, h = s / 2, rad = Math.max(10, s * 0.2);
    let fill: number = C.cream, border: number = C.lavender, bw = 2, alpha = 1;
    if (mode === 'idle')   { alpha = 0.85; }
    if (mode === 'active') { fill = C.white;  border = C.pink; bw = 3; }
    if (mode === 'next')   { fill = C.white;  border = C.pink; bw = 5; }
    if (mode === 'solved') { fill = C.mintBg; border = C.mint; bw = 3; }
    if (mode === 'oops')   { fill = C.bg1;    border = C.lavender2; bw = 4; }

    g.fillStyle(C.shadow, mode === 'idle' ? 0.08 : 0.14);
    g.fillRoundedRect(-h + 1, -h + 4, s, s, rad);
    g.fillStyle(fill, alpha);
    g.fillRoundedRect(-h, -h, s, s, rad);
    g.lineStyle(bw, border, 1);
    g.strokeRoundedRect(-h, -h, s, s, rad);
    cell.letterTxt.setColor(mode === 'solved' ? T.mint : T.main);
  }

  private refreshAllCellStyles(): void {
    const active = this.words[this.activeIdx];
    const activeSet = new Set(active.cells);
    const next = active.solved ? null : active.cells.find(c => c.filled === null) ?? null;

    for (const row of this.cellGrid) {
      for (const cell of row) {
        if (!cell) continue;
        // A letter that belongs to a finished word stays mint, so letters
        // given by a crossing word read as "already done".
        if (cell.filled && cell.words.some(w => w.solved)) this.drawCell(cell, 'solved');
        else if (activeSet.has(cell)) this.drawCell(cell, cell === next ? 'next' : 'active');
        else this.drawCell(cell, 'idle');
        if (cell.numTxt) {
          const isActiveStart = !active.solved && cell === active.cells[0];
          cell.numTxt.setColor(isActiveStart ? '#f06292' : T.sub);
        }
      }
    }

    // Band around the active word links it to the hint card.
    this.band.clear();
    if (!active.solved) {
      const first = active.cells[0], last = active.cells[active.cells.length - 1];
      const p = 7;
      const x = first.cx - this.cell / 2 - p, y = first.cy - this.cell / 2 - p;
      const w = last.cx - first.cx + this.cell + p * 2, hh = last.cy - first.cy + this.cell + p * 2;
      const rad = Math.max(14, this.cell * 0.28);
      this.band.fillStyle(C.pink, 0.22);
      this.band.fillRoundedRect(x, y, w, hh, rad);
      this.band.lineStyle(2, C.pink, 0.55);
      this.band.strokeRoundedRect(x, y, w, hh, rad);
    }

    // Blinking caret under the next square.
    this.cursor.clear();
    if (next) {
      const cw = this.cell * 0.42;
      this.cursor.fillStyle(C.pink, 1);
      this.cursor.fillRoundedRect(next.cx - cw / 2, next.cy + this.cell * 0.3, cw, 5, 2.5);
    }
  }

  // ──────────────────────────────── TRAY ────────────────────────────────────

  private buildTray(): void {
    const g = this.add.graphics();
    g.fillStyle(C.white, 0.55);
    g.fillRoundedRect(PAD, TRAY_Y, W - PAD * 2, TRAY_H, 30);
    g.lineStyle(2, C.white, 0.9);
    g.strokeRoundedRect(PAD, TRAY_Y, W - PAD * 2, TRAY_H, 30);
    this.bankContainer = this.add.container(0, 0);
    // Shown in the tray while a finished word is celebrated.
    this.trayWordTxt = this.add.text(W / 2, TILE_CY + 2, '', {
      fontFamily: F.head, fontSize: '54px', color: T.mint,
    }).setOrigin(0.5).setAlpha(0);
  }

  private rebuildBank(word: WordState): void {
    this.bankContainer.removeAll(true);
    this.bankTiles = [];

    const needed = word.cells.filter(c => c.filled === null).map(c => c.expected);
    // Shuffle, but avoid handing over the answer already in order.
    let scrambled = shuffle(needed);
    for (let i = 0; i < 6 && new Set(needed).size > 1 && scrambled.join('') === needed.join(''); i++) {
      scrambled = shuffle(needed);
    }
    const n = scrambled.length;
    if (n === 0) return;

    // Five tiles would touch the tray edge at full width — shrink a touch.
    const tw = Math.min(TILE_W, Math.floor((W - PAD * 2 - 28 - (n - 1) * TILE_GAP) / n));
    const totalW = n * tw + (n - 1) * TILE_GAP;
    const startX = (W - totalW) / 2 + tw / 2;

    scrambled.forEach((letter, i) => {
      const x = startX + i * (tw + TILE_GAP);
      const glow = this.add.graphics();
      glow.fillStyle(0xffd54f, 0.6);
      glow.fillRoundedRect(-tw / 2 - 7, -TILE_H / 2 - 7, tw + 14, TILE_H + 14, 24);
      glow.setVisible(false);

      const bg = this.add.graphics();
      bg.fillStyle(C.shadow, 0.25);
      bg.fillRoundedRect(-tw / 2 + 1, -TILE_H / 2 + 6, tw, TILE_H, 18);
      bg.fillStyle(C.pink, 1);
      bg.fillRoundedRect(-tw / 2, -TILE_H / 2, tw, TILE_H, 18);
      bg.fillStyle(C.lavender, 0.35);
      bg.fillRoundedRect(-tw / 2, -TILE_H / 2, tw, TILE_H * 0.48, { tl: 18, tr: 18, bl: 0, br: 0 });
      bg.fillStyle(C.white, 0.25);
      bg.fillRoundedRect(-tw / 2 + 10, -TILE_H / 2 + 7, tw - 20, 7, 3.5);
      const txt = this.add.text(0, 2, letter, {
        fontFamily: F.head, fontSize: '44px', color: T.white,
        shadow: { offsetX: 0, offsetY: 2, color: '#ad1457', blur: 0, fill: true },
      }).setOrigin(0.5);

      const container = this.add.container(x, TILE_CY, [glow, bg, txt]).setScale(0);
      this.tweens.add({ targets: container, scale: 1, duration: 260, delay: i * 50, ease: 'Back.Out' });

      const zone = this.add.zone(x, TILE_CY, tw + TILE_GAP, TILE_H + 24).setInteractive({ cursor: 'pointer' });
      const tile: BankTile = { letter, container, zone, glow, homeX: x, homeY: TILE_CY, used: false };
      zone.on('pointerdown', () => this.onBankTap(tile));

      this.bankContainer.add([container, zone]);
      this.bankTiles.push(tile);
    });
  }

  // ─────────────────────────── ACTIVE-WORD FLOW ─────────────────────────────

  private activateWord(idx: number, first = false, queueSpeech = false): void {
    this.activeIdx = idx;
    const word = this.words[idx];
    this.clearHint();
    this.refreshAllCellStyles();
    this.refreshHint(word);
    this.drawChips();

    if (word.cells.every(c => c.filled !== null)) {
      // Every square was already filled by crossing words.
      this.bankContainer.removeAll(true);
      this.bankTiles = [];
      this.markWordSolved(word);
      return;
    }
    this.rebuildBank(word);
    if (!first) sounds.flip();
    this.tweens.add({ targets: this.hintEmojiTxt, scale: { from: 0.6, to: 1 }, duration: 320, ease: 'Back.Out' });
    this.speakHint(false, !queueSpeech);
    this.resetIdle();
  }

  private onChipTap(i: number): void {
    if (this.locked) return;
    const w = this.words[i];
    if (w.solved) {
      say(w.placement.word.english.toLowerCase(), 'en-US');
      this.tweens.add({ targets: w.chip, scale: 1.25, duration: 140, yoyo: true });
      return;
    }
    if (i === this.activeIdx) { this.speakHint(false); return; }
    this.activateWord(i);
  }

  private onCellTap(cell: CellNode): void {
    if (this.locked) return;
    const active = this.words[this.activeIdx];
    if (cell.words.includes(active) && !active.solved) { this.speakHint(false); return; }
    const other = cell.words.find(w => !w.solved && w !== active);
    if (other) {
      this.activateWord(this.words.indexOf(other));
    } else if (cell.filled) {
      say(cell.words[0].placement.word.english.toLowerCase(), 'en-US');
    }
  }

  private onBankTap(tile: BankTile): void {
    if (this.locked || tile.used) return;
    const word = this.words[this.activeIdx];
    const next = word.cells.find(c => c.filled === null);
    if (!next) return;
    this.resetIdle();

    if (next.expected === tile.letter) {
      this.clearHint();
      this.placeLetter(next, tile);
      sounds.place();
      this.refreshSlots(word);
      if (word.cells.every(c => c.filled !== null)) {
        this.markWordSolved(word);
      } else {
        this.refreshAllCellStyles();
      }
    } else {
      // Gentle "not this one": the tile wobbles, the square wiggles. No red,
      // no penalty — and after a couple of tries the right letter shows.
      word.everWrong = true;
      next.wrongs++;
      sounds.wrong();
      this.wobbleTile(tile);
      this.oopsCell(next);
      if (next.wrongs >= WRONG_HINT_AFTER) this.showLetterHint();
    }
  }

  private placeLetter(cell: CellNode, tile: BankTile): void {
    cell.filled = tile.letter;
    tile.used = true;
    tile.zone.disableInteractive();

    // Fly a copy of the letter from the tile into its square.
    const fly = this.add.text(tile.homeX, tile.homeY, tile.letter, {
      fontFamily: F.head, fontSize: '44px', color: '#f06292',
    }).setOrigin(0.5).setDepth(20);
    const target = Math.round(this.cell * 0.56) / 44;
    this.tweens.add({
      targets: fly, x: cell.cx, y: cell.cy + 2, scale: target,
      duration: 240, ease: 'Cubic.Out',
      onComplete: () => {
        fly.destroy();
        cell.letterTxt.setText(tile.letter).setScale(1.3);
        this.tweens.add({ targets: cell.letterTxt, scale: 1, duration: 200, ease: 'Back.Out' });
      },
    });
    this.tweens.killTweensOf(tile.container);
    this.tweens.add({
      targets: tile.container, alpha: 0, scale: 0.4, duration: 200, ease: 'Back.In',
      onComplete: () => tile.container.setVisible(false),
    });
  }

  private wobbleTile(tile: BankTile): void {
    this.tweens.killTweensOf(tile.container);
    tile.container.setPosition(tile.homeX, tile.homeY).setAngle(0).setScale(1);
    this.tweens.add({
      targets: tile.container, angle: { from: -8, to: 8 },
      yoyo: true, repeat: 1, duration: 70, ease: 'Sine.InOut',
      onComplete: () => {
        tile.container.setAngle(0);
        if (tile.glow.visible) this.pulseTile(tile);
      },
    });
  }

  private oopsCell(cell: CellNode): void {
    this.drawCell(cell, 'oops');
    this.tweens.add({
      targets: cell.bg, x: { from: cell.cx - 4, to: cell.cx + 4 }, yoyo: true, repeat: 1, duration: 60,
      onComplete: () => cell.bg.setX(cell.cx),
    });
    this.time.delayedCall(320, () => { if (!this.locked) this.refreshAllCellStyles(); });
  }

  // ─────────────────────────────── HINTS ────────────────────────────────────

  private resetIdle(): void {
    this.idleTimer?.remove(false);
    this.idleTimer = this.time.delayedCall(IDLE_HINT_MS, () => this.showLetterHint());
  }

  /** Ghost the next letter into its square and make the right tile glow. */
  private showLetterHint(): void {
    if (this.locked || this.hintShown) return;
    const word = this.words[this.activeIdx];
    const next = word.cells.find(c => c.filled === null);
    if (!next) return;
    const tile = this.bankTiles.find(t => !t.used && t.letter === next.expected);
    if (!tile) return;
    this.hintShown = true;
    this.tweens.add({ targets: next.ghostTxt, alpha: 0.3, duration: 400 });
    tile.glow.setVisible(true);
    this.pulseTile(tile);
  }

  private pulseTile(tile: BankTile): void {
    this.tweens.add({
      targets: tile.container, scale: 1.1, y: tile.homeY - 6,
      duration: 420, yoyo: true, repeat: -1, ease: 'Sine.InOut',
    });
  }

  private clearHint(): void {
    this.hintShown = false;
    for (const row of this.cellGrid) {
      for (const c of row) {
        if (!c) continue;
        this.tweens.killTweensOf(c.ghostTxt);
        c.ghostTxt.setAlpha(0);
      }
    }
    this.bankTiles.forEach(t => {
      if (!t.glow.visible) return;
      t.glow.setVisible(false);
      if (t.used) return;
      this.tweens.killTweensOf(t.container);
      t.container.setScale(1).setY(t.homeY);
    });
  }

  // ─────────────────────────────── SOLVE ────────────────────────────────────

  private markWordSolved(word: WordState): void {
    word.solved = true;
    this.locked = true;
    this.idleTimer?.remove(false);
    if (!word.everWrong) this.firstTrySolved++;
    const { english } = word.placement.word;

    // Short pause so the last letter lands before the party starts.
    this.time.delayedCall(260, () => {
      sounds.match();
      say(english.toLowerCase(), 'en-US', { pitch: 1.35 });
      this.refreshAllCellStyles();
      this.refreshSlots(word);
      this.drawChips();
      this.paintCardBorder(C.mint, 4);

      // Wave across the word, with little sparkles popping out.
      word.cells.forEach((cell, i) => {
        this.tweens.add({
          targets: [cell.bg, cell.letterTxt], scale: 1.18,
          delay: i * 70, duration: 170, yoyo: true, ease: 'Sine.Out',
        });
        this.time.delayedCall(i * 70, () => this.sparkle(cell.cx, cell.cy));
      });
      this.tweens.add({ targets: word.chip, scale: 1.3, duration: 180, yoyo: true, ease: 'Back.Out' });

      this.trayWordTxt.setText(`${word.placement.word.emoji} ${english}`).setAlpha(1).setScale(0.3);
      this.tweens.add({ targets: this.trayWordTxt, scale: 1, duration: 360, ease: 'Back.Out' });

      this.cheerTxt.setText(Phaser.Utils.Array.GetRandom(CHEERS_ID)).setAlpha(1).setScale(0);
      this.speakBtn.setVisible(false);
      this.tweens.add({ targets: this.cheerTxt, scale: 1, duration: 300, ease: 'Back.Out' });
      this.tweens.add({
        targets: this.hintEmojiTxt, angle: { from: -12, to: 12 }, duration: 140, yoyo: true, repeat: 2,
        onComplete: () => this.hintEmojiTxt.setAngle(0),
      });
    });

    this.time.delayedCall(1700, () => {
      this.cheerTxt.setAlpha(0);
      this.speakBtn.setVisible(true);
      this.trayWordTxt.setAlpha(0);
      const nextIdx = this.nextUnsolved();
      if (nextIdx === -1) {
        this.onComplete();
      } else {
        this.locked = false;
        this.activateWord(nextIdx, false, true);
      }
    });
  }

  private nextUnsolved(): number {
    const n = this.words.length;
    for (let k = 1; k <= n; k++) {
      const i = (this.activeIdx + k) % n;
      if (!this.words[i].solved) return i;
    }
    return -1;
  }

  private sparkle(x: number, y: number): void {
    for (let i = 0; i < 2; i++) {
      const s = this.add.text(x, y, Phaser.Utils.Array.GetRandom(SPARKLES), { fontSize: '22px' })
        .setOrigin(0.5).setDepth(30).setScale(0.4);
      const ang = Phaser.Math.FloatBetween(-Math.PI * 0.9, -Math.PI * 0.1);
      const dist = Phaser.Math.Between(40, 70);
      this.tweens.add({
        targets: s, x: x + Math.cos(ang) * dist, y: y + Math.sin(ang) * dist,
        scale: 1, alpha: 0, duration: 750, ease: 'Cubic.Out',
        onComplete: () => s.destroy(),
      });
    }
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
    this.locked = true;
    this.band.clear();
    this.cursor.clear();
    sounds.win();
    say('Hore! Hebat, Aya!', 'id-ID', { interrupt: false });
    const total = this.words.length;
    this.endOverlay.show({
      emoji: '🎊',
      title: 'Hebat, Aya!',
      // Recap of the English words she just spelled.
      subtitle: this.words.map(w => w.placement.word.english).join(' · '),
      score: { value: total, label: 'kata English baru' },
      // Gentle scoring: finishing always earns at least two stars.
      stars: { earned: this.firstTrySolved / total >= 0.6 ? 3 : 2 },
    });
    launchConfetti(this, CONFETTI_EMOJIS);
  }
}

export type { CrosswordWord };
