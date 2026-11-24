import { LIST_LENGTH } from './keys';
import type { FlightLog } from './keystroke';

/** A key the player pressed in place of the one the text wanted, and how often. */
export interface MixUp {
  expected: string;
  pressed: string;
  count: number;
}

/**
 * The Run's Mix-ups, most frequent first, a tie going to the one that came
 * first in the Run. Only First attempts count: a player flailing on one
 * character after the first slip adds nothing.
 */
export function mixUps(log: FlightLog, length = LIST_LENGTH): MixUp[] {
  const counts = new Map<string, MixUp>();
  for (const { firstAttempt, expected, pressed } of log) {
    if (!firstAttempt || expected === pressed) continue;
    const id = JSON.stringify([expected, pressed]);
    const mixUp = counts.get(id) ?? { expected, pressed, count: 0 };
    mixUp.count += 1;
    counts.set(id, mixUp);
  }
  // The map keeps first-seen order and the sort is stable, so ties stay in it.
  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, length);
}
