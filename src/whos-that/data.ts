import bingImg    from '../../ayas-whos-that/images/bing.png';
import flopImg    from '../../ayas-whos-that/images/flop.png';
import sulaImg    from '../../ayas-whos-that/images/sula.png';
import pandoImg   from '../../ayas-whos-that/images/pando.png';
import cocoImg    from '../../ayas-whos-that/images/coco.png';
import charlieImg from '../../ayas-whos-that/images/charlie.png';
import padgetImg  from '../../ayas-whos-that/images/padget.png';
import ammaImg    from '../../ayas-whos-that/images/amma.png';
import mollyImg   from '../../ayas-whos-that/images/molly.png';
import nickyImg   from '../../ayas-whos-that/images/nicky.png';

export type Difficulty = 'easy' | 'hard';
export type GameMode = 'bing' | 'animal';

export interface Character { name: string; key: string; url: string; }

export const CHARACTERS: Character[] = [
  { name: 'Bing',    key: 'bing',    url: bingImg    },
  { name: 'Flop',    key: 'flop',    url: flopImg    },
  { name: 'Sula',    key: 'sula',    url: sulaImg    },
  { name: 'Pando',   key: 'pando',   url: pandoImg   },
  { name: 'Coco',    key: 'coco',    url: cocoImg    },
  { name: 'Charlie', key: 'charlie', url: charlieImg },
  { name: 'Padget',  key: 'padget',  url: padgetImg  },
  { name: 'Amma',    key: 'amma',    url: ammaImg    },
  { name: 'Molly',   key: 'molly',   url: mollyImg   },
  { name: 'Nicky',   key: 'nicky',   url: nickyImg   },
];

/**
 * `group` marks look-alike silhouettes (four-legged walkers, birds). A round
 * never offers two pictures from the same group, so the shapes on screen are
 * always clearly different for a 2-year-old.
 * Full-body emoji are used wherever possible: a dark *face* (dog, cat, pig,
 * tiger…) is just a round blob, but a full body has a readable outline.
 */
export interface Animal { name: string; emoji: string; group?: string; }

export const ANIMALS: Animal[] = [
  { name: 'Dog',       emoji: '🐕', group: 'walker' },
  { name: 'Cat',       emoji: '🐈', group: 'walker' },
  { name: 'Pig',       emoji: '🐖', group: 'walker' },
  { name: 'Horse',     emoji: '🐎', group: 'walker' },
  { name: 'Rabbit',    emoji: '🐇' },
  { name: 'Elephant',  emoji: '🐘' },
  { name: 'Giraffe',   emoji: '🦒' },
  { name: 'Turtle',    emoji: '🐢' },
  { name: 'Butterfly', emoji: '🦋' },
  { name: 'Dinosaur',  emoji: '🦖' },
  { name: 'Monkey',    emoji: '🐒' },
  { name: 'Penguin',   emoji: '🐧', group: 'bird' },
  { name: 'Owl',       emoji: '🦉', group: 'bird' },
  { name: 'Duck',      emoji: '🦆', group: 'bird' },
  { name: 'Snail',     emoji: '🐌' },
  { name: 'Crab',      emoji: '🦀' },
  { name: 'Whale',     emoji: '🐳' },
  { name: 'Lion',      emoji: '🦁' },
  { name: 'Unicorn',   emoji: '🦄' },
];

export const CONFETTI_EMOJIS = ['🌸', '⭐', '🎀', '✨', '🌟', '💖', '🎊', '🐰'];

/**
 * Two paces. Relaxed (default) has no clock at all: 3 big picture choices
 * and as many tries as she needs. Quick adds a 4th picture and a gentle
 * "beat the clock" bar — running out of time never ends the round (D-007),
 * it just means that round's star isn't a first-try star.
 */
export const MODE = {
  easy: {
    rounds: 5,
    optionCount: 3,
    roundMs: 0,
    tintFill: 0x4a2c6e,
  },
  hard: {
    rounds: 5,
    optionCount: 4,
    roundMs: 10_000,
    tintFill: 0x2d1b3d,
  },
} as const;
