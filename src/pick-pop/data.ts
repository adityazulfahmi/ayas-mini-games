export const TOTAL_ROUNDS = 5;
export const OPTIONS_PER_ROUND = 4;

export type TargetCategory = 'fruit' | 'vegetable' | 'vehicle' | 'animal';

/**
 * Target categories — when this is the asked-about category, the *correct*
 * answer is drawn from this pool. We deliberately keep the four target
 * categories chosen to be visually unambiguous to a 2-year-old:
 *
 *   - fruit:     emoji that read as a *piece of fruit* (no berries-on-a-stem)
 *   - vegetable: clearly-not-fruit edible plants (🍅 left out: it's a fruit
 *                botanically, and even at 2 we don't want to tank scoring on
 *                a technicality)
 *   - vehicle:   things that move people / cargo
 *   - animal:    creature emoji with faces, easy to point at
 */
export const TARGETS: Record<TargetCategory, { emoji: string; label: string; promptIcon: string; items: string[] }> = {
  fruit: {
    label: 'FRUIT',
    emoji: '🍎',
    promptIcon: '🍎',
    items: ['🍎', '🍌', '🍓', '🍇', '🍊', '🍐', '🍒', '🍑', '🥭', '🍍', '🥝', '🥥', '🍉', '🍈', '🫐'],
  },
  vegetable: {
    label: 'VEGGIE',
    emoji: '🥕',
    promptIcon: '🥕',
    items: ['🥕', '🥦', '🥒', '🌽', '🥔', '🍆', '🌶️', '🥬', '🧄', '🧅', '🫑'],
  },
  vehicle: {
    label: 'VEHICLE',
    emoji: '🚗',
    promptIcon: '🚗',
    items: ['🚗', '🚌', '🚲', '🚆', '✈️', '🚀', '🚓', '🚒', '🚜', '🛵', '🚁', '🚢', '⛵', '🏎️', '🚑'],
  },
  animal: {
    label: 'ANIMAL',
    emoji: '🐰',
    promptIcon: '🐰',
    items: ['🐶', '🐱', '🐰', '🐻', '🐯', '🦁', '🐼', '🐨', '🐸', '🐧', '🦒', '🐘', '🐵', '🦊', '🐮', '🐷'],
  },
};

/**
 * "Extreme" distractor pools — every item here is *unmistakably* not a
 * fruit, vegetable, vehicle, or animal. The product requirement: when the
 * round asks "which is the FRUIT?", the wrong options must be from
 * categories like *musical instrument* or *building* — never another food.
 *
 * Each round picks exactly one distractor from each of three different
 * pools (no repeats), so the 4 cards on screen always feel maximally
 * varied.
 */
export const DISTRACTOR_POOLS: Record<string, string[]> = {
  instrument: ['🎸', '🥁', '🎹', '🎻', '🎷', '🎺', '🎤', '🪈'],
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

export const CONFETTI_EMOJIS = ['🎯', '🫧', '⭐', '🌸', '✨', '🎀', '💖'];
