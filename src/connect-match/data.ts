export interface Pair {
  key: string;
  /** The friend (left column). */
  left: string;
  leftName: string;
  /** The thing it eats / uses (right column). */
  right: string;
  rightName: string;
  /** Spoken when the pair is connected. */
  phrase: string;
  /**
   * Keys of pairs that must never share a round with this one, because a
   * toddler could reasonably connect across them (a bear also eats fish, a
   * baby also drinks milk). Symmetric: listing it on one side is enough.
   */
  avoid?: string[];
}

/**
 * Easy set: "who eats what" pairs a 2½-year-old knows from picture books.
 * Every right-side emoji is a food or drink that reads clearly at phone size.
 * (Removed in the 2026-11 redesign as too abstract for this age: lion-crown,
 * owl-moon, whale-wave, crab-beach, dragon-fire, unicorn-rainbow, santa-gift…)
 */
export const EASY_PAIRS: Pair[] = [
  { key: 'dog',    left: '🐶', leftName: 'Dog',    right: '🦴', rightName: 'bone',   phrase: 'Dog loves the bone!' },
  { key: 'cat',    left: '🐱', leftName: 'Cat',    right: '🐟', rightName: 'fish',   phrase: 'Cat loves the fish!' },
  { key: 'rabbit', left: '🐰', leftName: 'Bunny',  right: '🥕', rightName: 'carrot', phrase: 'Bunny loves the carrot!' },
  { key: 'monkey', left: '🐵', leftName: 'Monkey', right: '🍌', rightName: 'banana', phrase: 'Monkey loves the banana!' },
  { key: 'mouse',  left: '🐭', leftName: 'Mouse',  right: '🧀', rightName: 'cheese', phrase: 'Mouse loves the cheese!' },
  { key: 'bear',   left: '🐻', leftName: 'Bear',   right: '🍯', rightName: 'honey',  phrase: 'Bear loves the honey!', avoid: ['cat', 'bee'] },
  { key: 'baby',   left: '👶', leftName: 'Baby',   right: '🍼', rightName: 'bottle', phrase: 'Baby loves the bottle!', avoid: ['cow'] },
  { key: 'cow',    left: '🐮', leftName: 'Cow',    right: '🥛', rightName: 'milk',   phrase: 'Cow gives us milk!' },
];

/** Tricky set: the easy friends plus a few that need a little more thinking. */
export const TRICKY_PAIRS: Pair[] = [
  ...EASY_PAIRS,
  { key: 'bee',      left: '🐝', leftName: 'Bee',      right: '🌻', rightName: 'flower', phrase: 'Bee loves the flower!' },
  { key: 'chicken',  left: '🐔', leftName: 'Chicken',  right: '🥚', rightName: 'egg',    phrase: 'Chicken lays an egg!', avoid: ['pig'] },
  { key: 'squirrel', left: '🐿️', leftName: 'Squirrel', right: '🌰', rightName: 'nut',    phrase: 'Squirrel loves the nut!', avoid: ['elephant'] },
  { key: 'elephant', left: '🐘', leftName: 'Elephant', right: '🥜', rightName: 'peanut', phrase: 'Elephant loves the peanut!' },
  { key: 'pig',      left: '🐷', leftName: 'Pig',      right: '🌽', rightName: 'corn',   phrase: 'Pig loves the corn!' },
  { key: 'horse',    left: '🐴', leftName: 'Horse',    right: '🍎', rightName: 'apple',  phrase: 'Horse loves the apple!', avoid: ['rabbit'] },
];

export type Level = 'easy' | 'tricky';

export interface GameConfig {
  level: Level;
  /** Timed race (optional) vs relaxed rounds (default). */
  timed: boolean;
}

export const LEVELS: Record<Level, { pairs: Pair[]; rounds: number[] }> = {
  // Pairs per round. Easy starts with a two-pair warm-up and shows each friend once.
  easy:   { pairs: EASY_PAIRS,   rounds: [2, 3, 3] },
  tricky: { pairs: TRICKY_PAIRS, rounds: [3, 3, 3, 3] },
};

/** Optional race mode: rounds of 3 keep refilling until the clock runs out. */
export const RACE_MS = 45_000;
export const RACE_PAIRS = 3;

/** Milliseconds of no progress before a little hand demonstrates a match. */
export const IDLE_HINT_MS = 6500;

export const CONFETTI_EMOJIS = ['🌸', '⭐', '🎀', '✨', '🌟', '💖', '🎊', '💞'];

function clash(a: Pair, b: Pair): boolean {
  return !!(a.avoid?.includes(b.key) || b.avoid?.includes(a.key));
}

/**
 * Draws pairs from a deck so friends don't repeat until every one has been
 * seen, and never puts two clashing pairs in the same round.
 */
export class PairDeck {
  private deck: Pair[] = [];
  constructor(private readonly pool: Pair[], private readonly shuffle: <T>(a: T[]) => T[]) {}

  draw(n: number): Pair[] {
    const out: Pair[] = [];
    const take = (src: Pair[]) => {
      for (let i = 0; i < src.length && out.length < n; ) {
        const p = src[i];
        if (!out.some(o => o.key === p.key || clash(o, p))) { out.push(p); src.splice(i, 1); }
        else i++;
      }
    };
    take(this.deck);
    if (out.length < n) {
      this.deck = this.shuffle(this.pool.filter(p => !out.some(o => o.key === p.key)));
      take(this.deck);
    }
    return out;
  }
}
