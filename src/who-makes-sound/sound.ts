import { getCtx, playTone } from '@shared/audio';
import type { Animal } from './data';

/**
 * Animal sounds through Web Audio: every clip is fetched and decoded up front,
 * so a tap plays instantly (no network or decoder delay like `new Audio()`).
 * Clips are pre-trimmed to start right on the sound (scripts/trim-sounds.mjs).
 */
const buffers = new Map<string, Promise<AudioBuffer | null>>();
let playing: AudioBufferSourceNode[] = [];

/** Very short calls (oink, ribbit, baa) play twice, like "oink oink". */
const REPEAT_UNDER = 0.7;
const REPEAT_GAP = 0.16;

function load(src: string): Promise<AudioBuffer | null> {
  let p = buffers.get(src);
  if (!p) {
    p = fetch(src)
      .then(r => r.arrayBuffer())
      // Callback form: older Safari doesn't return a promise from decodeAudioData.
      .then(data => new Promise<AudioBuffer>((res, rej) => getCtx().decodeAudioData(data, res, rej)))
      .catch(() => null);
    buffers.set(src, p);
  }
  return p;
}

export function preloadSounds(animals: Animal[]): void {
  animals.forEach(a => void load(a.src));
}

/** Call from a tap handler: iOS only lets audio start after a user gesture. */
export function unlockAudio(): void {
  try { void getCtx().resume(); } catch { /* no Web Audio */ }
}

export function stopSound(): void {
  playing.forEach(s => { try { s.stop(); } catch { /* already stopped */ } });
  playing = [];
}

/** Plays the animal's call; resolves with how long it lasts (ms). */
export async function playAnimal(animal: Animal): Promise<number> {
  stopSound();
  const buf = await load(animal.src);
  const ctx = getCtx();
  if (!buf || ctx.state !== 'running') {
    if (ctx.state === 'suspended') void ctx.resume();
    if (!buf || ctx.state !== 'running') return speakFallback(animal.fallback);
  }
  const times = buf.duration < REPEAT_UNDER ? 2 : 1;
  const t0 = ctx.currentTime + 0.01;
  for (let i = 0; i < times; i++) {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(t0 + i * (buf.duration + REPEAT_GAP));
    playing.push(src);
  }
  return Math.round((times * buf.duration + (times - 1) * REPEAT_GAP) * 1000);
}

function speakFallback(text: string): number {
  try {
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') throw new Error('no speech');
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.85;
    u.pitch = 1.25;
    u.lang = 'en-US';
    synth.speak(u);
    return 1500;
  } catch {
    playTone(520, 0.2, 'sine', 0.14);
    return 300;
  }
}
