export interface Pair {
  key: string;
  left: string;
  right: string;
}

/**
 * Semantic "goes-with" pairs chosen so a 2-year-old can reason about them
 * without reading. Keep both sides visually distinct and unambiguous —
 * avoid re-using the same emoji on the right side across pairs, or the
 * matching logic gives false positives.
 */
export const PAIRS: Pair[] = [
  { key: 'dog-bone',        left: '🐶', right: '🦴' },
  { key: 'cat-fish',        left: '🐱', right: '🐟' },
  { key: 'rabbit-carrot',   left: '🐰', right: '🥕' },
  { key: 'bee-flower',      left: '🐝', right: '🌸' },
  { key: 'monkey-banana',   left: '🐵', right: '🍌' },
  { key: 'mouse-cheese',    left: '🐭', right: '🧀' },
  { key: 'chicken-egg',     left: '🐔', right: '🥚' },
  { key: 'bear-honey',      left: '🐻', right: '🍯' },
  { key: 'lion-crown',      left: '🦁', right: '👑' },
  { key: 'cow-milk',        left: '🐮', right: '🥛' },
  { key: 'pig-corn',        left: '🐷', right: '🌽' },
  { key: 'unicorn-rainbow', left: '🦄', right: '🌈' },
  { key: 'panda-bamboo',    left: '🐼', right: '🎋' },
  { key: 'owl-moon',        left: '🦉', right: '🌙' },
  { key: 'penguin-ice',     left: '🐧', right: '🧊' },
  { key: 'koala-tree',      left: '🐨', right: '🌳' },
  { key: 'bird-nest',       left: '🐦', right: '🪺' },
  { key: 'ladybug-leaf',    left: '🐞', right: '🍃' },
  { key: 'baby-bottle',     left: '👶', right: '🍼' },
  { key: 'turtle-shell',    left: '🐢', right: '🐚' },
  { key: 'elephant-peanut', left: '🐘', right: '🥜' },
  { key: 'whale-wave',      left: '🐳', right: '🌊' },
  { key: 'crab-beach',      left: '🦀', right: '🏖️' },
  { key: 'parrot-palm',     left: '🦜', right: '🌴' },
  { key: 'dragon-fire',     left: '🐲', right: '🔥' },
  { key: 'santa-gift',      left: '🎅', right: '🎁' },
  { key: 'pumpkin-ghost',   left: '🎃', right: '👻' },
  { key: 'sun-sunflower',   left: '🌞', right: '🌻' },
  { key: 'cake-party',      left: '🎂', right: '🎉' },
  { key: 'butterfly-tulip', left: '🦋', right: '🌷' },
  { key: 'squirrel-acorn',  left: '🐿️', right: '🌰' },
];

export const ROUND_DURATION_MS = 30_000;
export const PAIRS_PER_ROUND = 3;

export const CONFETTI_EMOJIS = ['🌸', '⭐', '🎀', '✨', '🌟', '💖', '🎊', '🔗'];
