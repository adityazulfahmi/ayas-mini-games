export type ShapeKind = 'circle' | 'square' | 'triangle' | 'star' | 'heart';

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
];

/**
 * Holes per box. A 2.5-year-old starts with an easy two-hole box, then two
 * three-hole boxes. Every hole gets filled, so each box ends "complete".
 */
export const BOXES = [2, 3, 3];

export const CONFETTI_EMOJIS = ['🔴', '🟦', '🔺', '⭐', '💖', '🎉', '✨'];
