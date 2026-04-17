#!/usr/bin/env node
// Capture a screenshot of a URL at mobile width (420px) and save to
// `temporary screenshots/screenshot-N[-label].png` (auto-incrementing N).
//
// Usage:
//   node screenshot.mjs <url>           -> screenshot-N.png
//   node screenshot.mjs <url> <label>   -> screenshot-N-<label>.png
//
// Env overrides:
//   SCREENSHOT_WIDTH (default 420)
//   SCREENSHOT_HEIGHT (default 800)
//   SCREENSHOT_FULLPAGE=1 to capture full scroll height

import { mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import puppeteer from 'puppeteer';

const [, , url, label] = process.argv;
if (!url) {
  console.error('Usage: node screenshot.mjs <url> [label]');
  process.exit(1);
}

const outDir = 'temporary screenshots';
mkdirSync(outDir, { recursive: true });

const existing = readdirSync(outDir)
  .map(f => f.match(/^screenshot-(\d+)/))
  .filter(Boolean)
  .map(m => Number(m[1]));
const next = (existing.length ? Math.max(...existing) : 0) + 1;

const slug = label ? `-${String(label).replace(/[^a-z0-9-_]/gi, '_')}` : '';
const file = join(outDir, `screenshot-${next}${slug}.png`);

const width = Number(process.env.SCREENSHOT_WIDTH ?? 420);
const height = Number(process.env.SCREENSHOT_HEIGHT ?? 800);
const fullPage = process.env.SCREENSHOT_FULLPAGE === '1';

const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30_000 });
  // brief settle for fonts/animations
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: file, fullPage });
  console.log(file);
} finally {
  await browser.close();
}
