# Changelog

What's shipped in roughly the last 30 days, in reverse chronological
order. Older entries live in [`archive/CHANGELOG-2025.md`](./archive/CHANGELOG-2025.md);
move sections out of here when they're no longer load-bearing for current
work — keep this file dense and fast to scan.

> **Convention:** new entries go at the top under the most recent date.
> When a chunk of work needs more than one sentence to explain, link to
> the relevant `docs/<file>.md` rather than putting paragraphs here.

---

## 2026-11-17 — New game: Tidy Up! (sorting)

- `ayas-sort-it/` / `src/sort-it/`: one toy at a time goes into the basket it
  belongs in (drag or tap). Sorting by one attribute is the first logic skill,
  before patterns and counting. Levels on picture tiles: Colours → Big & small →
  What is it? (animals / food / things that go) → Three baskets. Baskets show
  their rule with a paint splash / size icon / 🐶🍎🚗 badge and say it aloud;
  wrong drops hop back with an explanation; idle 👆 hint; no timer.
- Content rule: the basket badge emoji (🐶 🍎 🚗) never appear as items, and no
  item may be ambiguous between kinds (no fish among "animals" vs "food").
- Landing: Tidy Up! is the wide featured card at the top (13 games).

## 2026-11-17 — What Comes Next?: pattern path + adaptive levels

- Patterns sit on coloured stepping stones grouped per repeat, a chick hops along
  on the beat and lands on the "?" when answered. Level ladder 1–4 (AB with
  2 cards → AB with 3 → AAB/ABB → ABC), chosen on the title screen and adaptive
  (two first-try answers step up, a miss steps down; stored in localStorage
  `aya.whats-next.level`). Pattern kinds vary: things, colours, animal voices,
  big/little, drum/clap/bell. Cards are inert until the question is asked.
  Story mode starts with 2 endings and has two new everyday stories.

## 2026-11-17 — Animated cover art for every game card

- Each landing card now shows bespoke cover art: `public/covers/<game>.svg`,
  a self-contained animated vector poster (400×460 viewBox, 8–14 KB, CSS
  keyframes, no text/emoji/external assets, honours prefers-reduced-motion).
  One colour world per game (bubblegum/aqua Pick & Pop, peach Shape Sorter,
  sky-blue Who Makes This Sound?, butter-yellow Colour Match, indigo Flip &
  Match, teal Connect the Match, plum theatre Who's That?, coral Colour Hunt,
  violet What Comes Next?, mint Odd One Out, tangerine Tic-Tac-Toe,
  cornflower Crossword). Who's That? uses an original bunny, not a TV character.
- The screenshot thumbnails from earlier today are gone; `scripts/capture-thumbs.mjs`
  stays for anyone who wants real screenshots again.

## 2026-11-17 — Landing page redesign with real screenshots

- Cards now show a real gameplay screenshot (`public/thumbs/<game>.webp`,
  ~9 KB each, made by `scripts/capture-thumbs.mjs` from the dev server) in a
  per-game colour frame with a ▶ play button, instead of hand-drawn previews
  that had drifted from the redesigned games. Re-run the script after a
  visual change to a game.
- 3 columns from tablet up (9 "now" games = 3×3, 3 "later" = 1 row), 2 on
  phones with one tag per card; header pills (12 games · no timers · Voice).
- `public/previews/*.svg` are no longer used by the landing page (the
  adityazulfahmi.com projects tile still uses copies of four of them).

## 2026-11-17 — Spoken-instructions switch

- `src/shared/voice.ts`: one on/off setting (localStorage `aya-voice`) for the
  talking voice in every game. `createGame()` wraps `speechSynthesis.speak`:
  when off nothing is spoken but `start`/`end` still fire after a similar delay,
  so pacing is unchanged. Animal sounds and effects stay on. A 🗣️/🔇 button sits
  bottom-left in every game; the landing page has the same switch.

## 2026-11-17 — Every game reworked for Aya at 2½

One agent per game assessed and improved it (branches `improve/<game>`, merged).
Common themes: spoken prompts and names (local `speech.ts`/`voice.ts` per game),
no-timer defaults with the old timed mode kept as an option, gentle wrong
answers that never end a round (D-007), idle hints (👆 hand), clearer emoji,
bigger targets, and new landing previews.

