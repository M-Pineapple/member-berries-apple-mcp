# AGENTS.md — Member Berries Apple MCP

Public MIT MCP under **M-Pineapple**. Bun + TypeScript. macOS only (JXA → Calendar, Notes, Reminders).

## Product thesis

Personality + local day-memory on top of Apple Calendar / Notes / Reminders.
Apple CRUD stays good-enough. Do not sprawl into Mail, Messages, Contacts, or Memory Service.

## Boundaries

- Stdio MCP: diagnostics on **stderr only** (`console.error`). Never `console.log` on the hot path.
- Runtime memory lives at `~/.member-berries-memory.json` (mode `0o600`). Never commit it.
- Public identity is **Pineapple / M-Pineapple**. No real names, home paths, or personal calendar names in source.
- No money-path / trading code in this repo.
- Keep the Buy Me a Coffee CTA (`mpineapple`) in README rewrites.
- Keep `assets/logo.svg` as the product mark.

## Version

Single pin: `member-berries/package.json` `version` and server `version` in `index.ts` must match.
Current target line: **2.1.0**.

## Workflow

Scratch branch → tests → PR → merge → GitHub release. Prefer thin high-ROI features over deep Apple feature parity.

## Layout

- `member-berries/` — runnable package (`index.ts`, tools, utils, memory)
- `assets/` — product logo
- Root `README.md` is the public face; nested README covers install detail
