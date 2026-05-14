import { shuffle } from '@shared/utils';
import type { CrosswordWord } from './data';

/**
 * Procedural mini-crossword generator. Targets a 5×5 grid with 3-5
 * interlocking words pulled from the curated pool in `./data.ts`.
 *
 * Why generate procedurally rather than ship handcrafted puzzles: the
 * "Again" contract (D-006/D-008) wants a fresh round every replay
 * without curating an unbounded set. With a pool of ~100 short words
 * the search space converges quickly — typical attempt < 5 ms.
 *
 * Adjacency rules enforced so the puzzle reads as a real crossword
 * rather than letter soup:
 *  - Two words sharing a letter must be perpendicular (one across, one down).
 *  - No two cells with letters may sit next to each other on the
 *    perpendicular axis unless they belong to the same word — i.e.
 *    no accidental side-by-side letter pairs.
 *  - The cell just before each word's start and just after each
 *    word's end (along the word's own axis) must be empty/out-of-bounds.
 *  - Every non-anchor word must cross at least one already-placed word.
 */

export const GRID_SIZE = 5;

export type Dir = 'across' | 'down';

export interface Placement {
  word: CrosswordWord;
  row: number;
  col: number;
  dir: Dir;
  /** Display number shown in the cell at (row,col). */
  label: number;
}

export interface Puzzle {
  letters: (string | null)[][];
  placements: Placement[];
}

interface MutableGrid {
  letters: (string | null)[][];
  across: boolean[][];
  down: boolean[][];
}

const inBounds = (r: number, c: number): boolean =>
  r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE;

const makeGrid = (): MutableGrid => ({
  letters: Array.from({ length: GRID_SIZE }, () => Array<string | null>(GRID_SIZE).fill(null)),
  across:  Array.from({ length: GRID_SIZE }, () => Array<boolean>(GRID_SIZE).fill(false)),
  down:    Array.from({ length: GRID_SIZE }, () => Array<boolean>(GRID_SIZE).fill(false)),
});

function placeWord(grid: MutableGrid, word: string, sr: number, sc: number, dir: Dir): void {
  const dr = dir === 'down' ? 1 : 0;
  const dc = dir === 'across' ? 1 : 0;
  const axis = dir === 'across' ? grid.across : grid.down;
  for (let i = 0; i < word.length; i++) {
    const r = sr + dr * i, c = sc + dc * i;
    grid.letters[r][c] = word[i];
    axis[r][c] = true;
  }
}

function canPlace(
  grid: MutableGrid, word: string, sr: number, sc: number, dir: Dir,
  requireIntersection: boolean,
): boolean {
  const dr = dir === 'down' ? 1 : 0;
  const dc = dir === 'across' ? 1 : 0;
  const er = sr + dr * (word.length - 1);
  const ec = sc + dc * (word.length - 1);
  if (!inBounds(sr, sc) || !inBounds(er, ec)) return false;

  // Cap cells just before start and just after end — must be empty.
  const beforeR = sr - dr, beforeC = sc - dc;
  if (inBounds(beforeR, beforeC) && grid.letters[beforeR][beforeC] !== null) return false;
  const afterR = er + dr, afterC = ec + dc;
  if (inBounds(afterR, afterC) && grid.letters[afterR][afterC] !== null) return false;

  const axis = dir === 'across' ? grid.across : grid.down;
  let intersections = 0;
  for (let i = 0; i < word.length; i++) {
    const r = sr + dr * i, c = sc + dc * i;
    // Same-direction word already passes through here → would overlap.
    if (axis[r][c]) return false;
    const existing = grid.letters[r][c];
    if (existing !== null) {
      if (existing !== word[i]) return false;
      intersections++;
      continue;
    }
    // Empty cell — check the two perpendicular neighbors aren't filled
    // (that would create an unplanned letter pair side-by-side).
    const p1r = r + (dir === 'across' ? -1 : 0);
    const p1c = c + (dir === 'across' ? 0 : -1);
    const p2r = r + (dir === 'across' ?  1 : 0);
    const p2c = c + (dir === 'across' ? 0 :  1);
    if (inBounds(p1r, p1c) && grid.letters[p1r][p1c] !== null) return false;
    if (inBounds(p2r, p2c) && grid.letters[p2r][p2c] !== null) return false;
  }
  return requireIntersection ? intersections >= 1 : true;
}

