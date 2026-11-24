import { type Day, daysBetween, WINDOW_DAYS } from './days';
import { cleanHitWpm, type TrickiestKey } from './keys';
import { MIN_DAY_LETTER_HITS, STARTING_DAYS } from './lifetime';
import type { RunSummary } from './runs';

/**
 * The facts behind the plain sentence Analytics opens with. The report picks
 * which of three things there is to say and gives its facts; the screen words
 * it (as `workOn` does for the Debrief).
 */

/** Fewer days than this in the last 8 weeks and the picture is still being rebuilt. */
export const MIN_DAYS_FOR_PICTURE = 3;

/** A gap of at least this many days between two days played counts as time away. */
const MIN_AWAY_DAYS = 2;

/** How long the player has been away, when they have been. */
export interface Away {
  days: number;
  /** The gap is longer than `days`: it began before the 8 weeks the Logbook still holds. */
  atLeast: boolean;
}

export type JourneySentence =
  /** No Run has been cleared yet. */
  | { kind: 'empty' }
  /**
   * Fewer than 3 days played in the last 8 weeks: the picture is rebuilding.
   * `away` is null for a player who has never been away (a new one).
   */
  | { kind: 'rebuilding'; away: Away | null }
  | {
      kind: 'journey';
      /** Days played in all, kept for good. */
      daysPlayed: number;
      /** Letter speed over the first 3 days played, or null before any letter was timed. */
      startingLetterWpm: number | null;
      /** Letter speed over the last 3 days played, or null without 50 timed letters. */
      nowLetterWpm: number | null;
      /** The copied name of the furthest Sector reached in the last 8 weeks, or null (Free Flights only). */
      furthestSector: string | null;
      /** The trickiest key over the last 8 weeks, or null when no key is typed often enough to tell. */
      trickiestKey: TrickiestKey | null;
    };

/**
 * How long the player has been away, from the days they played. After a
 * return the Logbook's last day is today again, so the gap is read from the
 * days played before it; a gap that began before the window is only known to
 * be at least the window long.
 */
export function awayFor(
  runs: readonly RunSummary[],
  today: Day,
  lastDay: Day | null,
  daysPlayedInAll: number,
): Away | null {
  if (lastDay === null) return null;
  const played = [...new Set(runs.map((run) => run.day))].sort();
  if (lastDay < today) {
    const days = daysBetween(lastDay, today);
    return days >= MIN_AWAY_DAYS ? { days, atLeast: false } : null;
  }
  const before = played.at(-2);
  if (before !== undefined) {
    const days = daysBetween(before, lastDay);
    return days >= MIN_AWAY_DAYS ? { days, atLeast: false } : null;
  }
  // Only today is left in the window: the day before it faded, if there was one.
  return daysPlayedInAll > played.length
    ? { days: WINDOW_DAYS, atLeast: true }
    : null;
}

/**
 * Letter speed over the last 3 days played in `runs`, or null when those days
 * hold fewer than 50 Clean hits on letters to measure it by.
 */
export function nowLetterWpm(runs: readonly RunSummary[]): number | null {
  const lastDays = new Set(
    [...new Set(runs.map((run) => run.day))].sort().slice(-STARTING_DAYS),
  );
  let hits = 0;
  let steps = 0;
  for (const run of runs) {
    if (!lastDays.has(run.day)) continue;
    hits += run.letterCleanHits;
    steps += run.letterCleanSteps;
  }
  return hits >= MIN_DAY_LETTER_HITS ? cleanHitWpm(hits, steps) : null;
}
