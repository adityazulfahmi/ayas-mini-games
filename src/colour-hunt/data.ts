export interface HuntItem {
  /** The emoji shown on the tile */
  e: string;
  /** Spoken name after the colour, e.g. "Purple grapes!" */
  name: string;
}

export interface ColourGroup {
  name: string;
  /** Display label, Title Case. Also what gets spoken. */
  prompt: string;
  /** Phaser hex for the big paint blob */
  phex: number;
  /**
   * Only emojis whose dominant colour is unmistakably this colour on Apple,
   * Google (Noto) and Samsung emoji fonts. Left out on purpose:
   * 🫐 (reads purple), 🍑 (reads pink), 🍞 (reads yellow/orange), 🍫 (red wrapper on
   * some fonts), 🎀 (red on some fonts), 🌊 (mostly white), 👾 (varies by font),
   * 🍊 ("Orange orange!" confuses), 🌹 (lots of green stem), 🥥 (white inside), 🐒 (pale tan).
   */
  items: HuntItem[];
}

export const COLOUR_POOL: ColourGroup[] = [
  { name: 'red', prompt: 'Red', phex: 0xe53935, items: [
    { e: '🍎', name: 'apple' }, { e: '🍓', name: 'strawberry' }, { e: '🍅', name: 'tomato' },
    { e: '🚒', name: 'fire truck' }, { e: '❤️', name: 'heart' },
  ] },
  { name: 'orange', prompt: 'Orange', phex: 0xfb8c00, items: [
    { e: '🥕', name: 'carrot' }, { e: '🎃', name: 'pumpkin' }, { e: '🦊', name: 'fox' },
    { e: '🏀', name: 'ball' },
  ] },
  { name: 'yellow', prompt: 'Yellow', phex: 0xfdd835, items: [
    { e: '🍋', name: 'lemon' }, { e: '🍌', name: 'banana' }, { e: '⭐', name: 'star' },
    { e: '🐥', name: 'chick' }, { e: '🌻', name: 'sunflower' },
  ] },
  { name: 'green', prompt: 'Green', phex: 0x43a047, items: [
    { e: '🐸', name: 'frog' }, { e: '🐢', name: 'turtle' }, { e: '🥦', name: 'broccoli' },
    { e: '🍏', name: 'apple' }, { e: '🦖', name: 'dinosaur' }, { e: '🥒', name: 'cucumber' },
  ] },
  { name: 'blue', prompt: 'Blue', phex: 0x1e88e5, items: [
    { e: '🐳', name: 'whale' }, { e: '🦋', name: 'butterfly' }, { e: '🧢', name: 'cap' },
    { e: '💧', name: 'water drop' }, { e: '💙', name: 'heart' },
  ] },
  { name: 'purple', prompt: 'Purple', phex: 0x8e24aa, items: [
    { e: '🍇', name: 'grapes' }, { e: '🍆', name: 'eggplant' }, { e: '💜', name: 'heart' },
    { e: '🟣', name: 'ball' },
  ] },
  { name: 'pink', prompt: 'Pink', phex: 0xf06292, items: [
    { e: '🐷', name: 'piggy' }, { e: '🦩', name: 'flamingo' }, { e: '🌸', name: 'flower' },
    { e: '💗', name: 'heart' }, { e: '🩰', name: 'ballet shoes' },
  ] },
  { name: 'brown', prompt: 'Brown', phex: 0x8d5a34, items: [
    { e: '🐻', name: 'bear' }, { e: '🐴', name: 'horse' },
    { e: '🌰', name: 'nut' }, { e: '🐿️', name: 'squirrel' },
  ] },
];

/**
 * Colours a 2½-year-old easily mixes up. A round never shows a target's
 * neighbour as a distractor, so the wrong answers are always clearly different.
 */
export const NEIGHBOURS: Record<string, string[]> = {
  red:    ['pink', 'orange'],
  orange: ['red', 'yellow', 'brown'],
  yellow: ['orange'],
  green:  [],
  blue:   ['purple'],
  purple: ['blue', 'pink'],
  pink:   ['red', 'purple'],
  brown:  ['orange'],
};

/** Relaxed mode length (rounds). */
export const ROUNDS = 10;
/** Speed mode length (seconds). */
export const SPEED_SECONDS = 30;

export type Mode = 'relaxed' | 'speed';

export const CONFETTI_EMOJIS = ['🌸', '⭐', '🎀', '✨', '🌟', '💖', '🎊', '🌈'];
