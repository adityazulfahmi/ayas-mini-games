export interface ColourGroup {
  name: string;
  /** Display label — short, child-friendly, always Title Case */
  prompt: string;
  /** Phaser hex used to tint the question swatch */
  phex: number;
  /** Only emojis that unambiguously render in this colour on modern OS emoji fonts */
  emojis: string[];
}

export const COLOUR_POOL: ColourGroup[] = [
  { name: 'red',    prompt: 'Red',    phex: 0xe53935, emojis: ['🍎', '🍓', '🍅', '🌹'] },
  { name: 'orange', prompt: 'Orange', phex: 0xfb8c00, emojis: ['🍊', '🥕', '🎃', '🍑'] },
  { name: 'yellow', prompt: 'Yellow', phex: 0xfdd835, emojis: ['🍋', '🌻', '🍌', '⭐'] },
  { name: 'green',  prompt: 'Green',  phex: 0x43a047, emojis: ['🐸', '🥦', '🌿', '🍀'] },
  { name: 'blue',   prompt: 'Blue',   phex: 0x1e88e5, emojis: ['🐳', '🫐', '🌊', '💙'] },
  { name: 'purple', prompt: 'Purple', phex: 0x8e24aa, emojis: ['🍇', '🍆', '🟣', '👾'] },
  { name: 'pink',   prompt: 'Pink',   phex: 0xec407a, emojis: ['🌸', '🎀', '🌷', '🐷'] },
  { name: 'brown',  prompt: 'Brown',  phex: 0x6d4c41, emojis: ['🍫', '🐻', '🌰', '🍞'] },
];

export const CONFETTI_EMOJIS = ['🌸', '⭐', '🎀', '✨', '🌟', '💖', '🎊', '🌈'];
