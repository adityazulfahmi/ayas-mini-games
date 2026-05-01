# Changelog

What's shipped, in reverse chronological order. Group commits by theme so
you can scan for "did we do X yet?" without scrolling. Every entry should
reference the commit hash so you can `git show <hash>` for the diff.

> **Convention:** new entries go at the top under the most recent date.
> When a chunk of work needs more than one sentence to explain, link to
> the relevant `docs/<file>.md` — keep this file dense.

---

## 2026-05-01 — Pick & Pop: pick-a-category mode

- Title scene's 4-bubble cluster now drives **category selection**: tap
  any bubble to lock in fruit / animal / vehicle / instrument; "Let's
  Pop!" runs 5 rounds on that category with distinct items each round.
  Vegetable is no longer a target — demoted to a distractor pool but
  still excluded on FRUIT rounds (food/food adjacency rule preserved).
  Per-target distractor exclusions are now declared on `TARGETS[k]
  .excludedDistractorPools` rather than special-cased in scene code.
  Prompt phrasing also rotates by round ("Find the FRUIT!" → "Where's
  the FRUIT?" → "Tap the FRUIT!" → …) so the screen stays fresh.

## 2026-05-01 — Pick & Pop: bubble-themed redesign

- Pick & Pop's title and game scenes redesigned around a literal bubble
  motif: drifting backdrop bubbles, glossy bubble-shaped cards, speech-
  bubble prompt with a tail pointing at the grid, expanding-ring
  shockwave on correct, tilt-jiggle (not horizontal shake) on wrong.
  Landing card SVG also rebuilt with radial-gradient bubbles so it's
  visibly distinct on the menu page.

## 2026-05-01 — Pick & Pop! game

- **Add 'Pick & Pop!' game** — 10th game in the collection. Toddler taps the
  one card in a 2×2 grid that matches the asked-about category (fruit,
  vegetable, vehicle, animal). Distractors are deliberately from
  *non-overlapping* "extreme" pools (instruments, buildings, tools, tech,
  toys, stationery, cosmic, clothing, sport, furniture) so a 2-year-old
  never has to disambiguate two adjacent food categories. Each round picks
  3 distractors from 3 different pools, so the four cards always feel
  varied. Round queue is built so all four target categories appear at
  least once across 5 rounds (one repeats).

## 2026-05-01 — Tech stack upgrade

- **Migrate to Phaser 4.1, Vite 8, TS 6, Node 22 in CI** — `4f8b2b5`. Single
  Phaser-API break across the whole codebase: `setTintFill(color)` →
  `setTint(color).setTintMode(Phaser.TintModes.FILL)`, 5 sites in `whos-that`.
  Visual smoke-test of all 9 games passed. Full notes in
  [phaser-4-migration.md](./phaser-4-migration.md).

## 2026-04-30 → 2026-05-01 — New game + UX polish

- **Add 'What Comes Next?' game with Pattern + Story modes** — `b624a7a`.
  Two modes (5 themed sets for Pattern, 6 four-frame transformation
  sequences for Story), toddler-forgiving scoring (wrong taps shake-and-dim
  but don't end the round; score = first-try correct count). Includes the
  TitleScene `heroFrames` array-reset fix in the same commit.
- **Who Makes This Sound?: distinct animals across the 5 rounds** — `e0f422d`.
  Pre-shuffle a queue at scene start so a 5-round game never repeats an
  animal.
- **Add loading cover + pink canvas clear color** — `ad0f7be`. Heavy games
  (Who's That) sat on a black canvas during boot; bouncing-flower cover hides
  the gap, and Phaser's `backgroundColor: '#fce4ec'` blends any pre-scene
  frames with the body gradient.
- **Fix pink letterbox bars next to canvas on mobile** — `94a0cf4`. Body
  bg switched from solid `#fce4ec` to `linear-gradient(180deg, #fce4ec,
  #ede7f6)` to match the canvas's internal vertical gradient. A shared
  `body::before` mirrors the popup dim onto the bars in lock-step
  (`docs/decisions.md` has the rationale).
- **Who's That? animal mode: supersize emoji answer options** — `bbb0513`.
- **Fix mobile Chrome bottom-bar cropping canvas** — `801f6e4`.
- **Who's That?: stage silhouette + enrich option rows** — `c6a467b`.
- **Who Makes This Sound?: soften speaker + polish title and game UI** — `32e1156`.
- **Flip & Matching: refine title and in-game UI** — `edea241`.

## Earlier 2026 — Sound & connect games

- **Who Makes This Sound?: real animal audio + UI polish** — `caba879`.
  Replaced synth tones with `.ogg` recordings under
  `ayas-who-makes-sound/sounds/` (see `CREDITS.md` there for sources).
- **Add Connect the Match and Who Makes This Sound? games** — `6336a66`.
- **Unify end-popup to 3-button contract + add Who's That modes** — `7e10b40`.
  Established the load-bearing **Again / 🏠 Home / 🎮 Games** contract that
  all games must follow. Don't deviate — see `decisions.md`.

## 2025 — Difficulty system + Phaser migration

- **Rebuild Odd One Out with Easy / Hard difficulty and category hints** — `f038583`.
- **Rebuild Colour Match with Easy / Hard difficulty** — `6b141aa`.
- **Remove pre-migration artefacts** — `4cf0388`.
- **Migrate to Phaser + TypeScript + Vite and auto-deploy via GitHub Actions** — `03b6cf3`.
  This is the watershed commit: pre-migration the games were single-file
  HTML+JS each. Post-migration: shared theme/utils, build pipeline, CI.

## Pre-migration era — single-file HTML games

The first ~15 commits (`eb83f99` through `38fd375`) built the first batch
of games as standalone single-file HTML + inline JS in their own folders:
Flip & Matching, Tic-Tac-Toe, Who's That Aya?, Colour Match, Colour Hunt,
Odd One Out. The pastel design system (Fredoka One + Nunito + lavender→pink
gradient) and the **Aya's Mini Games** landing-page menu were established
during this phase. See `git log` if you need detail — most of that era's
code was rewritten during the Phaser migration anyway.

---

## How to add an entry

When you ship something:

1. Check if today's date already has a section — append under it.
2. Otherwise add a new `## YYYY-MM-DD — <theme>` section at the top.
3. One bullet per logical change with the commit hash.
4. If the change has non-obvious rationale, link to `decisions.md` rather
   than putting paragraphs here.
5. Don't list trivial commits (typo fixes, formatting). Squash mentally.
