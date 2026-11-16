import { shuffle } from '@shared/utils';

// ─── Toys (drawn as vectors so colour and size are exact) ────────────────

export type ToyKind = 'ball' | 'block' | 'star' | 'heart' | 'flower' | 'fish' | 'car';

export interface Colour { key: string; name: string; hex: number }

export const COLOURS: Record<string, Colour> = {
  red:    { key: 'red',    name: 'red',    hex: 0xef5350 },
  blue:   { key: 'blue',   name: 'blue',   hex: 0x42a5f5 },
  yellow: { key: 'yellow', name: 'yellow', hex: 0xffca28 },
  green:  { key: 'green',  name: 'green',  hex: 0x66bb6a },
  purple: { key: 'purple', name: 'purple', hex: 0x9575cd },
  orange: { key: 'orange', name: 'orange', hex: 0xff9838 },
};

/** Pairs that are far apart for a toddler's eye (no red/orange, blue/purple, red/green). */
const COLOUR_PAIRS: [string, string][] = [
  ['red', 'blue'], ['yellow', 'purple'], ['green', 'orange'], ['blue', 'yellow'],
];
const COLOUR_TRIO = ['red', 'yellow', 'blue'];

const ALL_TOYS: ToyKind[] = ['ball', 'block', 'star', 'heart', 'flower', 'fish', 'car'];
const FIRST_TOYS: ToyKind[] = ['ball', 'block', 'star', 'heart'];
const SIZE_TOYS: ToyKind[] = ['star', 'ball', 'heart', 'fish', 'flower', 'block'];

// ─── Kinds (emoji; every one is unmistakable on Apple / Google / Samsung) ─

interface Thing { e: string; noun: string; art: string }
const t = (e: string, noun: string, art = 'a'): Thing => ({ e, noun, art });

interface KindDef {
  key: string;
  /** Soft basket colour. */
  color: number;
  /** Shown on the basket. Never used as an item, so it is a sign, not a match. */
  icon: string;
  rule: string;
  here: string;
  /** "A cow" → "A cow is an animal." */
  is: (name: string) => string;
  things: Thing[];
}

const KINDS: Record<string, KindDef> = {
  animal: {
    key: 'animal', color: 0x9ccc65, icon: '🐶',
    rule: 'Animals go in this basket!', here: 'Animals go here!',
    is: n => `${n} is an animal.`,
    things: [
      t('🐱', 'cat'), t('🐰', 'rabbit'), t('🐮', 'cow'), t('🐷', 'pig'), t('🐸', 'frog'), t('🐵', 'monkey'),
      t('🦁', 'lion'), t('🐘', 'elephant', 'an'), t('🐥', 'chick'), t('🐻', 'bear'), t('🦆', 'duck'), t('🐴', 'horse'),
    ],
  },
  food: {
    key: 'food', color: 0xffb74d, icon: '🍎',
    rule: 'Food goes in this basket!', here: 'Food goes here!',
    is: n => `${n} is food.`,
    things: [
      t('🍌', 'banana'), t('🍓', 'strawberry'), t('🍞', 'bread', ''), t('🧀', 'cheese', ''), t('🥕', 'carrot'),
      t('🍪', 'cookie'), t('🍉', 'watermelon'), t('🥚', 'egg', 'an'), t('🍊', 'orange', 'an'), t('🍕', 'pizza', ''),
      t('🥦', 'broccoli', ''),
    ],
  },
  go: {
    key: 'go', color: 0x64b5f6, icon: '🚗',
    rule: 'Things that go, go in this basket!', here: 'Things that go, go here!',
    is: n => `${n} can go.`,
    things: [
      t('🚌', 'bus'), t('🚂', 'train'), t('✈️', 'airplane', 'an'), t('🚲', 'bicycle'), t('🚀', 'rocket'),
      t('⛵', 'boat'), t('🚜', 'tractor'), t('🚒', 'fire truck'), t('🚁', 'helicopter'),
    ],
  },
};
const KIND_PAIRS: [string, string][] = [['animal', 'food'], ['animal', 'go'], ['food', 'go']];

// ─── A round: baskets + the toys to put away ─────────────────────────────

