export const TOTAL_ROUNDS = 5;
export const OPTIONS_PER_ROUND = 4;

export type TargetCategory = 'fruit' | 'animal' | 'vehicle' | 'instrument';
/** What the player chose on the title screen: one category, or a mix. */
export type Mode = TargetCategory | 'mix';

export interface TargetSpec {
  /** Upper-case keyword shown in the prompt ("Find the FRUIT!"). */
  label: string;
  /** Lower-case word used when speaking the prompt. */
  word: string;
  /** Short caption under the title-screen bubble (for Papa). */
  caption: string;
  emoji: string;
  /** Soft pastel fill for the title-screen bubble. */
  tint: number;
  items: string[];
  /**
   * Distractor pools to filter out when this is the target (D-012):
   * fruit rounds drop vegetables (food/food adjacency) and sport balls
   * (a basketball reads as an orange to a toddler).
   */
  excludedDistractorPools?: string[];
  /** Single distractor emoji that are near-misses for this target. */
  excludedDistractorItems?: string[];
}

/**
 * Target categories. Every item here must be instantly recognisable to a
 * 2½-year-old and render on older phones (no Unicode 15 emoji such as 🪈).
 * Dropped in the 2026-11 pass: 🍈 melon and 🥥 coconut (read as balls),
 * 🎤 microphone (not an instrument), 🪈 flute (tofu on older devices),
 * 🚆 (swapped for the more iconic 🚂).
 */
export const TARGETS: Record<TargetCategory, TargetSpec> = {
  fruit: {
    label: 'FRUIT', word: 'fruit', caption: 'Fruit', emoji: '🍎', tint: 0xffe4ee,
    items: ['🍎', '🍌', '🍓', '🍇', '🍊', '🍐', '🍒', '🍑', '🥭', '🍍', '🥝', '🍉', '🫐', '🍋'],
    excludedDistractorPools: ['vegetable', 'sport'],
    excludedDistractorItems: ['🌙', '☀️', '🎈'],
  },
  animal: {
    label: 'ANIMAL', word: 'animal', caption: 'Animals', emoji: '🐰', tint: 0xe0f7fa,
    items: ['🐶', '🐱', '🐰', '🐻', '🐯', '🦁', '🐼', '🐨', '🐸', '🐧', '🦒', '🐘', '🐵', '🦊', '🐮', '🐷'],
  },
  vehicle: {
    label: 'VEHICLE', word: 'vehicle', caption: 'Vehicles', emoji: '🚗', tint: 0xede7f6,
    items: ['🚗', '🚌', '🚲', '🚂', '✈️', '🚀', '🚓', '🚒', '🚜', '🛵', '🚁', '🚢', '⛵', '🏎️', '🚑'],
  },
  instrument: {
    label: 'INSTRUMENT', word: 'instrument', caption: 'Music', emoji: '🎸', tint: 0xfff3e0,
    items: ['🎸', '🥁', '🎹', '🎻', '🎷', '🎺', '🪗'],
  },
};

export const CATEGORY_ORDER: TargetCategory[] = ['fruit', 'animal', 'vehicle', 'instrument'];

/**
 * Distractor pools — where the three "wrong" cards in each round come
 * from. Each round draws from THREE different pools so the 4 cards on
 * screen always feel maximally varied. No pool may contain anything that
 * belongs to a target category (D-012).
 */
export const DISTRACTOR_POOLS: Record<string, string[]> = {
  vegetable: ['🥕', '🥦', '🥒', '🌽', '🥔', '🍆', '🌶️', '🫑'],
  building:  ['🏠', '🏢', '🏥', '🏫', '🗼', '⛪', '🏰'],
  furniture: ['🛋️', '🛏️', '🚪', '🪑', '🛁', '🚽'],
  tool:      ['🔨', '🪛', '🔧', '🪚', '🧰'],
  tech:      ['📱', '💻', '⌚', '📷', '🎮'],
  // 🧸 excluded: reads as an animal. 🪀 excluded: a red yo-yo reads as an apple.
  toy:       ['🎈', '🎁', '🎲', '🪁', '🧩'],
  stationery: ['✏️', '🖍️', '📒', '📚', '✂️'],
  sky:       ['⭐', '🌙', '☀️', '🌈', '☁️', '❄️'],
  clothing:  ['👕', '👖', '👗', '👟', '🧢', '👜', '🧦'],
  sport:     ['⚽', '🏀', '🏈', '🏐'],
};

