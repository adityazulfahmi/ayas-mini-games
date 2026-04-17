export type Difficulty = 'easy' | 'hard';

export interface Category {
  name: string;
  /** Big friendly hint shown on easy mode's category card */
  prompt: string;
  /** One-line emoji row used as a visual mnemonic on easy-mode hint */
  mnemonic: string;
  emojis: string[];
}

/**
 * Categories are curated so their members look like they belong to the same
 * "family" at a glance (all animals, all fruits, etc.) — no member could
 * plausibly sit in two groups. That keeps the odd-one-out unambiguous.
 */
export const CATEGORIES: Category[] = [
  {
    name: 'Animals', prompt: 'These are ANIMALS', mnemonic: '🐱 🐶 🐰',
    emojis: ['🐱', '🐶', '🐸', '🐼', '🐨', '🦊', '🐯', '🐮', '🐷', '🦁', '🐰', '🐵', '🐻'],
  },
  {
    name: 'Fruits', prompt: 'These are FRUITS', mnemonic: '🍎 🍊 🍓',
    emojis: ['🍎', '🍊', '🍋', '🍇', '🍓', '🍒', '🍑', '🍌', '🍉', '🍐', '🫐', '🥝', '🍍'],
  },
  {
    name: 'Vehicles', prompt: 'These are VEHICLES', mnemonic: '🚗 ✈️ 🚀',
    emojis: ['🚗', '✈️', '🚀', '🚌', '🚂', '🚁', '⛵', '🚑', '🚒', '🚲'],
  },
  {
    name: 'Sweets', prompt: 'These are SWEETS', mnemonic: '🍦 🍰 🍪',
    emojis: ['🍦', '🍰', '🧁', '🍩', '🍪', '🍫', '🍬', '🍭', '🎂'],
  },
  {
    name: 'Flowers', prompt: 'These are FLOWERS', mnemonic: '🌸 🌻 🌷',
    emojis: ['🌸', '🌺', '🌻', '🌹', '🌷', '🌼', '💐', '🏵️', '🪻'],
  },
  {
    name: 'Sports gear', prompt: 'These are SPORTS', mnemonic: '⚽ 🏀 🎾',
    emojis: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏓', '🎳', '🏸'],
  },
  {
    name: 'Musical', prompt: 'These are INSTRUMENTS', mnemonic: '🎸 🎹 🥁',
    emojis: ['🎸', '🎹', '🥁', '🎺', '🎷', '🎻', '🎤', '🪕', '🪗'],
  },
  {
    name: 'Sea creatures', prompt: 'These live in the SEA', mnemonic: '🐳 🐙 🐠',
    emojis: ['🐳', '🐙', '🦈', '🐠', '🐡', '🦀', '🦐', '🐬', '🐟'],
  },
];

export const CONFETTI_EMOJIS = ['🌸', '⭐', '🎀', '✨', '🌟', '💖', '🎊', '🔍'];
