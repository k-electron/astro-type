# astro-type

A browser typing game; `README.md` says what it is and what it's built with. Use the names in `GLOSSARY.md` in code, tests, tickets and commits.

## Working here

- Node is `.node-version`, pnpm is `packageManager` in `package.json`, which also lists every script.
- Two commands and one rule: `pnpm check` while you work, `pnpm verify` before every push. `pnpm fix` applies Biome's safe fixes.
- Every Biome rule is an error: fix any diagnostic `check` reports. Where a rule truly can't apply, suppress that one line with a `// biome-ignore lint/...: reason` that says why. Don't weaken a rule in `biome.json`.
- Before you write, change or delete a test, or call any change done, read `docs/agents/testing.md`.

## Where things live

- `src/game/`: the headless game, with no browser, React, PixiJS or sound. `game.ts` is `createGame` and the `Game` interface, the only way in (ADR-0003); the machine owns the screen and the Run phase, the store owns the data (ADR-0001).
- `src/curriculum/`: the Sectors and Stages, the key and finger table, Free Flight's Stage factory and text check. It imports nothing from `src/game/`.
- `src/app/`: the composition root and the browser adapters (keys and focus, localStorage, frames).
- `src/audio/`: the sound engine; outside tests, only the composition root imports it.
- `src/screens/`: the React screens, overlay shell, HUD and header. They read `useGameState(selector)` and act through `useGame()`.
- `src/deck/`: the PixiJS Action Deck and its accessibility layer.
- `tests/`: DOM tests, browser journeys and the data they share.
- `scripts/`: `verify`, the screenshot runner and the smoke test.

## Ground rules

- **Game rules stay as they are.** A change that gives the player a different rule (scoring, Stars, unlocks, timing) is the project owner's call, so raise it on the ticket.
- **Player data stays in the player's browser, in localStorage.** No accounts, no analytics.

## Shipping

- Commit only when the project owner asks. Commits go straight to `main`, written as `type: summary` (`feat`, `fix`, `docs`, `ci`, `chore`, `refactor`, `style`).
- **Every push to `main` goes to production.** CI (`.github/workflows/ci.yml`) checks it, deploys `dist/` to https://astro-type.k-electron.workers.dev and smoke-tests it there; a failed check stops the deploy. There are no preview deploys.
- **To roll back,** `git revert` the commit and push it. In an emergency, the project owner runs `pnpm exec wrangler rollback`, which needs their Cloudflare login.
- **Dependabot** opens grouped PRs every week. CI checks them; the project owner merges them by hand.

## Skills and tracker

Work runs through Matt Pocock's skills (`mattpocock-skills`), so reach for one first: `/wayfinder` maps the work, `/grill-with-docs` settles decisions, `/to-spec`, `/to-tickets` and `/implement` build it, `/diagnosing-bugs` handles bugs, `/code-review` reviews a change.
- Issues, specs and wayfinder maps are GitHub Issues on k-electron/astro-type, via `gh`: `docs/agents/issue-tracker.md`. Labels: `docs/agents/triage-labels.md`.
- One `GLOSSARY.md` and the ADRs in `docs/adr/`, read before working in their area: `docs/agents/domain.md`.
