export type Difficulty = 'easy' | 'hard';
export type PlayMode = 'relaxed' | 'timed';

/** Broad "kind of thing" used to keep easy-mode contrasts obvious. */
type Family = 'creature' | 'plant' | 'food' | 'thing';

export interface Item {
  emoji: string;
  /** Spoken name, lower case ("apple", "fire truck"). */
  name: string;
}

export interface Category {
  id: string;
  family: Family;
  /** Upper-case group name for the on-screen card ("ANIMALS"). */
  plural: string;
  /** Spoken + shown question when this group is the majority. */
  question: string;
  /** Sentence about one member: "The apple is a fruit!" */
  about: (name: string) => string;
  items: Item[];
}

/**
 * Every emoji here was picked to read clearly at toddler glance: face-style
 * animals, whole fruits, side-on vehicles. Dropped from the old list because
 * they were confusing or don't render everywhere: 🏵️ (rosette, not a flower),
 * 💐 (bouquet), 🪻 / 🫐 (new emoji, missing on older phones), 🍑 (reads as a
 * bottom), 🎤 (not an instrument), 🪕 / 🪗 (unfamiliar), 🎳 / 🏸 / 🏓 (not
 * balls), ⛵ (doesn't go vroom), 🐟 (same name as 🐠).
 */
export const CATEGORIES: Category[] = [
  {
    id: 'animals', family: 'creature', plural: 'ANIMALS',
    question: 'Which one is not an animal?',
    about: n => `The ${n} is an animal!`,
    items: [
      { emoji: '🐱', name: 'cat' }, { emoji: '🐶', name: 'dog' }, { emoji: '🐰', name: 'bunny' },
      { emoji: '🐷', name: 'pig' }, { emoji: '🐮', name: 'cow' }, { emoji: '🦁', name: 'lion' },
      { emoji: '🐻', name: 'bear' }, { emoji: '🐵', name: 'monkey' }, { emoji: '🐸', name: 'frog' },
      { emoji: '🐼', name: 'panda' }, { emoji: '🐯', name: 'tiger' }, { emoji: '🦊', name: 'fox' },
    ],
  },
  {
    id: 'fruits', family: 'food', plural: 'FRUITS',
    question: 'Which one is not a fruit?',
    about: n => `The ${n} is a fruit!`,
    items: [
      { emoji: '🍎', name: 'apple' }, { emoji: '🍌', name: 'banana' }, { emoji: '🍓', name: 'strawberry' },
      { emoji: '🍇', name: 'grape' }, { emoji: '🍊', name: 'orange' }, { emoji: '🍉', name: 'watermelon' },
      { emoji: '🍐', name: 'pear' }, { emoji: '🍒', name: 'cherry' }, { emoji: '🍋', name: 'lemon' },
      { emoji: '🍍', name: 'pineapple' }, { emoji: '🥝', name: 'kiwi' },
    ],
  },
  {
    id: 'vehicles', family: 'thing', plural: 'THINGS THAT GO',
    question: 'Which one does not go vroom?',
    about: n => `The ${n} goes vroom!`,
    items: [
      { emoji: '🚗', name: 'car' }, { emoji: '🚌', name: 'bus' }, { emoji: '🚒', name: 'fire truck' },
      { emoji: '🚑', name: 'ambulance' }, { emoji: '🚜', name: 'tractor' }, { emoji: '🚓', name: 'police car' },
      { emoji: '🚂', name: 'train' }, { emoji: '✈️', name: 'plane' }, { emoji: '🚁', name: 'helicopter' },
      { emoji: '🚀', name: 'rocket' },
    ],
  },
  {
    id: 'sweets', family: 'food', plural: 'SWEET TREATS',
    question: 'Which one is not a sweet treat?',
    about: n => `The ${n} is a sweet treat!`,
    items: [
      { emoji: '🍦', name: 'ice cream' }, { emoji: '🍰', name: 'cake' }, { emoji: '🧁', name: 'cupcake' },
      { emoji: '🍩', name: 'donut' }, { emoji: '🍪', name: 'cookie' }, { emoji: '🍫', name: 'chocolate' },
      { emoji: '🍬', name: 'candy' }, { emoji: '🍭', name: 'lollipop' }, { emoji: '🎂', name: 'birthday cake' },
    ],
  },
  {
    id: 'flowers', family: 'plant', plural: 'FLOWERS',
    question: 'Which one is not a flower?',
    about: n => `The ${n} is a flower!`,
    items: [
      { emoji: '🌻', name: 'sunflower' }, { emoji: '🌷', name: 'tulip' }, { emoji: '🌹', name: 'rose' },
      { emoji: '🌸', name: 'pink flower' }, { emoji: '🌺', name: 'red flower' }, { emoji: '🌼', name: 'yellow flower' },
    ],
  },
  {
    id: 'balls', family: 'thing', plural: 'BALLS',
    question: 'Which one is not a ball?',
    about: n => `The ${n} is a ball!`,
    items: [
      { emoji: '⚽', name: 'football' }, { emoji: '🏀', name: 'basketball' }, { emoji: '⚾', name: 'baseball' },
      { emoji: '🎾', name: 'tennis ball' }, { emoji: '🏐', name: 'volleyball' }, { emoji: '🏈', name: 'rugby ball' },
    ],
  },
  {
    id: 'music', family: 'thing', plural: 'MUSIC MAKERS',
    question: 'Which one does not make music?',
    about: n => `The ${n} makes music!`,
    items: [
      { emoji: '🎸', name: 'guitar' }, { emoji: '🎹', name: 'piano' }, { emoji: '🥁', name: 'drum' },
      { emoji: '🎺', name: 'trumpet' }, { emoji: '🎷', name: 'saxophone' }, { emoji: '🎻', name: 'violin' },
    ],
  },
  {
    id: 'sea', family: 'creature', plural: 'SEA CREATURES',
    question: 'Which one does not live in the sea?',
    about: n => `The ${n} lives in the sea!`,
    items: [
      { emoji: '🐳', name: 'whale' }, { emoji: '🐙', name: 'octopus' }, { emoji: '🦈', name: 'shark' },
      { emoji: '🐠', name: 'fish' }, { emoji: '🐡', name: 'puffer fish' }, { emoji: '🦀', name: 'crab' },
      { emoji: '🐬', name: 'dolphin' }, { emoji: '🦐', name: 'shrimp' },
    ],
  },
];