/**
 * Spoken / shown names, written with the article we'd say out loud
 * ("an apple", "grapes"). `displayName()` strips the article for captions.
 */
export const NAMES: Record<string, string> = {
  // fruit
  '🍎': 'an apple', '🍌': 'a banana', '🍓': 'a strawberry', '🍇': 'grapes', '🍊': 'an orange',
  '🍐': 'a pear', '🍒': 'cherries', '🍑': 'a peach', '🥭': 'a mango', '🍍': 'a pineapple',
  '🥝': 'a kiwi', '🍉': 'a watermelon', '🫐': 'blueberries', '🍋': 'a lemon',
  // animals
  '🐶': 'a puppy', '🐱': 'a kitty', '🐰': 'a bunny', '🐻': 'a bear', '🐯': 'a tiger',
  '🦁': 'a lion', '🐼': 'a panda', '🐨': 'a koala', '🐸': 'a frog', '🐧': 'a penguin',
  '🦒': 'a giraffe', '🐘': 'an elephant', '🐵': 'a monkey', '🦊': 'a fox', '🐮': 'a cow', '🐷': 'a pig',
  // vehicles
  '🚗': 'a car', '🚌': 'a bus', '🚲': 'a bike', '🚂': 'a train', '✈️': 'an airplane',
  '🚀': 'a rocket', '🚓': 'a police car', '🚒': 'a fire truck', '🚜': 'a tractor', '🛵': 'a scooter',
  '🚁': 'a helicopter', '🚢': 'a ship', '⛵': 'a sailboat', '🏎️': 'a race car', '🚑': 'an ambulance',
  // instruments
  '🎸': 'a guitar', '🥁': 'a drum', '🎹': 'a piano', '🎻': 'a violin', '🎷': 'a saxophone',
  '🎺': 'a trumpet', '🪗': 'an accordion',
  // distractors
  '🥕': 'a carrot', '🥦': 'broccoli', '🥒': 'a cucumber', '🌽': 'corn', '🥔': 'a potato',
  '🍆': 'an eggplant', '🌶️': 'a chili', '🫑': 'a pepper',
  '🏠': 'a house', '🏢': 'a building', '🏥': 'a hospital', '🏫': 'a school', '🗼': 'a tower',
  '⛪': 'a church', '🏰': 'a castle',
  '🛋️': 'a sofa', '🛏️': 'a bed', '🚪': 'a door', '🪑': 'a chair', '🛁': 'a bathtub', '🚽': 'a toilet',
  '🔨': 'a hammer', '🪛': 'a screwdriver', '🔧': 'a wrench', '🪚': 'a saw', '🧰': 'a toolbox',
  '📱': 'a phone', '💻': 'a laptop', '⌚': 'a watch', '📷': 'a camera', '🎮': 'a game controller',
  '🎈': 'a balloon', '🎁': 'a present', '🎲': 'a dice', '🪁': 'a kite', '🧩': 'a puzzle',
  '✏️': 'a pencil', '🖍️': 'a crayon', '📒': 'a notebook', '📚': 'books', '✂️': 'scissors',
  '⭐': 'a star', '🌙': 'the moon', '☀️': 'the sun', '🌈': 'a rainbow', '☁️': 'a cloud', '❄️': 'a snowflake',
  '👕': 'a T-shirt', '👖': 'jeans', '👗': 'a dress', '👟': 'a shoe', '🧢': 'a cap', '👜': 'a bag', '🧦': 'socks',
  '⚽': 'a ball', '🏀': 'a basketball', '🏈': 'a football', '🏐': 'a volleyball',
};

/** "an apple" → "Apple". */
export function displayName(emoji: string): string {
  const n = (NAMES[emoji] ?? '').replace(/^(a|an|the)\s+/i, '');
  return n.charAt(0).toUpperCase() + n.slice(1);
}

/**
 * Per-round prompt phrasings. Same target across the 5 rounds, but the
 * wording rotates so it doesn't sound robotic. {L} is the keyword.
 */
export const PROMPT_VARIANTS = [
  'Find the {L}!',
  "Where's the {L}?",
  'Pop the {L}!',
  'Find the {L}!',
  'Last one! The {L}!',
];

export const CHEERS = ['Yay!', 'Hooray!', 'Well done!', 'You found it!', 'Great job!'];

export const CONFETTI_EMOJIS = ['🫧', '⭐', '🌸', '✨', '🎀', '💖'];
