import { getCtx, playTone } from '@shared/audio';

/**
 * Spoken prompts so Aya can play without reading. Uses the browser's
 * built-in speechSynthesis (no audio files, D-009). Silent if unsupported.
 *
 * `interrupt: false` queues behind whatever is being said (used for the
 * next round's prompt so it doesn't cut off "Strawberry! Yay!").
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

/** A short, bright bubble "pop": fast upward pitch sweep + a tiny noise click. */
export function popSound(): void {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(1300, t + 0.07);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.32, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.14);

    const len = Math.floor(ctx.sampleRate * 0.03);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2000;
    const ng = ctx.createGain();
    ng.gain.value = 0.12;
    noise.connect(hp).connect(ng).connect(ctx.destination);
    noise.start(t);
  } catch { /* ignore audio errors */ }
}

/** Soft, low "boop" for a wrong tap — not a buzzer. */
export function boopSound(): void {
  playTone(330, 0.12, 'sine', 0.09);
  playTone(262, 0.18, 'sine', 0.08, 0.1);
}

/** Little rising chime used when a found item lands in the tray. */
export function chime(step: number): void {
  const scale = [523, 587, 659, 784, 880, 1047];
  playTone(scale[Math.min(step, scale.length - 1)], 0.16, 'triangle', 0.1);
}
