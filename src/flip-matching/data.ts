/**
 * Picture cards. Every item is something a 2½-year-old can name, drawn by an
 * emoji that unmistakably shows it. `look` groups items that look alike at a
 * glance (orange cat-like faces, round citrus, bear faces, ...): a round never
 * deals two items from the same group, so a miss is about memory, not squinting.
 */
export interface Item {
  emoji: string;
  name: string;
  /** Spoken on a match: "Two apples!" */
  plural: string;
  look: string;
}

export const ITEMS: Item[] = [
  { emoji: '🍎', name: 'apple',      plural: 'apples',       look: 'red-fruit' },
  { emoji: '🍌', name: 'banana',     plural: 'bananas',      look: 'banana' },
  { emoji: '🍓', name: 'strawberry', plural: 'strawberries', look: 'berry' },
  { emoji: '🍇', name: 'grapes',     plural: 'bunches of grapes', look: 'grapes' },
  { emoji: '🍉', name: 'watermelon', plural: 'watermelons',  look: 'melon' },
  { emoji: '🍊', name: 'orange',     plural: 'oranges',      look: 'citrus' },
  { emoji: '🍋', name: 'lemon',      plural: 'lemons',       look: 'citrus' },
  { emoji: '🍒', name: 'cherries',   plural: 'cherries',     look: 'red-fruit' },
  { emoji: '🍍', name: 'pineapple',  plural: 'pineapples',   look: 'pineapple' },
  { emoji: '🥕', name: 'carrot',     plural: 'carrots',      look: 'carrot' },
  { emoji: '🐱', name: 'cat',        plural: 'cats',         look: 'cat-face' },
  { emoji: '🐶', name: 'dog',        plural: 'dogs',         look: 'dog-face' },
  { emoji: '🐸', name: 'frog',       plural: 'frogs',        look: 'frog' },
  { emoji: '🐼', name: 'panda',      plural: 'pandas',       look: 'bear-face' },
  { emoji: '🐻', name: 'bear',       plural: 'bears',        look: 'bear-face' },
  { emoji: '🐰', name: 'bunny',      plural: 'bunnies',      look: 'bunny' },
  { emoji: '🐷', name: 'pig',        plural: 'pigs',         look: 'pig' },
  { emoji: '🐮', name: 'cow',        plural: 'cows',         look: 'cow' },
  { emoji: '🦁', name: 'lion',       plural: 'lions',        look: 'cat-face' },
  { emoji: '🐵', name: 'monkey',     plural: 'monkeys',      look: 'monkey' },
  { emoji: '🐥', name: 'chick',      plural: 'chicks',       look: 'chick' },
  { emoji: '🦋', name: 'butterfly',  plural: 'butterflies',  look: 'butterfly' },
  { emoji: '🐢', name: 'turtle',     plural: 'turtles',      look: 'turtle' },
  { emoji: '🐘', name: 'elephant',   plural: 'elephants',    look: 'elephant' },
  { emoji: '🐙', name: 'octopus',    plural: 'octopuses',    look: 'octopus' },
  { emoji: '🦄', name: 'unicorn',    plural: 'unicorns',     look: 'unicorn' },
  { emoji: '🚗', name: 'car',        plural: 'cars',         look: 'car' },
  { emoji: '⚽', name: 'ball',       plural: 'balls',        look: 'ball' },
  { emoji: '🌈', name: 'rainbow',    plural: 'rainbows',     look: 'rainbow' },
  { emoji: '🌻', name: 'sunflower',  plural: 'sunflowers',   look: 'flower' },
];

export interface GridSize {
  cols: number;
  rows: number;
}

/**
 * A gentle ladder for a 2½-year-old: 2 → 3 → 6 → 8 → 10 pairs.
 * The old 6×6 grid made cards ~55 px on a phone — too small to tap and far
 * too many to remember. 4×5 is the largest; its cards are still ~85 CSS px
 * wide on a 390 px phone.
 */
export const GRID_SIZES: GridSize[] = [
  { cols: 2, rows: 2 },
  { cols: 2, rows: 3 },
  { cols: 3, rows: 4 },
  { cols: 4, rows: 4 },
  { cols: 4, rows: 5 },
];

export const CONFETTI_EMOJIS = ['🌸','⭐','🎀','✨','🌟','💖','🎊','🌺'];
