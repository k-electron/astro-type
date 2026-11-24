import { cleanHitSteps } from './keys';
import type { FlightLog } from './keystroke';

/**
 * What a Run says of one Letter pair: two characters next to each other in
 * the text, written as the two characters ("th"). `count` is how many times
 * the pair was typed as a Clean hit, which is what times it, and `steps` the
 * Run Time those took together, so `steps / count` is its mean time. `misses`
 * counts the First attempts on the pair's second character that were wrong.
 */
export interface PairTally {
  count: number;
  steps: number;
  misses: number;
}

/** The Letter pairs of a Flight log, by pair. A pair the Run never typed has no entry. */
export function pairTallies(log: FlightLog): Record<string, PairTally> {
  const tallies: Record<string, PairTally> = {};
  const textOf = new Map<number, string>();
  for (const { index, expected } of log) textOf.set(index, expected);
  const steps = cleanHitSteps(log);
  const tallyOf = (pair: string): PairTally => {
    tallies[pair] ??= { count: 0, steps: 0, misses: 0 };
    return tallies[pair];
  };
  log.forEach((keystroke, position) => {
    const before = textOf.get(keystroke.index - 1);
    if (before === undefined) return;
    const pair = before + keystroke.expected;
    const took = steps[position];
    if (took !== null) {
      const tally = tallyOf(pair);
      tally.count += 1;
      tally.steps += took;
    }
    if (keystroke.firstAttempt && keystroke.pressed !== keystroke.expected) {
      tallyOf(pair).misses += 1;
    }
  });
  return tallies;
}
