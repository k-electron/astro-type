# astro-type

A browser typing game: React and Tailwind for the screens, a Zustand store and an XState machine for state, and the curriculum in code. It's built with Vite and served as static assets from Cloudflare Workers.

## Working here

- Use pnpm on the Node version pinned in `package.json`. The scripts there install, run, check and build.
- `pnpm verify` runs exactly what CI checks before a deploy. Run it before you push.
- `pnpm check` runs Biome, and every Biome rule is an error: fix any diagnostic it reports. Where a rule truly can't apply, suppress that one line with a `// biome-ignore lint/...: reason` that says why. Don't weaken a rule in `biome.json`.
- Screenshot checks compare a few key frames inside CI's fixed Playwright image: `pnpm screenshots` runs them and `pnpm screenshots:update` redraws the baselines on purpose. Both need Docker (linux/amd64). They're part of CI, but `pnpm verify` doesn't run them. See `docs/agents/testing.md`.
- The README overstates the game: it describes shortcuts, states and features that don't exist. Treat the code and `GLOSSARY.md` as the truth.

## Where things live

ADR-0001 sets the split between the store and the machine.
- **Game rules and the live Run:** `src/game/gameStore.ts` holds the Run and the Profile. The rules themselves are pure functions in `src/game/rules.ts` (Judgement, scoring, Streak, Overdrive, shields, Stars and Credits), and the Profile's defaults and helpers are in `src/game/profile.ts`. `src/store/useGameStore.ts` is only React's hook over that store.
- **The game, built:** `src/game/createGame.ts` is the headless factory that wires the store, the machine, the clock and the Save together; tests build their own. `src/appGame.ts` is the app's composition root, with real time, localStorage and sound attached.
- **Run clock:** `src/game/clock.ts` measures Run Time, and `src/game/frameLoop.ts` steps it from the browser's frames.
- **Screens and the moves between them:** `src/store/gameMachine.ts`. It is the only authority on the screen and the Run phase. Buttons send what the player did (`game.send({ type: 'PRESS_CLOSE' })`), the machine changes data only through the store's named Run actions, and a move it refuses changes nothing: it warns in dev builds and throws `RefusedMoveError` in the headless game.
- **Action Deck:** PixiJS, in `src/components/pixi-deck/` (`PixiActionDeck.tsx` mounts it). Its accessibility layer is what browser tests read.
- **Curriculum:** `src/data/curriculum.ts`.
- **Save and Backup:** `src/game/save.ts` is the Save module, `src/utils/storage.ts` is the localStorage adapter, and the schemas are in `src/store/schemas.ts`.
- **Sound:** `src/audio/soundEngine.ts`, attached to the game through the effects port in `src/audio/soundEffects.ts`.

## Ground rules

- **Game rules stay as they are.** A change that gives the player a different rule is the project owner's call, so raise it on the ticket. That covers scoring, Stars, unlocks and timing.
- **Player data stays in the player's browser, in localStorage.** There are no accounts and no analytics.
- **Testing and done:** a gameplay change is done only when it's seen working in a real browser on a real clock. Before you write or change a test, or call a gameplay change done, read `docs/agents/testing.md`.

## Shipping

- Commit only when the project owner asks. Commits go straight to `main`, with messages written as `type: summary` (`feat`, `fix`, `docs`, `ci`, `chore`, `refactor`, `style`).
- **Every push to `main` goes to production.** CI runs `pnpm verify`, deploys the built `dist/` to https://astro-type.k-electron.workers.dev, then smoke-tests it there. If a check fails, the deploy stops. There are no preview deploys.
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
