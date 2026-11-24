import { keyForCharacter } from '../curriculum/keyboardLayout';
import type { FlightLog } from './keystroke';
import type { LogbookKeyTally } from './runs';

/** The two Shift keycaps, as the curriculum's key table names them. */
export const SHIFT_KEYCAPS = ['ShiftLeft', 'ShiftRight'] as const;
export type ShiftKeycap = (typeof SHIFT_KEYCAPS)[number];

/**
 * How many keys the Run pressed with each Shift held, retries included: a
 * Shift held for a retry after a Miss was still used (both sides count for
 * both). A side the Run never used is absent. A Shift the game didn't see go down (`unknown`) can't
 * be told apart, so it lights neither side.
 */
export function shiftUses(
  log: FlightLog,
): Partial<Record<ShiftKeycap, number>> {
  const uses: Partial<Record<ShiftKeycap, number>> = {};
  for (const { shift } of log) {
    if (shift === 'left' || shift === 'both') {
      uses.ShiftLeft = (uses.ShiftLeft ?? 0) + 1;
    }
    if (shift === 'right' || shift === 'both') {
      uses.ShiftRight = (uses.ShiftRight ?? 0) + 1;
    }
  }
  return uses;
}

/**
 * How a character's First attempts were typed, by the Shift held: the Shift of
 * the opposite hand (the habit to build), the same hand's, both, none (Caps
 * Lock) or one the game never saw go down.
 */
export interface ShiftTally {
  shiftOpposite: number;
  shiftSame: number;
  shiftBoth: number;
  shiftNone: number;
  shiftUnknown: number;
}

export const noShiftTally = (): ShiftTally => ({
  shiftOpposite: 0,
  shiftSame: 0,
  shiftBoth: 0,
  shiftNone: 0,
  shiftUnknown: 0,
});

/**
 * The Shift tallies of a Flight log, by character: only characters that need
 * Shift, and only their First attempts, right or wrong. A shifted character
 * typed by a left-hand finger wants the right Shift, and the other way round.
 * A Shift held on a key that doesn't need one is not counted here: it is just
 * a Miss and a Mix-up.
 */
export function shiftTallies(log: FlightLog): Record<string, ShiftTally> {
  const tallies: Record<string, ShiftTally> = {};
  for (const { firstAttempt, expected, shift } of log) {
    const typed = keyForCharacter(expected);
    if (!firstAttempt || !typed?.shiftRequired) continue;
    tallies[expected] ??= noShiftTally();
    const tally = tallies[expected];
    if (shift === 'both') tally.shiftBoth += 1;
    else if (shift === 'none') tally.shiftNone += 1;
    else if (shift === 'unknown') tally.shiftUnknown += 1;
    else if (shift === typed.recommendedShiftHand) tally.shiftOpposite += 1;
    else tally.shiftSame += 1;
  }
  return tallies;
}

/**
 * How the player used Shift over the last 8 weeks: the First attempts on
 * shifted characters, counted by the Shift held, and each as a share of them
 * (0 to 100). Caps Lock is `shiftNone` and a Shift the game never saw go down
 * stays `shiftUnknown`: neither is guessed into another. With no shifted
 * character typed, the total and every share are 0.
 */
export interface ShiftHand {
  total: number;
  counts: ShiftTally;
  shares: ShiftTally;
}

/** The Shift hand of key tallies, as `journeyReport` sums them over the window. */
export function shiftHand(keys: Record<string, LogbookKeyTally>): ShiftHand {
  const counts = noShiftTally();
  for (const tally of Object.values(keys)) {
    for (const field of Object.keys(counts) as (keyof ShiftTally)[]) {
      counts[field] += tally[field];
    }
  }
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const shares = noShiftTally();
  for (const field of Object.keys(counts) as (keyof ShiftTally)[]) {
    shares[field] = total === 0 ? 0 : (counts[field] * 100) / total;
  }
  return { total, counts, shares };
}
