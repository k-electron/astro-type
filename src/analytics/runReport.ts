import {
  averageCleanSteps,
  type InaccurateKey,
  type KeyTally,
  keyTallies,
  leastAccurateKeys,
  type SlowKey,
  slowestKeys,
  stepsToMs,
} from './keys';
import type { FlightLog } from './keystroke';
import { type LetterReport, letters } from './letters';
import { type MixUp, mixUps } from './mixUps';
import { type ShiftKeycap, shiftUses } from './shift';
import { type RunStrips, runStrips } from './strips';
import { type RhythmFacts, type WorkOn, workOn } from './workOn';

/** What a Run knows beyond its Keystrokes. */
export type RunFacts = RhythmFacts;

/** Everything the Debrief draws of a Run, worked out once at the clear. */
export interface RunReport {
  /** Each key's tally, by character. */
  keys: Record<string, KeyTally>;
  /** The Run's average Clean-hit time in ms, or null when no key was timed. */
  averageMs: number | null;
  /** The Run's text, each character with its time and its Misses. */
  letters: LetterReport[];
  slowestKeys: SlowKey[];
  leastAccurateKeys: InaccurateKey[];
  mixUps: MixUp[];
  /** How many keys were pressed with each Shift held; a side never held is absent. */
  shiftUses: Partial<Record<ShiftKeycap, number>>;
  /** The one thing the plain sentence says to work on. */
  workOn: WorkOn;
  /** The series the four strips draw over Run Time. */
  strips: RunStrips;
}

/** The report on a Flight log, with the numbers the Run itself stamped. */
export function runReport(log: FlightLog, facts: RunFacts): RunReport {
  const keys = keyTallies(log);
  const averageSteps = averageCleanSteps(keys);
  return {
    keys,
    averageMs: averageSteps === null ? null : stepsToMs(averageSteps),
    letters: letters(log, averageSteps),
    slowestKeys: slowestKeys(keys),
    leastAccurateKeys: leastAccurateKeys(keys),
    mixUps: mixUps(log),
    shiftUses: shiftUses(log),
    workOn: workOn(keys, averageSteps, facts),
    strips: runStrips(log),
  };
}
