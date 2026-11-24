import { z } from 'zod';
import { type Day, isDay } from './days';
import { cleanHitWpm } from './keys';
import { countField, isRecord, type RunSummary } from './runs';

/**
 * The Logbook's lifetime part, kept for good: the totals of every cleared Run
 * ever, the best day and the starting speed. Each is updated at the fold, from
 * the summaries then in the Logbook, and never from days that have faded.
 */

/** A day needs this many Clean hits on letters to count for the best day. */
export const MIN_DAY_LETTER_HITS = 50;

/** The starting speed is the letter speed over the first 3 days played. */
export const STARTING_DAYS = 3;

const dayField = z.string().refine(isDay).nullable().catch(null);

const bestDayField = z
  .object({
    day: z.string().refine(isDay),
    letterWpm: z.number().min(0).catch(0),
  })
  .nullable()
  .catch(null);

export const LifetimeSchema = z.preprocess(
  (value) => (isRecord(value) ? value : {}),
  z.object({
    firstDay: dayField,
    lastDay: dayField,
    daysPlayed: countField,
    runs: countField,
    /** Run Time over every cleared Run, in steps. */
    practiceSteps: countField,
    wordsTyped: countField,
    /** The day of the fastest letter typing, and its speed. */
    bestDay: bestDayField,
    /** The best day among the days whose Run summaries have been deleted, kept so the best day can't be lost. */
    fadedBestDay: bestDayField,
    /** The letter Clean hits, and the Run Time they took, over the first 3 days played. */
    startingLetterCleanHits: countField,
    startingLetterCleanSteps: countField,
  }),
);
export type Lifetime = z.output<typeof LifetimeSchema>;

/** The best day of the Runs given: the day with the fastest letter speed among those with enough letters. */
function bestDayOf(
  runs: readonly RunSummary[],
): { day: Day; letterWpm: number } | null {
  const days = new Map<Day, { hits: number; steps: number }>();
  for (const run of runs) {
    const total = days.get(run.day) ?? { hits: 0, steps: 0 };
    total.hits += run.letterCleanHits;
    total.steps += run.letterCleanSteps;
    days.set(run.day, total);
  }
  let best: { day: Day; letterWpm: number } | null = null;
  for (const day of [...days.keys()].sort()) {
    const total = days.get(day);
    if (!total || total.hits < MIN_DAY_LETTER_HITS) continue;
    const letterWpm = cleanHitWpm(total.hits, total.steps);
    if (letterWpm !== null && (best === null || letterWpm > best.letterWpm)) {
      best = { day, letterWpm };
    }
  }
  return best;
}

/** The better of two best days: the faster, and the earlier on a tie. */
function better(
  first: { day: Day; letterWpm: number } | null,
  second: { day: Day; letterWpm: number } | null,
): { day: Day; letterWpm: number } | null {
  if (first === null || second === null) return first ?? second;
  return second.letterWpm > first.letterWpm ? second : first;
}

/**
 * The lifetime part after `summary` joined the Logbook on `today`. `recent`
 * are the summaries still in the Logbook, this one included, and `faded` the
 * ones this fold deletes. A day counts once, and only when it is later than
 * the last day played, so a clock moved back can't count a day twice.
 */
export function foldLifetime(
  lifetime: Lifetime,
  summary: RunSummary,
  recent: readonly RunSummary[],
  faded: readonly RunSummary[],
  today: Day,
): Lifetime {
  const newDay = lifetime.lastDay === null || today > lifetime.lastDay;
  const daysPlayed = lifetime.daysPlayed + (newDay ? 1 : 0);
  const starting = daysPlayed <= STARTING_DAYS;

  // A day's speed moves with each Run flown on it, so the days still held are
  // worked out afresh; a day is final once it fades, and only then is its
  // speed kept for good.
  const fadedBestDay = better(lifetime.fadedBestDay, bestDayOf(faded));
  const bestDay = better(fadedBestDay, bestDayOf(recent));

  return {
    firstDay:
      lifetime.firstDay === null || today < lifetime.firstDay
        ? today
        : lifetime.firstDay,
    lastDay: newDay ? today : lifetime.lastDay,
    daysPlayed,
    runs: lifetime.runs + 1,
    practiceSteps: lifetime.practiceSteps + summary.runSteps,
    wordsTyped: lifetime.wordsTyped + summary.words,
    bestDay,
    fadedBestDay,
    startingLetterCleanHits:
      lifetime.startingLetterCleanHits +
      (starting ? summary.letterCleanHits : 0),
    startingLetterCleanSteps:
      lifetime.startingLetterCleanSteps +
      (starting ? summary.letterCleanSteps : 0),
  };
}

/** The letter speed of the first 3 days played, or null before any letter was timed. */
export function startingLetterWpm(lifetime: Lifetime): number | null {
  return cleanHitWpm(
    lifetime.startingLetterCleanHits,
    lifetime.startingLetterCleanSteps,
  );
}
