import { cleanHitSteps, LIST_LENGTH, stepsToMs } from './keys';
import type { FlightLog } from './keystroke';
import type { RunSummary } from './runs';

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

/** A pair is ranked, and its time told, only once it was typed cleanly this often. */
export const MIN_PAIR_COUNT = 8;

/** The 10 most common pairs in English, most common first. */
export const COMMON_PAIRS = [
  'th',
  'he',
  'in',
  'er',
  'an',
  're',
  'on',
  'at',
  'en',
  'nd',
] as const;

/** A Letter pair and how long it takes the player. */
export interface PairTime {
  pair: string;
  /** How many times it was typed cleanly: what the time is made of. */
  count: number;
  ms: number;
}

/** A common English pair: the player's time on it, or null when it was typed too seldom to tell. */
export interface CommonPairTime {
  pair: string;
  count: number;
  ms: number | null;
}

/** What Analytics shows of the player's Letter pairs over the last 8 weeks. */
export interface LetterPairs {
  /**
   * The slowest pairs, slowest first, each typed cleanly at least 8 times and
   * slower than the average over every pair, so the list never reads as a
   * contradiction of `averageMs`.
   */
  slowest: PairTime[];
  /** How many pairs were typed cleanly at least 8 times (so a list with none slower is told from one with none to rank). */
  oftenTyped: number;
  /** The 10 most common English pairs, in their order. */
  common: CommonPairTime[];
  /** The mean time over every pair that has one, in ms, or null with none. */
  averageMs: number | null;
}

/** A pair with a Space in it is the start or end of a word, not a move between two keys. */
const hasSpace = (pair: string): boolean => pair.includes(' ');

/** The Run summaries' Letter pairs, added up. */
function totalPairs(runs: readonly RunSummary[]): Map<string, PairTally> {
  const total = new Map<string, PairTally>();
  for (const run of runs) {
    for (const [pair, tally] of Object.entries(run.pairs)) {
      const sum = total.get(pair) ?? { count: 0, steps: 0, misses: 0 };
      sum.count += tally.count;
      sum.steps += tally.steps;
      sum.misses += tally.misses;
      total.set(pair, sum);
    }
  }
  return total;
}

/**
 * The Letter pairs of the Run summaries given: the slowest, the common English
 * pairs and the average. A pair is timed by its Clean hits, so they are what
 * the 8-try floor counts. Pairs with a Space in them are left out of all three.
 */
export function letterPairs(
  runs: readonly RunSummary[],
  length = LIST_LENGTH,
): LetterPairs {
  const total = totalPairs(runs);
  const timed = [...total]
    .filter(([pair, { count }]) => count > 0 && !hasSpace(pair))
    .map(([pair, { count, steps }]) => ({
      pair,
      count,
      ms: stepsToMs(steps / count),
    }));
  const everyHit = timed.reduce((sum, { count }) => sum + count, 0);
  const everyStep = [...total]
    .filter(([pair]) => !hasSpace(pair))
    .reduce((sum, [, { steps }]) => sum + steps, 0);
  const averageMs = everyHit === 0 ? null : stepsToMs(everyStep / everyHit);
  const often = timed.filter(({ count }) => count >= MIN_PAIR_COUNT);
  return {
    slowest: often
      .filter(({ ms }) => averageMs !== null && ms > averageMs)
      .sort((a, b) => b.ms - a.ms || a.pair.localeCompare(b.pair))
      .slice(0, length),
    oftenTyped: often.length,
    common: COMMON_PAIRS.map((pair) => {
      const tally = total.get(pair);
      const count = tally?.count ?? 0;
      return {
        pair,
        count,
        ms:
          tally !== undefined && count >= MIN_PAIR_COUNT
            ? stepsToMs(tally.steps / count)
            : null,
      };
    }),
    averageMs,
  };
}
