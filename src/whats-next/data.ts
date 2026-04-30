export type GameMode = 'pattern' | 'story';

export const TOTAL_ROUNDS = 5;
export const OPTIONS_PER_ROUND = 3;

/**
 * Pattern mode building blocks. Each set is internally consistent (a single
 * "category" of items) so an ABAB pattern within a set reads as a clear
 * alternation rather than random noise. We keep ≥4 items so distractors
 * for the answer row come from the same family — wrong choices feel
 * thematically connected rather than visually random.
 */
export interface PatternSet {
  name: string;
  items: string[];
}
export const PATTERN_SETS: PatternSet[] = [
  { name: 'colors',  items: ['🔴', '🟡', '🔵', '🟢', '🟣', '🟠'] },
  { name: 'fruits',  items: ['🍎', '🍌', '🍓', '🍇', '🍊', '🥝'] },
  { name: 'animals', items: ['🐶', '🐱', '🐰', '🐻', '🐼', '🐭'] },
  { name: 'sweets',  items: ['🍩', '🍪', '🧁', '🍰', '🍫', '🍬'] },
  { name: 'shapes',  items: ['⭐', '❤️', '💎', '🌸', '🎀', '✨'] },
];

/**
 * Story mode = picture-clear FOUR-frame transformations. The first three
 * frames are visible and the fourth is the answer Aya picks. Both modes
 * share the same "3 visible + ?" sequence layout in the game scene.
 *
 * Distractors for the answer row come from other stories' final frames so
 * wrong choices feel obviously off-topic rather than plausibly correct.
 */
export interface Story {
  frames: [string, string, string, string];
}
export const STORIES: Story[] = [
  { frames: ['🌰',  '🌱',  '🌿',  '🌸']  }, // seed → sprout → leaves → flower
  { frames: ['🥚',  '🐣',  '🐤',  '🐔']  }, // egg → hatching → chick → hen
  { frames: ['🌑',  '🌒',  '🌓',  '🌕']  }, // new → crescent → half → full moon
  { frames: ['☀️', '🌤️', '🌧️', '🌈']  }, // sunny → cloudy → rainy → rainbow
  { frames: ['🌅', '☀️', '🌇',  '🌙']  }, // sunrise → noon → sunset → moon
  { frames: ['🥚',  '🍳',  '🥞',  '😋']  }, // egg → cooked → pancakes → yum
];

export const CONFETTI_EMOJIS = ['🌸', '⭐', '🎀', '✨', '🌟', '💖', '🔮', '🎊'];
