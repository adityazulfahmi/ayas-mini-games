/**
 * Global "spoken instructions" on/off switch for every game.
 *
 * Games speak through `window.speechSynthesis` from their own little helpers.
 * Rather than touching each helper, `installVoiceGate()` wraps
 * `speechSynthesis.speak` once: when voice is off the utterance is not spoken,
 * but its `start`/`end` events still fire after a similar delay, so games that
 * wait for "speech finished" keep their pacing. Animal sounds and sound effects
 * are not affected; only the talking voice.
 *
 * The choice is stored in localStorage and shared with the landing page
 * (index.html reads the same key).
 */
export const VOICE_KEY = 'aya-voice';

export function isVoiceOn(): boolean {
  try { return localStorage.getItem(VOICE_KEY) !== 'off'; } catch { return true; }
}

export function setVoiceOn(on: boolean): void {
  try { localStorage.setItem(VOICE_KEY, on ? 'on' : 'off'); } catch { /* private mode */ }
  if (!on) {
    try { window.speechSynthesis?.cancel(); } catch { /* no speech */ }
  }
  document.querySelectorAll<HTMLButtonElement>('.aya-voice-toggle').forEach(paintToggle);
}

let gateInstalled = false;
const pending = new Set<{ u: SpeechSynthesisUtterance; timers: number[] }>();

export function installVoiceGate(): void {
  if (gateInstalled || typeof window === 'undefined' || !window.speechSynthesis) return;
  gateInstalled = true;
  const synth = window.speechSynthesis;
  const speak = synth.speak.bind(synth);
  const cancel = synth.cancel.bind(synth);

  synth.speak = (u: SpeechSynthesisUtterance) => {
    if (isVoiceOn()) { speak(u); return; }
    // Silent stand-in: roughly as long as the sentence would take to say.
    const words = Math.max(1, (u.text || '').trim().split(/\s+/).length);
    const ms = Math.min(4000, 250 + words * 330 / Math.max(0.5, u.rate || 1));
    const job = { u, timers: [] as number[] };
    job.timers.push(window.setTimeout(() => u.dispatchEvent(new Event('start')), 0));
    job.timers.push(window.setTimeout(() => { pending.delete(job); u.dispatchEvent(new Event('end')); }, ms));
    pending.add(job);
  };

  synth.cancel = () => {
    // Mirror the browser: cancelled utterances report an error, not a normal end.
    pending.forEach(job => {
      job.timers.forEach(t => window.clearTimeout(t));
      job.u.dispatchEvent(new Event('error'));
    });
    pending.clear();
    cancel();
  };
}

function paintToggle(b: HTMLButtonElement): void {
  const on = isVoiceOn();
  b.textContent = on ? '🗣️' : '🔇';
  b.setAttribute('aria-pressed', String(on));
  b.setAttribute('aria-label', on ? 'Spoken instructions on. Tap to turn off' : 'Spoken instructions off. Tap to turn on');
  b.title = on ? 'Voice on' : 'Voice off';
  b.classList.toggle('off', !on);
}

/** Small floating button (bottom-left) to switch the voice on/off during play. */
export function mountVoiceToggle(): void {
  if (typeof document === 'undefined' || document.querySelector('.aya-voice-toggle')) return;
  if (!document.getElementById('aya-voice-style')) {
    const style = document.createElement('style');
    style.id = 'aya-voice-style';
    style.textContent = `
      .aya-voice-toggle {
        position: fixed; z-index: 50;
        left: calc(10px + env(safe-area-inset-left)); bottom: calc(10px + env(safe-area-inset-bottom));
        width: 44px; height: 44px; border-radius: 50%;
        border: 2px solid rgba(206,147,216,0.6); background: rgba(255,255,255,0.88);
        box-shadow: 0 4px 14px rgba(156,77,204,0.18);
        font-size: 20px; line-height: 1; cursor: pointer; padding: 0;
        display: grid; place-items: center;
        -webkit-tap-highlight-color: transparent;
      }
      .aya-voice-toggle.off { background: rgba(243,229,245,0.92); }
      .aya-voice-toggle:active { transform: scale(0.92); }
      body.aya-popup-open .aya-voice-toggle { opacity: 0.6; }
    `;
    document.head.appendChild(style);
  }
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'aya-voice-toggle';
  paintToggle(b);
  b.addEventListener('click', e => {
    e.stopPropagation();
    const on = !isVoiceOn();
    setVoiceOn(on);
    // Confirm the change out loud only when turning it back on.
    if (on) {
      try {
        const u = new SpeechSynthesisUtterance('Voice on!');
        u.lang = 'en-US'; u.rate = 0.9; u.pitch = 1.3;
        window.speechSynthesis?.speak(u);
      } catch { /* no speech */ }
    }
  });
  const add = () => document.body.appendChild(b);
  if (document.body) add(); else document.addEventListener('DOMContentLoaded', add, { once: true });
}
