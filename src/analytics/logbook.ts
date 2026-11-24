import { z } from 'zod';
import type { Day } from './days';
import {
  awayFor,
  type JourneySentence,
  MIN_DAYS_FOR_PICTURE,
  nowLetterWpm,
} from './journeySentence';
import { type KeyboardOnDay, keyboardDays } from './keyboardDays';
import { foldKeyHistory, KeyHistorySchema } from './keyHistory';
import { type KeyStory, keyStories, mostTypedKey } from './keyStory';
import { keycapOf, type TrickiestKey, trickiestKey } from './keys';
import type { FlightLog } from './keystroke';
import {
  type Lifetime,
  LifetimeSchema,
  foldLifetime,
  startingLetterWpm,
} from './lifetime';
import { type JourneyMixUp, journeyMixUps } from './mixUps';
import { type LetterPairs, letterPairs } from './pairs';
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
import {
  foldSectors,
  type SectorSummary,
  SectorsSchema,
  sectorSummaries,
} from './sectors';
import { type ShiftHand, shiftHand } from './shift';
import { buildTimeline, type TimelineDay } from './timeline';

/**
 * The player's Logbook: their typing, kept in the Profile. It records how the
 * player types, not their progress, so a revamp of the Stages and Sectors
 * leaves it as it is (ADR-0004). It holds the summary of each cleared Run of
 * the last 56 days, and the parts kept for good: the lifetime totals, the day
 * each key was first typed and a summary of each Sector.
 */
export const LogbookSchema = z.preprocess(
  (value) => (isRecord(value) ? value : {}),
  z.object({
    runs: RunsSchema,
    lifetime: LifetimeSchema,
    keys: KeyHistorySchema,
    sectors: SectorsSchema,
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
  const { keys, fresh } = foldKeyHistory(logbook.keys, summary, runs, today);
  return {
    runs,
    lifetime: foldLifetime(logbook.lifetime, summary, runs, faded, today),
    keys,
    sectors: foldSectors(logbook.sectors, summary, fresh),
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
  /** Fewer than 3 days were played in the last 56: "how you type now" is rebuilding. */
  rebuilding: boolean;
  /** What the plain sentence on top says: its case and its facts. */
  sentence: JourneySentence;
  /** The last 56 days, oldest first, one point each. */
  timeline: TimelineDay[];
  /** The keyboard as it was on each of those days: the one under the timeline's cursor. */
  keyboards: Record<Day, KeyboardOnDay>;
  /** Every typed key's story, by keycap: its first days, trend and Mix-ups. */
  keyStories: Record<string, KeyStory>;
  /** The keycap whose story opens first: the trickiest key, else the most typed one, or null before any key was typed. */
  startKey: string | null;
  /** Every Sector flown, kept for good, in the order first reached. */
  sectors: SectorSummary[];
  /** The most common Mix-ups of the last 56 days, each with its likely cause. */
  mixUps: JourneyMixUp[];
  /** How the last 56 days' shifted characters were typed, by the Shift held. */
  shiftHand: ShiftHand;
  /** The slowest Letter pairs of the last 56 days, and the common English pairs. */
  pairs: LetterPairs;
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
  // The Sectors are kept for good, so a Sector reached before the window
  // still has its band.
  const sectors = sectorSummaries(logbook.sectors);
  const timeline = buildTimeline(runs, today, lifetime.firstDay, sectors);
  const stories = keyStories(runs, logbook.keys, today);
  const trickiest = rebuilding ? null : trickiestNow(keys, stories);
  const keyboards = keyboardDays(
    runs,
    logbook.keys,
    timeline.map(({ day }) => day),
  );
  return {
    totals: {
      daysPlayed: lifetime.daysPlayed,
      practiceSteps: lifetime.practiceSteps,
      wordsTyped: lifetime.wordsTyped,
      bestDay: lifetime.bestDay,
    },
    startingLetterWpm: startingLetterWpm(lifetime),
    rebuilding,
    sentence: sentenceOf(logbook, runs, trickiest, sectors, rebuilding, today),
    timeline,
    keyboards: Object.fromEntries(
      timeline.map(({ day }, at) => [day, keyboards[at]]),
    ),
    keyStories: stories,
    startKey: trickiest?.character ?? mostTypedKey(stories),
    sectors,
    mixUps: journeyMixUps(runs),
    shiftHand: shiftHand(keys),
    pairs: letterPairs(runs),
  };
}

/**
 * The trickiest key now: of the keys with a "now" reading (typed at least 10
 * times on a day lately), so one short Free Flight can't make a key of 5 tries
 * the trickiest. When no key has one, the trickiest of them all, as before.
 */
function trickiestNow(
  keys: Record<string, LogbookKeyTally>,
  stories: Record<string, KeyStory>,
): TrickiestKey | null {
  const known = Object.fromEntries(
    Object.entries(keys).filter(
      ([character]) => stories[keycapOf(character)]?.now != null,
    ),
  );
  return trickiestKey(known) ?? trickiestKey(keys);
}

function sentenceOf(
  { lifetime }: Logbook,
  runs: readonly RunSummary[],
  trickiest: TrickiestKey | null,
  sectors: readonly SectorSummary[],
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
    trickiestKey: trickiest,
  };
}
