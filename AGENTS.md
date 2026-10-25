# astro-type

A browser typing game: React and Tailwind for the screens, a Zustand store and an XState machine for state, and the curriculum in code. It's built with Vite and served as static assets from Cloudflare Workers.

## Working here

- Use pnpm on the Node version pinned in `package.json`. The scripts there install, run, check and build.
- `pnpm verify` runs exactly what CI checks before a deploy. Run it before you push.
- `pnpm check` fails only on Biome errors. The backlog of Biome warnings is being kept on purpose for now, so fix warnings only in the lines you change.
- The README overstates the game: it describes shortcuts, states and features that don't exist. Treat the code and `GLOSSARY.md` as the truth.

## Where things live

This is today's layout. The [v1 map (#1)](https://github.com/k-electron/astro-type/issues/1) is migrating it, and ADR-0001 sets the target split between the store and the machine.
- **Game rules and the live Run:** `src/store/useGameStore.ts`. This covers Judgement, scoring, Streak, Overdrive, shields, Stars and Credits.
- **Screens and the moves between them:** `src/store/gameMachine.ts`. Today, a screen change goes through the store's `setGameState`, which runs side effects and then sends the machine an event, and the machine silently drops any event it doesn't accept.
- **Action Deck:** `src/components/IntegratedLanesKeyboard.tsx`. It's drawn with the DOM today; PixiJS is planned.
- **Curriculum:** `src/data/curriculum.ts`.
- **Save and Backup:** `src/utils/storage.ts`, with the schemas in `src/store/schemas.ts`.
- **Sound:** `src/audio/soundEngine.ts`.

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
