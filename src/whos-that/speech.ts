import { getCtx } from '@shared/audio';

/**
 * Say a short phrase out loud — friendly, slow, a little high-pitched.
 * Aya can't read yet, so every prompt and every name is spoken. Silent on
 * devices without speech synthesis.
 */
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

export function stopSpeech(): void {
  try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
}

/** Resume the shared AudioContext from inside a user gesture (iOS). */
export function unlockAudio(): void {
  try { void getCtx().resume(); } catch { /* no Web Audio */ }
}
