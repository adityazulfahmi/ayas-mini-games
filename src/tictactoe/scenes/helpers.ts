import Phaser from 'phaser';
import { playTone } from '@shared/audio';

export const W = 420;
export const H = 780;

export type Player = 1 | 2;
export type Cell = Player | null;
export type Mode = 'bot' | 'duo';

export const BOT_NAME = 'Papa-bot';

/** Per-player look. Cat is always player 1 and always moves first vs the bot. */
export const P = {
  1: { emoji: '🐱', animal: 'Kitty', fill: 0xfce4ec, disc: 0xf8bbd0, edge: 0xf06292, text: '#e91e63' },
  2: { emoji: '🐰', animal: 'Bunny', fill: 0xede7f6, disc: 0xe1bee7, edge: 0xab47bc, text: '#8e24aa' },
} as const;

export const WINNING_LINES: number[][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function findWin(board: Cell[]): number[] | null {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return line;
  }
  return null;
}

/** The empty cell that would complete a line for `who`, if any. */
function completingMove(board: Cell[], who: Player): number | null {
  for (const line of WINNING_LINES) {
    const mine = line.filter(i => board[i] === who).length;
    const empty = line.filter(i => board[i] === null);
    if (mine === 2 && empty.length === 1) return empty[0];
  }
  return null;
}

/**
 * Papa-bot: a deliberately gentle opponent. It mostly plays at random, only
 * sometimes notices its own winning move and rarely blocks the child, so a
 * 2½-year-old tapping freely wins most games — but not every single one,
 * which keeps it feeling like a real game. Simulated vs a purely random tapper:
 * child ~63% · bot ~19% · tie ~18%.
 */
export function pickBotMove(board: Cell[], bot: Player, human: Player): number {
  const empties = board.map((v, i) => (v === null ? i : -1)).filter(i => i >= 0);
  const win = completingMove(board, bot);
  if (win !== null && Math.random() < 0.15) return win;
  const block = completingMove(board, human);
  if (block !== null && Math.random() < 0.1) return block;
  // Avoid "accidentally" winning too often: prefer cells that don't complete a bot line.
  const calm = empties.filter(i => i !== win);
  const pool = calm.length ? calm : empties;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Say a short phrase out loud (friendly, slow, high-pitched). Silent if unsupported. */
export function say(text: string): void {
  try {
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9;
    u.pitch = 1.3;
    u.lang = 'en-US';
    synth.speak(u);
  } catch { /* no speech on this device */ }
}

/** Little per-animal "plop" — cat is a bright two-note blip, bunny a soft hop. */
export function placeSound(p: Player): void {
  if (p === 1) {
    playTone(660, 0.1, 'sine', 0.14);
    playTone(880, 0.14, 'sine', 0.12, 0.08);
  } else {
    playTone(440, 0.1, 'triangle', 0.16);
    playTone(587, 0.16, 'triangle', 0.13, 0.08);
  }
}

export function cheerSound(): void {
  [523, 659, 784, 1047, 1319].forEach((f, i) => playTone(f, 0.22, 'sine', 0.15, i * 0.12));
}

export function tieSound(): void {
  // Two bright "high five" claps, not a sad descending tone.
  playTone(784, 0.12, 'triangle', 0.15);
  playTone(988, 0.2, 'triangle', 0.15, 0.16);
}

export const NAME_KEY = 'aya-ttt-names';

export function loadNames(): [string, string] {
  try {
    const raw = localStorage.getItem(NAME_KEY);
    if (raw) {
      const v = JSON.parse(raw);
      if (Array.isArray(v)) return [String(v[0] ?? ''), String(v[1] ?? '')];
    }
  } catch { /* storage blocked */ }
  return ['', ''];
}

export function saveNames(names: [string, string]): void {
  try { localStorage.setItem(NAME_KEY, JSON.stringify(names)); } catch { /* ignore */ }
}

/** Little burst of coloured dots flying out from (x, y). */
export function sparkle(scene: Phaser.Scene, x: number, y: number, color: number, count = 8, dist = 70): void {
  for (let i = 0; i < count; i++) {
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const dot = scene.add.graphics().setPosition(x, y).setDepth(20);
    dot.fillStyle(i % 2 ? 0xffffff : color, 1);
    dot.fillCircle(0, 0, 5 + Math.random() * 3);
    scene.tweens.add({
      targets: dot,
      x: x + Math.cos(a) * dist, y: y + Math.sin(a) * dist,
      alpha: 0, scale: 0.4,
      duration: 520, ease: 'Cubic.Out',
      onComplete: () => dot.destroy(),
    });
  }
}

/** Soft drop shadow + rounded fill, a common card look in this game. */
export function softCard(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, w: number, h: number, r: number,
  fill: number, edge?: number, edgeW = 3, shadowA = 0.14,
): void {
  g.fillStyle(0x9c4dcc, shadowA);
  g.fillRoundedRect(x, y + 6, w, h, r);
  g.fillStyle(fill, 1);
  g.fillRoundedRect(x, y, w, h, r);
  if (edge !== undefined) {
    g.lineStyle(edgeW, edge, 1);
    g.strokeRoundedRect(x, y, w, h, r);
  }
}
