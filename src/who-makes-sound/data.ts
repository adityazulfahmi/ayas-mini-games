import cowSrc     from '../../ayas-who-makes-sound/sounds/cow.ogg';
import dogSrc     from '../../ayas-who-makes-sound/sounds/dog.ogg';
import catSrc     from '../../ayas-who-makes-sound/sounds/cat.ogg';
import duckSrc    from '../../ayas-who-makes-sound/sounds/duck.ogg';
import sheepSrc   from '../../ayas-who-makes-sound/sounds/sheep.ogg';
import horseSrc   from '../../ayas-who-makes-sound/sounds/horse.ogg';
import pigSrc     from '../../ayas-who-makes-sound/sounds/pig.ogg';
import roosterSrc from '../../ayas-who-makes-sound/sounds/rooster.ogg';
import lionSrc    from '../../ayas-who-makes-sound/sounds/lion.ogg';
import frogSrc    from '../../ayas-who-makes-sound/sounds/frog.ogg';

export interface Animal {
  name: string;
  emoji: string;
  /** Real-animal recording (Ogg Vorbis). See sounds/CREDITS.md for sources. */
  src: string;
  /**
   * Max playback duration in ms. The asset itself may be longer; we cut
   * playback short so every round stays snappy for a 2-year-old.
   */
  clipMs: number;
  /** Fallback text spoken via speech-synth when the browser can't play Ogg. */
  fallback: string;
}

export const ANIMALS: Animal[] = [
  { name: 'Cow',     emoji: '🐮', src: cowSrc,     clipMs: 2500, fallback: 'mooo mooo' },
  { name: 'Dog',     emoji: '🐶', src: dogSrc,     clipMs: 2000, fallback: 'woof woof' },
  { name: 'Cat',     emoji: '🐱', src: catSrc,     clipMs: 1500, fallback: 'meow' },
  { name: 'Duck',    emoji: '🦆', src: duckSrc,    clipMs: 2500, fallback: 'quack quack' },
  { name: 'Sheep',   emoji: '🐑', src: sheepSrc,   clipMs: 1500, fallback: 'baaa baaa' },
  { name: 'Horse',   emoji: '🐴', src: horseSrc,   clipMs: 3000, fallback: 'neigh' },
  { name: 'Pig',     emoji: '🐷', src: pigSrc,     clipMs: 1500, fallback: 'oink oink' },
  { name: 'Rooster', emoji: '🐓', src: roosterSrc, clipMs: 2500, fallback: 'cock a doodle doo' },
  { name: 'Lion',    emoji: '🦁', src: lionSrc,    clipMs: 2500, fallback: 'roarrr' },
  { name: 'Frog',    emoji: '🐸', src: frogSrc,    clipMs: 2000, fallback: 'ribbit ribbit' },
];

export const TOTAL_ROUNDS = 5;
export const OPTIONS_PER_ROUND = 4;

export const CONFETTI_EMOJIS = ['🌸', '⭐', '🎀', '✨', '🌟', '💖', '🎊', '🎶'];
