# Testing

How tests are written and when a change counts as done. Decided in [#5](https://github.com/k-electron/astro-type/issues/5); use the terms in `GLOSSARY.md`. Two commands and one rule: `pnpm check` while you work (typecheck, Biome, and the unit and screen tests in Vitest, about 10 s), and `pnpm verify` before every push. `verify` runs `check`, then one Playwright run of the CI browser journeys and the local-only suite (below) against a fresh build, then the screenshot checks last, so they don't compete with the browser tests for the CPU. The scripts are listed in `package.json`. Which layer a test belongs in is decided in [ADR-0002](../adr/0002-tests-at-the-lowest-layer-that-sees-the-behaviour.md): the lowest one that can see the behaviour, and each layer has one job. This file is the only how-to for writing a test.

## The rule

A test goes red only when something a player would notice breaks, or a game rule changes. Assert on what is on screen, or on the outcome of a rule (the Judgement, the Stars, the WPM). Be pragmatic: a few tests that guard real behaviour beat many that guard nothing.

A test that restates the code is a change detector: delete it. That covers checking that a function was called, snapshotting component markup, asserting a constant equals itself, mocking the thing under test, and copying a transition table.

**What a test may restate, and what it must import.** A test restates **rule numbers**, because it is their oracle: prices, Multiplier steps, Judgement windows and Star thresholds. If a rule changes, the test should go red. It **imports** everything incidental: Stage text, copy strings, the Save key, defaults, headings and types. A test that spells those out breaks when someone rewords a screen, and says nothing about the game. Where the source doesn't export one yet, note the gap on the ticket rather than copy it a second time.

**The overlap rule.** A higher-layer test stays only if it proves something the lower layer can't see. A rule that only a browser test guards gets a headless test before the browser test is deleted.

## Starting a test

Every layer starts from the same two modules, so no test builds a Save or sets up a `Game` of its own:
- **`tests/shared/saves.ts`** builds every Save. `stageProgress(id, stars, overrides?)` is one Stage's entry; `clearedStages({ 's1-l1': 3 })` is a Profile's Stage progress; `RETURNING_PLAYER` is 5 Stars in all and 1,234 Credits; `completeSave()` is a complete Save in today's format with every field set off its default; `OLD_LIVE_EXPORT` is a fixture, the Backup the game exported before versions existed. Pass one to `createMemoryStorage` or `loadGame` (unit), `renderGame({ profile })` (DOM) or `seedSave` from `tests/browser/helpers.ts` (browser). Add a Save here, never as a local copy. The folder also holds `names.ts` (the words the game never says), `multiplier.ts` (the Multiplier steps) and `screens.ts` (the heading of each menu, and the names of the Pause Menu, the Debrief, Academy Home and the HUD). It imports from no test runner, so every layer can use it.
- **`src/game/testHelpers.ts`** is the one test-helpers module. It sets up a `Game` through `send` over a seeded Save, and plays it by `pressKey` and `step`: `newGame(seed)`, `loadGame(seed, effects)` (which also gives the Save's storage), `startedGame({ upgrades })`, `startStage(game, id)`, `startFreeFlight(game, text)`, `hitPerfect`, `miss`, `typeText` and `clearStage`. It imports from no test runner and no React, so a headless test and the DOM harness both use it (the harness's `player.startStage` is its `startStage` over the harness's own game).

## Unit tests (headless)

Vitest, in `src/**/*.test.ts`, on `createGame` with the Run clock stepped by hand, only where the logic is real:
- Judgement and scoring: Perfect, Great or Good by distance to the Strike Line, Multiplier steps, Overdrive, shields
- Stars from WPM, accuracy and Streak
- WPM, accuracy and cadence measured in Run Time
- the machine's promises from [#10](https://github.com/k-electron/astro-type/issues/10): every chain of opened screens unwinds back to its start, every header button works on every screen, only Academy Home and starting a Stage abandon a Run, and Close onto a paused Run lands on the Pause Menu. Test the promises, never a copy of the transition table.
- the curriculum's integrity check from [#11](https://github.com/k-electron/astro-type/issues/11): unique Stage ids, every character typeable, the values a type can't say (text to type, percentages, positive thresholds), star thresholds stricter at each level, Sector unlocks only going up. The shape of a Sector and a Stage is the `Sector` and `Stage` types, which the typecheck holds.
- moments (`moments.test.ts`): what the `Game` announces through `onMoment`: a hit with its Drone, lane and finger, a Miss, a shield, Overdrive's ignition, the Stage clear (heard with the Debrief already on show), an Upgrade or a trail bought
- the Run's frame loop: catch-up after a stall is capped, and no Run Time passes while paused (`frameLoop.ts`, driven with a fake frame environment)
- a Sector unlocked by a clear, which is what the Debrief banner shows
- which characters the text prompt marks as missed
- the Save adapter moving an unreadable Save aside, verbatim

The rules are tested through the `Game` (`send`, `pressKey`, `step`, the Profile commands and what it reports), not as fragments; the data, adapter and frame-loop checks sit beside them. The recording sound adapter (`tests/shared/recordingSound.ts`) stands in for the speakers, and `src/game/sound.test.ts` asserts at each moment of a scripted Run whether the beat and the Overdrive layer are on and which cue fired. How the sound feels is for a person. There is no coverage target.

## DOM tests

Vitest with happy-dom, in `tests/dom/*.test.tsx`, run by `pnpm check` (the `dom` project in `vite.config.ts`, beside the Node `unit` project) and not in Playwright. A DOM test mounts the real `<App />` against a headless game (`createGame`, with a stepped clock, silent sound and a Save in memory) and drives it as a player does: it clicks buttons, types keys and lets the Run clock run. It takes tens of milliseconds, so it is the place for "this screen shows the right thing after that move". Use it for what the player reads and clicks on the React screens, and the wiring from a screen to the `Game`: the HUD, the text prompt's labels, the Pause Menu, the Galaxy Map, the Hangar, Analytics, Free Flight, the Debrief, the menus and their Back labels, Esc and focus-loss handling, and the glossary names.

```tsx
import { expect, it } from 'vitest';
import { DEBRIEF_TITLE } from '../shared/screens';
import { renderGame, screen } from './harness';

it('shows the Debrief when the text is typed to the end', () => {
  const player = renderGame({ text: 'ff jj' });
  player.type('ff jj');
  expect(screen.getByText(DEBRIEF_TITLE)).toBeTruthy();
});
```

`tests/dom/harness.tsx` is the whole interface; read its doc comments.
- `renderGame({ profile?, storage?, text? })` mounts the app on a new game. `profile` is the Save the player already has (one from `tests/shared/saves.ts`; any fields you leave out take their defaults); `text` starts a Free Flight Run of that text.
- `player.openHeader('Sectors' | 'Hangar' | 'Analytics' | 'Free Flight' | 'Home')` and `player.click(name)` press real buttons.
- `player.launchFreeFlight(text)`, `player.press(key, { repeat?, ctrlKey?, metaKey? })`, `player.type(text, { stepsPerKey? })` and `player.step(steps)` start and play a Run. Keys go through the keys the harness attaches to its game, `attachKeyboard` (`src/app/attachKeyboard.ts`, the same adapter the composition root attaches), as a keydown and a keyup on `window`; the App has no key listener of its own. `type` steps the Run clock half a second (30 steps) before each character so the Drone is at the Strike Line.
- `player.blur()`, `player.hideTab()`, `player.focus()` and `player.showTab()` are the player leaving the page and coming back; `player.reload()` rebuilds the app over the same Save, so only what the game saved survives.
- `player.startStage(stageId)` begins a Run of a curriculum Stage by id, through the game, with the helpers module's `startStage`. It does not click through the Galaxy Map (a Stage's card has no name of its own to find it by), and it does not check that the Stage's Sector is open. A test that has to see the Galaxy Map's Launch Mission button work clicks it (`navigation.test.tsx` does). `player.typePrompt({ stepsPerKey?, characters? })` types the rest of the text the prompt is showing, from the current character, so a test needn't know the Stage's text; with `characters` it stops short of the end. It reads the prompt's one-character elements in order and starts at the one marked `aria-current`. `player.importBackup(contents)` chooses a file on "Import Backup"; the file is read after it returns, so wait for the outcome on screen with `findBy...`.
- The player has no handle on the game, so a test can only check what is on screen. The HUD's Accuracy follows every keystroke; its Speed refreshes every 30 steps, so `type` leaves it current, and after a bare `press` call `step(30)` before reading Speed.

Rules:
- Find things the way a player sees them: `getByRole` with a name, `getByText`, `getByLabelText`. No test ids, no class names, no store reads for what the screen shows. The harness gives no access to the game, the store or the machine.
- No snapshots of markup, and no checks that a function was called. Assert on text, buttons and headings, and import copy, headings and Stage text rather than retyping them.
- Test one behaviour per test, through the screen. A rule's outcome (Judgement, Stars, WPM) belongs in a unit test; a DOM test checks that the screen shows it.
- A move the machine refuses fails the test when it ends, even if it happened inside a click handler. `expectNoRefusedMove(where)` fails at once instead, with `where` in the message. `random-walk.test.tsx` is a seeded random walk over the real App: it clicks whichever buttons are on screen and presses Esc, and calls `expectNoRefusedMove` after every step so a failure names its seed and step (replay one with `WALK_SEED=7 pnpm exec vitest run tests/dom/random-walk.test.tsx`). It lists nothing a screen offers, so a new button, or one that sends the wrong thing, is found by the walk itself.
- No fixed sleeps and no fake timers: nothing here runs on real time. The Run only moves when the test calls `step` or `type`.

**What is stubbed, and why.** All of it is in `tests/dom/setup.ts`, with a numbered comment each:
- The PixiJS deck session (`getDeckSession`, the only place `pixi.js` loads) attaches to nothing. It needs WebGL, and a DOM has none. The Action Deck's React header bar around it stays real: the Overdrive and Streak badges and the Hands toggle can be tested here. The canvas under it (Drones, keycaps, effects) is not there, so assert nothing about anything drawn.
- `src/appGame.ts`, the app's real game, is a tripwire: loading it fails the test, because it would bring in real time and localStorage. The tree reads its game with `useGame()`, and `renderGame` provides a headless one.
- `canvas-confetti` draws on a canvas.
- `ResizeObserver` and `requestAnimationFrame` do nothing, since there is no layout and no frame. The starfield's canvas gets no 2D context from happy-dom and skips drawing by itself.
- Sound needs no stub: the sound engine only sets fields until a sound plays, and the headless game's sound is silent.

Tailwind is not loaded, so no element is hidden by CSS: a DOM test sees the header's `md:flex` navigation at every width and sees a modal's buttons whether or not they would fit on screen. happy-dom also has no scrolling or native key activation.

**What still needs the real browser.** Do not try to cover these in a DOM test; they have a Playwright journey (CI's, in `tests/browser/*.spec.ts` using `tests/browser/journey-helpers.ts`, or the local-only suite), a screenshot, or a person playing:
- the Action Deck's canvas: Drones, keycaps, lasers, effects, hit popups, and clicking a keycap
- the real clock and frames: Drone motion, catch-up after a slow frame, a pause freezing the deck, exact Judgement timing
- native focus and keyboard: what has focus after a screen opens or closes, a stray Enter or Space on a focused button, Space scrolling the page (the keyboard adapter's handling of `blur`, tab-hidden, Esc and a held key is DOM-testable, via `blur()`, `hideTab()` and `press(..., { repeat })`; `attach-keyboard.test.tsx` holds what only the adapter sees, including the Esc contract: an element swallows an Esc by calling `preventDefault` on it first)
- layout: what is on screen at a given size, scrolling, anything CSS hides or moves
- persistence across a reload: the localStorage adapter and a Save surviving a page load
- how it looks (screenshots) and how it sounds (by ear)

## Browser tests

Playwright, in `tests/browser/*.spec.ts`, Chromium only, against the production build. `playwright.config.ts` has two projects: `chromium`, the CI journeys, which ignores `*.local.spec.ts`, and `local`, the local-only suite (below). Playwright's `webServer` owns the build: every run does `pnpm build`, then serves `dist/` with `vite preview` on port 4318 (`--strictPort`, never reusing a server), so a browser test can't run against a stale build or a server left on 4173. That is `verify`'s one build.
- The browser keeps only what a real browser proves: the Action Deck and its accessibility layer, motion and a frozen pause on the real or a stopped clock, native keyboard and focus behaviour (Space not scrolling, Enter and Space not activating the Pause Menu), the Save in localStorage across a reload, the screenshots, and the `@smoke` journey.
- There are a few journeys, one launch each. Each fact is a `test.step`, and checks that don't gate the next step use `expect.soft`, so one run reports every broken fact. Helpers shared by the journeys are in `tests/browser/journey-helpers.ts`, CI's and the local-only ones alike. What every layer of tests shares (the Saves to start from, the banned names, the Multiplier steps) is in `tests/shared/`, which imports from no test runner.
- Add a test to an existing journey before adding a new one.
- Anything real-browser but too heavy for the runner goes in the local-only suite (below).
- Keep the whole suite within a few minutes on the 2-vCPU runner. A real-clock key costs about half a second there, and a `page.clock` frame about a third of a second.
- With no GPU, the Action Deck's WebGL is drawn in software. On Linux, when Mesa's lavapipe is installed (CI installs `mesa-vulkan-drivers`), `playwright.config.ts` has Chromium draw on it instead of on its own SwiftShader, which is several times slower there. Lavapipe stays on the runner because, on SwiftShader, each Action Deck frame took about 270 ms there, which slowed every key press and every `page.clock` frame of the non-screenshot browser tests. The screenshot checks keep SwiftShader, the GL their baselines were drawn with.
- Find things the way a player sees them: by role and visible text. Inside the PixiJS Action Deck, use its accessibility layer (Drones and keycaps labelled at their drawn positions). Read nothing else from the app: no store, no `window` globals, no test hooks.
- Tag a test `@smoke` and it also runs against the live URL after every deploy. Keep `@smoke` to "a Stage can start" level: quick, and safe to run on production.
- Screenshot comparisons are limited to a few key frames, and they're compared only in CI's fixed Playwright image. `verify` runs them there, last, through `scripts/screenshots.mjs` (CI's screenshots job runs the same script); `pnpm screenshots:update` redraws the baselines on purpose, in `tests/browser/screenshots.spec.ts-snapshots`. The per-pixel `threshold` is 0, the strictest value that stayed green over 10 runs in a row in CI's image (the frames draw pixel-identically there, so no tolerance was needed); `maxDiffPixelRatio` stays at 0.001. Both need Docker, and `verify` fails at once, with a message, when Docker isn't running, rather than skipping them. CI's checks job runs `verify --no-screenshots`, because its screenshots have a parallel job of their own; that flag is the only way to skip them. A failure leaves the before, after and diff images in `screenshot-results/test-results`, which CI uploads. The baselines carry the Playwright version they were made with, so a Playwright upgrade (a Dependabot bump) fails the check until the upgrade's branch has run `pnpm screenshots:update` and committed the new pictures. The Playwright step of `verify` skips them: they run only in the Docker step.

Two exceptions to "read nothing but the screen, on the real clock" are sanctioned, both for the canvas:
- `tests/browser/local/effects.local.spec.ts` checks the Action Deck's effects (lasers, explosions, the ship, the guidance beam, keycap glow) by comparing the pixels of captures taken within the same run. There are no stored baselines, so it runs on any machine, but only in the `local` project, which `pnpm verify` runs and CI does not. It uses `page.clock` so an effect is caught mid-flight, and its thresholds are wide: the effects have to be there and run their course, not match a picture.
- The screenshot specs stub `AudioContext` and `Math.random` and block web fonts, so the same frame draws the same pixels on every run: the sound engine draws random numbers on its own real-time schedule, and a font arriving mid-run would redraw the text. Nothing else in the browser tests does this.

## Clocks

- Unit and DOM tests step the Run clock by hand.
- Browser tests use the real clock and real key presses. Drones wait at the Strike Line, so there is no race. Wait with Playwright's auto-waiting `expect`, never with fixed sleeps.
- `page.clock` is for exact timing only: a paused deck is frozen, Run Time stands still during a pause, catch-up after a slow frame is capped, and exact Judgement timing (a hit that must land a given distance from the Strike Line).
- `page.clock` may also keep the deck still while a journey types keys whose timing doesn't matter. Nothing moves until the test runs the clock, so every key is then a Good, and the journey costs no drawing until it asks for frames.

## Local-only browser suite

Playwright, in `tests/browser/local/*.local.spec.ts`, run by `pnpm verify`, in the same Playwright run as the CI journeys. CI never runs them: the `local` project doesn't exist when `CI` is set, and each file skips itself there. They follow the browser-test rules above. They hold what is real-browser but too heavy for CI's runner: the deck's effects by pixel comparison (`effects.local`), exact Run Time through the real frame loop (`run-clock.local`), and one full Stage played for real, from a fresh Save through its Debrief, with the Stars kept across a reload (`campaign.local`). The long Streak and Overdrive climbs are not here: the rules are unit tests, the badges and names are DOM tests, and the canvas wiring is a CI journey (the popups and names one). `verify` runs them on every push, so a gameplay or Action Deck change is checked by them before it lands; the play-check subagent runs `verify` too. Write them as journeys (`test.step`, `expect.soft`), and start a file with `test.skip(Boolean(process.env.CI), 'Local-only: pnpm verify runs it, CI does not')`. A test that belongs in CI, because it is cheap and guards a release, goes in a CI journey instead.

## Flaky tests

CI never retries, and neither does the local suite. A test that fails without a code change is a bug: fix it or delete it the same day.

## Building a ticket

1. A **separate subagent** writes the tests from the ticket, `GLOSSARY.md` and the running game, before or alongside the code. It never reads the implementation. It picks the lowest layer that can see the behaviour: headless for a rule, DOM for a React screen, a CI journey only for the list in "Browser tests", and the local suite for what is real-browser but too heavy for CI.
2. The implementing agent makes those tests pass and leaves the test files as written. If it thinks a test is wrong, it says so on the ticket. The orchestrating agent decides, and the project owner decides anything that's a gameplay call.
3. A gameplay change is **done** when all three hold:
   - CI is green, and `pnpm verify` passes on the dev machine.
   - A **fresh subagent** that didn't write the code has run `pnpm verify` and played the change in a real, visible Chromium, on a real clock with the real GPU, and reported what it saw with screenshots.
   - For anything felt rather than seen (Drone motion, effects, sound, responsiveness), the project owner has played it.
