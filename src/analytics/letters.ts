import { cleanHitSteps, stepsToMs } from './keys';
import type { FlightLog } from './keystroke';

/**
 * How long a letter took against the Run's average Clean-hit time: quick
 * under 80% of it, slow from 120% and very slow from 160%.
 */
export type Pace = 'quick' | 'steady' | 'slow' | 'very slow';

export const QUICK_BELOW = 0.8;
export const SLOW_FROM = 1.2;
export const VERY_SLOW_FROM = 1.6;

/** The pace of a time against the Run's average time (both in the same unit). */
export function paceOf(time: number, average: number): Pace {
  const ratio = time / average;
  if (ratio >= VERY_SLOW_FROM) return 'very slow';
  if (ratio >= SLOW_FROM) return 'slow';
  if (ratio < QUICK_BELOW) return 'quick';
  return 'steady';
}

/** One character of the Run's text, and how it went. */
export interface LetterReport {
  /** Its place in the text. */
  index: number;
  character: string;
  /** What the first Keystroke on it took, when that timed it (a Clean hit), in ms. */
  ms: number | null;
  /** How that time compares with the Run's average, or null when it has no time. */
  pace: Pace | null;
  /** A wrong key was pressed on it. */
  missed: boolean;
  /** The wrong keys pressed on it, in order. */
  wrongKeys: string[];
}

/**
 * The Run's text, character by character in order, as far as the Flight log
 * reached. `averageSteps` is the Run's average Clean-hit time in steps.
 */
export function letters(
  log: FlightLog,
  averageSteps: number | null,
): LetterReport[] {
  const steps = cleanHitSteps(log);
  const byIndex = new Map<number, LetterReport>();
  log.forEach((keystroke, position) => {
    const letter = byIndex.get(keystroke.index) ?? {
      index: keystroke.index,
      character: keystroke.expected,
      ms: null,
      pace: null,
      missed: false,
      wrongKeys: [],
    };
    byIndex.set(keystroke.index, letter);
    if (keystroke.pressed !== keystroke.expected) {
      letter.missed = true;
      letter.wrongKeys.push(keystroke.pressed);
    }
    const took = steps[position];
    if (took !== null && averageSteps !== null) {
      letter.ms = stepsToMs(took);
      letter.pace = paceOf(took, averageSteps);
    }
  });
  return [...byIndex.values()].sort((a, b) => a.index - b.index);
}
