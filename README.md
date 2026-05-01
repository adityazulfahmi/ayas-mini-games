# 🌸 Aya's Mini Games

A collection of calming, toddler-friendly mini games built with a soft pastel theme.
Each game runs in the browser — no install, no accounts, just tap and play.

Live at [adityazulfahmi.github.io/ayas-mini-games](https://adityazulfahmi.github.io/ayas-mini-games/).

## 🎮 Games

| Game | Description |
|------|-------------|
| [🃏 Flip & Matching](./ayas-flip-matching/) | Flip cards and find every matching pair. Pick your grid: 2×2, 4×4, 4×6, or 6×6. |
| [🐱 Tic-Tac-Toe](./ayas-tictactoe/) | Two players take turns — 🐱 Cat vs 🐰 Bunny. Enter your names, get three in a row, and the score carries across rounds. |
| [🐰 Who's That, Aya?](./ayas-whos-that/) | Two modes: guess the Bing character or the animal from a dark silhouette. Easy (3 choices · 12s) or Hard (4 choices · 8s). 5 rounds. |
| [🎨 Colour Match](./ayas-colour-match/) | Tap the swatch that matches the colour. Easy: 10 bright hues. Hard: subtle shades that get trickier with every streak. 30 seconds. |
| [🤔 Odd One Out](./ayas-odd-one-out/) | Three things belong together — one doesn't. Easy shows the category (animals, fruits, vehicles…); Hard hides it. 30 seconds. |
| [🔍 Colour Hunt](./ayas-colour-hunt/) | A colour pops up — find the emoji that wears it. 30 seconds, 8 colour families, streak bonuses. |
| [🔗 Connect the Match](./ayas-connect-match/) | Tap a friend on the left and its pair on the right to draw a match line. Rounds of 3 pairs refill automatically for 30 seconds of matching. |
| [🔊 Who Makes This Sound?](./ayas-who-makes-sound/) | Tap the speaker to hear an animal sound, then tap the right animal from four big choices. 5 rounds, 10 animals, toddler-easy. |
| [🔮 What Comes Next?](./ayas-whats-next/) | Two modes: **Pattern** (spot the next item in an ABAB row of shapes & colours) or **Story** (pick what comes after a 3-frame growing-up story). 5 rounds. |
| [🎯 Pick & Pop!](./ayas-pick-pop/) | Pick a category to play (fruit, animal, vehicle, or musical instrument), then tap the matching one in a 2×2 grid of bubbles. Distractors are pulled from clearly-different categories — buildings, tools, vegetables, toys — so the right answer is unmistakable. 5 rounds. |

## 🎨 Design

- Soft lavender-to-pink gradient backgrounds with pastel purples, pinks, and mints
- Playful *Fredoka One* headings + *Nunito* body text
- Built for mobile-first (420px-wide canvas) but works on desktop too
- Sound effects are synthesised on the fly via Web Audio API — no audio files shipped
- Every game ends with the same 3-button popup: **Again** (same settings), **🏠 Home** (that game's title), **🎮 Games** (this landing page)

## 🛠️ Tech

Phaser + TypeScript + Vite, bundled into static files and deployed to GitHub Pages on every push to `main`.

```
npm install        # once
npm run dev        # local dev server at http://localhost:5173/ayas-mini-games/
npm run build      # production build into dist/
```
