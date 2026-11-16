import cowSrc from '../../ayas-who-makes-sound/sounds/cow.mp3';
import dogSrc from '../../ayas-who-makes-sound/sounds/dog.mp3';
import catSrc from '../../ayas-who-makes-sound/sounds/cat.mp3';
import duckSrc from '../../ayas-who-makes-sound/sounds/duck.mp3';
import sheepSrc from '../../ayas-who-makes-sound/sounds/sheep.mp3';
import horseSrc from '../../ayas-who-makes-sound/sounds/horse.mp3';
import pigSrc from '../../ayas-who-makes-sound/sounds/pig.mp3';
import roosterSrc from '../../ayas-who-makes-sound/sounds/rooster.mp3';
import lionSrc from '../../ayas-who-makes-sound/sounds/lion.mp3';
import frogSrc from '../../ayas-who-makes-sound/sounds/frog.mp3';

export interface Animal {
  name: string;
  emoji: string;
  /**
   * Real-animal recording, trimmed to start right on the sound (scripts/trim-sounds.mjs).
   * See sounds/CREDITS.md for sources.
   */
  src: string;
  /** Spoken via speech-synth if the recording can't play. */
  fallback: string;
  /** Shown after a correct answer: "Dog says Woof!" */
  says: string;
}

export const ANIMALS: Animal[] = [
  { name: 'Cow',     emoji: '🐮', src: cowSrc,      fallback: 'mooo mooo', says: 'Moo' },
  { name: 'Dog',     emoji: '🐶', src: dogSrc,      fallback: 'woof woof', says: 'Woof' },
  { name: 'Cat',     emoji: '🐱', src: catSrc,      fallback: 'meow', says: 'Meow' },
  { name: 'Duck',    emoji: '🦆', src: duckSrc,     fallback: 'quack quack', says: 'Quack' },
  { name: 'Sheep',   emoji: '🐑', src: sheepSrc,    fallback: 'baaa baaa', says: 'Baa' },
  { name: 'Horse',   emoji: '🐴', src: horseSrc,    fallback: 'neigh', says: 'Neigh' },
  { name: 'Pig',     emoji: '🐷', src: pigSrc,      fallback: 'oink oink', says: 'Oink' },
  { name: 'Rooster', emoji: '🐓', src: roosterSrc, fallback: 'cock a doodle doo', says: 'Cock-a-doodle-doo' },
  { name: 'Lion',    emoji: '🦁', src: lionSrc,     fallback: 'roarrr', says: 'Roar' },
  { name: 'Frog',    emoji: '🐸', src: frogSrc,     fallback: 'ribbit ribbit', says: 'Ribbit' },
];

export const TOTAL_ROUNDS = 5;

export interface Mode {
  /** Answer cards per round. */
  choices: 2 | 4;
  label: string;
  emoji: string;
  blurb: string;
}

export const MODES: Mode[] = [
  { choices: 2, label: 'Little Ears', emoji: '🐣', blurb: '2 animals to pick from' },
  { choices: 4, label: 'Big Ears',    emoji: '🦉', blurb: '4 animals to pick from' },
];

/** "Who says moo?" — the animal's call, lower-cased for speech + caption. */
export function callWord(a: Animal): string {
  return a.says.toLowerCase();
}

export const CONFETTI_EMOJIS = ['🌸', '⭐', '🎀', '✨', '🌟', '💖', '🎊', '🎶'];