export type Badge =
  | { type: 'splash'; color: number }
  | { type: 'toy'; kind: ToyKind; scale: number }
  | { type: 'emoji'; char: string };

export interface BinDef {
  key: string;
  color: number;
  badge: Badge;
  /** Basket width, body height and how big sorted toys sit inside it. */
  w: number;
  bodyH: number;
  mini: number;
  /** Said at the start: "Red things go in the red basket!" */
  rule: string;
  /** Said when showing the way: "Red goes here!" */
  here: string;
}

export type ItemArt =
  | { type: 'toy'; kind: ToyKind; color: number }
  | { type: 'emoji'; char: string };

export interface ItemDef {
  bin: string;
  art: ItemArt;
  /** On-screen size while it waits to be sorted. */
  size: number;
  label: string;
  /** "A red ball!" */
  say: string;
  /** "That one is red." */
  is: string;
  /** "Red! Yay!" */
  yes: string;
}

export interface Round { bins: BinDef[]; items: ItemDef[] }

export interface LevelDef { name: string; spoken: string }
export const LEVELS: LevelDef[] = [
  { name: 'Colours',       spoken: 'Colours!' },
  { name: 'Big & small',   spoken: 'Big and small!' },
  { name: 'What is it?',   spoken: 'Animals, food, and things that go!' },
  { name: 'Three baskets', spoken: 'Three baskets!' },
];

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const PRAISE = ['Yay!', 'Good job!', 'Well done!', 'Yes!'];

/** Shuffle until no basket gets more than two toys in a row (so it never looks like "always this one"). */
function mixOrder(items: ItemDef[], prev: ItemDef[] = []): ItemDef[] {
  for (let tries = 0; tries < 60; tries++) {
    const s = shuffle(items);
    const all = [...prev, ...s];
    let ok = all.length < 2 || prev.length > 0 || all[0].bin !== all[1].bin;
    for (let i = 2; i < all.length && ok; i++) {
      if (all[i].bin === all[i - 1].bin && all[i].bin === all[i - 2].bin) ok = false;
    }
    if (ok) return s;
  }
  return shuffle(items);
}

function colourItem(c: Colour, kind: ToyKind, size: number): ItemDef {
  return {
    bin: c.key, art: { type: 'toy', kind, color: c.hex }, size,
    label: `${cap(c.name)} ${kind}`,
    say: `${c.name === 'orange' ? 'An' : 'A'} ${c.name} ${kind}!`,
    is: `That one is ${c.name}.`,
    yes: `${cap(c.name)}! ${pick(PRAISE)}`,
  };
}

function colourBin(c: Colour, w: number, bodyH: number, mini: number): BinDef {
  return {
    key: c.key, color: c.hex, badge: { type: 'splash', color: c.hex }, w, bodyH, mini,
    rule: `${cap(c.name)} things go in the ${c.name} basket!`,
    here: `${cap(c.name)} goes here!`,
  };
}

function kindItem(k: KindDef, th: Thing, size: number): ItemDef {
  const name = th.art ? `${cap(th.art)} ${th.noun}` : cap(th.noun);
  return {
    bin: k.key, art: { type: 'emoji', char: th.e }, size,
    label: cap(th.noun),
    say: `${name}!`,
    is: k.is(name),
    yes: `Yes! ${k.is(name).replace(/\.$/, '!')}`,
  };
}

function kindBin(k: KindDef, w: number, bodyH: number, mini: number): BinDef {
  return { key: k.key, color: k.color, badge: { type: 'emoji', char: k.icon }, w, bodyH, mini, rule: k.rule, here: k.here };
}

/**
 * Build one short session. `plays` (how often this level was finished before)
 * walks through the variations, so the very first game is always the plainest
 * one (red vs blue balls) and later games bring new colours, toys and kinds.
 */
