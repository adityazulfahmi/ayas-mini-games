import { getCtx, playTone } from '@shared/audio';

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

// ─── Real sounds for the music patterns ──────────────────────────────────

function drum(): void {
  try {
    const ctx = getCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(170, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.22);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.4);
  } catch { /* ignore */ }
}

let noiseBuf: AudioBuffer | null = null;
function clap(): void {
  try {
    const ctx = getCtx();
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.2), ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    // Two tiny bursts a few ms apart sound like two hands meeting.
    [0, 0.018].forEach((off, i) => {
      const t = ctx.currentTime + off;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 0.9;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(i ? 0.42 : 0.25, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      src.connect(bp); bp.connect(g); g.connect(ctx.destination);
      src.start(t); src.stop(t + 0.16);
    });
  } catch { /* ignore */ }
}

function bell(): void {
  playTone(1318.5, 0.7, 'sine', 0.16);
  playTone(2637, 0.45, 'sine', 0.05);
  playTone(1975.5, 0.3, 'triangle', 0.03);
}

export function playSfx(kind: 'drum' | 'clap' | 'bell'): void {
  if (kind === 'drum') drum();
  else if (kind === 'clap') clap();
  else bell();
}

/** A happy little "boing" when the chick lands on the finished step. */
export function boing(): void {
  playTone(659.25, 0.12, 'sine', 0.1);
  playTone(987.77, 0.2, 'sine', 0.1, 0.09);
}
