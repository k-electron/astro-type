# Testing

How tests are written and when a change counts as done. Decided in [#5](https://github.com/k-electron/astro-type/issues/5); use the terms in `GLOSSARY.md`. `pnpm verify` runs everything CI runs before a deploy (the unit and screen tests in Vitest, then the browser journeys) except the screenshot checks, which need Docker (`pnpm screenshots`, below). It skips the local-only suite too (`pnpm test:local`, below); `pnpm verify:full` runs both. The other scripts are in `package.json`. Which layer a test belongs in is decided in [ADR-0002](../adr/0002-tests-at-the-lowest-layer-that-sees-the-behaviour.md): the lowest one that can see the behaviour.

## The rule

A test goes red only when something a player would notice breaks, or a game rule changes. Assert on what is on screen, or on the outcome of a rule (the Judgement, the Stars, the WPM). Be pragmatic: a few tests that guard real behaviour beat many that guard nothing.

A test that restates the code is a change detector: delete it. That covers checking that a function was called, snapshotting component markup, asserting a constant equals itself, and mocking the thing under test.

## Unit tests (headless)

Vitest, in `src/**/*.test.ts`, on `createGame` with the Run clock stepped by hand, only where the logic is real:
- Judgement and scoring: Perfect, Great or Good by distance to the Strike Line, Multiplier steps, Overdrive, shields
- Stars from WPM, accuracy and Streak
- WPM, accuracy and cadence measured in Run Time
- the machine's promises from [#10](https://github.com/k-electron/astro-type/issues/10): every chain of opened screens unwinds back to its start, every header button works on every screen, only Academy Home and starting a Stage abandon a Run, and Close onto a paused Run lands on the Pause Menu. Test the promises, never a copy of the transition table.
- the curriculum's integrity check from [#11](https://github.com/k-electron/astro-type/issues/11): its schema, unique Stage ids, every character typeable, star thresholds stricter at each level, Sector unlocks only going up
- the Run's frame loop: catch-up after a stall is capped, and no Run Time passes while paused (`frameLoop.ts`, driven with a fake frame environment)
- a Sector unlocked by a clear, which is what the Debrief banner shows
- which characters the text prompt marks as missed
- the Save adapter moving an unreadable Save aside, verbatim

Sound is checked by ear. There is no coverage target.

## DOM tests

Vitest with happy-dom, in `tests/dom/*.test.tsx`, run by `pnpm test` beside the unit tests, through `renderGame()` (`tests/dom/harness.tsx`), which mounts the real `<App />` over a headless game and drives it as a player does (buttons, keys, Run clock steps). Use them for what the player reads and clicks on the React screens: the HUD, the text prompt's labels, the Pause Menu, the Galaxy Map, the Hangar, Analytics, Free Flight, the Debrief, the menus and their Back labels, Esc and focus-loss handling, and the glossary names.
- Find things by role and visible text only. The harness gives no access to the store or the machine.
- Step Run Time with `step()`. The HUD's Accuracy and Speed change only on the 30-step tick.
- The PixiJS Action Deck is replaced by an empty stage at its session seam, so assert nothing about Drones, keycaps, effects or anything drawn.
- happy-dom has no CSS, layout, scrolling or native key activation. Those belong in the browser.

[`dom-tests.md`](dom-tests.md) shows how to write one and what is stubbed.

## Browser tests

Playwright, in `tests/browser/*.spec.ts`, Chromium only, against the production build. `pnpm test:browser` runs the `chromium` project, which is what CI runs and ignores `*.local.spec.ts`.
- The browser keeps only what a real browser proves: the Action Deck and its accessibility layer, motion and a frozen pause on the real or a stopped clock, native keyboard and focus behaviour (Space not scrolling, Enter and Space not activating the Pause Menu), the Save in localStorage across a reload, the screenshots, and the `@smoke` journey.
- There are a few journeys, one launch each. Each fact is a `test.step`, and checks that don't gate the next step use `expect.soft`, so one run reports every broken fact. Helpers shared by the journeys are in `tests/browser/journey-helpers.ts`, CI's and the local-only ones alike. What every layer of tests shares (the Saves to start from, the banned names, the Multiplier steps) is in `tests/shared/`, which imports from no test runner.
- Add a test to an existing journey before adding a new one.
- Anything real-browser but too heavy for the runner goes in the local-only suite (below).
- Keep the whole suite within a few minutes on the 2-vCPU runner. A real-clock key costs about half a second there, and a `page.clock` frame about a third of a second.
- With no GPU, the Action Deck's WebGL is drawn in software. On Linux, when Mesa's lavapipe is installed (CI installs `mesa-vulkan-drivers`), `playwright.config.ts` has Chromium draw on it instead of on its own SwiftShader, which is several times slower there. The screenshot checks keep SwiftShader, the GL their baselines were drawn with.
- Find things the way a player sees them: by role and visible text. Inside the PixiJS Action Deck, use its accessibility layer (Drones and keycaps labelled at their drawn positions). Read nothing else from the app: no store, no `window` globals, no test hooks.
- Tag a test `@smoke` and it also runs against the live URL after every deploy. Keep `@smoke` to "a Stage can start" level: quick, and safe to run on production.
- Screenshot comparisons are limited to a few key frames, and they're compared only in CI's fixed Playwright image. `pnpm screenshots` runs them there (CI runs the same command); `pnpm screenshots:update` redraws the baselines on purpose, in `tests/browser/screenshots.spec.ts-snapshots`. Both need Docker. A failure leaves the before, after and diff images in `screenshot-results/test-results`, which CI uploads. The baselines carry the Playwright version they were made with, so a Playwright upgrade (a Dependabot bump) fails the check until the upgrade's branch has run `pnpm screenshots:update` and committed the new pictures. Plain `pnpm test:browser` skips them.

Two exceptions to "read nothing but the screen, on the real clock" are sanctioned, both for the canvas:
- `tests/browser/local/effects.local.spec.ts` checks the Action Deck's effects (lasers, explosions, the ship, the guidance beam, keycap glow) by comparing the pixels of captures taken within the same run. There are no stored baselines, so it runs on any machine, but only in `pnpm test:local`, not in plain `pnpm test:browser` or CI. It uses `page.clock` so an effect is caught mid-flight, and its thresholds are wide: the effects have to be there and run their course, not match a picture.
- The screenshot specs stub `AudioContext` and `Math.random` and block web fonts, so the same frame draws the same pixels on every run: the sound engine draws random numbers on its own real-time schedule, and a font arriving mid-run would redraw the text. Nothing else in the browser tests does this.

## Clocks

- Unit and DOM tests step the Run clock by hand.
- Browser tests use the real clock and real key presses. Drones wait at the Strike Line, so there is no race. Wait with Playwright's auto-waiting `expect`, never with fixed sleeps.
- `page.clock` is for exact timing only: a paused deck is frozen, Run Time stands still during a pause, catch-up after a slow frame is capped, and exact Judgement timing (a hit that must land a given distance from the Strike Line).
- `page.clock` may also keep the deck still while a journey types keys whose timing doesn't matter. Nothing moves until the test runs the clock, so every key is then a Good, and the journey costs no drawing until it asks for frames.

## Local-only browser suite

Playwright, in `tests/browser/local/*.local.spec.ts`, run by `pnpm test:local` (or `pnpm verify:full`). CI never runs them: the `local` project doesn't exist when `CI` is set, and each file skips itself there. They follow the browser-test rules above. They hold what is real-browser but too heavy for CI's runner: the deck's effects by pixel comparison, the hit-popup matrix, long Streak and Overdrive climbs, exact Run Time through the real frame loop, and full Stage Runs. Run them before landing a gameplay or Action Deck change; the play-check subagent runs them too. Write them as journeys (`test.step`, `expect.soft`), and start a file with `test.skip(Boolean(process.env.CI), 'Local-only: run with pnpm test:local')`. A test that belongs in CI, because it is cheap and guards a release, goes in a CI journey instead.

## Flaky tests

CI never retries, and neither does the local suite. A test that fails without a code change is a bug: fix it or delete it the same day.

## Building a ticket

1. A **separate subagent** writes the tests from the ticket, `GLOSSARY.md` and the running game, before or alongside the code. It never reads the implementation. It picks the lowest layer that can see the behaviour: headless for a rule, DOM for a React screen, a CI journey only for the list in "Browser tests", and the local suite for what is real-browser but too heavy for CI.
2. The implementing agent makes those tests pass and leaves the test files as written. If it thinks a test is wrong, it says so on the ticket. The orchestrating agent decides, and the project owner decides anything that's a gameplay call.
3. A gameplay change is **done** when all three hold:
   - CI is green, and `pnpm test:local` passes on the dev machine.
   - A **fresh subagent** that didn't write the code has run `pnpm test:local` and played the change in a real, visible Chromium, on a real clock with the real GPU, and reported what it saw with screenshots.
   - For anything felt rather than seen (Drone motion, effects, sound, responsiveness), the project owner has played it.
