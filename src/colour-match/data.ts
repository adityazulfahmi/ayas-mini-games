export type Difficulty = 'easy' | 'hard';

/**
 * Easy mode palette — 10 anchor hues, each visually distinct at a glance
 * for a 2-year-old. Distractors in easy mode are picked from this list, so
 * no two options ever look "almost the same."
 */
export const EASY_PALETTE = [
  0xe53935, // red
  0xfb8c00, // orange
  0xfdd835, // yellow
  0x43a047, // green
  0x00897b, // teal
  0x1e88e5, // blue
  0x5e35b1, // indigo
  0xec407a, // pink
  0x8d6e63, // brown
  0x607d8b, // slate
];

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
  floor:   { h: 10, s: 0.06,  v: 0.06 },
} as const;

export const CONFETTI_EMOJIS = ['🌸', '⭐', '🎀', '✨', '🌟', '💖', '🎊', '🎨', '🌈'];
