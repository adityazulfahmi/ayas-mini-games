# Changelog Archive — 2025 and earlier

Older entries lifted out of the main `docs/CHANGELOG.md` to keep the live
file focused on the last ~30 days. Frozen — don't append here. The full
history beyond what's recorded below lives in `git log`.

---

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
