import type { Day } from './days';
import {
  countedDays,
  dayTalliesByKeycap,
  type Reading,
  readingOf,
} from './keyDays';
import type { KeyHistory } from './keyHistory';
import { MIN_CLEAN_HITS, stepsToMs } from './keys';
import { type Pace, paceOf } from './letters';
import type { RunSummary } from './runs';

/**
 * The keyboard as it was on a day: how each key was going then, for the
 * keyboard on Analytics that turns back in time with the timeline's cursor.
 * Keys are keycaps ("a" for both "a" and "A", "1" for "!"), as on the
 * keyboard. A key's numbers are its last 5 days played, up to the day, each
 * with at least 10 tries, so a key typed a few times a day doesn't swing.
 */

/** How one key was going as of a day. */
export interface KeyOnDay {
  /** First attempts over the key's counted days; 0 when none counted. */
  tries: number;
  /** How many of those were Misses. */
  misses: number;
  /** How many days counted (up to 5). */
  days: number;
  /** Mean Clean-hit time in ms, or null with fewer than 3 Clean hits. */
  ms: number | null;
  /** Accuracy over the tries, 0 to 100, or null when no day counted. */
  accuracy: number | null;
  /** The time against the day's average over all keys, or null when `ms` is. */
  pace: Pace | null;
  /** Clean hits and the Run Time steps they took: what `ms` is made of. */
  cleanHits: number;
  cleanSteps: number;
}

/**
 * The keyboard as of a day. A key is in `keys` once it has been typed, by that
 * day; one first typed later, or never, is not there ("not yet typed"). A key
 * typed long ago with nothing counting lately is there, with no numbers.
 */
export interface KeyboardOnDay {
  keys: Record<string, KeyOnDay>;
  /** The mean Clean-hit time over the keys that have a time, in ms, or null when none has. */
  averageMs: number | null;
}

/** One key's numbers over the days that count for it. */
interface Sum extends Reading {
  keycap: string;
}

/** The keyboard from each typed key's sum. */
function keyboardOf(sums: readonly Sum[]): KeyboardOnDay {
  const timed = sums.filter((sum) => sum.cleanHits >= MIN_CLEAN_HITS);
  const hits = timed.reduce((total, sum) => total + sum.cleanHits, 0);
  const steps = timed.reduce((total, sum) => total + sum.cleanSteps, 0);
  const averageMs = hits === 0 ? null : stepsToMs(steps / hits);
  const keys: Record<string, KeyOnDay> = {};
  for (const sum of sums) {
    const { ms } = sum;
    keys[sum.keycap] = {
      tries: sum.tries,
      misses: sum.misses,
      days: sum.days,
      ms,
      accuracy: sum.accuracy,
      pace: ms !== null && averageMs !== null ? paceOf(ms, averageMs) : null,
      cleanHits: sum.cleanHits,
      cleanSteps: sum.cleanSteps,
    };
  }
  return { keys, averageMs };
}

/**
 * The keyboard on each of `days` (in the order given): `runs` are the Run
 * summaries still in the window, `history` the day each key was first typed
 * (kept for good). A Run summary also shows a key as typed, whatever
 * `history` says.
 */
export function keyboardDays(
  runs: readonly RunSummary[],
  history: KeyHistory,
  days: readonly Day[],
): KeyboardOnDay[] {
  const tallies = dayTalliesByKeycap(runs);
  const keycaps = new Set([...Object.keys(history), ...tallies.keys()]);
  return days.map((day) => {
    const sums: Sum[] = [];
    for (const keycap of keycaps) {
      const played = (tallies.get(keycap) ?? []).filter(
        (tally) => tally.day <= day,
      );
      const firstDay = [history[keycap]?.firstDay, played[0]?.day]
        .filter((first) => first !== undefined)
        .sort()[0];
      if (firstDay === undefined || firstDay > day) continue;
      sums.push({ keycap, ...readingOf(countedDays(played, day)) });
    }
    return keyboardOf(sums);
  });
}
