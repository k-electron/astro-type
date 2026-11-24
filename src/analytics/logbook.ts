import { z } from 'zod';
import type { Day } from './days';
import {
  awayFor,
  type JourneySentence,
  MIN_DAYS_FOR_PICTURE,
  nowLetterWpm,
} from './journeySentence';
import { trickiestKey } from './keys';
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
import { type ReachedSector, sectorsReached } from './sectorBands';
import { buildTimeline, type TimelineDay } from './timeline';

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
  /** Fewer than 3 days were played in the last 56: "how you type now" is rebuilding. */
  rebuilding: boolean;
  /** What the plain sentence on top says: its case and its facts. */
  sentence: JourneySentence;
  /** The last 56 days, oldest first, one point each. */
  timeline: TimelineDay[];
  /** The Sectors reached in the last 56 days, in the order first reached. */
  sectors: ReachedSector[];
}

/** The Journey as of `today`: detail from the last 56 days, and the totals kept for good. */
export function journeyReport(logbook: Logbook, today: Day): JourneyReport {
  // Old summaries stay until the next fold, so a Save opened months later
  // still holds some: only the window is read.
  const runs: RunSummary[] = recentRuns(logbook.runs, today);
  const { lifetime } = logbook;
  const keys = sumKeys(runs);
  const daysPlayedInWindow = new Set(runs.map((run) => run.day)).size;
  const rebuilding = daysPlayedInWindow < MIN_DAYS_FOR_PICTURE;
  // The Sectors come from the Runs' copies, so only those flown in the last
  // 56 days are known: a Sector reached earlier shows from its first Run in
  // the window.
  const sectors = sectorsReached(runs);
  return {
    totals: {
      daysPlayed: lifetime.daysPlayed,
      practiceSteps: lifetime.practiceSteps,
      wordsTyped: lifetime.wordsTyped,
      bestDay: lifetime.bestDay,
    },
    startingLetterWpm: startingLetterWpm(lifetime),
    daysPlayedInWindow,
    keys,
    rebuilding,
    sentence: sentenceOf(logbook, runs, keys, sectors, rebuilding, today),
    timeline: buildTimeline(runs, today, lifetime.firstDay, sectors),
    sectors,
  };
}

function sentenceOf(
  { lifetime }: Logbook,
  runs: readonly RunSummary[],
  keys: Record<string, LogbookKeyTally>,
  sectors: readonly ReachedSector[],
  rebuilding: boolean,
  today: Day,
): JourneySentence {
  if (lifetime.runs === 0) return { kind: 'empty' };
  if (rebuilding) {
    return {
      kind: 'rebuilding',
      away: awayFor(runs, today, lifetime.lastDay, lifetime.daysPlayed),
    };
  }
  return {
    kind: 'journey',
    daysPlayed: lifetime.daysPlayed,
    startingLetterWpm: startingLetterWpm(lifetime),
    nowLetterWpm: nowLetterWpm(runs),
    furthestSector: sectors.at(-1)?.name ?? null,
    trickiestKey: trickiestKey(keys),
  };
}
