export type ShapeKind = 'circle' | 'square' | 'triangle' | 'star' | 'heart' | 'moon' | 'diamond';

export interface ShapeDef {
  kind: ShapeKind;
  /** Spoken + shown name. */
  name: string;
  /** Piece colour (Phaser hex). Each shape keeps one colour so colour is a gentle hint, not the rule. */
  color: number;
}

export const SHAPES: ShapeDef[] = [
  { kind: 'circle',   name: 'Circle',   color: 0xef5350 },
  { kind: 'square',   name: 'Square',   color: 0x42a5f5 },
  { kind: 'triangle', name: 'Triangle', color: 0x66bb6a },
  { kind: 'star',     name: 'Star',     color: 0xffca28 },
  { kind: 'heart',    name: 'Heart',    color: 0xf06292 },
  { kind: 'moon',     name: 'Moon',     color: 0x9575cd },
  { kind: 'diamond',  name: 'Diamond',  color: 0xffa040 },
];

/**
 * One sorter box per step. A 2.5-year-old starts with an easy two-hole box,
 * then three holes, then a big four-hole box to finish. Every hole gets
 * filled, so each box ends "complete". Each box has its own colour.
 */
export const BOXES: { holes: number; color: number }[] = [
  { holes: 2, color: 0xf48fb1 },
  { holes: 3, color: 0x80cbc4 },
  { holes: 4, color: 0x9fa8da },
];

export const CONFETTI_EMOJIS = ['🔴', '🟦', '🔺', '⭐', '💖', '🌙', '🔶', '🎉', '✨'];