- **Pick & Pop!** one-tap start, Mix mode, pop effects + tray, per-item distractor exclusions.
- **Shape Sorter** toy box with a window, 7 shapes (moon, diamond), 2/3/4-hole boxes, drop-to-nearest fix.
- **Colour Match** 7 bright "colour buddies", Relaxed/Timed × Colours/Shades.
- **Who Makes This Sound?** Little Ears (2 cards) / Big Ears (4), "Who says moo?", animal reacts.
- **Colour Hunt** relaxed 10 rounds + Speed Hunt, curated unambiguous emoji, no look-alike distractors.
- **What Comes Next?** patterns play on a beat with speech, gentle ramp, 6 toddler stories.
- **Flip & Match** star-buddy card backs, 2×2 → 4×5 ladder (6×6 removed), peek, no clock.
- **Odd One Out** relaxed default, spoken question and reason, curated groups.
- **Connect the Match** "who eats what" easy set, drag or tap, no-timer rounds + 45 s race.
- **Who's That, Aya?** picture answers, Relaxed/Quick, colour reveal, images 23 MB → 1.4 MB.
- **Tic-Tac-Toe** gentle Papa-bot for solo play, 420×780, win line + cheerful ties.
- **Crossword** 420×780, clue numbers/direction, id-ID + en-US speech, letter hints, 97 concrete words.
- Shared: end popup shows unearned stars as a faded ⭐ instead of 🌑. Landing: Connect the
  Match and Who's That moved to "Perfect for Aya now"; new card texts and tags.

## 2026-11-16 — Landing shelves + Who Makes This Sound? polish

- **Landing page**: games split into "Perfect for Aya now" (2½) and
  "Grow into these"; phones get a compact 2-up grid (title + tags, no
  paragraphs), tablets 3-up, desktop 4-up. Hover lift only on real
  pointers. Each card has short tags (No timer, 30 s, Sounds, …).
- **Who Makes This Sound?**: recordings re-cut by `scripts/trim-sounds.mjs`
  (originals in `sounds/original/`) so each starts on the animal's call
  (duck/rooster had ~1 s of lead-in, cow 0.7 s), loudness-matched MP3s.
  Playback moved to pre-decoded Web Audio buffers (`src/who-makes-sound/sound.ts`)
  so taps play instantly; very short calls play twice ("oink oink").
  Layout: bigger cards with the animal's name, roomier speaker/caption,
  caption guides the round (Listen… → Who makes this sound? →
  "🐶 Dog says Woof!") and the sound replays after a correct answer.

## 2026-11-16 — Shape Sorter + aya.adityazulfahmi.com

- **Shape Sorter** (`ayas-shape-sorter/`): drag (or tap-to-place) five
  friendly shapes into a sorter box. Built for Aya at 2½: shape names are
  spoken, wrong holes just wiggle and say the hole's name, a pointing hand
  appears after 7s idle, no timer. Boxes grow 2 → 3 → 3 holes. Placed
  second on the landing page (D-013).
- **Self-hosted at aya.adityazulfahmi.com**: `vite.config.ts` `base` now
  reads `process.env.BASE` (default stays `/ayas-mini-games/` for Pages).

## 2026-05-01 — Token efficiency: SVG extraction, shared host CSS, archive

- **Extract landing-card SVG previews** — `df58a43`. The 9 inline `<svg>`
  blocks on the landing page moved into `public/previews/*.svg`; each
  card is now a one-line `<img>`. `index.html` shrank from ~885 → 395
  lines (-55%). Vite's `public/` dir copies the files into `dist/`
  verbatim. Who's That, Aya? stayed inline (HTML+CSS + real PNG, not SVG).
- **Polish the 8 other previews + Pick & Pop iterations** — see commits
  `799b518`, `1aa5205`, `b7d73c8`, `44b6a06`, `62b6431`, `f86da8d`. Each
  game preview now has a distinct hero motif (paint palette, magnifying
  glass, speech bubble, etc.) instead of generic 2×2 swatch grids.
- **Shared `public/game-host.css`** + sweep of stale `temporary screenshots/*.mjs`
  probe scripts + this archive. Game-host HTMLs went from ~33 lines each
  to 16 lines each (10 games × shared CSS).

## 2026-05-01 — Sort landing cards by 2yo suitability

- Reordered the 10 game cards in `index.html` and the games table in
  `README.md` from "most 2yo-friendly" to "least". Pick & Pop! leads;
  Tic-Tac-Toe (2-player strategy + reading) is last. Rationale and
  the full ranking captured in `docs/decisions.md` D-013. A comment
  at the top of the `games-grid` block in `index.html` points readers
  at the decision so future re-shuffles are deliberate.

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

---

## How to add an entry

When you ship something:

1. Check if today's date already has a section — append under it.
2. Otherwise add a new `## YYYY-MM-DD — <theme>` section at the top.
3. One bullet per logical change with the commit hash.
4. If the change has non-obvious rationale, link to `decisions.md` rather
   than putting paragraphs here.
5. Don't list trivial commits (typo fixes, formatting). Squash mentally.

When the file gets long: move sections older than ~30 days to
`archive/CHANGELOG-2025.md` (or open a new archive file for a future
year). The archive isn't appended to during day-to-day work — it's a
frozen historical record.
