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

export interface Animal { name: string; emoji: string; }

export const ANIMALS: Animal[] = [
  { name: 'Dog',       emoji: '🐶' },
  { name: 'Cat',       emoji: '🐱' },
  { name: 'Rabbit',    emoji: '🐰' },
  { name: 'Panda',     emoji: '🐼' },
  { name: 'Lion',      emoji: '🦁' },
  { name: 'Tiger',     emoji: '🐯' },
  { name: 'Frog',      emoji: '🐸' },
  { name: 'Fox',       emoji: '🦊' },
  { name: 'Penguin',   emoji: '🐧' },
  { name: 'Unicorn',   emoji: '🦄' },
  { name: 'Pig',       emoji: '🐷' },
  { name: 'Butterfly', emoji: '🦋' },
  { name: 'Turtle',    emoji: '🐢' },
  { name: 'Elephant',  emoji: '🐘' },
  { name: 'Giraffe',   emoji: '🦒' },
  { name: 'Owl',       emoji: '🦉' },
  { name: 'Dinosaur',  emoji: '🦖' },
  { name: 'Monkey',    emoji: '🐵' },
];

export const CONFETTI_EMOJIS = ['🌸', '⭐', '🎀', '✨', '🌟', '💖', '🎊', '🐰'];

/**
 * Per-difficulty round shape. Easy rounds give more time, fewer options, and
 * a slightly brighter silhouette so a child can read the contour; Hard is
 * harder on every axis. Score is the raw count of correct answers out of
 * `rounds`, so difficulty only affects the round mechanics, not the scale.
 */
export const MODE = {
  easy: {
    rounds: 5,
    optionCount: 3,
    roundMs: 12_000,
    tintFill: 0x3d2552,
  },
  hard: {
    rounds: 5,
    optionCount: 4,
    roundMs: 8_000,
    tintFill: 0x15091f,
  },
} as const;
