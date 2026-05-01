export const TOTAL_ROUNDS = 5;
export const OPTIONS_PER_ROUND = 4;

export type TargetCategory = 'fruit' | 'animal' | 'vehicle' | 'instrument';

interface TargetSpec {
  emoji: string;
  label: string;
  promptIcon: string;
  items: string[];
  /**
   * Distractor pools to filter out when this is the target. Used to
   * preserve the disjoint-category invariant (D-012): when the asked
   * category is FRUIT, vegetable distractors are excluded so a 2yo
   * never has to disambiguate two food categories on the same screen.
   * Other targets allow vegetables freely (carrot vs car, carrot vs
   * cat, carrot vs drum — all clearly different).
   */
  excludedDistractorPools?: string[];
}

/**
 * Target categories — the four choices Aya picks on the title screen.
 * Vegetable is intentionally NOT here (demoted to a distractor pool to
 * avoid food/food adjacency on fruit rounds — see D-012).
 */
export const TARGETS: Record<TargetCategory, TargetSpec> = {
  fruit: {
    label: 'FRUIT',
    emoji: '🍎',
    promptIcon: '🍎',
    items: ['🍎', '🍌', '🍓', '🍇', '🍊', '🍐', '🍒', '🍑', '🥭', '🍍', '🥝', '🥥', '🍉', '🍈', '🫐'],
    // The single excluded pool: vegetables would be food-adjacent for fruit rounds.
    excludedDistractorPools: ['vegetable'],
  },
  animal: {
    label: 'ANIMAL',
    emoji: '🐰',
    promptIcon: '🐰',
    items: ['🐶', '🐱', '🐰', '🐻', '🐯', '🦁', '🐼', '🐨', '🐸', '🐧', '🦒', '🐘', '🐵', '🦊', '🐮', '🐷'],
  },
  vehicle: {
    label: 'VEHICLE',
    emoji: '🚗',
    promptIcon: '🚗',
    items: ['🚗', '🚌', '🚲', '🚆', '✈️', '🚀', '🚓', '🚒', '🚜', '🛵', '🚁', '🚢', '⛵', '🏎️', '🚑'],
  },
  instrument: {
    label: 'INSTRUMENT',
    emoji: '🎸',
    promptIcon: '🎸',
    items: ['🎸', '🥁', '🎹', '🎻', '🎷', '🎺', '🎤', '🪈'],
  },
};

/**
 * Distractor pools — where the three "wrong" cards in each round come
 * from. Each round draws from THREE different pools (no repeats) so the
 * 4 cards on screen always feel maximally varied.
 *
 * Vegetable lives here (not as a target) so a 2yo never has to choose
 * between an apple and a carrot — but stays in the rotation for animal /
 * vehicle / instrument rounds where the contrast is unmistakable.
 *
 * `instrument` is *not* a distractor pool here — it was promoted to a
 * target. Its emoji never appear as wrong answers.
 */
export const DISTRACTOR_POOLS: Record<string, string[]> = {
  vegetable: ['🥕', '🥦', '🥒', '🌽', '🥔', '🍆', '🌶️', '🥬', '🧄', '🧅', '🫑'],
  building:   ['🏠', '🏢', '🏥', '🏫', '🗼', '⛪', '🏰', '🏛️'],
  furniture:  ['🛋️', '🛏️', '🚪', '🪑', '🛁', '🚽'],
  tool:       ['🔨', '🪛', '🔧', '🪚', '🧰', '⚒️'],
  tech:       ['📱', '💻', '⌚', '📷', '🖨️', '🎮'],
  // 🧸 (teddy bear) deliberately excluded — visually reads as an animal
  // and would confuse a 2yo on "Find the ANIMAL!" rounds.
  toy:        ['🪀', '🎈', '🎁', '🎲', '🪁'],
  stationery: ['✏️', '📝', '📒', '📚', '🖊️'],
  cosmic:     ['⭐', '🌙', '☀️', '🌈', '☁️', '⚡'],
  clothing:   ['👕', '👖', '👗', '👟', '🧢', '👜'],
  sport:      ['⚽', '🏀', '🎾', '🏈', '🥎', '🏐'],
};

/**
 * Per-round prompt phrasings — same target across the 5 rounds, but the
 * wording rotates so the screen feels fresh and the parent can read along
 * without sounding robotic. The {LABEL} token is replaced at render time.
 */
export const PROMPT_VARIANTS = [
  'Find the {LABEL}!',
  "Where's the {LABEL}?",
  'Tap the {LABEL}!',
  'Spot the {LABEL}!',
  'Last one — {LABEL}!',
];

export const CONFETTI_EMOJIS = ['🎯', '🫧', '⭐', '🌸', '✨', '🎀', '💖'];
