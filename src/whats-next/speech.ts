import { playTone } from '@shared/audio';

/**
 * Speak a line out loud (friendly, slightly slow, high-pitched). By default
 * any line still playing is cut off first; pass `queue: true` to let it
 * line up behind the current one (used for the pattern beat, one word per
 * beat). Silent where speech synthesis is unsupported.
 */
export function say(text: string, opts: { queue?: boolean; rate?: number } = {}): void {
  try {
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return;
    if (!opts.queue) synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = opts.rate ?? 0.9;
    u.pitch = 1.3;
    u.lang = 'en-US';
    synth.speak(u);
  } catch { /* no speech on this device */ }
}

export function hush(): void {
  try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
}

/**
 * iOS only allows speech that starts inside a user gesture; speaking a
 * near-silent utterance from the Play tap unlocks it for the rest of the
 * session.
 */
export function unlockSpeech(): void {
  try {
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return;
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    synth.speak(u);
  } catch { /* ignore */ }
}

/** Soft xylophone notes: item A, B and C each get their own pitch. */
const NOTES = [523.25, 659.25, 783.99, 880];
export function beatNote(slot: number, vol = 0.13): void {
  const f = NOTES[slot % NOTES.length];
  playTone(f, 0.32, 'triangle', vol);
  playTone(f * 2, 0.16, 'sine', vol * 0.25);
}

/** A rising "hmm?" for the question slot. */
export function askNote(): void {
  playTone(587.33, 0.16, 'sine', 0.1);
  playTone(698.46, 0.26, 'sine', 0.1, 0.14);
}

/** A soft, non-punishing "not that one" boop. */
export function softNo(): void {
  playTone(392, 0.16, 'sine', 0.08);
  playTone(349.23, 0.22, 'sine', 0.07, 0.14);
}
