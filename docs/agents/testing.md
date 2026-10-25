# Testing

How tests are written and when a change counts as done. Decided in [#5](https://github.com/k-electron/astro-type/issues/5); use the terms in `GLOSSARY.md`. `pnpm verify` runs everything CI runs before a deploy except the screenshot checks, which need Docker (`pnpm screenshots`, below); the other scripts are in `package.json`.

## The rule

A test goes red only when something a player would notice breaks, or a game rule changes. Assert on what is on screen, or on the outcome of a rule (the Judgement, the Stars, the WPM). Be pragmatic: a few tests that guard real behaviour beat many that guard nothing.

A test that restates the code is a change detector: delete it. That covers checking that a function was called, snapshotting component markup, asserting a constant equals itself, and mocking the thing under test.

## Unit tests

Vitest, in `src/**/*.test.ts(x)`, only where the logic is real:
- Judgement and scoring: Perfect, Great or Good by distance to the Strike Line, Multiplier steps, Overdrive, shields
- Stars from WPM, accuracy and Streak
- WPM, accuracy and cadence measured in Run Time
- the machine's promises from [#10](https://github.com/k-electron/astro-type/issues/10): every chain of opened screens unwinds back to its start, every header button works on every screen, only Academy Home and starting a Stage abandon a Run, and Close onto a paused Run lands on the Pause Menu. Test the promises, never a copy of the transition table.
- the curriculum's integrity check from [#11](https://github.com/k-electron/astro-type/issues/11): its schema, unique Stage ids, every character typeable, star thresholds stricter at each level, Sector unlocks only going up

Everything else is covered by browser journeys or by playing. Sound is checked by ear. There is no coverage target.

## Browser tests

Playwright, in `tests/browser/*.spec.ts`, Chromium only, against the production build.
- Find things the way a player sees them: by role and visible text. Inside the PixiJS Action Deck, use its accessibility layer (Drones and keycaps labelled at their drawn positions). Read nothing else from the app: no store, no `window` globals, no test hooks.
- Tag a test `@smoke` and it also runs against the live URL after every deploy. Keep `@smoke` to "a Stage can start" level: quick, and safe to run on production.
- Screenshot comparisons are limited to a few key frames, and they're compared only in CI's fixed Playwright image. `pnpm screenshots` runs them there (CI runs the same command); `pnpm screenshots:update` redraws the baselines on purpose, in `tests/browser/screenshots.spec.ts-snapshots`. Both need Docker. A failure leaves the before, after and diff images in `screenshot-results/test-results`, which CI uploads. The baselines carry the Playwright version they were made with, so a Playwright upgrade (a Dependabot bump) fails the check until the upgrade's branch has run `pnpm screenshots:update` and committed the new pictures. Plain `pnpm test:browser` skips them.

Two exceptions to "read nothing but the screen, on the real clock" are sanctioned, both for the canvas:
- `tests/browser/pixi-effects.spec.ts` checks the Action Deck's effects (lasers, explosions, the ship, the guidance beam, keycap glow) by comparing the pixels of captures taken within the same run. There are no stored baselines, so it runs on any machine in plain `pnpm test:browser`. It uses `page.clock` so an effect is caught mid-flight, and its thresholds are wide: the effects have to be there and run their course, not match a picture.
- The screenshot specs stub `AudioContext` and `Math.random` and block web fonts, so the same frame draws the same pixels on every run: the sound engine draws random numbers on its own real-time schedule, and a font arriving mid-run would redraw the text. Nothing else in the browser tests does this.

## Clocks

- Unit tests step the Run clock by hand.
- Browser tests use the real clock and real key presses. Drones wait at the Strike Line, so there is no race. Wait with Playwright's auto-waiting `expect`, never with fixed sleeps.
- `page.clock` is for exact timing only: a paused deck is frozen, Run Time stands still during a pause, catch-up after a slow frame is capped, and exact Judgement timing (a hit that must land a given distance from the Strike Line).

## Flaky tests

CI never retries. A test that fails without a code change is a bug: fix it or delete it the same day.

## Building a ticket

1. A **separate subagent** writes the tests from the ticket, `GLOSSARY.md` and the running game, before or alongside the code. It never reads the implementation.
2. The implementing agent makes those tests pass and leaves the test files as written. If it thinks a test is wrong, it says so on the ticket. The orchestrating agent decides, and the project owner decides anything that's a gameplay call.
3. A gameplay change is **done** when all three hold:
   - CI is green.
   - A **fresh subagent** that didn't write the code has played the change in a real, visible Chromium, on a real clock with the real GPU, and reported what it saw with screenshots.
   - For anything felt rather than seen (Drone motion, effects, sound, responsiveness), the project owner has played it.
