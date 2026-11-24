import { z } from 'zod';
import { type Day, isDay } from './days';
import { cleanHitWpm } from './keys';
import { countField, itemsOf, measureField, type RunSummary } from './runs';

/**
 * The Logbook's Sector part, kept for good: one summary per Sector the player
 * has flown, in the order they first reached them. It is keyed by the id and
 * name the Runs copied, never looked up in the curriculum, so a renamed
 * Sector keeps its summary (under the newest name it was flown with) and a
 * Sector that is gone from the curriculum keeps its summary too. Free Flights
 * are in no Sector and never touch one. Each part is updated at the fold, from
 * the Run that has just been cleared, and never from days about to be deleted.
 */

/** A Sector's speed and accuracy are read over its first and its last 3 days played. */
export const SECTOR_READING_DAYS = 3;

/** The sparkline holds this many points at most. */
export const SPARKLINE_POINTS = 48;

const dayField = z.string().refine(isDay);

/** What the Runs of one day in a Sector add up to. */
const SectorDaySchema = z.object({
  day: dayField,
  letterCleanHits: countField,
  letterCleanSteps: countField,
  characters: countField,
  /** The Runs' accuracy times their characters, so a day's accuracy is the mean weighted by characters. */
  accuracyPoints: measureField,
});
type SectorDay = z.output<typeof SectorDaySchema>;

/** One point of the sparkline: a speed, and how many Runs it is the mean of. */
const SparkPointSchema = z.object({
  wpm: measureField,
  runs: z.number().int().min(1).catch(1),
});
type SparkPoint = z.output<typeof SparkPointSchema>;

const SectorTallySchema = z.object({
  id: z.string(),
  name: z.string(),
  firstDay: dayField,
  lastDay: dayField,
  days: countField,
  runs: countField,
  /** Run Time over the Sector's Runs, in steps. */
  runSteps: countField,
  /** The tallies of the first 3 days played in the Sector. */
  startDays: itemsOf(SectorDaySchema),
  /** The tallies of the last 3 days played in the Sector. */
  endDays: itemsOf(SectorDaySchema),
  /** The keycaps first typed while in the Sector, in the order typed. */
  keysBroughtIn: itemsOf(z.string()),
  sparkline: itemsOf(SparkPointSchema),
});
type SectorTally = z.output<typeof SectorTallySchema>;

/** The Logbook's Sectors, in the order first reached. A damaged one is dropped, the rest kept. */
export const SectorsSchema = itemsOf(SectorTallySchema);
export type Sectors = z.output<typeof SectorsSchema>;

/** Letter speed and accuracy over some days; null where there is nothing to measure. */
export interface SectorReading {
  letterWpm: number | null;
  accuracy: number | null;
}

/** One Sector as Analytics reads it. */
export interface SectorSummary {
  id: string;
  name: string;
  firstDay: Day;
  lastDay: Day;
  /** Days played in the Sector. */
  days: number;
  runs: number;
  runSteps: number;
  /** Over the Sector's first 3 days played. */
  start: SectorReading;
  /** Over its last 3 days played; the same as `start` while it has had no more than 3. */
  end: SectorReading;
  /** The keycaps first typed while in it. */
  keysBroughtIn: string[];
  /** Run speeds in WPM, oldest first, at most 48. */
  sparkline: number[];
}

function sectorReadingOf(days: readonly SectorDay[]): SectorReading {
  const sum = (pick: (day: SectorDay) => number) =>
    days.reduce((total, day) => total + pick(day), 0);
  const characters = sum((day) => day.characters);
  return {
    letterWpm: cleanHitWpm(
      sum((day) => day.letterCleanHits),
      sum((day) => day.letterCleanSteps),
    ),
    accuracy:
      characters > 0 ? sum((day) => day.accuracyPoints) / characters : null,
  };
}

