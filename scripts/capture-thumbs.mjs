// Captures a gameplay screen of every game for the landing-page cards.
//   public/thumbs/<game>.webp  (360×540, the top of the 420×780 game canvas)
// Usage:
//   BASE=/ npx vite --port 5400        (dev server: exposes window.__game)
//   PW=<path to playwright/index.mjs> node scripts/capture-thumbs.mjs [game ...]
// Needs Playwright with Chromium and sharp (not project dependencies).
import { mkdirSync } from 'node:fs'
const { chromium } = await import(process.env.PW ?? 'playwright')
const sharp = (await import(process.env.SHARP ?? 'sharp')).default

const ORIGIN = process.env.ORIGIN ?? 'http://localhost:5400'
const OUT = new URL('../public/thumbs/', import.meta.url).pathname
const ALL = ['pick-pop', 'shape-sorter', 'colour-match', 'who-makes-sound', 'colour-hunt', 'whats-next',
  'flip-matching', 'odd-one-out', 'connect-match', 'whos-that', 'tictactoe', 'crossword']
// Taps (logical canvas coords) to reach a more telling moment than the empty first frame.
// Some rounds animate in for a while (pattern beat, piece flying in).
const WAIT = { 'shape-sorter': 14000, 'whats-next': 16000 }
const TAPS = { tictactoe: [[210, 480], [100, 346], [320, 346], [100, 615], [210, 346]] }

mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] })
for (const g of process.argv.slice(2).length ? process.argv.slice(2) : ALL) {
  const page = await browser.newPage({ viewport: { width: 420, height: 780 }, deviceScaleFactor: 2 })
  await page.addInitScript(() => localStorage.setItem('aya-voice', 'off'))
  await page.goto(`${ORIGIN}/ayas-${g}/`)
  await page.waitForFunction(() => window.__game?.isBooted, null, { timeout: 20000 })
  await page.addStyleTag({ content: '.aya-voice-toggle{display:none!important}' })
  await page.evaluate(() => {
    const game = window.__game
    game.scene.getScenes(true).forEach(s => s.scene.stop())
    game.scene.start('GameScene')
  })
  await page.waitForTimeout(WAIT[g] ?? 7000) // headless Phaser runs slowly; let the round settle
  for (const [x, y] of TAPS[g] ?? []) { await page.mouse.click(x, y); await page.waitForTimeout(2500) }
  const png = await page.locator('canvas').screenshot()
  const { width, height } = await sharp(png).metadata()
  // Top 2:3 of the canvas (every game keeps its header + main play area there).
  const h = Math.min(height, Math.round(width * 1.5))
  await sharp(png).extract({ left: 0, top: 0, width, height: h }).resize(360, 540, { fit: 'cover', position: 'top' })
    .webp({ quality: 82 }).toFile(`${OUT}${g}.webp`)
  console.log('captured', g)
  await page.close()
}
await browser.close()
