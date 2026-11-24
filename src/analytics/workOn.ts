import type { FingerZone } from '../curriculum/keyboardLayout';
import { fingerOf, type KeyTally, slowestKeys, stepsToMs } from './keys';
import { SLOW_FROM } from './letters';

/**
 * The one thing to work on after a Run, as the plain sentence says it: the
 * key missed most, else the slowest key, else uneven Rhythm, else praise.
 * The report chooses and gives the facts; the screen words them.
 */
export type WorkOn =
  | {
      kind: 'missed key';
      character: string;
      misses: number;
      firstAttempts: number;
      finger: FingerZone | null;
    }
  | {
      kind: 'slow key';
      character: string;
      ms: number;
      averageMs: number;
      finger: FingerZone | null;
    }
  | { kind: 'uneven rhythm'; rhythm: number }
  | { kind: 'clean run' };

/** A Miss repeated on one key: two or more in the Run. */
export const REPEATED_MISSES = 2;

/** The Run's own Rhythm, as the game stamped it. */
export interface RhythmFacts {
  rhythm: number;
  /** The game's name for how even the Rhythm was. Analytics does not work it out. */
  rhythmBand: 'Steady' | 'Paced' | 'Uneven';
}

/**
 * Accuracy comes first. A key counts as missed with at least 2 Misses; the
 * most-missed wins, then the larger share of its First attempts, then the
 * character. The slowest key counts only when it is slow (from 120% of the
 * Run's average), so a quick, clean Run is not told to fix its quickest key.
 */
export function workOn(
  tallies: Record<string, KeyTally>,
  averageSteps: number | null,
  { rhythm, rhythmBand }: RhythmFacts,
): WorkOn {
  const missed = Object.entries(tallies)
    .filter(([, tally]) => tally.misses >= REPEATED_MISSES)
    .sort(
      ([a, x], [b, y]) =>
        y.misses - x.misses ||
        y.misses / y.firstAttempts - x.misses / x.firstAttempts ||
        a.localeCompare(b),
    )[0];
  if (missed) {
    const [character, tally] = missed;
    return {
      kind: 'missed key',
      character,
      misses: tally.misses,
      firstAttempts: tally.firstAttempts,
      finger: fingerOf(character),
    };
  }

  const slowest = slowestKeys(tallies, 1)[0];
  if (
    slowest &&
    averageSteps !== null &&
    slowest.ms >= stepsToMs(averageSteps) * SLOW_FROM
  ) {
    return {
      kind: 'slow key',
      character: slowest.character,
      ms: slowest.ms,
      averageMs: stepsToMs(averageSteps),
      finger: slowest.finger,
    };
  }

  if (rhythmBand === 'Uneven') return { kind: 'uneven rhythm', rhythm };
  return { kind: 'clean run' };
}
