# Decisions log

The **why** behind choices that *look* arbitrary but aren't. If a future
session is tempted to "clean up" any of these, read the entry first —
the issue we were solving may not be visible in the diff.

Each entry has the same shape:

- **What** the decision is
- **Problem** it solves (often a real bug we hit)
- **Solution shape** (what to implement)
- **Don't-touch list** (the load-bearing parts)

---

## D-001 — Body background is a vertical gradient, not solid pink

**What.** Every game's `<body>` uses
`background: linear-gradient(180deg, #fce4ec 0%, #ede7f6 100%)`.

**Problem.** Phaser's `Scale.FIT` letterboxes the canvas on mobile when the
content area is wider than the game's portrait ratio (e.g. iPhone Safari
with both URL bar + toolbar visible). The body shows as bars on the canvas's
left/right. With a solid pink body these bars looked like a stark "pink
border" against the canvas.

**Solution.** The Phaser canvas internally draws a vertical gradient
(`bg1` top → `bg2` bottom) via `drawBg()` in `phaserUtils.ts`. Match the
body's gradient direction and stops, so when the canvas is height-constrained
(width-letterboxed), the bars and the canvas's bg blend with no visible seam.

**Don't touch.** The `180deg` direction is critical — it must match the
canvas's vertical gradient. A `135deg` (diagonal) gradient won't blend at
the seam. The two stops must remain `#fce4ec` and `#ede7f6` exactly.

---

## D-002 — `body::before` mirrors the popup dim onto letterbox bars

**What.** Each game's body has a fixed-position `::before` pseudo-element
sitting *behind* the canvas (`z-index: 0`, with `#game { z-index: 1 }`).
Its background is `rgba(45, 27, 61, 0.55)` — exactly Phaser's popup dim
color/alpha. It fades in/out via `body.aya-popup-open` class. Implemented
in `src/shared/letterboxDim.ts`, injected by `createGame()`.

**Problem.** Phaser draws the end-popup dim *inside* the canvas. On
letterboxed mobile screens that meant the canvas darkened, but the body's
gradient bars stayed bright pastel — a stark frame around the dimmed popup.

**Solution.** Mirror the same dim color on the body via a CSS pseudo-element.
Sit it *behind* the canvas (lower z-index) so the canvas's opaque bg covers
it where the canvas exists, and only the bars get dimmed. Toggle the body
class from `endPopup.show()` / `hide()`, plus cleanup hooks for the
Again/Home/Games button paths and `Phaser.Scenes.Events.SHUTDOWN`.

**Don't touch.** The z-index ordering (`#game` must be above `body::before`),
the cleanup hooks (without them the body class persists into the next scene
and the new scene boots dimmed), and the alpha matching Phaser's popup dim.

---

## D-003 — Phaser canvas clears to pink, not black

**What.** `createGame()` sets `backgroundColor: '#fce4ec'` on the Phaser config.

