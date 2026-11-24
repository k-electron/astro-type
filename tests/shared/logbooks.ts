/**
 * What the analytics tests share to build a Logbook by hand: the day they look
 * from, a Free Flight's numbers, small typed logs, and a Logbook folded from
 * Runs on chosen days. This imports from no test runner.
 */
import { addDays } from '../../src/analytics/days';
import {
  EMPTY_LOGBOOK,
  type FoldFacts,
  foldRun,
  type Logbook,
} from '../../src/analytics/logbook';
import { evenly, logOf } from './flightLog';
import { TEST_DAY } from './testHelpers';

/** The player's calendar day in an analytics test (the same day the game tests start on). */
export const TODAY = TEST_DAY;

/** The day `count` days before `TODAY`. */
export const daysAgo = (count: number): string => addDays(TODAY, -count);

/** The facts of a Free Flight Run: in no Sector, 20 WPM, 100% accurate, Rhythm 90. */
export const FREE_FLIGHT: FoldFacts = {
  where: null,
  runSteps: 600,
  wpm: 20,
  accuracy: 100,
  rhythm: 90,
};

export type Log = ReturnType<typeof logOf>;

/** `text` typed right, `gap` steps between keys. */
export const typed = (text: string, gap = 12): Log =>
  logOf(text, evenly(text, gap));

/** A log of `letters` letters of "a", `gap` steps apart: `letters - 1` timed hits. */
export const lettersAt = (letters: number, gap: number): Log =>
  typed('a'.repeat(letters), gap);

/** A Run flown in a Sector, by the id and name it copies, with its own numbers if given. */
export const inSector = (
  id: string,
  name = id,
  numbers: Partial<FoldFacts> = {},
): FoldFacts => ({
  ...FREE_FLIGHT,
  ...numbers,
  where: { sector: { id, name }, stage: { id: `${id}-1`, name: `${id} one` } },
});

/** The Logbook after each Free Flight Run in turn: the day it was flown and its log. */
export const flown = (runs: { day: string; log: Log }[]): Logbook =>
  runs.reduce(
    (logbook, { day, log }) => foldRun(logbook, log, FREE_FLIGHT, day),
    EMPTY_LOGBOOK,
  );