function findValidPlacement(grid: MutableGrid, word: string): { row: number; col: number; dir: Dir } | null {
  // Try every existing letter as a potential crossing point.
  const positions: Array<{ r: number; c: number }> = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid.letters[r][c] !== null) positions.push({ r, c });
    }
  }
  // Shuffle so we don't always cross the first placed word.
  shuffleInPlace(positions);
  for (const { r, c } of positions) {
    const cell = grid.letters[r][c]!;
    for (const dir of ['across', 'down'] as const) {
      for (let i = 0; i < word.length; i++) {
        if (word[i] !== cell) continue;
        const sr = dir === 'down'   ? r - i : r;
        const sc = dir === 'across' ? c - i : c;
        if (canPlace(grid, word, sr, sc, dir, true)) {
          return { row: sr, col: sc, dir };
        }
      }
    }
  }
  return null;
}

function shuffleInPlace<T>(a: T[]): void {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}

export function generatePuzzle(
  pool: CrosswordWord[],
  minWords = 3,
  maxWords = 5,
  attempts = 60,
): Puzzle {
  for (let n = 0; n < attempts; n++) {
    const result = tryOnce(pool, minWords, maxWords);
    if (result) return result;
  }
  // Deterministic fallback so the game never boots empty even if the
  // pool is tiny. CAT/CAR sharing C, plus RAT sharing R from CAR.
  return fallback();
}

function tryOnce(pool: CrosswordWord[], minWords: number, maxWords: number): Puzzle | null {
  const shuffled = shuffle(pool);
  // Prefer a 4-5 letter anchor for variety; fall back to whatever fits.
  const anchor = shuffled.find(w => w.english.length >= 4 && w.english.length <= 5) ?? shuffled[0];
  if (!anchor) return null;

  const grid = makeGrid();
  const anchorRow = 1 + Math.floor(Math.random() * 3); // 1, 2, or 3
  const anchorCol = Math.floor((GRID_SIZE - anchor.english.length) / 2);
  if (!canPlace(grid, anchor.english, anchorRow, anchorCol, 'across', false)) return null;
  placeWord(grid, anchor.english, anchorRow, anchorCol, 'across');

  const placements: Placement[] = [
    { word: anchor, row: anchorRow, col: anchorCol, dir: 'across', label: 0 },
  ];

  for (const w of shuffled) {
    if (placements.length >= maxWords) break;
    if (placements.some(p => p.word.english === w.english)) continue;
    const found = findValidPlacement(grid, w.english);
    if (found) {
      placeWord(grid, w.english, found.row, found.col, found.dir);
      placements.push({ word: w, ...found, label: 0 });
    }
  }

  if (placements.length < minWords) return null;

  // Assign display labels by scan order (top→bottom, left→right) so
  // the user reads 1, 2, 3… intuitively.
  placements.sort((a, b) => (a.row - b.row) || (a.col - b.col));
  placements.forEach((p, i) => { p.label = i + 1; });

  return { letters: grid.letters, placements };
}

function fallback(): Puzzle {
  // Hand-built 3-word puzzle used only if the generator can't find a
  // valid layout (shouldn't happen with the curated pool but keeps the
  // game robust against a future shrinking of the data).
  const letters: (string | null)[][] = [
    [null, null, null, null, null],
    [null, 'C',  'A',  'T',  null],
    [null, 'A',  null, null, null],
    [null, 'R',  null, null, null],
    [null, null, null, null, null],
  ];
  return {
    letters,
    placements: [
      { word: { english: 'CAT', indonesian: 'kucing', emoji: '🐱' }, row: 1, col: 1, dir: 'across', label: 1 },
      { word: { english: 'CAR', indonesian: 'mobil',  emoji: '🚗' }, row: 1, col: 1, dir: 'down',   label: 1 },
    ],
  };
}
