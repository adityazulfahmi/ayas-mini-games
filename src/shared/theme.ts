/** Phaser hex colours (0xRRGGBB) */
export const C = {
  bg1:        0xfce4ec,
  bg2:        0xede7f6,
  white:      0xffffff,
  pink:       0xf06292,
  lavender:   0xce93d8,
  lavender2:  0xba68c8,
  plum:       0x6a1b9a,
  purple:     0x9c4dcc,
  mint:       0x80cbc4,
  mintBg:     0xe0f7fa,
  cream:      0xfff8fc,
  red:        0xe53935,
  shadow:     0x9c4dcc,
} as const;

/** CSS colour strings for Phaser Text objects */
export const T = {
  main:   '#6a1b9a',
  sub:    '#9c4dcc',
  white:  '#ffffff',
  mint:   '#00695c',
  red:    '#e53935',
} as const;

/** Font families */
export const F = {
  head: "'Fredoka One', cursive",
  body: "'Nunito', sans-serif",
} as const;

export const GAME_DURATION = 30;
