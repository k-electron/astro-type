# astro-type

A browser typing game: React and Tailwind for the screens, a Zustand store and an XState machine for state, and the curriculum in code. It's built with Vite and served as static assets from Cloudflare Workers.

## Working here

- Use pnpm on the Node version pinned in `package.json`. The scripts there install, run, check and build.
- Two commands and one rule. `pnpm check` while you work (about 10 s): typecheck, Biome and the unit and screen tests. `pnpm verify` before every push: `check`, then one build, then the CI browser journeys and the local-only suite (`tests/browser/local/*.local.spec.ts`) in one Playwright run, then the screenshot checks last. `pnpm fix` applies Biome's safe fixes.
- `verify` needs Docker for the screenshots (linux/amd64, in CI's fixed Playwright image) and fails at once, with a message, when Docker isn't running: it never skips them. `pnpm screenshots:update` redraws the baselines on purpose. CI runs `verify --no-screenshots` in one job and the screenshots in a parallel one; the local-only suite doesn't exist under `CI`, so CI is a strict subset of `verify`. See `docs/agents/testing.md`.
- Every Biome rule is an error: fix any diagnostic `check` reports. Where a rule truly can't apply, suppress that one line with a `// biome-ignore lint/...: reason` that says why. Don't weaken a rule in `biome.json`.
- The README overstates the game: it describes shortcuts, states and features that don't exist. Treat the code and `GLOSSARY.md` as the truth.

## Where things live

Who owns what is in ADR-0001 (the machine or the store: who reads it to decide) and ADR-0003 (the `Game` is the only way in).
- **`src/game/`** is the headless game: it runs with no browser, React, PixiJS or sound. `game.ts` is `createGame` and the `Game` interface, the only way in (the store is private to it); `machine.ts` is the only authority on the screen and the Run phase; `rules.ts` holds the pure rules (`strike`, `tick`, Stars, Credits); `run.ts` and `profile.ts` are the Run and the Profile in the one store; `catalog.ts` is what the Hangar sells; `save.ts` and `schemas.ts` are the Save and Backup; `clock.ts` and `frameLoop.ts` measure and step Run Time; `sound.ts` and `moments.ts` are what the player hears and what just happened; `testHelpers.ts` is the one test-setup module.
- **`src/curriculum/`** is the Sectors and Stages, the one key table (`KEY_FINGER_MAP`, finger and lane per key), the shown keyboard (`keyboardLayout.ts`), the Sector unlock gates, and Free Flight's Stage factory and text check (`freeFlightStage`). It depends on nothing in `src/game`.
- **`src/app/`** is the composition root and the browser adapters: `appGame.ts` builds the app's `Game`, `attachKeyboard.ts` is the keys, Esc and focus loss, and the rest adapt localStorage and the browser's frames.
- **`src/audio/`** is the sound engine (`soundEngine.ts`) and its adapter to the game's sound port (`engineSound.ts`); outside tests, only the composition root imports it.
- **`src/screens/`** is the React screens, the overlay shell, the HUD and the header. They read `useGameState(selector)` and send what the player did (`useGame().send({ type: 'PRESS_CLOSE' })`).
- **`src/deck/`** is the PixiJS Action Deck (`PixiActionDeck.tsx` mounts it). Its accessibility layer is what browser tests read.
- **Tests:** headless unit tests beside the code in `src/**/*.test.ts`, screen tests in `tests/dom/*.test.tsx` (through `tests/dom/harness.tsx`), CI browser journeys in `tests/browser/*.spec.ts`, and the local-only suite in `tests/browser/local/`. ADR-0002 sets the layers.
- **A refused move** (an event that doesn't apply on this screen) changes nothing: it warns in dev builds and throws `RefusedMoveError` in the headless game.

## Ground rules

- **Game rules stay as they are.** A change that gives the player a different rule is the project owner's call, so raise it on the ticket. That covers scoring, Stars, unlocks and timing.
- **Player data stays in the player's browser, in localStorage.** There are no accounts and no analytics.
- **Testing and done:** a gameplay change is done only when `pnpm verify` passes and the change is seen working in a real browser on a real clock. Before you write or change a test, or call a gameplay change done, read `docs/agents/testing.md`.

## Shipping

- Commit only when the project owner asks. Commits go straight to `main`, with messages written as `type: summary` (`feat`, `fix`, `docs`, `ci`, `chore`, `refactor`, `style`).
- **Every push to `main` goes to production.** CI runs `pnpm verify --no-screenshots` in one job and the screenshots in a parallel one, deploys the built `dist/` to https://astro-type.k-electron.workers.dev, then smoke-tests it there. If a check fails, the deploy stops. There are no preview deploys.
- **To roll back,** `git revert` the commit and push it. In an emergency, the project owner runs `pnpm exec wrangler rollback`, which needs their Cloudflare login.
- **Dependabot** opens grouped PRs every week. CI checks them, and the project owner merges them by hand.

## Agent skills

Work runs through Matt Pocock's skills (`mattpocock-skills`), so reach for one first:
- `/wayfinder` maps the work.
- `/grill-with-docs` settles decisions.
- `/to-spec`, then `/to-tickets`, then `/implement` build it.
- `/diagnosing-bugs` handles bugs.
- `/code-review` reviews a change.

### Issue tracker

Issues, specs and wayfinder maps live in GitHub Issues on k-electron/astro-type, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default roles, each label string matching its role name (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
