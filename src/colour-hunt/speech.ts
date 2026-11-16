/** Local copy of the speech helper (shared code is off-limits for this game). */
export function say(text: string): void {
  try {
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.85;
    u.pitch = 1.3;
    u.lang = 'en-US';
    synth.speak(u);
  } catch { /* no speech on this device */ }
}

/** Mix a colour towards white (t>0) or black (t<0). */
export function shade(hex: number, t: number): number {
  const r = (hex >> 16) & 0xff, g = (hex >> 8) & 0xff, b = hex & 0xff;
  const to = t > 0 ? 255 : 0, k = Math.abs(t);
  const m = (c: number) => Math.round(c + (to - c) * k);
  return (m(r) << 16) | (m(g) << 8) | m(b);
}

export function css(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`;
}