/**
 * Pairs that must never meet, in either direction: a fish *is* an animal, a
 * fruit *is* sweet, so "which one is not an animal?" with a fish would be a
 * trick question.
 */
const NEVER_TOGETHER: [string, string][] = [
  ['animals', 'sea'],
  ['fruits', 'sweets'],
];

function clash(a: Category, b: Category): boolean {
  return a.id === b.id || NEVER_TOGETHER.some(([x, y]) => (x === a.id && y === b.id) || (x === b.id && y === a.id));
}

/**
 * Categories allowed to supply the odd one out against `majority`.
 * Easy mode demands a different family entirely (animal vs car, never
 * guitar vs ball) so the contrast is obvious to a 2½-year-old.
 */
export function oddCandidates(majority: Category, difficulty: Difficulty): Category[] {
  return CATEGORIES.filter(c => !clash(majority, c) && (difficulty === 'hard' || c.family !== majority.family));
}

export const GRID = {
  easy: { cols: 2, rows: 2 },
  hard: { cols: 3, rows: 3 },
} as const;

/** Rounds per relaxed game: short enough for a toddler's attention. */
export const ROUNDS = 6;
export const TIMED_SECONDS = 30;

export const CONFETTI_EMOJIS = ['🌸', '⭐', '🎀', '✨', '🌟', '💖', '🎊', '🔍'];

/** Last-chosen settings survive a trip back to the title scene. */
export const settings: { difficulty: Difficulty; mode: PlayMode } = { difficulty: 'easy', mode: 'relaxed' };
