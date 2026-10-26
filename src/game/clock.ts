/**
 * Time in the game.
 *
 * Two different things, kept apart:
 * - The Run clock (`RunClock`) measures **Run Time**: the time a Run has spent
 *   running, pauses left out. It moves in fixed steps of 1/60 s, only when
 *   something steps it, and the rules read it for WPM, accuracy, Stars,
 *   cadence and keystroke intervals. Tests step it by hand.
 * - `Clock` is the date on the wall, used only for timestamps (when a Stage was
 *   last played, a Drone's id). It never measures how long anything took.
 */
export const STEP_MS = 1000 / 60;

/** The most time one frame may catch up on after a stall: 6 steps. */
export const MAX_CATCH_UP_MS = 100;

/** Wall-clock timestamps only. Never measures a duration. */
export interface Clock {
  /** Milliseconds, on the same scale as `Date.now()`. */
  now(): number;
  /** Move a hand-stepped clock on by `count` steps. A real-time clock ignores this. */
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

/** Wall-clock time, for the app. */
export function createRealtimeClock(): Clock {
  return {
    now: () => Date.now(),
    step: () => {},
  };
}

/** Run Time: counts the fixed steps a Run has run for. */
export interface RunClock {
  /** Run Time in milliseconds: steps taken while running, 1/60 s each. */
  runTimeMs(): number;
  /** The steps behind it, as a whole number. */
  steps(): number;
  /** Count `count` more steps of running time. */
  advance(count: number): void;
  /** Back to zero, for the start of a Run. */
  reset(): void;
}

export function createRunClock(): RunClock {
  let steps = 0;
  return {
    runTimeMs: () => steps * STEP_MS,
    steps: () => steps,
    advance: (count) => {
      steps += count;
    },
    reset: () => {
      steps = 0;
    },
  };
}
