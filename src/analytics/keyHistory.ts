import { z } from 'zod';
import { type Day, isDay } from './days';
import { countedDays, dayTalliesByKeycap, readingOf } from './keyDays';
import { keycapTallies } from './keys';
import { countField, entriesOf, type RunSummary } from './runs';

/**
 * The Logbook's key part, kept for good, by keycap ("a" for both "a" and "A",
 * as on the keyboard): the day each key was first typed, how often it has
 * been typed, its tallies over the first 3 days it was typed on, and its best
 * smoothed speed and accuracy. The Runs that typed a key may have faded long
 * ago, so each is updated at the fold, from the Run that has just been
 * cleared and the summaries still held, and never from days about to be
 * deleted. Free Flights are in it like any cleared Run.
 */

/** A key's first days are its first 3 days typed. */
export const FIRST_DAYS = 3;

const dayField = z.string().refine(isDay);

/** The tally of the days a key was first typed on. */
const FirstDaysSchema = z
  .object({
    /** How many days are added in (up to 3). */
    days: countField,
    /** The latest of those days. */
    lastDay: dayField.nullable().catch(null),
    firstAttempts: countField,
    misses: countField,
    cleanHits: countField,
    cleanSteps: countField,
  })
  .catch({
    days: 0,
    lastDay: null,
    firstAttempts: 0,
    misses: 0,
    cleanHits: 0,
    cleanSteps: 0,
  });

const measure = z.number().min(0).nullable().catch(null);

/** The key's best smoothed speed (the lowest ms) and accuracy: each its own best, from days that may differ. */
const BestSchema = z
  .object({ ms: measure, accuracy: measure })
  .catch({ ms: null, accuracy: null });

export const KeyHistorySchema = entriesOf(
  z.object({
    firstDay: dayField,
    /** How many times the key has been typed (First attempts), ever. */
    typed: countField,
    firstDays: FirstDaysSchema,
    best: BestSchema,
  }),
);
export type KeyHistory = z.output<typeof KeyHistorySchema>;
type KeyEntry = KeyHistory[string];

const lower = (first: number | null, second: number): number =>
  first === null ? second : Math.min(first, second);
const higher = (first: number | null, second: number): number =>
  first === null ? second : Math.max(first, second);

/**
 * The key part after `summary` joined the Logbook on `today`. `runs` are the
 * summaries still in the Logbook, this one included. `fresh` are the keycaps
 * nobody had typed before this Run, in the order it typed them.
 */
export function foldKeyHistory(
  known: KeyHistory,
  summary: RunSummary,
  runs: readonly RunSummary[],
  today: Day,
): { keys: KeyHistory; fresh: string[] } {
  const keys: KeyHistory = { ...known };
  const fresh: string[] = [];
  const days = dayTalliesByKeycap(runs);
  for (const [keycap, tally] of Object.entries(keycapTallies(summary.keys))) {
    const before: KeyEntry | undefined = keys[keycap];
    if (before === undefined) fresh.push(keycap);
    const entry: KeyEntry = before ?? {
      firstDay: today,
      typed: 0,
      firstDays: FirstDaysSchema.parse(undefined),
      best: { ms: null, accuracy: null },
    };

    // A day counts once, and only when it is later than the last day counted,
    // so a clock moved back can't count a day twice. The first days are fixed
    // once the key has had 3.
    const { firstDays } = entry;
    const newDay = firstDays.lastDay === null || today > firstDays.lastDay;
    const counted = firstDays.days + (newDay ? 1 : 0);

    const smoothed = readingOf(countedDays(days.get(keycap) ?? [], today));
    keys[keycap] = {
      // A clock moved back: the earliest day is the first.
      firstDay: today < entry.firstDay ? today : entry.firstDay,
      typed: entry.typed + tally.firstAttempts,
      firstDays:
        counted > FIRST_DAYS
          ? firstDays
          : {
              days: counted,
              lastDay: newDay ? today : firstDays.lastDay,
              firstAttempts: firstDays.firstAttempts + tally.firstAttempts,
              misses: firstDays.misses + tally.misses,
              cleanHits: firstDays.cleanHits + tally.cleanHits,
              cleanSteps: firstDays.cleanSteps + tally.cleanSteps,
            },
      best: {
        ms:
          smoothed.ms === null
            ? entry.best.ms
            : lower(entry.best.ms, smoothed.ms),
        accuracy:
          smoothed.accuracy === null
            ? entry.best.accuracy
            : higher(entry.best.accuracy, smoothed.accuracy),
      },
    };
  }
  return { keys, fresh };
}
