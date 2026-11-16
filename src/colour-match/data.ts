export type Difficulty = 'easy' | 'hard';
export type Pace = 'relaxed' | 'timed';

export interface NamedColour {
  name: string;
  hex: number;
  /** Text colour that reads well on top of `hex`. */
  ink: string;
}

/**
 * Easy mode palette: the seven bright "first colours" a toddler learns.
 * Deliberately no brown / grey / teal / indigo: muddy or in-between shades
 * are hard for a 2-year-old to tell apart and hard to name. Each one is
 * spoken aloud so the game also teaches the words.
 */
export const EASY_PALETTE: NamedColour[] = [
  { name: 'Red',    hex: 0xe53935, ink: '#ffffff' },
  { name: 'Orange', hex: 0xfb8c00, ink: '#ffffff' },
  { name: 'Yellow', hex: 0xfdd835, ink: '#6a1b9a' },
  { name: 'Green',  hex: 0x43a047, ink: '#ffffff' },
  { name: 'Blue',   hex: 0x1e88e5, ink: '#ffffff' },
  { name: 'Purple', hex: 0x8e24aa, ink: '#ffffff' },
  { name: 'Pink',   hex: 0xff6fae, ink: '#ffffff' },
];

/** Relaxed mode: a fixed number of rounds, no clock. */
export const RELAXED_ROUNDS: Record<Difficulty, number> = { easy: EASY_PALETTE.length, hard: 8 };

/** Timed mode length in seconds (opt-in only). */
export const TIMED_SECONDS = 30;

/**
 * Hard mode: the correct colour is a fresh random hue each round, and the
 * three distractors are perturbations of it in HSV space. The perturbation
 * range shrinks with the player's streak, so each correct answer makes the
 * next round harder. A wrong answer resets the ramp.
 *
 *  - `initial`:  starting per-axis wiggle room (hue°, saturation 0-1, value 0-1)
 *  - `perStep`:  how much of each axis we subtract per correct answer
 *  - `floor`:    the hardest it ever gets — still solvable, but subtle
 */
export const HARD_RAMP = {
  initial: { h: 42, s: 0.28, v: 0.22 },
  perStep: { h: 4,  s: 0.022, v: 0.018 },
  floor:   { h: 12, s: 0.07,  v: 0.07 },
} as const;

export const CONFETTI_EMOJIS = ['🌸', '⭐', '🎀', '✨', '🌟', '💖', '🎨', '🌈'];

/**
 * Last picked settings, so "🏠 Home" lands on the title with the same
 * choices still selected (module state survives scene restarts).
 */
export const lastConfig: { difficulty: Difficulty; pace: Pace } = { difficulty: 'easy', pace: 'relaxed' };
