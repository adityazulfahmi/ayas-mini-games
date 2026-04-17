# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Always Do First
- **Invoke the `frontend-design` skill** before writing any frontend code, every session, no exceptions.

## Screenshot workflow

Use this whenever you need to visually verify frontend changes — layout, spacing, colors, responsive breakpoints — before reporting a task as done. Typecheck and unit tests don't catch visual regressions; screenshots do.

- **Tool:** `puppeteer` (dev dependency). The capture script is `screenshot.mjs` at the project root — use it as-is, do not reinvent it.
- **Dev server must be running** first (`npm run dev`), default at `http://localhost:5173/`.
- **Capture:**
  ```
  node screenshot.mjs <url>                # saves temporary screenshots/screenshot-N.png
  node screenshot.mjs <url> <label>        # saves temporary screenshots/screenshot-N-<label>.png
  ```
  `N` auto-increments — files are never overwritten, so you can keep before/after pairs.
- **Review:** read the PNG with the Read tool. Claude sees the image directly and can critique it.
- **What to check each pass:** spacing / padding, font size / weight / line-height, exact hex colors, alignment, border-radius, shadows, image sizing, and (for this repo) mobile width at 420px — the target canvas width for most games.
- **Clean up:** `temporary screenshots/` is gitignored; don't commit its contents.

## What this repo is

A collection of small browser games built for Aya, with a calming pastel baby girl theme. All games are single-file HTML (HTML + CSS + JS, no build step, no dependencies).

## Structure

```
index.html                  ← Landing page (game menu)
ayas-flip-matching/
  index.html                ← Memory card flip & matching game
ayas-tictactoe/
  index.html                ← 2-player Tic-Tac-Toe (🐱 vs 🐰)
```

## Running locally

Open any `index.html` directly in a browser — no server needed.

## Deployment

Hosted on GitHub Pages at `https://adityazulfahmi.github.io/ayas-mini-games/`. Every push to `main` auto-deploys.

## Git workflow

Each change gets its own commit with a clear message, then pushed to `origin main`. Always `git add <specific files>` rather than `git add .`.

## Design system

All games share the same visual language — do not deviate from it:

- **Font:** Fredoka One (headings) + Nunito (body) via Google Fonts
- **Background:** `linear-gradient(135deg, #fce4ec, #ede7f6)`
- **Primary text:** `#6a1b9a` (deep plum)
- **Accent/buttons:** `#f06292` pink → `#ce93d8` lavender gradient
- **Card backs:** `#ce93d8` → `#ba68c8`
- **Matched/win highlight:** `#80cbc4` mint glow on `#e0f7fa` background
- **Shadows:** `0 4px 20px rgba(156, 77, 204, 0.18)`
- **Border radius:** generous — 14px–28px on containers, 10px–18px on cards

## Sound

All audio uses Web Audio API only — no external audio files. Each game creates tones programmatically via `OscillatorNode` + `GainNode`. The pattern is: create `AudioContext` lazily on first user interaction, play short envelope tones (linearRampToValueAtTime → exponentialRampToValueAtTime).

## End-of-game popup

Every game's finished screen uses the shared `createEndPopup` (`src/shared/endPopup.ts`) with the same three-button row — do not add, remove, or reorder the buttons per game. All three callbacks are required:

- **Again** (`onPlayAgain`) — primary pink button. Replays the round with the **same config** (difficulty, grid size, mode, etc.) — do not drop the player back at the title to re-pick.
- **🏠 Home** (`onHome`) — back to the game's own title/landing scene.
- **🎮 Games** (`onAllGames`) — `window.location.href = '../'` back to the root game picker.

Default labels are "Again", "🏠 Home", "🎮 Games"; override only if the game needs different wording (`playAgainLabel`, `homeLabel`, `allGamesLabel`). Keep labels short so all three fit the 90px button width.

## Adding a new game

1. Create `ayas-<gamename>/index.html` as a self-contained single file
2. Match the design system above
3. Add a card to the root `index.html` grid (image via inline SVG, title, description, Play Now button)
4. Update `README.md` games table
