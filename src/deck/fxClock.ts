import type { RunPhase } from '../game/machine';
import { MAX_CATCH_UP_MS, STEP_MS } from '../game/clock';

/** What the effect clock reads each frame. */
export interface FxClockInput {
  phase: RunPhase;
  /** Whole Run clock steps taken so far. */
  runSteps: number;
  /** How far the frame is into the next step, from the Run clock's frame loop. */
  fraction: number;
  /** A monotonic wall clock, in milliseconds. */
  wallMs: number;
}

export interface FxClockReading {
  /**
   * How long the effects advance this frame, in steps of 1/60 s. This is the
   * unit the DOM deck's per-frame constants were written in, so an effect at
   * 60 Hz plays exactly as it always has.
   */
  d: number;
  /** The Run clock went back to zero: a new Run has started. */
  newRun: boolean;
}

/**
 * The clock the deck's effects run on. While the Run is running it is the Run
 * clock itself (steps plus the fraction of the next one), so effects play at
 * the same speed on a 60 Hz and a 120 Hz display and stand perfectly still
 * while the Run is paused: no time passes, so nothing moves, and the first
 * frame after a resume carries on from where the effects were.
 *
 * One exception: when the Run is cleared its clock has stopped for good, but
 * the last hit's explosion is still going. That plays out on the wall clock,
 * behind the Debrief, with the same cap on catching up after a stall.
 */
export class FxClock {
  private lastRunPosition: number | null = null;
  private lastRunSteps = 0;
  private lastWallMs: number | null = null;

  advance(input: FxClockInput): FxClockReading {
    const wallDelta =
      this.lastWallMs === null
        ? 0
        : Math.min(
            Math.max(0, input.wallMs - this.lastWallMs),
            MAX_CATCH_UP_MS,
          );
    this.lastWallMs = input.wallMs;

    const newRun = input.runSteps < this.lastRunSteps;
    this.lastRunSteps = input.runSteps;

    if (input.phase === 'running') {
      const position = input.runSteps + input.fraction;
      // The first frame after a pause or a start only sets the mark.
      const d =
        this.lastRunPosition === null || newRun
          ? 0
          : Math.max(0, position - this.lastRunPosition);
      this.lastRunPosition = position;
      return { d, newRun };
    }
    this.lastRunPosition = null;
    return {
      d: input.phase === 'cleared' ? wallDelta / STEP_MS : 0,
      newRun,
    };
  }
}
