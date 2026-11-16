import Phaser from 'phaser';
import { C } from '@shared/theme';
import { playTone } from '@shared/audio';

/**
 * Say something out loud in a slow, friendly voice. `onDone` fires when the
 * sentence ends, or straight away if this device has no speech.
 * (Local copy of the Shape Sorter helper, plus an end callback.)
 */
export function say(text: string, onDone?: () => void): void {
  try {
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') { onDone?.(); return; }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.85;
    u.pitch = 1.3;
    u.lang = 'en-US';
    if (onDone) {
      let fired = false;
      const done = () => { if (!fired) { fired = true; onDone(); } };
      u.onend = done;
      u.onerror = done;
    }
    synth.speak(u);
  } catch { onDone?.(); }
}

export function hush(): void {
  try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
}

/** A soft two-note "hmm, not that one" — lower and quieter than a buzzer. */
export function softNope(): void {
  playTone(440, 0.14, 'triangle', 0.07);
  playTone(370, 0.2, 'triangle', 0.06, 0.12);
}

/** Pink round button with a white speaker glyph, centred on (0, 0). */
export function drawSpeakerBtn(g: Phaser.GameObjects.Graphics, r: number): void {
  g.clear();
  g.fillStyle(C.shadow, 0.16);
  g.fillCircle(0, 4, r);
  g.fillStyle(C.pink, 1);
  g.fillCircle(0, 0, r);
  const s = r / 30;
  g.fillStyle(C.white, 1);
  g.fillRoundedRect(-16 * s, -7 * s, 9 * s, 14 * s, 2 * s);
  g.fillTriangle(-9 * s, -7 * s, 3 * s, -15 * s, 3 * s, 15 * s);
  g.fillTriangle(-9 * s, -7 * s, -9 * s, 7 * s, 3 * s, 15 * s);
  g.lineStyle(3 * s, C.white, 1);
  for (let i = 0; i < 2; i++) {
    g.beginPath();
    g.arc(5 * s, 0, (8 + i * 7) * s, -Math.PI / 3.2, Math.PI / 3.2, false);
    g.strokePath();
  }
}
