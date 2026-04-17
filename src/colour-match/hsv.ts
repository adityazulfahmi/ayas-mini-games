export interface HSV { h: number; s: number; v: number }

/**
 * Pick a random target colour biased to child-friendly saturated hues,
 * avoiding muddy / near-white / near-black areas.
 */
export function randomTarget(): HSV {
  return {
    h: Math.random() * 360,
    s: 0.6 + Math.random() * 0.35,
    v: 0.6 + Math.random() * 0.3,
  };
}

/**
 * Return a new colour perturbed from `base` by up to `range` in each axis.
 * The perturbation is non-zero (minimum 30% of range) so distractors never
 * collide with the target in hard mode.
 */
export function perturb(base: HSV, range: { h: number; s: number; v: number }): HSV {
  const signedOffset = (r: number): number => {
    const mag = (0.3 + Math.random() * 0.7) * r;
    return Math.random() < 0.5 ? -mag : mag;
  };
  return {
    h: (base.h + signedOffset(range.h) + 360) % 360,
    s: clamp(base.s + signedOffset(range.s), 0.3, 1),
    v: clamp(base.v + signedOffset(range.v), 0.35, 1),
  };
}

export function hsvToHex(c: HSV): number {
  const h = c.h / 60;
  const i = Math.floor(h);
  const f = h - i;
  const p = c.v * (1 - c.s);
  const q = c.v * (1 - f * c.s);
  const t = c.v * (1 - (1 - f) * c.s);
  let r = 0, g = 0, b = 0;
  switch (i % 6) {
    case 0: r = c.v; g = t;   b = p;   break;
    case 1: r = q;   g = c.v; b = p;   break;
    case 2: r = p;   g = c.v; b = t;   break;
    case 3: r = p;   g = q;   b = c.v; break;
    case 4: r = t;   g = p;   b = c.v; break;
    case 5: r = c.v; g = p;   b = q;   break;
  }
  return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
