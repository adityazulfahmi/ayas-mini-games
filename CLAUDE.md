# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## Adding a new game

1. Create `ayas-<gamename>/index.html` as a self-contained single file
2. Match the design system above
3. Add a card to the root `index.html` grid (image via inline SVG, title, description, Play Now button)
4. Update `README.md` games table