export function buildRound(level: number, plays: number): Round {
  switch (level) {
    case 0: {
      // Colours: the same toy in two colours first, then all sorts of toys.
      const [a, b] = COLOUR_PAIRS[plays % COLOUR_PAIRS.length].map(k => COLOURS[k]);
      const first = FIRST_TOYS[plays % FIRST_TOYS.length];
      const rest = shuffle(ALL_TOYS.filter(k => k !== first)).slice(0, 4);
      const half1 = mixOrder([a, a, b, b].map(c => colourItem(c, first, 124)));
      const half2 = mixOrder([a, b, a, b].map((c, i) => colourItem(c, rest[i], 124)), half1);
      return { bins: shuffle([a, b]).map(c => colourBin(c, 164, 140, 66)), items: [...half1, ...half2] };
    }
    case 1: {
      // Big and small: one toy, two clearly different sizes. The colour changes halfway but does not matter.
      const kind = SIZE_TOYS[plays % SIZE_TOYS.length];
      const [c1, c2] = shuffle(Object.values(COLOURS));
      const straw = 0xf6c177;
      const mk = (big: boolean, c: Colour): ItemDef => ({
        bin: big ? 'big' : 'small', art: { type: 'toy', kind, color: c.hex }, size: big ? 156 : 66,
        label: `${big ? 'Big' : 'Small'} ${kind}`,
        say: `A ${big ? 'big' : 'small'} ${kind}!`,
        is: `That one is ${big ? 'big' : 'small'}.`,
        yes: `${big ? 'Big' : 'Small'}! ${pick(PRAISE)}`,
      });
      const half1 = mixOrder([true, true, false, false].map(bg => mk(bg, c1)));
      const half2 = mixOrder([true, true, false, false].map(bg => mk(bg, c2)), half1);
      const bins: BinDef[] = [
        { key: 'big', color: straw, badge: { type: 'toy', kind, scale: 1 }, w: 198, bodyH: 150, mini: 72,
          rule: 'Big ones go in the big basket!', here: 'Big ones go here!' },
        { key: 'small', color: straw, badge: { type: 'toy', kind, scale: 0.45 }, w: 122, bodyH: 96, mini: 36,
          rule: 'Small ones go in the small basket!', here: 'Small ones go here!' },
      ];
      return { bins: shuffle(bins), items: [...half1, ...half2] };
    }
    case 2: {
      // Kinds: two baskets, four things each.
      const kinds = KIND_PAIRS[plays % KIND_PAIRS.length].map(k => KINDS[k]);
      const items = kinds.flatMap(k => shuffle(k.things).slice(0, 4).map(th => kindItem(k, th, 124)));
      return { bins: shuffle(kinds).map(k => kindBin(k, 164, 140, 66)), items: mixOrder(items) };
    }
    default: {
      // Tricky: three baskets. Colours one time, kinds the next.
      if (plays % 2 === 0) {
        const cols = COLOUR_TRIO.map(k => COLOURS[k]);
        const items = cols.flatMap(c => shuffle(ALL_TOYS).slice(0, 3).map(kind => colourItem(c, kind, 124)));
        return { bins: shuffle(cols).map(c => colourBin(c, 106, 124, 48)), items: mixOrder(items) };
      }
      const kinds = Object.values(KINDS);
      const items = kinds.flatMap(k => shuffle(k.things).slice(0, 3).map(th => kindItem(k, th, 124)));
      return { bins: shuffle(kinds).map(k => kindBin(k, 106, 124, 48)), items: mixOrder(items) };
    }
  }
}

// ─── Remembered between visits ───────────────────────────────────────────

const STORE_KEY = 'aya-sort-it';
export interface Save { level: number; plays: number[]; }

export function loadSave(): Save {
  const blank: Save = { level: 0, plays: LEVELS.map(() => 0) };
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null') as Partial<Save> | null;
    if (!raw) return blank;
    const level = Number.isInteger(raw.level) && raw.level! >= 0 && raw.level! < LEVELS.length ? raw.level! : 0;
    const plays = LEVELS.map((_, i) => Math.max(0, Math.floor(Number(raw.plays?.[i]) || 0)));
    return { level, plays };
  } catch { return blank; }
}

export function storeSave(s: Save): void {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch { /* private mode */ }
}

export const CONFETTI_EMOJIS = ['🧺', '⭐', '💖', '🎉', '✨', '🌟', '🎈'];
