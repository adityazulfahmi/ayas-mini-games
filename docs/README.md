# /docs — resumability log

These notes exist so a fresh session (any model, any time) can resume work
without re-deriving context. Read **CLAUDE.md** at the repo root first for
project basics; then come here for state and rationale.

## Files

| File | When to read it |
|---|---|
| [STATE.md](./STATE.md) | **First.** Current stack versions, what's open, smoke-test recipe. The one-page snapshot. |
| [CHANGELOG.md](./CHANGELOG.md) | When you need to know what shipped recently and why. Reverse chronological, capped at the last ~30 days. Older entries live in [`archive/CHANGELOG-2025.md`](./archive/CHANGELOG-2025.md). |
| [decisions.md](./decisions.md) | Before changing anything that *looks* arbitrary. Captures the WHY for non-obvious choices so you don't undo them. |
| [phaser-4-migration.md](./phaser-4-migration.md) | Historical record of the Phaser 3 → 4 migration. Useful as a recipe for future engine bumps. |

## How to resume work cold

1. `git log --oneline | head -10` — what shipped most recently
2. `cat docs/STATE.md` — snapshot of current state
3. `npx tsc --noEmit && npm run build` — verify the tree is buildable
4. Check open items in STATE.md → pick one → ship it

When you finish a meaningful chunk of work, append a CHANGELOG entry and
update STATE.md if anything in the snapshot changed. Treat the docs as
load-bearing: stale state notes are worse than missing ones.

## What goes where

- **Code conventions** → CLAUDE.md
- **What shipped + when** → CHANGELOG.md
- **Why we did X this way** → decisions.md
- **Current versions / open items / smoke-test commands** → STATE.md
- **Migration mid-flight** → a focused log like `phaser-4-migration.md`,
  link-listed above. Delete or archive when done — but only after the
  knowledge has been promoted into decisions.md if it's load-bearing.
