# DOM tests

How to test a React screen without a browser. The rule in `testing.md` still holds: a test goes red only when something a player would notice breaks. Use the terms in `GLOSSARY.md`.

A DOM test mounts the real `<App />` in happy-dom against a headless game (`createGame`, with a stepped clock, silent sound and a Save in memory), then drives it as a player does: it clicks buttons, types keys and lets the Run clock run. It takes tens of milliseconds, so it is the place for "this screen shows the right thing after that move".

Files live in `tests/dom/*.test.tsx`. They run in `pnpm test` (the `dom` project in `vite.config.ts`, beside the Node `unit` project) and not in Playwright.

## Writing one

```tsx
import { expect, it } from 'vitest';
import { renderGame, screen } from './harness';

it('shows the Debrief when the text is typed to the end', () => {
  const player = renderGame({ text: 'ff jj' });
  player.type('ff jj');
  expect(screen.getByText(/Mission Debriefing/)).toBeTruthy();
});
```

`tests/dom/harness.tsx` is the whole interface; read its doc comments.
- `renderGame({ profile?, storage?, text? })` mounts the app on a new game. `profile` is the Save the player already has (any fields you leave out take their defaults); `text` starts a Free Flight Run of that text.
- `player.openHeader('Sectors' | 'Hangar' | 'Analytics' | 'Free Flight' | 'Home')` and `player.click(name)` press real buttons.
- `player.launchFreeFlight(text)`, `player.press(key, { repeat?, ctrlKey?, metaKey? })`, `player.type(text, { stepsPerKey? })` and `player.step(steps)` start and play a Run. Keys go through the App's own key listener as a keydown and a keyup on `window`. `type` steps the Run clock half a second (30 steps) before each character so the Drone is at the Strike Line.
- `player.blur()` and `player.hideTab()` are the player leaving the page; `player.reload()` rebuilds the app over the same Save, so only what the game saved survives.
- The player has no handle on the game, so a test can only check what is on screen. The HUD's Accuracy and Speed refresh every 30 steps; `type` leaves them current, and after a bare `press` call `step(30)`.

Rules:
- Find things the way a player sees them: `getByRole` with a name, `getByText`, `getByLabelText`. No test ids, no class names, no store reads for what the screen shows.
- No snapshots of markup, and no checks that a function was called. Assert on text, buttons and headings.
- Test one behaviour per test, through the screen. A rule's outcome (Judgement, Stars, WPM) belongs in a unit test; a DOM test checks that the screen shows it.
- A move the machine refuses fails the test when it ends, even if it happened inside a click handler.
- No fixed sleeps and no fake timers: nothing here runs on real time. The Run only moves when the test calls `step` or `type`.

## What is stubbed, and why

All of it is in `tests/dom/setup.ts`, with a numbered comment each:
- **The PixiJS deck session** (`getDeckSession`, the only place `pixi.js` loads) attaches to nothing. It needs WebGL, and a DOM has none. The Action Deck's React header bar around it stays real: the Overdrive and Streak badges and the Hands toggle can be tested here. The canvas under it (Drones, keycaps, effects) is not there.
- **`src/appGame.ts`**, the app's real game, is a tripwire: loading it fails the test, because it would bring in real time and localStorage. The tree reads its game with `useGame()`, and `renderGame` provides a headless one.
- **`canvas-confetti`** draws on a canvas.
- **`ResizeObserver` and `requestAnimationFrame`** do nothing, since there is no layout and no frame. The starfield's canvas gets no 2D context from happy-dom and skips drawing by itself.
- Sound needs no stub: the sound engine only sets fields until a sound plays, and the headless game's sound is silent.

Tailwind is not loaded, so no element is hidden by CSS. A DOM test sees the header's `md:flex` navigation at every width and sees a modal's buttons whether or not they would fit on screen.

## What still needs the real browser

Do not try to cover these here; they have a Playwright journey, a screenshot, or a person playing:
- the Action Deck's canvas: Drones, keycaps, lasers, effects, hit popups, and clicking a keycap
- the real clock and frames: Drone motion, catch-up after a slow frame, a pause freezing the deck, exact Judgement timing
- native focus and keyboard: what has focus after a screen opens or closes, a stray Enter on a focused button, a key held down, the `blur` and tab-hidden events
- layout: what is on screen at a given size, scrolling, anything CSS hides or moves
- persistence across a reload: the localStorage adapter and a Save surviving a page load
- how it looks (screenshots) and how it sounds (by ear)
