# Project State Snapshot

> **Last updated:** 2026-05-01 — keep this current. If a model finds it stale,
> the first task is to reconcile it before doing anything else.

## Stack (latest commit: see `git log -1 --oneline`)

| Layer | Version | Notes |
|---|---|---|
| Runtime engine | **Phaser 4.1.0** | 2D WebGL canvas, single shared engine across all 9 games |
| Language | **TypeScript 6.0.3** | strict; tsconfig has no `baseUrl` (deprecated in TS 6) |
| Build | **Vite 8.0.10** | multi-entry — one HTML per game, plus root landing |
| Dev test util | **Puppeteer 24.42.0** | only used by `screenshot.mjs` |
| CI Node | **22** | `.github/workflows/deploy.yml` |
| Hosting | GitHub Pages | auto-deploys on push to `main` |

## Repo layout

```
index.html                       ← landing/menu page
ayas-<game>/index.html           ← per-game host page (9 games)
src/
  shared/                        ← engine glue: createGame, theme,
                                   audio, endPopup, loadingScreen,
                                   letterboxDim, phaserUtils, utils
  <game>/main.ts + scenes/       ← per-game source
docs/                            ← these notes
public/                          ← bundled-as-is assets
.github/workflows/deploy.yml     ← CI
screenshot.mjs                   ← visual-regression workflow (Puppeteer)
```

## Games (10 total, all live)

`flip-matching`, `tictactoe`, `whos-that`, `colour-match`, `colour-hunt`,
`odd-one-out`, `connect-match`, `who-makes-sound`, `whats-next`, `pick-pop`.

## Smoke-test recipe

```bash
npx tsc --noEmit          # typecheck — must be clean
npm run build             # production build — must finish, ≤500ms typical
npm run dev               # Vite serves at http://localhost:5173/ayas-mini-games/
# Then visit each /ayas-<game>/ in a browser, or:
node screenshot.mjs http://localhost:5173/ayas-mini-games/<path>/ <label>
```

## Open / known items

_None at the time of last update._ Add bullet points here when something
is parked: what it is, why it's parked, where the work-in-progress is.

## Recent direction

Most recent push (2026-05-01): added 10th game **Pick & Pop!** — pick the
matching item from a 2×2 grid where distractors are pulled from "extreme"
non-overlapping categories (instruments, buildings, tools, etc.) so a 2yo
never has to disambiguate between, e.g., a fruit and a vegetable. Tech
stack on Phaser 4, Vite 8, TS 6, Node 22. No active migration in flight.

## When this file goes stale

Common drift sources, check first:
- New game added but **Games** list above still shows 9
- Phaser/Vite/TS bumped but versions above don't match `package.json`
- New `docs/<thing>.md` added but not linked from `docs/README.md`
- `tsconfig.json` changed shape (e.g. paths re-introduced)