/** The Sectors as Analytics reads them, in the order first reached. */
export function sectorSummaries(sectors: Sectors): SectorSummary[] {
  return sectors.map((sector) => ({
    id: sector.id,
    name: sector.name,
    firstDay: sector.firstDay,
    lastDay: sector.lastDay,
    days: sector.days,
    runs: sector.runs,
    runSteps: sector.runSteps,
    start: sectorReadingOf(sector.startDays),
    end: sectorReadingOf(sector.endDays),
    keysBroughtIn: sector.keysBroughtIn,
    sparkline: sector.sparkline.map((point) => point.wpm),
  }));
}

const tallyOf = (summary: RunSummary): SectorDay => ({
  day: summary.day,
  letterCleanHits: summary.letterCleanHits,
  letterCleanSteps: summary.letterCleanSteps,
  characters: summary.characters,
  accuracyPoints: summary.accuracy * summary.characters,
});

const addTally = (to: SectorDay, summary: RunSummary): SectorDay => ({
  ...to,
  letterCleanHits: to.letterCleanHits + summary.letterCleanHits,
  letterCleanSteps: to.letterCleanSteps + summary.letterCleanSteps,
  characters: to.characters + summary.characters,
  accuracyPoints: to.accuracyPoints + summary.accuracy * summary.characters,
});

/** The sparkline with one more Run; when it is full, the two lightest neighbours merge into their weighted mean. */
function sparklineWith(
  points: readonly SparkPoint[],
  wpm: number,
): SparkPoint[] {
  const next = [...points, { wpm, runs: 1 }];
  if (next.length <= SPARKLINE_POINTS) return next;
  let lightest = 0;
  for (let at = 1; at < next.length - 1; at++) {
    if (
      next[at].runs + next[at + 1].runs <
      next[lightest].runs + next[lightest + 1].runs
    ) {
      lightest = at;
    }
  }
  const [first, second] = [next[lightest], next[lightest + 1]];
  const runs = first.runs + second.runs;
  next.splice(lightest, 2, {
    wpm: (first.wpm * first.runs + second.wpm * second.runs) / runs,
    runs,
  });
  return next;
}

/**
 * The Sectors after a cleared Run. A Free Flight changes nothing; a Run in a
 * Sector starts its summary on the first Run there, or adds to it, and
 * `fresh` are the keycaps nobody had typed before this Run.
 */
export function foldSectors(
  sectors: Sectors,
  summary: RunSummary,
  fresh: readonly string[],
): Sectors {
  if (summary.where === null) return sectors;
  const { id, name } = summary.where.sector;
  const found = sectors.find((sector) => sector.id === id);
  const before: SectorTally = found ?? {
    id,
    name,
    firstDay: summary.day,
    lastDay: summary.day,
    days: 0,
    runs: 0,
    runSteps: 0,
    startDays: [],
    endDays: [],
    keysBroughtIn: [],
    sparkline: [],
  };

  // A day counts once, and only when it is later than the last day played in
  // the Sector, so a clock moved back can't count a day twice.
  const newDay = found === undefined || summary.day > before.lastDay;
  const days = before.days + (newDay ? 1 : 0);
  // The Run joins the Sector's current day, or starts a new one.
  const joinDay = (list: readonly SectorDay[], keep: number): SectorDay[] => {
    const current = list.at(-1);
    return newDay || current === undefined
      ? [...list, tallyOf(summary)].slice(-keep)
      : [...list.slice(0, -1), addTally(current, summary)];
  };
  const after: SectorTally = {
    ...before,
    // The newest name the Sector was flown with.
    name,
    lastDay: newDay ? summary.day : before.lastDay,
    days,
    runs: before.runs + 1,
    runSteps: before.runSteps + summary.runSteps,
    // The first days are fixed once the Sector has had 3.
    startDays:
      days <= SECTOR_READING_DAYS
        ? joinDay(before.startDays, SECTOR_READING_DAYS)
        : before.startDays,
    endDays: joinDay(before.endDays, SECTOR_READING_DAYS),
    keysBroughtIn: [...before.keysBroughtIn, ...fresh],
    sparkline: sparklineWith(before.sparkline, summary.wpm),
  };
  return found === undefined
    ? [...sectors, after]
    : sectors.map((sector) => (sector === found ? after : sector));
}
