/**
 * Everything the DOM test layer fakes, in one place. A happy-dom window is
 * not a browser: it has no WebGL, no canvas, no audio and no layout. Each
 * entry here stands in for one of those, and for nothing else.
 *
 *   1. The app's singleton game (a tripwire, not a stub)
 *   2. The PixiJS deck session (needs WebGL)
 *   3. canvas-confetti (needs a canvas)
 *   4. ResizeObserver (no layout engine)
 *   5. requestAnimationFrame (no frames: the test steps the clock itself)
 *
 * Not faked, because happy-dom already copes: `canvas.getContext('2d')`
 * returns null (the starfield skips drawing), and the sound engine only sets
 * fields until a sound plays, so AudioContext is never touched.
 */
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// 1. `src/app/appGame.ts` builds a localStorage game and starts a real frame loop
//    the moment it is imported. A DOM test builds its own headless game, so
//    anything that still imports the singleton fails loudly here instead of
//    quietly leaking real time and real storage into a test.
vi.mock('../../src/app/appGame', () => {
  throw new Error(
    'DOM tests must not load src/app/appGame.ts: read the game with useGame().',
  );
});

// 2. STUB: the PixiJS deck session, the one place pixi.js is loaded. It draws
//    with WebGL, which a DOM cannot do. The Action Deck's own React header bar
//    (the Overdrive and Streak badges, the Hands toggle) stays real; only the
//    canvas under it is missing, and attaching to it does nothing.
vi.mock('../../src/deck/deckSession', () => ({
  getDeckSession: () => ({ attach() {}, detach() {} }),
}));

// 3. STUB: confetti is drawn on a canvas.
vi.mock('canvas-confetti', () => ({ default: () => null }));

// 4. SHIM: the header watches its own size; there is no layout to watch.
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// 5. SHIM: no animation frames. The starfield's loop would run forever on
//    real timers; the Run's own clock is stepped by the harness instead.
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};

// Testing Library only cleans up on its own when the runner has globals.
afterEach(cleanup);
