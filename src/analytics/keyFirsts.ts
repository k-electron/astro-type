import { z } from 'zod';
import { type Day, isDay } from './days';
import { entriesOf } from './runs';

/**
 * The Logbook's key part, kept for good: the day each key was first typed, by
 * keycap ("a" for both "a" and "A", as on the keyboard). It is what tells a
 * Sector which keys were new to it, since the Runs that typed a key may have
 * faded long ago. Free Flights are in it like any cleared Run.
 */
export const KeyFirstsSchema = entriesOf(
  z.object({ firstDay: z.string().refine(isDay) }),
);
export type KeyFirsts = z.output<typeof KeyFirstsSchema>;

/**
 * The key part after a Run that typed `keycaps` (in the order it typed them)
 * on `today`, and which of them nobody had typed before.
 */
export function foldKeyFirsts(
  known: KeyFirsts,
  keycaps: readonly string[],
  today: Day,
): { keys: KeyFirsts; fresh: string[] } {
  const keys: KeyFirsts = { ...known };
  const fresh: string[] = [];
  for (const keycap of keycaps) {
    const first = keys[keycap];
    if (first === undefined) {
      fresh.push(keycap);
      keys[keycap] = { firstDay: today };
    } else if (today < first.firstDay) {
      // A clock moved back: the earliest day is the first.
      keys[keycap] = { firstDay: today };
    }
  }
  return { keys, fresh };
}
