/**
 * Tiny speech-synthesis helper (local copy; same voice settings as Shape
 * Sorter). Silent on devices without speechSynthesis.
 */
export function say(text: string, interrupt = true): void {
  try {
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return;
    if (interrupt) synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.85;
    u.pitch = 1.3;
    u.lang = 'en-US';
    synth.speak(u);
  } catch { /* no speech on this device */ }
}

export function hush(): void {
  try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
}
