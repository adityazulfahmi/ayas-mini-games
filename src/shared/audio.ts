let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioCtx;
}

export function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  vol = 0.18,
  delay = 0,
): void {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration + 0.05);
  } catch (_) { /* ignore audio errors */ }
}

export const sounds = {
  correct: (): void => {
    playTone(523, 0.18, 'sine', 0.16);
    playTone(659, 0.22, 'sine', 0.16, 0.18);
  },
  streak: (): void => {
    playTone(523, 0.15, 'sine', 0.16);
    playTone(659, 0.15, 'sine', 0.16, 0.15);
    playTone(784, 0.25, 'sine', 0.18, 0.30);
  },
  wrong:   (): void => playTone(260, 0.25, 'sine', 0.1),
  end: (): void => {
    playTone(523, 0.22, 'sine', 0.18);
    playTone(659, 0.22, 'sine', 0.18, 0.22);
    playTone(784, 0.22, 'sine', 0.18, 0.44);
    playTone(1047, 0.5,  'sine', 0.18, 0.66);
  },
  flip:    (): void => playTone(440, 0.15, 'sine', 0.12),
  match: (): void => {
    playTone(523, 0.22, 'sine', 0.16);
    playTone(659, 0.28, 'sine', 0.16, 0.22);
  },
  win: (): void => {
    playTone(523, 0.22, 'sine', 0.18);
    playTone(659, 0.22, 'sine', 0.18, 0.22);
    playTone(784, 0.22, 'sine', 0.18, 0.44);
    playTone(1047, 0.5,  'sine', 0.18, 0.66);
  },
  place:   (): void => playTone(520, 0.12, 'sine', 0.13),
  draw: (): void => {
    playTone(350, 0.25, 'sine', 0.12);
    playTone(300, 0.3,  'sine', 0.1, 0.25);
  },
  timeout: (): void => playTone(250, 0.3, 'sine', 0.12),
  noMatch: (): void => playTone(300, 0.18, 'sine', 0.1),
};
