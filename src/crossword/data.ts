/**
 * Hand-curated subset of high-frequency English words for a 6-year-old
 * Bahasa-Indonesia native speaker. Every entry has the English answer
 * (3-5 letters, uppercase), the Bahasa hint, and a single emoji used
 * by the hint card.
 *
 * Curation rules:
 *  - Concrete, picture-able words only — every emoji must show the
 *    thing unambiguously (no 🧠 for "head", no 🪑 for "table").
 *    No abstract words (old/new/good/day) and no function words.
 *  - Each emoji is used once, so two clues never look the same.
 *  - Length 3-5 — fits the 5×5 grid.
 *  - Heavy with the high-frequency vowels A E O and common consonants
 *    R T N L S so the generator has lots of valid intersections.
 *  - Bahasa hints use the everyday word a 6yo would say, not the
 *    dictionary form.
 */

export interface CrosswordWord {
  english: string;
  indonesian: string;
  emoji: string;
}

export const POOL: CrosswordWord[] = [
  // ── 3 letters ─────────────────────────────────────────────────────
  { english: 'CAT', indonesian: 'kucing',     emoji: '🐱' },
  { english: 'DOG', indonesian: 'anjing',     emoji: '🐶' },
  { english: 'SUN', indonesian: 'matahari',   emoji: '☀️' },
  { english: 'CAR', indonesian: 'mobil',      emoji: '🚗' },
  { english: 'BUS', indonesian: 'bus',        emoji: '🚌' },
  { english: 'RED', indonesian: 'merah',      emoji: '🔴' },
  { english: 'BED', indonesian: 'kasur',      emoji: '🛏️' },
  { english: 'HAT', indonesian: 'topi',       emoji: '👒' },
  { english: 'COW', indonesian: 'sapi',       emoji: '🐮' },
  { english: 'PIG', indonesian: 'babi',       emoji: '🐷' },
  { english: 'EGG', indonesian: 'telur',      emoji: '🥚' },
  { english: 'BEE', indonesian: 'lebah',      emoji: '🐝' },
  { english: 'KEY', indonesian: 'kunci',      emoji: '🔑' },
  { english: 'SEA', indonesian: 'laut',       emoji: '🌊' },
  { english: 'TEA', indonesian: 'teh',        emoji: '🍵' },
  { english: 'BAG', indonesian: 'tas',        emoji: '🎒' },
  { english: 'LEG', indonesian: 'kaki',       emoji: '🦵' },
  { english: 'EAR', indonesian: 'telinga',    emoji: '👂' },
  { english: 'ARM', indonesian: 'lengan',     emoji: '💪' },
  { english: 'BOX', indonesian: 'kotak',      emoji: '📦' },
  { english: 'MAP', indonesian: 'peta',       emoji: '🗺️' },
  { english: 'ICE', indonesian: 'es batu',    emoji: '🧊' },
  { english: 'FOX', indonesian: 'rubah',      emoji: '🦊' },
  { english: 'ANT', indonesian: 'semut',      emoji: '🐜' },
  { english: 'TOY', indonesian: 'mainan',     emoji: '🧸' },
  { english: 'OWL', indonesian: 'burung hantu', emoji: '🦉' },
  { english: 'CUP', indonesian: 'gelas',      emoji: '🥤' },
  { english: 'PEN', indonesian: 'pena',       emoji: '🖊️' },
  { english: 'NUT', indonesian: 'kacang',     emoji: '🥜' },

  // ── 4 letters ─────────────────────────────────────────────────────
  { english: 'FISH', indonesian: 'ikan',      emoji: '🐟' },
  { english: 'BOOK', indonesian: 'buku',      emoji: '📕' },
  { english: 'MILK', indonesian: 'susu',      emoji: '🥛' },
  { english: 'DOOR', indonesian: 'pintu',     emoji: '🚪' },
  { english: 'BABY', indonesian: 'bayi',      emoji: '👶' },
  { english: 'HAND', indonesian: 'tangan',    emoji: '✋' },
  { english: 'MOON', indonesian: 'bulan',     emoji: '🌙' },
  { english: 'STAR', indonesian: 'bintang',   emoji: '⭐' },
  { english: 'RAIN', indonesian: 'hujan',     emoji: '🌧️' },
  { english: 'TREE', indonesian: 'pohon',     emoji: '🌳' },
  { english: 'BIRD', indonesian: 'burung',    emoji: '🐦' },
  { english: 'FROG', indonesian: 'katak',     emoji: '🐸' },
  { english: 'BEAR', indonesian: 'beruang',   emoji: '🐻' },
  { english: 'DUCK', indonesian: 'bebek',     emoji: '🦆' },
  { english: 'GOAT', indonesian: 'kambing',   emoji: '🐐' },
  { english: 'LION', indonesian: 'singa',     emoji: '🦁' },
  { english: 'CRAB', indonesian: 'kepiting',  emoji: '🦀' },
  { english: 'RICE', indonesian: 'nasi',      emoji: '🍚' },
  { english: 'CAKE', indonesian: 'kue',       emoji: '🍰' },
  { english: 'CORN', indonesian: 'jagung',    emoji: '🌽' },
  { english: 'PEAR', indonesian: 'pir',       emoji: '🍐' },
  { english: 'SHOE', indonesian: 'sepatu',    emoji: '👟' },
  { english: 'SOCK', indonesian: 'kaus kaki', emoji: '🧦' },
  { english: 'BALL', indonesian: 'bola',      emoji: '⚽' },
  { english: 'KITE', indonesian: 'layangan',  emoji: '🪁' },
  { english: 'DRUM', indonesian: 'drum',      emoji: '🥁' },
  { english: 'BIKE', indonesian: 'sepeda',    emoji: '🚲' },
  { english: 'BOAT', indonesian: 'perahu',    emoji: '⛵' },
  { english: 'SHIP', indonesian: 'kapal',     emoji: '🚢' },
  { english: 'SNOW', indonesian: 'salju',     emoji: '❄️' },
  { english: 'FIRE', indonesian: 'api',       emoji: '🔥' },
  { english: 'BLUE', indonesian: 'biru',      emoji: '🔵' },
  { english: 'LAMP', indonesian: 'lampu',     emoji: '💡' },
  { english: 'NOSE', indonesian: 'hidung',    emoji: '👃' },
  { english: 'ROSE', indonesian: 'mawar',     emoji: '🌹' },
  { english: 'EYES', indonesian: 'mata',      emoji: '👀' },

  // ── 5 letters ─────────────────────────────────────────────────────
  { english: 'APPLE', indonesian: 'apel',     emoji: '🍎' },
  { english: 'BREAD', indonesian: 'roti',     emoji: '🍞' },
  { english: 'HOUSE', indonesian: 'rumah',    emoji: '🏠' },
  { english: 'WATER', indonesian: 'air',      emoji: '💧' },
  { english: 'MOUSE', indonesian: 'tikus',    emoji: '🐭' },
  { english: 'HORSE', indonesian: 'kuda',     emoji: '🐴' },
  { english: 'CHAIR', indonesian: 'kursi',    emoji: '🪑' },
  { english: 'GREEN', indonesian: 'hijau',    emoji: '🟢' },
  { english: 'MOUTH', indonesian: 'mulut',    emoji: '👄' },
  { english: 'JUICE', indonesian: 'jus',      emoji: '🧃' },
  { english: 'CANDY', indonesian: 'permen',   emoji: '🍬' },
  { english: 'TIGER', indonesian: 'harimau',  emoji: '🐯' },
  { english: 'LEMON', indonesian: 'lemon',    emoji: '🍋' },
  { english: 'CLOUD', indonesian: 'awan',     emoji: '☁️' },
  { english: 'SHEEP', indonesian: 'domba',    emoji: '🐑' },
  { english: 'TRAIN', indonesian: 'kereta',   emoji: '🚂' },
  { english: 'PLANE', indonesian: 'pesawat',  emoji: '✈️' },
  { english: 'TRUCK', indonesian: 'truk',     emoji: '🚚' },
  { english: 'PIZZA', indonesian: 'pizza',    emoji: '🍕' },
  { english: 'ROBOT', indonesian: 'robot',    emoji: '🤖' },
  { english: 'ZEBRA', indonesian: 'zebra',    emoji: '🦓' },
  { english: 'PANDA', indonesian: 'panda',    emoji: '🐼' },
  { english: 'MANGO', indonesian: 'mangga',   emoji: '🥭' },
  { english: 'CAMEL', indonesian: 'unta',     emoji: '🐫' },
  { english: 'CLOCK', indonesian: 'jam',      emoji: '⏰' },
  { english: 'SPOON', indonesian: 'sendok',   emoji: '🥄' },
  { english: 'TOOTH', indonesian: 'gigi',     emoji: '🦷' },
  { english: 'SHIRT', indonesian: 'baju',     emoji: '👕' },
  { english: 'DRESS', indonesian: 'gaun',     emoji: '👗' },
  { english: 'CROWN', indonesian: 'mahkota',  emoji: '👑' },
  { english: 'HEART', indonesian: 'hati',     emoji: '❤️' },
  { english: 'BEACH', indonesian: 'pantai',   emoji: '🏖️' },
];

export const CONFETTI_EMOJIS = ['🧩', '⭐', '🌸', '💖', '🦋', '🌟', '🎀'];

/** Little bursts that pop out of a word's cells when it's finished. */
export const SPARKLES = ['⭐', '✨', '💖', '🌟'];

/** Cheer shown on the hint card when a word is finished. */
export const CHEERS_ID = ['Hebat!', 'Pintar!', 'Yeay!', 'Keren!'];
