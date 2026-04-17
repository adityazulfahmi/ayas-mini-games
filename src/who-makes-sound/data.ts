export interface Animal {
  name: string;
  emoji: string;
  /** Spoken cue read aloud by the browser's speech synth. */
  utter: string;
}

/**
 * Each animal's `utter` is the text read aloud via Web Speech API. The
 * spellings are tuned so default English voices produce something a toddler
 * recognises — extra vowels stretch the sound, double-words give rhythm.
 */
export const ANIMALS: Animal[] = [
  { name: 'Cow',     emoji: '🐮', utter: 'mooo mooo' },
  { name: 'Dog',     emoji: '🐶', utter: 'woof woof' },
  { name: 'Cat',     emoji: '🐱', utter: 'meow' },
  { name: 'Duck',    emoji: '🦆', utter: 'quack quack' },
  { name: 'Sheep',   emoji: '🐑', utter: 'baaa baaa' },
  { name: 'Horse',   emoji: '🐴', utter: 'neigh' },
  { name: 'Pig',     emoji: '🐷', utter: 'oink oink' },
  { name: 'Rooster', emoji: '🐓', utter: 'cock a doodle doo' },
  { name: 'Lion',    emoji: '🦁', utter: 'roarrr' },
  { name: 'Bee',     emoji: '🐝', utter: 'bzzzz' },
  { name: 'Frog',    emoji: '🐸', utter: 'ribbit ribbit' },
  { name: 'Owl',     emoji: '🦉', utter: 'hoo hoo' },
];

export const TOTAL_ROUNDS = 10;
export const OPTIONS_PER_ROUND = 4;

export const CONFETTI_EMOJIS = ['🌸', '⭐', '🎀', '✨', '🌟', '💖', '🎊', '🎶'];