**Problem.** Phaser's WebGL renderer clears to black by default. Any frame
rendered before the first scene's `drawBg()` runs flashed a black canvas
inside the pastel body gradient — especially visible on heavy games (e.g.
Who's That, where image preloading takes a beat).

**Solution.** Set the clear color to the gradient's top stop (`#fce4ec`).
Pre-scene frames now blend with the body gradient and the loading cover
sits on top of both seamlessly.

**Don't touch.** The pink shade must be `#fce4ec` to match D-001's gradient
top stop.

---

## D-004 — Loading cover mounts before fonts await, dismisses on Phaser READY

**What.** `mountLoading()` is called from the top of `waitForFonts()`, so
the bouncing-flower cover is visible the moment the JS evaluates — before
the font CDN responds, before Phaser inits. `dismissLoading()` is registered
on `game.events.once(Phaser.Core.Events.READY, …)` followed by two `requestAnimationFrame`s.
See `src/shared/loadingScreen.ts`.

**Problem.** Heavy games sit on a black/empty canvas for noticeable seconds
during boot. Black-canvas + body-gradient was jarring. A loading cover
needed to appear immediately and stay up until *after* the title scene's bg
had at least one frame painted underneath it.

**Solution.** Mount as a side-effect at the start of the very first
function the entry-point calls (`waitForFonts`). Use Phaser's READY event
+ 2 RAFs to ensure the title scene's bg is on screen before fading the
cover.

**Don't touch.** The two RAFs (one isn't enough — first RAF is "scene
created", second is "scene rendered"). And the cover's `linear-gradient(180deg…)`
must match D-001 so resting state at fade-time blends.

---

## D-005 — Class-field arrays must reset at the top of `create()`

**What.** Any scene field declared as `private foo: Bar[] = []` MUST be
reassigned to `[]` at the start of `create()` if anything later `push`es
into it.

**Problem.** Phaser reuses scene instances across `scene.start(key)` —
the constructor (and class-field initializers) runs once per game lifetime,
not once per scene visit. So `private heroFrames: Text[] = []` only
initialises empty on the first visit. On the second visit, the array still
holds references to *destroyed* Text objects, and any subsequent `setText()`
on those refs throws → the `create()` method aborts mid-way → scene boots
in a broken state.

We hit this in `whats-next/scenes/TitleScene.ts` where the Home button
appeared "broken": clicking it called `scene.start('TitleScene')` which
threw inside `create()` and left the user staring at a frozen popup-dim'd
screen.

**Solution.** Top of `create()`:

```ts
this.heroFrames = [];
this.heroArrows = [];
// …any other arrays you push into
```

Single-object refs (`private titleTxt!: Phaser.GameObjects.Text`) are fine
because they get reassigned on each `create()`. Only arrays/maps that
accumulate via `.push()` / `.set()` are at risk.

**Don't touch.** When adding new array fields to scenes, reset them in
`create()`. When debugging "scene-on-second-visit acts weird" symptoms,
suspect this first.

---

## D-006 — Per-game pre-shuffled "correct answer" queue

**What.** Games that have N rounds with a "correct answer" pulled from a
larger pool pre-shuffle the pool at `create()` and slice the first N. Used
in `who-makes-sound` (`roundAnimals`) and `whats-next` Story mode (`storyQueue`).

**Problem.** Picking the correct answer with `Math.random()` per round means
a 5-round game can repeat the same correct answer twice (or more). Aya
deserves variety.

**Solution.** Shuffle once, take first N, index by `roundIndex`. `restart()`
re-runs `create()` so each replay gets a fresh shuffle.

**Don't touch.** Distractors stay randomized per round — only the correct
answer is queued. Mixing those up would either over-constrain distractors
(can't fully randomize the wrong-options pool) or under-constrain correct
answers (back to repeats).

---

## D-007 — First-try-correct scoring; no fail state

**What.** Round-based games (e.g. `whats-next`, `who-makes-sound`) score
as "first-try correct count out of N" — wrong taps shake + dim that
specific option but the round continues. Aya can keep tapping until she
finds the right answer.

**Problem.** A 2-year-old hitting a "Game Over" or losing progress on a
single mis-tap is frustrating. But we still want the score to reflect
actual performance for the parent watching over her shoulder.

**Solution.** Track a `firstTry` boolean per round. Wrong tap sets it to
false but leaves the round playable. Correct tap awards the point only if
`firstTry` is still true.

**Don't touch.** This is a UX contract — every round-based game should
follow it. Don't introduce a per-round timer that ends the round on
timeout, and don't dock multiple points for multiple wrong taps.

---

## D-008 — End popup is always 3 buttons: Again / 🏠 Home / 🎮 Games

**What.** `createEndPopup()` in `src/shared/endPopup.ts` requires all three
callbacks: `onPlayAgain`, `onHome`, `onAllGames`. The labels can be
overridden but not removed or reordered. The button row is hard-sized for
three 90 px buttons.

**Problem.** Without a contract, each game would invent its own "what next?"
flow and the menu would feel different per game.

**Solution.** Cement the contract: **Again** (replay same config — no
"pick difficulty again" detour), **🏠 Home** (this game's title scene),
**🎮 Games** (the root landing). All three required.

**Don't touch.** Listed in `CLAUDE.md` too — adding/removing/reordering
buttons here breaks every game.

---

## D-009 — Web Audio synth, not audio files (with one exception)

**What.** All sound effects are programmatic `OscillatorNode + GainNode`
envelopes via `src/shared/audio.ts`. The single exception: `who-makes-sound`
ships real animal recordings (`.ogg` files in `ayas-who-makes-sound/sounds/`).

**Problem.** Audio files inflate bundle size, fail offline, and need
copyright accounting.

**Solution.** Synthesize. Each game calls `sounds.correct()`,
`sounds.wrong()`, etc. — all defined as short tone envelopes. The
who-makes-sound game gets an exception because the *point* of the game is
recognising authentic animal sounds; synth wouldn't work.

**Don't touch.** Don't add audio files except for an obvious "the audio
content IS the game" case.

---

## D-010 — DPR text resolution monkey-patch in `createGame()`

**What.** `createGame.ts` monkey-patches `Phaser.GameObjects.GameObjectFactory.prototype.text`
once at boot to call `setResolution(dpr)` on every Text object created via
`scene.add.text(…)`.

**Problem.** Phaser rasterizes text into a texture at the *logical* font
size. On Retina (DPR=2) screens that texture gets upscaled by the WebGL
renderer and looks soft. Graphics shapes don't have this problem because
they render via WebGL primitives.

**Solution.** Set every Text's resolution to `Math.min(window.devicePixelRatio, 2)`.
Done once at game boot via factory monkey-patch so individual scene code
doesn't need to repeat it.

The same patch also defaults `fontFamily` to Nunito if a Text is created
without an explicit family — Phaser's default is `Courier`.

**Don't touch.** This is in `createGame.ts`. Don't lift the patch into
individual scenes; the boot-time singleton model keeps it consistent.

---

## D-011 — Phaser 4 tint API: setTint + setTintMode

**What.** Phaser 4 split tint color and tint mode into two separate setters.
Anywhere we want a "fill tint" (silhouettes in `whos-that`):

```ts
// Phaser 3 (deprecated, no-ops in Phaser 4):
obj.setTintFill(0x2d1b3d);

// Phaser 4:
obj.setTint(0x2d1b3d).setTintMode(Phaser.TintModes.FILL);
```

**Don't touch.** When adding new tinted GameObjects, use the Phaser-4 form.
The old method still exists in the d.ts but is documented as a no-op.

---

## D-012 — Pick & Pop distractors come from disjoint, non-food, non-vehicle pools

**What.** In `src/pick-pop/data.ts`, distractors live in `DISTRACTOR_POOLS`
(instruments, buildings, furniture, tools, tech, toys, stationery, cosmic,
clothing, sport). Each round draws 1 correct from the target pool + 3
distractors from 3 *different* distractor pools. No distractor can come
from a target category (no fruit/veg/vehicle/animal items in the
distractor pools).

**Problem.** A 2-year-old asked "which is the FRUIT?" should not have to
disambiguate between an apple and a tomato, or between a car and a bicycle
when the question is "which is the VEHICLE?". Adjacent-category distractors
are pedagogically frustrating at this age — the child *picks* a category
member but it happens to be the "wrong" one.

**Solution.** Every distractor must be obviously, visually-unmistakably
*not* a fruit/veg/vehicle/animal. Buildings, instruments, tools — they
share none of the visual cues. The 3-different-pools rule per round means
the four cards on screen also never accidentally feel like "three musical
instruments and a fruit", which would skew the visual weight.

**Don't touch.** Don't add foods, plants, or living creatures to the
distractor pools — the whole point is non-overlap. If you grow the target
categories beyond fruit/veg/vehicle/animal, audit the distractor pools at
the same time so the disjointness invariant still holds.

**Already caught.** 🧸 (teddy bear) was originally in the `toy` distractor
pool. On an "Find the ANIMAL!" round it appeared next to a real bear face
emoji — visually a near-miss for a 2-year-old. Now excluded with an
inline comment. Watch for similar cases when adding new distractors:
plush toys, animal-shaped cookies/sweets, vehicle-shaped toys.

## How to add a new decision

1. Pick the next `D-NNN` number.
2. Title with one short sentence (no question marks; describe the choice).
3. Fill the four sections — be honest about the *problem* even when it's
   embarrassing ("we hit this bug in production").
4. The "Don't touch" list is the most important part. State the invariants.
5. If the decision is later overturned, don't delete the entry — strike
   through the title and add a "**Superseded by D-NNN.**" line so the
   history is preserved.
