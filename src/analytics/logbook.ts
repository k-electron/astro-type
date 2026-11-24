import { z } from 'zod';
import type { Day } from './days';
import type { FlightLog } from './keystroke';
import {
  type Lifetime,
  LifetimeSchema,
  foldLifetime,
  startingLetterWpm,
} from './lifetime';
import {
  type LogbookKeyTally,
  type RunNumbers,
  type RunSummary,
  isRecord,
  RunsSchema,
  recentRuns,
  sumKeys,
  summariseRun,
} from './runs';

/**
 * The player's Logbook: their typing, kept in the Profile. It records how the
 * player types, not their progress, so a revamp of the Stages and Sectors
 * leaves it as it is (ADR-0004). This part holds the summary of each cleared
 * Run of the last 56 days and the lifetime part kept for good.
 */
export const LogbookSchema = z.preprocess(
  (value) => (isRecord(value) ? value : {}),
  z.object({
    runs: RunsSchema,
    lifetime: LifetimeSchema,
  }),
);
export type Logbook = z.output<typeof LogbookSchema>;

/** What a Run knows beyond its Keystrokes. */
export type FoldFacts = RunNumbers;

/** The Logbook before any Run. */
export const EMPTY_LOGBOOK: Logbook = LogbookSchema.parse({});

/**
 * The Logbook after a cleared Run of `log`, flown on `today` (the day it was
 * cleared, in the player's own time). The Run's summary joins the others,
 * summaries older than 56 days are deleted, and the lifetime part takes the
 * Run in. An abandoned Run is never folded.
 */
export function foldRun(
  logbook: Logbook,
  log: FlightLog,
  facts: FoldFacts,
  today: Day,
): Logbook {
  const summary = summariseRun(log, facts, today);
  const kept = recentRuns(logbook.runs, today);
  const faded = logbook.runs.filter((run) => !kept.includes(run));
  const runs = [...kept, summary];
  return {
    runs,
    lifetime: foldLifetime(logbook.lifetime, summary, runs, faded, today),
  };
}

/** Everything Analytics draws of the Journey, worked out from the Logbook. */
export interface JourneyReport {
  /** The totals row: kept for good. */
  totals: {
    daysPlayed: number;
    practiceSteps: number;
    wordsTyped: number;
    bestDay: Lifetime['bestDay'];
  };
  /** Letter speed over the first 3 days played, or null before any letter was timed. */
  startingLetterWpm: number | null;
  /** How many different days were played in the last 56. */
  daysPlayedInWindow: number;
  /** Each key's tallies over the last 56 days, by character. */
  keys: Record<string, LogbookKeyTally>;
}

/** The Journey as of `today`: detail from the last 56 days, and the totals kept for good. */
export function journeyReport(logbook: Logbook, today: Day): JourneyReport {
  // Old summaries stay until the next fold, so a Save opened months later
  // still holds some: only the window is read.
  const runs: RunSummary[] = recentRuns(logbook.runs, today);
  const { lifetime } = logbook;
  return {
    totals: {
      daysPlayed: lifetime.daysPlayed,
      practiceSteps: lifetime.practiceSteps,
      wordsTyped: lifetime.wordsTyped,
      bestDay: lifetime.bestDay,
    },
    startingLetterWpm: startingLetterWpm(lifetime),
    daysPlayedInWindow: new Set(runs.map((run) => run.day)).size,
    keys: sumKeys(runs),
  };
}
