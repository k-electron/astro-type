import type { Day } from './days';
import {
  addTallies,
  emptyTally,
  keycapOf,
  type KeyTally,
  tallyMs,
} from './keys';
import type { RunSummary } from './runs';

/**
 * A key's days: what each keycap did on each day it was typed, and the
 * smoothing over its last 5 days played with at least 10 tries that the
 * keyboard, a key's trend and a key's best all read. A key here is a keycap
 * ("a" for both "a" and "A", "1" for "!"), as on the keyboard.
 */

/** A key's numbers cover this many of its latest days played. */
export const TREND_DAYS = 5;

/** A day counts for a key only with at least this many tries (First attempts) of it. */
export const MIN_DAY_TRIES = 10;

/** What one keycap did on one day, its Runs added together. */
export interface DayTally extends KeyTally {
  day: Day;
}

/** Each keycap's tallies for each day it was typed on, summed over the day's Runs, oldest day first. */
export function dayTalliesByKeycap(
  runs: readonly RunSummary[],
): Map<string, DayTally[]> {
  const byKeycap = new Map<string, Map<Day, DayTally>>();
  for (const run of runs) {
    for (const [character, tally] of Object.entries(run.keys)) {
      const keycap = keycapOf(character);
      const days = byKeycap.get(keycap) ?? new Map<Day, DayTally>();
      byKeycap.set(keycap, days);
      const total = days.get(run.day) ?? { day: run.day, ...emptyTally() };
      days.set(run.day, { ...total, ...addTallies(total, tally) });
    }
  }
  return new Map(
    [...byKeycap].map(([keycap, days]) => [
      keycap,
      [...days.values()].sort((a, b) => a.day.localeCompare(b.day)),
    ]),
  );
}

/** The days that count for a key as of `day`: its last 5 days played, up to the day, each with 10 tries. */
export function countedDays(
  tallies: readonly DayTally[],
  day: Day,
): DayTally[] {
  return tallies
    .filter((tally) => tally.day <= day && tally.firstAttempts >= MIN_DAY_TRIES)
    .slice(-TREND_DAYS);
}

/** A key's numbers over some days. */
export interface Reading {
  /** How many days were added up. */
  days: number;
  /** First attempts over them, and how many of those were Misses. */
  tries: number;
  misses: number;
  /** Clean hits and the Run Time steps they took: what `ms` is made of. */
  cleanHits: number;
  cleanSteps: number;
  /** Mean Clean-hit time in ms, or null with fewer than 3 Clean hits. */
  ms: number | null;
  /** Accuracy over the tries, 0 to 100, or null with no tries. */
  accuracy: number | null;
}

/** The numbers of some days' tallies added up. */
export function readingOf(tallies: readonly DayTally[]): Reading {
  const sum = tallies.reduce(addTallies, emptyTally());
  return {
    days: tallies.length,
    tries: sum.firstAttempts,
    misses: sum.misses,
    cleanHits: sum.cleanHits,
    cleanSteps: sum.cleanSteps,
    ms: tallyMs(sum),
    accuracy:
      sum.firstAttempts === 0
        ? null
        : (100 * (sum.firstAttempts - sum.misses)) / sum.firstAttempts,
  };
}
