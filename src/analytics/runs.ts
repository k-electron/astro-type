import { z } from 'zod';
import { type Day, isDay, isInWindow } from './days';
import { keyTallies, letterCleanHits, type KeyTally } from './keys';
import type { FlightLog } from './keystroke';
import { mixUpTallies } from './mixUps';
import { pairTallies } from './pairs';
import { noShiftTally, type ShiftTally, shiftTallies } from './shift';

/**
 * The Logbook's Runs: a summary of each cleared Run of the last 56 days, and
 * the fields every slice of the Save is read with. The Save is read slice by
 * slice, so a damaged slice, or a damaged summary, loses only itself and the
 * parse never fails (the Save module would move the whole Save aside).
 */

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A whole number, at least 0; anything else reads as 0. */
export const countField = z.number().int().min(0).catch(0);

/** A number, at least 0; anything else reads as 0. */
export const measureField = z.number().min(0).catch(0);

/** The entries of a record that `entry` accepts; the others are dropped. */
export function entriesOf<T>(entry: z.ZodType<T>) {
  return z.preprocess(
    (value) => {
      if (!isRecord(value)) return {};
      const kept: Record<string, T> = {};
      for (const [name, item] of Object.entries(value)) {
        const parsed = entry.safeParse(item);
        if (parsed.success) kept[name] = parsed.data;
      }
      return kept;
    },
    z.record(z.string(), entry),
  );
}

/** The items of a list that `item` accepts; the others are dropped. */
export function itemsOf<T>(item: z.ZodType<T>) {
  return z.preprocess((value) => {
    if (!Array.isArray(value)) return [];
    return value.flatMap((candidate) => {
      const parsed = item.safeParse(candidate);
      return parsed.success ? [parsed.data] : [];
    });
  }, z.array(item));
}

/** What a Run says of one key: its tally and the Shift it was typed with. */
export type LogbookKeyTally = KeyTally & ShiftTally;

const LogbookKeyTallySchema = z.object({
  firstAttempts: countField,
  misses: countField,
  cleanHits: countField,
  cleanSteps: countField,
  shiftOpposite: countField,
  shiftSame: countField,
  shiftBoth: countField,
  shiftNone: countField,
  shiftUnknown: countField,
});

const PairTallySchema = z.object({
  count: countField,
  steps: countField,
  misses: countField,
});

/** Where a Run was flown: copies of its Sector's and Stage's ids and names as they were that day. */
const NameSchema = z.object({ id: z.string(), name: z.string() });
const WhereSchema = z.object({ sector: NameSchema, stage: NameSchema });
export type RunWhere = z.output<typeof WhereSchema>;

/**
 * One cleared Run, as the Logbook keeps it for 56 days. It is keyed by
 * characters, Letter pairs, dates and Runs: a Sector and a Stage appear only
 * as the copies the Run brought (`where`, null for a Free Flight), and nothing
 * here is looked up in the curriculum later.
 */
export const RunSummarySchema = z.object({
  day: z.string().refine(isDay),
  where: WhereSchema.nullable().catch(null),
  /** Run Time, in steps. */
  runSteps: countField,
  /** The characters of the text, all typed by the clear. */
  characters: countField,
  words: countField,
  firstAttempts: countField,
  misses: countField,
  /** Clean hits on letters, and the Run Time they took: the Journey's speed. */
  letterCleanHits: countField,
  letterCleanSteps: countField,
  wpm: measureField,
  accuracy: measureField,
  rhythm: measureField,
  keys: entriesOf(LogbookKeyTallySchema),
  mixUps: entriesOf(entriesOf(countField)),
  pairs: entriesOf(PairTallySchema),
});
export type RunSummary = z.output<typeof RunSummarySchema>;

/** The Logbook's Runs: damaged summaries are dropped, the rest kept. */
export const RunsSchema = itemsOf(RunSummarySchema);

/** What a Run knows beyond its Keystrokes, for its summary. */
export interface RunNumbers {
  /** Where it was flown, or null for a Free Flight (and, later, a generated practice Stage). */
  where: RunWhere | null;
  /** Run Time, in steps. */
  runSteps: number;
  wpm: number;
  accuracy: number;
  rhythm: number;
}

/** Words typed, as the Save has always counted them: the characters over 5, rounded. */
const wordsOf = (characters: number): number => Math.round(characters / 5);

/** Each key's tally in a Flight log, with the Shift it was typed with. */
function logbookKeys(log: FlightLog): Record<string, LogbookKeyTally> {
  const shifts = shiftTallies(log);
  return Object.fromEntries(
    Object.entries(keyTallies(log)).map(([character, tally]) => [
      character,
      { ...tally, ...(shifts[character] ?? noShiftTally()) },
    ]),
  );
}

/** The summary of a cleared Run, flown on `day`. */
export function summariseRun(
  log: FlightLog,
  numbers: RunNumbers,
  day: Day,
): RunSummary {
  const keys = logbookKeys(log);
  const tallies = Object.values(keys);
  const firstAttempts = tallies.reduce(
    (sum, tally) => sum + tally.firstAttempts,
    0,
  );
  const letters = letterCleanHits(log);
  const characters = new Set(log.map((keystroke) => keystroke.index)).size;
  return {
    day,
    where: numbers.where,
    runSteps: numbers.runSteps,
    characters,
    words: wordsOf(characters),
    firstAttempts,
    misses: tallies.reduce((sum, tally) => sum + tally.misses, 0),
    letterCleanHits: letters.hits,
    letterCleanSteps: letters.steps,
    wpm: numbers.wpm,
    accuracy: numbers.accuracy,
    rhythm: numbers.rhythm,
    keys,
    mixUps: mixUpTallies(log),
    pairs: pairTallies(log),
  };
}

/** The summaries that are still within the 56 days ending `today`. */
export function recentRuns(
  runs: readonly RunSummary[],
  today: Day,
): RunSummary[] {
  return runs.filter((run) => isInWindow(run.day, today));
}

/** The key tallies of the Logbook's Runs, added up by character. */
export function sumKeys(
  runs: readonly RunSummary[],
): Record<string, LogbookKeyTally> {
  const total: Record<string, LogbookKeyTally> = {};
  for (const run of runs) {
    for (const [character, tally] of Object.entries(run.keys)) {
      total[character] ??= {
        firstAttempts: 0,
        misses: 0,
        cleanHits: 0,
        cleanSteps: 0,
        ...noShiftTally(),
      };
      const sum = total[character];
      for (const field of Object.keys(sum) as (keyof LogbookKeyTally)[]) {
        sum[field] += tally[field];
      }
    }
  }
  return total;
}
