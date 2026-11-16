/** Speak a short phrase in a bright, slow voice. Silently does nothing without speech support. */
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

/**
 * iOS Safari only lets speech start inside a user gesture. Speaking a silent
 * utterance from a tap handler unlocks it for the rest of the session.
 */
export function primeSpeech(): void {
  try {
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return;
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    synth.speak(u);
  } catch { /* ignore */ }
}
