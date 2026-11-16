/**
 * Spoken prompts so Aya can play without reading. Uses the browser's built-in
 * speechSynthesis (no audio files, D-009). Silent if unsupported. The shared
 * voice gate (src/shared/voice.ts) wraps `speechSynthesis.speak`, so the 🗣️/🔇
 * switch works without anything extra here.
 *
 * `interrupt: false` queues behind whatever is being said.
 */
let voice: SpeechSynthesisVoice | null | undefined;

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices?.() ?? [];
  const en = voices.filter(v => /^en[-_]/i.test(v.lang));
  const preferred = ['Samantha', 'Google US English', 'Karen', 'Moira', 'Tessa', 'Serena', 'Female'];
  for (const name of preferred) {
    const v = en.find(x => x.name.includes(name));
    if (v) return v;
  }
  return en.find(v => /en[-_]US/i.test(v.lang)) ?? en[0] ?? null;
}

export function say(text: string, interrupt = true): void {
  try {
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return;
    if (interrupt) synth.cancel();
    if (!voice) voice = pickVoice();
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? 'en-US';
    u.rate = 0.88;
    u.pitch = 1.25;
    synth.speak(u);
  } catch { /* no speech on this device */ }
}

export function hush(): void {
  try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
}
