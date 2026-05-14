/**
 * Hand-curated subset of high-frequency English words for a 6-year-old
 * Bahasa-Indonesia native speaker. Every entry has the English answer
 * (3-5 letters, uppercase), the Bahasa hint, and a single emoji used
 * by the hint card.
 *
 * Curation rules:
 *  - Concrete, picture-able words only. No function words (the/of/to).
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
  { english: 'BIG', indonesian: 'besar',      emoji: '🐘' },
  { english: 'EAT', indonesian: 'makan',      emoji: '🍴' },
  { english: 'RUN', indonesian: 'lari',       emoji: '🏃' },
  { english: 'HOT', indonesian: 'panas',      emoji: '🔥' },
  { english: 'BED', indonesian: 'kasur',      emoji: '🛏️' },
  { english: 'HAT', indonesian: 'topi',       emoji: '🎩' },
  { english: 'COW', indonesian: 'sapi',       emoji: '🐄' },
  { english: 'PIG', indonesian: 'babi',       emoji: '🐷' },
  { english: 'EGG', indonesian: 'telur',      emoji: '🥚' },
  { english: 'BEE', indonesian: 'lebah',      emoji: '🐝' },
  { english: 'KEY', indonesian: 'kunci',      emoji: '🔑' },
  { english: 'SEA', indonesian: 'laut',       emoji: '🌊' },
  { english: 'SKY', indonesian: 'langit',     emoji: '☁️' },
  { english: 'TEA', indonesian: 'teh',        emoji: '🍵' },
  { english: 'BAG', indonesian: 'tas',        emoji: '👜' },
  { english: 'LEG', indonesian: 'kaki',       emoji: '🦵' },
  { english: 'EAR', indonesian: 'telinga',    emoji: '👂' },
  { english: 'EYE', indonesian: 'mata',       emoji: '👁️' },
  { english: 'ARM', indonesian: 'lengan',     emoji: '💪' },
  { english: 'BOX', indonesian: 'kotak',      emoji: '📦' },
  { english: 'MAP', indonesian: 'peta',       emoji: '🗺️' },
  { english: 'ICE', indonesian: 'es',         emoji: '🧊' },
  { english: 'FOX', indonesian: 'rubah',      emoji: '🦊' },
  { english: 'ANT', indonesian: 'semut',      emoji: '🐜' },
  { english: 'ONE', indonesian: 'satu',       emoji: '1️⃣' },
  { english: 'TWO', indonesian: 'dua',        emoji: '2️⃣' },
  { english: 'TEN', indonesian: 'sepuluh',    emoji: '🔟' },
  { english: 'BOY', indonesian: 'anak laki-laki', emoji: '👦' },
  { english: 'MOM', indonesian: 'mama',       emoji: '👩' },
  { english: 'DAD', indonesian: 'papa',       emoji: '👨' },
  { english: 'NEW', indonesian: 'baru',       emoji: '✨' },
  { english: 'OLD', indonesian: 'tua',        emoji: '🧓' },
  { english: 'DAY', indonesian: 'siang',      emoji: '🌤️' },
  { english: 'TOY', indonesian: 'mainan',     emoji: '🧸' },

  // ── 4 letters ─────────────────────────────────────────────────────
  { english: 'FISH', indonesian: 'ikan',      emoji: '🐟' },
  { english: 'BOOK', indonesian: 'buku',      emoji: '📕' },
  { english: 'MILK', indonesian: 'susu',      emoji: '🥛' },
  { english: 'DOOR', indonesian: 'pintu',     emoji: '🚪' },
  { english: 'BABY', indonesian: 'bayi',      emoji: '👶' },
  { english: 'HAND', indonesian: 'tangan',    emoji: '✋' },
  { english: 'HEAD', indonesian: 'kepala',    emoji: '🧠' },
  { english: 'MOON', indonesian: 'bulan',     emoji: '🌙' },
  { english: 'STAR', indonesian: 'bintang',   emoji: '⭐' },
  { english: 'RAIN', indonesian: 'hujan',     emoji: '🌧️' },
  { english: 'TREE', indonesian: 'pohon',     emoji: '🌳' },
  { english: 'BIRD', indonesian: 'burung',    emoji: '🐦' },
  { english: 'FROG', indonesian: 'katak',     emoji: '🐸' },
  { english: 'BEAR', indonesian: 'beruang',   emoji: '🐻' },
  { english: 'DUCK', indonesian: 'bebek',     emoji: '🦆' },
  { english: 'GOAT', indonesian: 'kambing',   emoji: '🐐' },
  { english: 'RICE', indonesian: 'nasi',      emoji: '🍚' },
  { english: 'CAKE', indonesian: 'kue',       emoji: '🍰' },
  { english: 'SHOE', indonesian: 'sepatu',    emoji: '👟' },
  { english: 'BALL', indonesian: 'bola',      emoji: '⚽' },
  { english: 'BIKE', indonesian: 'sepeda',    emoji: '🚲' },
  { english: 'SHIP', indonesian: 'kapal',     emoji: '🚢' },
  { english: 'ROAD', indonesian: 'jalan',     emoji: '🛣️' },
  { english: 'PARK', indonesian: 'taman',     emoji: '🌳' },
  { english: 'SNOW', indonesian: 'salju',     emoji: '❄️' },
  { english: 'FIRE', indonesian: 'api',       emoji: '🔥' },
  { english: 'BLUE', indonesian: 'biru',      emoji: '🟦' },
  { english: 'PINK', indonesian: 'pink',      emoji: '🌸' },
  { english: 'PLAY', indonesian: 'main',      emoji: '🎮' },
  { english: 'READ', indonesian: 'membaca',   emoji: '📖' },
  { english: 'JUMP', indonesian: 'lompat',    emoji: '🤸' },
  { english: 'COLD', indonesian: 'dingin',    emoji: '🥶' },
  { english: 'GOOD', indonesian: 'baik',      emoji: '👍' },
  { english: 'LAMP', indonesian: 'lampu',     emoji: '💡' },
  { english: 'NOSE', indonesian: 'hidung',    emoji: '👃' },
  { english: 'CORN', indonesian: 'jagung',    emoji: '🌽' },

  // ── 5 letters ─────────────────────────────────────────────────────
  { english: 'APPLE', indonesian: 'apel',     emoji: '🍎' },
  { english: 'BREAD', indonesian: 'roti',     emoji: '🍞' },
  { english: 'HOUSE', indonesian: 'rumah',    emoji: '🏠' },
  { english: 'HAPPY', indonesian: 'senang',   emoji: '😊' },
  { english: 'WATER', indonesian: 'air',      emoji: '💧' },
  { english: 'MOUSE', indonesian: 'tikus',    emoji: '🐭' },
  { english: 'HORSE', indonesian: 'kuda',     emoji: '🐴' },
  { english: 'TABLE', indonesian: 'meja',     emoji: '🪑' },
  { english: 'CHAIR', indonesian: 'kursi',    emoji: '🪑' },
  { english: 'GREEN', indonesian: 'hijau',    emoji: '🟢' },
  { english: 'BLACK', indonesian: 'hitam',    emoji: '⚫' },
  { english: 'WHITE', indonesian: 'putih',    emoji: '⚪' },
  { english: 'SLEEP', indonesian: 'tidur',    emoji: '😴' },
  { english: 'MOUTH', indonesian: 'mulut',    emoji: '👄' },
  { english: 'NIGHT', indonesian: 'malam',    emoji: '🌃' },
  { english: 'JUICE', indonesian: 'jus',      emoji: '🧃' },
  { english: 'CANDY', indonesian: 'permen',   emoji: '🍬' },
  { english: 'TIGER', indonesian: 'harimau',  emoji: '🐯' },
  { english: 'LEMON', indonesian: 'lemon',    emoji: '🍋' },
  { english: 'LIGHT', indonesian: 'cahaya',   emoji: '💡' },
  { english: 'GRASS', indonesian: 'rumput',   emoji: '🌱' },
  { english: 'CLOUD', indonesian: 'awan',     emoji: '☁️' },
  { english: 'SHEEP', indonesian: 'domba',    emoji: '🐑' },
  { english: 'TRAIN', indonesian: 'kereta',   emoji: '🚂' },
  { english: 'PLANE', indonesian: 'pesawat',  emoji: '✈️' },
];

export const CONFETTI_EMOJIS = ['🧩', '⭐', '🌸', '💖', '🦋', '🌟', '🎀'];
