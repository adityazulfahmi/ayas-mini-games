/**
 * Friendly spoken prompts ("Who says moo?") via speechSynthesis.
 * `say` resolves when the line is done — or after a length-based timeout,
 * because `onend` never fires on some devices (and there is no voice at all
 * on others). Silent no-op where speech isn't supported.
 */
let token = 0;

function synth(): SpeechSynthesis | null {
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;
    if (typeof SpeechSynthesisUtterance === 'undefined') return null;
    return window.speechSynthesis;
  } catch { return null; }
}

/** Call from a tap handler: iOS only lets speech start after a user gesture. */
export function unlockSpeech(): void {
  const s = synth();
  if (!s) return;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    s.speak(u);
  } catch { /* ignore */ }
}

export function stopSpeech(): void {
  token++;
  try { synth()?.cancel(); } catch { /* ignore */ }
}

export function say(text: string): Promise<void> {
  const s = synth();
  const my = ++token;
  // ~70 ms per character at rate 0.85 is a generous upper bound.
  const maxMs = Math.min(4000, 900 + text.length * 70);
  if (!s) return new Promise(res => setTimeout(res, Math.min(maxMs, 900)));
  return new Promise(res => {
    let done = false;
    const finish = (): void => { if (!done) { done = true; res(); } };
    try {
      s.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.85;
      u.pitch = 1.3;
      u.lang = 'en-US';
      u.onend = finish;
      u.onerror = finish;
      s.speak(u);
    } catch { finish(); }
    setTimeout(finish, maxMs);
    // A newer line replaces this one: settle so callers don't hang.
    const poll = setInterval(() => { if (token !== my) { clearInterval(poll); finish(); } else if (done) clearInterval(poll); }, 200);
  });
}
