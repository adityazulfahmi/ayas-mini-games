export type GameMode = 'pattern' | 'story';

export const TOTAL_ROUNDS = 5;
export const OPTIONS_PER_ROUND = 3;

// ─── Pattern mode ────────────────────────────────────────────────────────

/**
 * One thing that can appear in a pattern. `name` is spoken aloud as the row
 * plays its beat ("apple, banana, apple, banana… what comes next?"), and
 * `tint` is a rough main colour: items picked into the same round must have
 * different tints, so A and B never look alike (no apple + strawberry).
 */
export interface PatternItem {
  e: string;
  name: string;
  tint: string;
}

export interface PatternFamily {
  name: string;
  items: PatternItem[];
}

export const PATTERN_FAMILIES: PatternFamily[] = [
  {
    name: 'fruit',
    items: [
      { e: '🍎', name: 'apple',      tint: 'red' },
      { e: '🍌', name: 'banana',     tint: 'yellow' },
      { e: '🍇', name: 'grapes',     tint: 'purple' },
      { e: '🍊', name: 'orange',     tint: 'orange' },
      { e: '🍉', name: 'watermelon', tint: 'green' },
    ],
  },
  {
    name: 'animals',
    items: [
      { e: '🐶', name: 'doggy',  tint: 'brown' },
      { e: '🐸', name: 'froggy', tint: 'green' },
      { e: '🐷', name: 'piggy',  tint: 'pink' },
      { e: '🐼', name: 'panda',  tint: 'white' },
      { e: '🐥', name: 'chick',  tint: 'yellow' },
    ],
  },
  {
    name: 'colours',
    items: [
      { e: '🔴', name: 'red',    tint: 'red' },
      { e: '🔵', name: 'blue',   tint: 'blue' },
      { e: '🟡', name: 'yellow', tint: 'yellow' },
      { e: '🟢', name: 'green',  tint: 'green' },
      { e: '🟣', name: 'purple', tint: 'blue' }, // too close to blue to pair
    ],
  },
  {
    name: 'sky',
    items: [
      { e: '⭐', name: 'star',   tint: 'yellow' },
      { e: '❤️', name: 'heart',  tint: 'red' },
      { e: '☁️', name: 'cloud',  tint: 'white' },
      { e: '🌸', name: 'flower', tint: 'pink' },
      { e: '💧', name: 'drop',   tint: 'blue' },
    ],
  },
  {
    name: 'vehicles',
    items: [
      { e: '🚗', name: 'car',   tint: 'red' },
      { e: '🚂', name: 'train', tint: 'black' },
      { e: '✈️', name: 'plane', tint: 'grey' },
      { e: '⛵', name: 'boat',  tint: 'white' },
      { e: '🚌', name: 'bus',   tint: 'yellow' },
    ],
  },
];

/**
 * Pattern difficulty grows slowly over the five rounds. `shape` is the
 * repeating unit written with letters (A/B/C index into the three items
 * picked for the round); `shown` is how many items are visible before the
 * "?" slot. Every round offers the three picked items as the choices, so
 * the third card is always "something new" that can be ruled out.
 *
 *   1. A B A B ?      → A   (simplest alternation)
 *   2. A B A B ?      → A   (again, new family, builds confidence)
 *   3. A B A B A ?    → B
 *   4. A A B A A ?    → B
 *   5. A B C A B ?    → C
 */
export interface PatternLevel { shape: string; shown: number }
export const PATTERN_LEVELS: PatternLevel[] = [
  { shape: 'AB',  shown: 4 },
  { shape: 'AB',  shown: 4 },
  { shape: 'AB',  shown: 5 },
  { shape: 'AAB', shown: 5 },
  { shape: 'ABC', shown: 5 },
];

// ─── Story mode ──────────────────────────────────────────────────────────

/**
 * A little four-step story from a toddler's world. The first three frames
 * play one at a time with a spoken line each; Aya picks the fourth.
 * `scale` lets one emoji appear at different sizes (the hungry caterpillar
 * gets bigger). Wrong choices are other stories' endings, so they are
 * clearly off-topic.
 */
export interface StoryFrame { e: string; say: string; scale?: number }
export interface Story {
  title: string;
  frames: [StoryFrame, StoryFrame, StoryFrame];
  end: StoryFrame;
}

export const STORIES: Story[] = [
  {
    title: 'The little egg',
    frames: [
      { e: '🥚', say: 'An egg.' },
      { e: '🐣', say: 'Crack! It hatches.' },
      { e: '🐥', say: 'A little chick.' },
    ],
    end: { e: '🐔', say: 'A big chicken!' },
  },
  {
    title: 'The tiny seed',
    frames: [
      { e: '🌰', say: 'A tiny seed.' },
      { e: '🌱', say: 'A little sprout.' },
      { e: '🌿', say: 'It grows and grows.' },
    ],
    end: { e: '🌻', say: 'A big sunflower!' },
  },
  {
    title: 'The hungry caterpillar',
    frames: [
      { e: '🐛', say: 'A little caterpillar.', scale: 0.7 },
      { e: '🍏', say: 'Munch, munch, munch!' },
      { e: '🐛', say: 'A big fat caterpillar.', scale: 1.15 },
    ],
    end: { e: '🦋', say: 'A beautiful butterfly!' },
  },
  {
    title: 'Rainy day',
    frames: [
      { e: '☀️', say: 'Sunshine.' },
      { e: '☁️', say: 'Here come the clouds.' },
      { e: '🌧️', say: 'Pitter patter, rain!' },
    ],
    end: { e: '🌈', say: 'A rainbow!' },
  },
  {
    title: 'Bedtime',
    frames: [
      { e: '🛁', say: 'Bath time.' },
      { e: '🪥', say: 'Brush your teeth.' },
      { e: '📖', say: 'A bedtime story.' },
    ],
    end: { e: '😴', say: 'Night night, sleepy time!' },
  },
  {
    title: 'Growing up',
    frames: [
      { e: '👶', say: 'A baby.' },
      { e: '👧', say: 'A big girl, like Aya!' },
      { e: '👩', say: 'A grown-up, like Mama.' },
    ],
    end: { e: '👵', say: 'A grandma!' },
  },
];

export const CONFETTI_EMOJIS = ['🌸', '⭐', '🎀', '✨', '🌟', '💖', '🔮', '🎊'];
