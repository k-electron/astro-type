import type { FlightLog } from './keystroke';

/** How often a key's character was typed right or wrong on its First attempt. */
export interface KeyCount {
  hits: number;
  misses: number;
}

/**
 * Each key's hits and misses in a Flight log, by the character the text
 * wanted. They count characters, as accuracy does: a character is one hit if
 * its key was right on the First attempt, and one miss if it carries a Miss
 * mark, however many wrong keys it got. Keys the text never wanted have no
 * entry.
 */
export function keyCounts(log: FlightLog): Record<string, KeyCount> {
  const counts: Record<string, KeyCount> = {};
  for (const keystroke of log) {
    if (!keystroke.firstAttempt) continue;
    const count = counts[keystroke.expected] ?? { hits: 0, misses: 0 };
    counts[keystroke.expected] =
      keystroke.pressed === keystroke.expected
        ? { ...count, hits: count.hits + 1 }
        : { ...count, misses: count.misses + 1 };
  }
  return counts;
}
