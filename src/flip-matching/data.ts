export const POOL = [
  '🍎','🍊','🍋','🍇','🍓','🍒','🍑','🥝','🍍','🥭',
  '🍌','🍉','🍐','🥑','🍆','🌽','🍔','🧁',
  '🐱','🐶','🐸','🐼','🐨','🦊','🐯','🦁',
  '🐮','🐷','🐙','🦋','🐢','🦄','🐬','🦒','🦓','🐘',
];

export interface GridSize {
  cols: number;
  rows: number;
  label: string;
  sub: string;
}

export const GRID_SIZES: GridSize[] = [
  { cols: 2, rows: 2, label: '2×2', sub: '4 cards' },
  { cols: 4, rows: 4, label: '4×4', sub: '16 cards' },
  { cols: 4, rows: 6, label: '4×6', sub: '24 cards' },
  { cols: 6, rows: 6, label: '6×6', sub: '36 cards' },
];

export const CONFETTI_EMOJIS = ['🌸','⭐','🎀','✨','🌟','💖','🎊','🌺'];
