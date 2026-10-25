/**
 * The game's clock. Every "now" in the rules comes from here, never from
 * `Date.now()`, so a test can step time by hand.
 *
 * This is the simple stand-in until the Run clock ticket. One step is one
 * 60 Hz frame (1/60 s).
 */
export const STEP_MS = 1000 / 60;

export interface Clock {
  /** Milliseconds, on the same scale as `Date.now()`. */
  now(): number;
  /** Move the clock on by `count` steps. A real-time clock ignores this. */
  step(count: number): void;
}

/** Time only moves when `step` is called. */
export function createSteppedClock(
  // A realistic epoch: 0 would read as "no start time" to a falsy check.
  startMs = 1_700_000_000_000,
): Clock {
  let steps = 0;
  return {
    now: () => startMs + (steps * 1000) / 60,
    step: (count) => {
      steps += count;
    },
  };
}

/** Wall-clock time, for the app. Something else drives `game.step` on a timer. */
export function createRealtimeClock(): Clock {
  return {
    now: () => Date.now(),
    step: () => {},
  };
}
