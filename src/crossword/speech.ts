/**
 * Tiny speechSynthesis wrapper (local copy — the shared folder has no
 * speech helper yet; see shape-sorter/scenes/shapes.ts for the same idea).
 *
 * Bahasa hints are spoken with an id-ID voice and English answers with an
 * en-US voice. When a device has no matching voice the browser falls back
 * to its default voice, which is still better than silence.
 */

type Lang = 'en-US' | 'id-ID';

let voices: SpeechSynthesisVoice[] = [];

function loadVoices(): void {
  try {
    voices = window.speechSynthesis?.getVoices() ?? [];
  } catch { voices = []; }
}

try {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    loadVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
  }
} catch { /* no speech on this device */ }

function pickVoice(lang: Lang): SpeechSynthesisVoice | undefined {
  if (!voices.length) loadVoices();
  const base = lang.slice(0, 2);
  return voices.find(v => v.lang === lang)
    ?? voices.find(v => v.lang.replace('_', '-').startsWith(base));
}

export interface SayOpts {
  /** Stop whatever is currently being said first (default true). */
  interrupt?: boolean;
  rate?: number;
  pitch?: number;
}

/** Speak `text` in `lang`. Silent no-op if speech is unsupported. */
export function say(text: string, lang: Lang, opts: SayOpts = {}): void {
  try {
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return;
    if (opts.interrupt !== false) synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    const v = pickVoice(lang);
    if (v) u.voice = v;
    u.rate = opts.rate ?? 0.85;
    u.pitch = opts.pitch ?? 1.25;
    synth.speak(u);
  } catch { /* no speech on this device */ }
}

export function stopSpeech(): void {
  try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
}
