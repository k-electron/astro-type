import { describe, expect, it } from 'vitest';
import { type FrameEnvironment, startFrameLoop } from './frameLoop';
import { newGame, startedGame } from './testHelpers';

/**
 * The frame loop turns the browser's frames into Run clock steps. These tests
 * drive it with a frame environment they move by hand, over a real game, and
 * read what a player would feel: Run Time, and where the Drones are.
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;
/** One step of the Run clock, 1/60 s. */
const STEP_MS = SECOND / 60;

/** A browser stand-in: time moves only when the test says, one frame at a time. */
function fakeBrowser() {
  let time = 5_000;
  let pending: (() => void) | null = null;
  const env: FrameEnvironment = {
    now: () => time,
    request(callback) {
      pending = callback;
      return 1;
    },
    cancel() {
      pending = null;
    },
  };
  return {
    env,
    /** `ms` of real time go by, then the browser draws one frame. */
    frame(ms: number) {
      time += ms;
      const callback = pending;
      pending = null;
      callback?.();
    },
    /** The same, in frames of `ms` each, for `total` ms. */
    frames(total: number, ms = 50) {
      for (let spent = 0; spent < total; spent += ms) this.frame(ms);
    },
  };
}

const droneHeights = (game: ReturnType<typeof startedGame>) =>
  game.getRun().drones.map((drone) => drone.yPercent);

describe('the frame loop on a running Run', () => {
  it('takes the steps that real time calls for, so Run Time follows the clock', () => {
    const game = startedGame();
    const browser = fakeBrowser();
    startFrameLoop(game, browser.env);

    browser.frame(0); // the first frame only starts the count
    browser.frames(2 * SECOND);

    // Frames of 50 ms are three steps each, give or take the step in hand.
    expect(Math.abs(game.getRunTime() - 2 * SECOND)).toBeLessThan(STEP_MS);
  });

  it('catches up on at most 100 ms after a stall, so the Drones do not jump across the deck', () => {
    const stalled = startedGame();
    const browser = fakeBrowser();
    startFrameLoop(stalled, browser.env);
    browser.frame(0);

    // The page is frozen for five minutes, then draws one frame.
    browser.frame(5 * MINUTE);

    // The Run took 6 steps (100 ms), the same as a game stepped by hand.
    const reference = startedGame();
    reference.step(6);
    expect(stalled.getRunTime()).toBeGreaterThan(0);
    expect(stalled.getRunTime()).toBeLessThanOrEqual(100 + STEP_MS / 2);
    expect(droneHeights(stalled)).toEqual(droneHeights(reference));
  });

  it('does not let a stall carry over: the next normal frame takes a normal step', () => {
    const game = startedGame();
    const browser = fakeBrowser();
    startFrameLoop(game, browser.env);
    browser.frame(0);
    browser.frame(5 * MINUTE);
    const afterStall = game.getRunTime();

    browser.frame(STEP_MS);

    expect(game.getRunTime() - afterStall).toBeLessThan(2 * STEP_MS);
  });
});

describe('the frame loop across a pause', () => {
  it('takes no steps while the Run is paused, however many frames go by', () => {
    const game = startedGame();
    const browser = fakeBrowser();
    startFrameLoop(game, browser.env);
    browser.frame(0);
    browser.frames(SECOND);
    const before = game.getRunTime();
    const dronesBefore = droneHeights(game);

    game.send({ type: 'PRESS_PAUSE' });
    browser.frames(5 * MINUTE, SECOND);

    expect(game.getRunTime()).toBe(before);
    expect(droneHeights(game)).toEqual(dronesBefore);
  });

  it('counts nothing on the first frame after resume, so Run Time equals the same Run unpaused', () => {
    const paused = startedGame();
    const browser = fakeBrowser();
    startFrameLoop(paused, browser.env);
    browser.frame(0);
    browser.frames(SECOND);

    paused.send({ type: 'PRESS_PAUSE' });
    browser.frames(5 * MINUTE, SECOND);
    paused.send({ type: 'PRESS_RESUME' });
    // The frame after resume comes a long time after the last one that ran.
    browser.frame(5 * MINUTE);
    expect(paused.getRunTime()).toBeCloseTo(SECOND, -1);
    browser.frames(SECOND);

    // The same Run with no pause in it: two seconds of running, in 50 ms frames.
    const unpaused = startedGame();
    const other = fakeBrowser();
    startFrameLoop(unpaused, other.env);
    other.frame(0);
    other.frames(2 * SECOND);

    expect(paused.getRunTime()).toBeCloseTo(unpaused.getRunTime(), -1);
    expect(Math.abs(paused.getRunTime() - unpaused.getRunTime())).toBeLessThan(
      2 * STEP_MS,
    );
    expect(droneHeights(paused)).toEqual(droneHeights(unpaused));
  });
});

describe('the frame loop reporting each frame', () => {
  it('reports 0 outside a running Run: on Academy Home, while paused, and on the first frame after resume', () => {
    const game = newGame();
    const browser = fakeBrowser();
    const reported: number[] = [];
    startFrameLoop(game, browser.env, (fraction) => reported.push(fraction));

    // Academy Home: no Run at all.
    browser.frame(100);
    expect(reported).toEqual([0]);

    game.startStage('s1-l1');
    browser.frame(0); // the frame that starts the count
    browser.frame(25);
    reported.length = 0;

    game.send({ type: 'PRESS_PAUSE' });
    browser.frame(SECOND);
    browser.frame(SECOND);
    game.send({ type: 'PRESS_RESUME' });
    browser.frame(5 * MINUTE);

    expect(reported).toEqual([0, 0, 0]);
  });

  it('reports how far the frame has got into the next step while running', () => {
    const game = startedGame();
    const browser = fakeBrowser();
    const reported: number[] = [];
    startFrameLoop(game, browser.env, (fraction) => reported.push(fraction));
    browser.frame(0);

    // 25 ms is one step and half of the next.
    browser.frame(25);

    expect(game.getRunTime()).toBeCloseTo(STEP_MS, 3);
    expect(reported.at(-1)).toBeCloseTo(0.5, 5);
  });
});
