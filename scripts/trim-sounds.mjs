// Trims the animal recordings so each one starts the moment the animal makes a sound.
//   ayas-who-makes-sound/sounds/original/*.ogg  (Wikimedia originals, see CREDITS.md)
//   -> ayas-who-makes-sound/sounds/*.mp3        (trimmed, loudness-matched, plays on every browser)
// Prints the clip lengths for src/who-makes-sound/data.ts.
// Usage: node scripts/trim-sounds.mjs   (needs ffmpeg)
import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'

const DIR = new URL('../ayas-who-makes-sound/sounds/', import.meta.url).pathname
const RATE = 16000, WIN = 320 // 20 ms analysis windows
const LEAD = 0.03 // keep 30 ms before the onset so the attack isn't clipped
const GAP = 0.5 // a quiet stretch this long ends the sound (keeps "woof woof", drops a second roar)
const MAX = 2.6 // never longer than this

for (const f of readdirSync(DIR + 'original').filter(n => n.endsWith('.ogg'))) {
  const src = DIR + 'original/' + f
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', src, '-ac', '1', '-ar', String(RATE), '-f', 'f32le', '-'], { maxBuffer: 1e8 })
  const s = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4)
  const rms = []
  for (let i = 0; i + WIN <= s.length; i += WIN) {
    let a = 0
    for (let j = i; j < i + WIN; j++) a += s[j] * s[j]
    rms.push(Math.sqrt(a / WIN))
  }
  const max = Math.max(...rms)
  // Onset: first time the level stays above 20% of the peak for 100 ms (ignores clicks and breaths).
  let on = rms.findIndex((_, i) => rms.slice(i, i + 5).length === 5 && rms.slice(i, i + 5).every(r => r > max * 0.2))
  if (on < 0) on = 0
  // End: first quiet stretch of GAP seconds after the onset.
  const gapN = Math.round(GAP / 0.02)
  let end = rms.length
  for (let i = on, quiet = 0; i < rms.length; i++) {
    quiet = rms[i] < max * 0.06 ? quiet + 1 : 0
    if (quiet >= gapN) { end = i - gapN + 1; break }
  }
  const start = Math.max(0, on * 0.02 - LEAD)
  const dur = Math.min(MAX, end * 0.02 + 0.12 - start)
  const out = DIR + f.replace('.ogg', '.mp3')
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', start.toFixed(3), '-t', dur.toFixed(3), '-i', src,
    '-af', `afade=t=in:d=0.01,afade=t=out:st=${(dur - 0.12).toFixed(3)}:d=0.12,loudnorm=I=-16:TP=-1.5`,
    '-ar', '44100', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '96k', out])
  console.log(`${f.padEnd(12)} skip ${start.toFixed(2)}s, keep ${dur.toFixed(2)}s`)
}
