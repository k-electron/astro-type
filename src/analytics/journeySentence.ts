import { addDays, type Day, daysBetween, WINDOW_DAYS } from './days';
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
  /** The gap is at least `days`: it began before the 8 weeks the Logbook still holds. */
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
 * How long the player has been away, from the days they played: the latest
 * gap of at least 2 days between the days played, today included. After a
 * return the Logbook's last day is today again, so the gap is read from the
 * days played before it. When the days played in the window show no such gap
 * but days have faded from it, the player began again after a gap that began
 * before the window, which is only known to be at least as long as from the
 * window's start to their first day back. Null only when there was no gap and
 * nothing has faded: a new player.
 */
export function awayFor(
  runs: readonly RunSummary[],
  today: Day,
  lastDay: Day | null,
  daysPlayedInAll: number,
): Away | null {
  if (lastDay === null) return null;
  const played = [...new Set(runs.map((run) => run.day))].sort();
  // Summaries older than the window may be all that is left of the last day.
  const seen = played.length === 0 ? [lastDay] : played;
  const sequence = seen.at(-1) === today ? seen : [...seen, today];
  for (let at = sequence.length - 1; at >= 1; at--) {
    const days = daysBetween(sequence[at - 1], sequence[at]);
    if (days >= MIN_AWAY_DAYS) return { days, atLeast: false };
  }
  if (daysPlayedInAll <= played.length) return null;
  const days = daysBetween(addDays(today, -WINDOW_DAYS), sequence[0]);
  return days >= MIN_AWAY_DAYS ? { days, atLeast: true } : null;
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
