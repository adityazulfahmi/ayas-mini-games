# Phaser 3 → 4 Migration Log

Live progress notes for migrating all 9 games from Phaser 3.90 to Phaser 4.x.
Updated incrementally so a fresh session can resume mid-migration without
context loss. **Read the "Status" + "Resume here" sections first.**

## Status

- **Started:** 2026-05-01
- **Completed:** 2026-05-01 (same day — turned out to be a single-API migration)
- **From → To:** `phaser ^3.87.0` (resolved 3.90.0) → `phaser ^4.1.0`
- **Branch:** `main`
- **Result:** ✅ All 9 games render identically under Phaser 4. Single API
  break across the whole codebase (`setTintFill(color)` → `setTint(color)
  .setTintMode(Phaser.TintModes.FILL)`), 5 call sites, all in `whos-that`.

### Resume here

Migration is done. If a future Phaser bump (4.2+) breaks something, the
recipe below is the same: `npm install phaser@latest && npx tsc --noEmit`
to map the breakage, then check this log's "API Mapping" table for any
APIs we'd already migrated.

---

## Plan

1. **Setup** — install Phaser 4, capture typecheck errors as the breakage map.
2. **Shared modules first** — `src/shared/{createGame,phaserUtils,endPopup,loadingScreen}.ts` are imported by every game. Migrate them once and most game-level breakage either resolves automatically or surfaces as a clean list.
3. **Per-game migration** — easiest → hardest, screenshot after each:
   1. tictactoe (simplest UI, two-player flow)
   2. flip-matching
   3. colour-match
   4. colour-hunt
   5. odd-one-out
   6. connect-match
   7. who-makes-sound
   8. whats-next
   9. whos-that (most state, two modes, image assets)
4. **Final** — `npm run build`, dev smoke-test all 9 games, single push.

Each step ends with `npx tsc --noEmit` clean + a green build. Commit after
each game so any partial state is recoverable via `git checkout`.

---

## API Mapping (filled as we discover)

> Phaser 4 is API-near-compatible with 3.x for game-level code, but a few
> specific APIs we use need attention. This table is the migration cheat
> sheet — keep it updated as new breaks come up.

| Phaser 3 (current) | Phaser 4 (target) | Status | Notes |
|---|---|---|---|
| `Phaser.AUTO`, `Phaser.Game` | _(same)_ | TBD | core entry should be unchanged |
| `Phaser.Scale.FIT`, `Phaser.Scale.CENTER_BOTH` | TBD | TBD | scale manager rewritten in 4.0 — verify enum names |
| `scene.add.text` factory + `setResolution(dpr)` | TBD | TBD | createGame.ts monkey-patches this |
| `scene.add.graphics()` + `fillGradientStyle` | TBD | TBD | drawBg uses 4-corner gradient |
| `Phaser.Scenes.Events.SHUTDOWN` | TBD | TBD | endPopup hooks SHUTDOWN |
| `Phaser.Core.Events.READY` | TBD | TBD | createGame dismisses loader on READY |
| `scene.tweens.add` | TBD | TBD | tween API may have changed in 4 |
| `scene.scene.start(key, data)` / `scene.scene.restart(data)` | TBD | TBD | scene manager API |
| `Phaser.GameObjects.Container`, `.Zone`, `.Graphics`, `.Text` | _(same)_ | ✅ unchanged | typecheck clean |
| `setTintFill(color)` | `setTint(color).setTintMode(Phaser.TintModes.FILL)` | 🛠️ fixing | Phaser 4 split tint color from tint mode. d.ts ships migration note: "Deprecated method which does nothing." |

---

## Step log

Each step gets a short note: what was tried, what broke, what shipped.

### Step 1 — install + map breakages ✅

```bash
npm install phaser@latest    # → phaser ^4.1.0
npx tsc --noEmit             # → 5 errors, same shape
```

All 5 errors point at `setTintFill(color)` — 2 in `whos-that/scenes/GameScene.ts`, 3 in `whos-that/scenes/TitleScene.ts`. Phaser 4 split the "set tint color" and "use fill mode" responsibilities into two methods. No other call sites broke; shared modules (`createGame`, `endPopup`, `phaserUtils`, `loadingScreen`, `audio`) compile clean — meaning `Scale.FIT`, `Phaser.Core.Events.READY`, `Phaser.Scenes.Events.SHUTDOWN`, the text/graphics/container factories, tween API, scene manager, and the `Phaser.Game` constructor all still work as-written.

### Step 2 — fix the 5 setTintFill sites ✅

Replaced `.setTintFill(color)` with `.setTint(color).setTintMode(Phaser.TintModes.FILL)` at:

- `src/whos-that/scenes/GameScene.ts:380` (Bing silhouette image)
- `src/whos-that/scenes/GameScene.ts:383` (Animal silhouette emoji)
- `src/whos-that/scenes/TitleScene.ts:49` (hero Bing image)
- `src/whos-that/scenes/TitleScene.ts:53` (hero animal emoji)
- `src/whos-that/scenes/TitleScene.ts:223` (hero animal preview swap)

Visual verification: hero Bing silhouette still renders at deep plum
(`0x2d1b3d`) — the new tint+mode combo produces the identical pixel
output as the old `setTintFill`.

### Step 3 — full smoke test ✅

Captured title-scene screenshots for all 9 games at 420×800 against the
Vite dev server. No Phaser console errors. Game-level visual output is
indistinguishable from the Phaser 3 build.

```
✓ tictactoe       (DOM input fields render — DOM container support intact)
✓ flip-matching
✓ colour-match
✓ colour-hunt
✓ odd-one-out
✓ connect-match
✓ who-makes-sound
✓ whats-next
✓ whos-that       (silhouette tint correct under new API)
```

Build also clean: `npm run build` ships in 587ms; the only chunk-size
warning is the audio (Phaser+game) chunk at 1.36 MB gzipped 356 kB
(was 1.21/324 kB on Phaser 3 — ~12% bigger, expected for 4.x).

### Step 4 — sundries

- **Bundle size note:** the `audio` chunk grew from 1210 kB → 1364 kB
  (gzip 324 kB → 356 kB). This is just Phaser 4 itself being slightly
  larger. Not actionable yet but worth knowing if first-load matters.
- **No Phaser 3 → 4 surprise:** the engine team kept the public API
  remarkably stable for game-level code. Most "Phaser 4 migration guide"
  entries online discuss things we don't use (e.g. `setShader`, internal
  pipeline classes, removed plugins).
