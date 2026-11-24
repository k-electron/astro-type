import { addDays, type Day, daysBetween, WINDOW_DAYS } from './days';
import { cleanHitWpm } from './keys';
import { MIN_DAY_LETTER_HITS } from './lifetime';
import type { RunSummary } from './runs';
import { type ReachedSector, sectorOn } from './sectorBands';

/**
 * The Journey's timeline: one point for each of the 56 local days ending
 * today, worked out from the Run summaries. A day that wasn't played has no
 * number, never a zero, and a measure a played day has too little of to
 * measure has none either.
 */

/** One local day of the timeline. */
export interface TimelineDay {
  day: Day;
  /** At least one Run was cleared on it. */
  played: boolean;
  /**
   * A day the player didn't play after they began, and before today (today
   * isn't over, and days before their first aren't days away).
   */
  away: boolean;
  /** Letter speed in WPM, from Clean hits on letters only, and only with at least 50 of them. */
  letterWpm: number | null;
  /** The Runs' accuracy as the game stamped it, 0 to 100, weighted by characters. */
  accuracy: number | null;
  /** The Runs' Rhythm as the game stamped it, 0 to 100, weighted by characters. */
  rhythm: number | null;
  /**
   * The share of the day's shifted characters, First attempts, typed with the
   * Shift of the opposite hand, 0 to 100; null on a day with none.
   */
  oppositeShiftShare: number | null;
  /** The latest new Sector reached by this day, or null before the window's first Sector Run. */
  sector: ReachedSector | null;
}

const weightedMean = (
  parts: readonly { value: number; weight: number }[],
): number | null => {
  const weight = parts.reduce((sum, part) => sum + part.weight, 0);
  if (weight <= 0) return null;
  return (
    parts.reduce((sum, part) => sum + part.value * part.weight, 0) / weight
  );
};

/** The day's numbers from the Runs flown on it (none: a day not played). */
function measuresOf(runs: readonly RunSummary[]) {
  let letterHits = 0;
  let letterSteps = 0;
  let shifted = 0;
  let opposite = 0;
  for (const run of runs) {
    letterHits += run.letterCleanHits;
    letterSteps += run.letterCleanSteps;
    for (const tally of Object.values(run.keys)) {
      opposite += tally.shiftOpposite;
      shifted +=
        tally.shiftOpposite +
        tally.shiftSame +
        tally.shiftBoth +
        tally.shiftNone +
        tally.shiftUnknown;
    }
  }
  const weights = (pick: (run: RunSummary) => number) =>
    runs.map((run) => ({ value: pick(run), weight: run.characters }));
  return {
    letterWpm:
      letterHits >= MIN_DAY_LETTER_HITS
        ? cleanHitWpm(letterHits, letterSteps)
        : null,
    accuracy: weightedMean(weights((run) => run.accuracy)),
    rhythm: weightedMean(weights((run) => run.rhythm)),
    oppositeShiftShare: shifted > 0 ? (opposite * 100) / shifted : null,
  };
}

/**
 * The 56 days ending `today`, oldest first. `runs` are the summaries still
 * inside the window, `firstDay` is the first day the player ever played (kept
 * for good) and `reached` the Sectors in the order first reached.
 */
export function buildTimeline(
  runs: readonly RunSummary[],
  today: Day,
  firstDay: Day | null,
  reached: readonly ReachedSector[],
): TimelineDay[] {
  const byDay = new Map<Day, RunSummary[]>();
  for (const run of runs) {
    byDay.set(run.day, [...(byDay.get(run.day) ?? []), run]);
  }
  return Array.from({ length: WINDOW_DAYS }, (_, offset) => {
    const day = addDays(today, offset - (WINDOW_DAYS - 1));
    const flown = byDay.get(day) ?? [];
    const played = flown.length > 0;
    return {
      day,
      played,
      away:
        !played &&
        day !== today &&
        firstDay !== null &&
        daysBetween(firstDay, day) > 0,
      ...measuresOf(flown),
      sector: sectorOn(reached, day),
    };
  });
}
