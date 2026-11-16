export type GameMode = 'pattern' | 'story';

export const TOTAL_ROUNDS = 5;
export const LEVEL_KEY = 'aya.whats-next.level';

// ─── Pattern mode ────────────────────────────────────────────────────────

export type Sfx = 'drum' | 'clap' | 'bell';

/**
 * One thing that can sit on a stepping stone.
 *  - `say` is spoken on the beat ("apple, banana, apple…"); `label` is the
 *    word printed under the answer card (defaults to `say`).
 *  - `bg` is the stone's colour and `hue` a rough colour name: items picked
 *    into one round always have different hues, so A and B differ in colour
 *    AND shape (never apple + strawberry).
 *  - `scale` draws the same picture bigger/smaller (big bear, little bear).
 *  - `sfx` plays a real sound instead of a spoken word (drum, clap, bell).
 */
export interface PatternItem {
  e: string;
  say: string;
  label?: string;
  hue: string;
  bg: number;
  scale?: number;
  sfx?: Sfx;
}

export interface PatternFamily {
  name: string;
  items: PatternItem[];
  /** Same picture in every item (size patterns): skip the "different hue" rule. */
  sameHue?: boolean;
}

const BG = {
  red: 0xffc9cf, yellow: 0xffefa0, purple: 0xe0c8ff, orange: 0xffd6a5, green: 0xc5efbe,
  brown: 0xecd5bd, pink: 0xffcfe6, white: 0xe4eaf3, blue: 0xbfdcff, grey: 0xd3d8e2,
} as const;
type Hue = keyof typeof BG;
const it = (e: string, say: string, hue: Hue, extra: Partial<PatternItem> = {}): PatternItem =>
  ({ e, say, hue, bg: BG[hue], ...extra });

/** Everyday things: the picture changes, its name is spoken. */
export const THING_FAMILIES: PatternFamily[] = [
  { name: 'fruit', items: [
    it('🍎', 'apple', 'red'), it('🍌', 'banana', 'yellow'), it('🍇', 'grapes', 'purple'),
    it('🍊', 'orange', 'orange'), it('🍉', 'watermelon', 'green'),
  ] },
  { name: 'animals', items: [
    it('🐶', 'doggy', 'brown'), it('🐸', 'froggy', 'green'), it('🐷', 'piggy', 'pink'),
    it('🐼', 'panda', 'white'), it('🐱', 'kitty', 'yellow'),
  ] },
  { name: 'sky', items: [
    it('⭐', 'star', 'yellow'), it('❤️', 'heart', 'red'), it('☁️', 'cloud', 'white'),
    it('🌸', 'flower', 'pink'), it('💧', 'drop', 'blue'),
  ] },
  { name: 'vehicles', items: [
    it('🚗', 'car', 'red'), it('🚌', 'bus', 'yellow'), it('🚂', 'train', 'grey'),
    it('🚜', 'tractor', 'green'), it('⛵', 'boat', 'orange'),
  ] },
];

/** Colour patterns: same shape, only the colour changes. */
export const COLOUR_FAMILY: PatternFamily = { name: 'colours', items: [
  it('🔴', 'red', 'red'), it('🔵', 'blue', 'blue'), it('🟡', 'yellow', 'yellow'), it('🟢', 'green', 'green'),
] };

/** Animal voices: the row is heard as "moo, quack, moo, quack…". */
export const VOICE_FAMILY: PatternFamily = { name: 'voices', items: [
  it('🐮', 'moo', 'white'), it('🦆', 'quack', 'green'), it('🐑', 'baa', 'grey'),
  it('🐱', 'meow', 'yellow'), it('🐶', 'woof', 'brown'),
] };

/** Music: real drum / clap / bell sounds, no words needed. */
export const MUSIC_FAMILY: PatternFamily = { name: 'music', items: [
  it('🥁', 'boom', 'red', { sfx: 'drum' }), it('👏', 'clap', 'yellow', { sfx: 'clap' }),
  it('🔔', 'ding', 'blue', { sfx: 'bell' }),
] };

/** Size patterns: one picture, big and little. */
const SIZE_OBJECTS: Array<{ e: string; hue: Hue }> = [
  { e: '🐻', hue: 'brown' }, { e: '🐘', hue: 'blue' }, { e: '⚽', hue: 'green' },
  { e: '🐟', hue: 'blue' }, { e: '🌳', hue: 'yellow' },
];
export function makeSizeFamily(): PatternFamily {
  const o = SIZE_OBJECTS[Math.floor(Math.random() * SIZE_OBJECTS.length)];
  return { name: 'size', sameHue: true, items: [
    it(o.e, 'big', o.hue, { scale: 1 }),
    it(o.e, 'little', o.hue, { scale: 0.52 }),
  ] };
}

/**
 * The ladder (easiest first). `shapes` is the repeating unit written with
 * letters, shown `units` times; the "?" is always the LAST step of the last
 * unit, so the finished unit right before it is the model to copy. `choices`
 * is the number of answer cards.
 *
 *   1. A B · A B · A ?     two cards: just the two things in the pattern
 *   2. A B · A B · A ?     three cards: one is something new to rule out
 *   3. A A B · A A ?  or  A B B · A B ?
 *   4. A B C · A B ?
 *
 * The game starts on the level chosen on the title screen and then adapts:
 * two first-try answers in a row step up, a round with a miss steps down.
 */
export interface PatternLevel { shapes: string[]; units: number; choices: number; blurb: string }
export const PATTERN_LEVELS: PatternLevel[] = [
  { shapes: ['AB'],         units: 3, choices: 2, blurb: 'A-B pattern · 2 cards' },
  { shapes: ['AB'],         units: 3, choices: 3, blurb: 'A-B pattern · 3 cards' },
  { shapes: ['AAB', 'ABB'], units: 2, choices: 3, blurb: 'A-A-B and A-B-B' },
  { shapes: ['ABC'],        units: 2, choices: 3, blurb: 'A-B-C pattern' },
];

export function loadLevel(): number {
  try {
    const n = Number(window.localStorage.getItem(LEVEL_KEY));
    if (Number.isInteger(n) && n >= 1 && n <= PATTERN_LEVELS.length) return n;
  } catch { /* private mode */ }
  return 1;
}
export function saveLevel(n: number): void {
  try { window.localStorage.setItem(LEVEL_KEY, String(n)); } catch { /* ignore */ }
}

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
  {
    title: 'Baking a cake',
    frames: [
      { e: '🥣', say: 'Mix, mix, mix.' },
      { e: '🔥', say: 'Into the hot oven.' },
      { e: '⏰', say: 'Ding! It is ready.' },
    ],
    end: { e: '🎂', say: 'A yummy cake!' },
  },
  {
    title: 'Going out',
    frames: [
      { e: '🧦', say: 'Socks on.' },
      { e: '👟', say: 'Shoes on.' },
      { e: '🚪', say: 'Open the door.' },
    ],
    end: { e: '🌳', say: 'Off to the park!' },
  },
];

export const CONFETTI_EMOJIS = ['🌸', '⭐', '🎀', '✨', '🌟', '💖', '🔮', '🎊'];
