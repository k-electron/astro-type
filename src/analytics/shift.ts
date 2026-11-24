import type { FlightLog } from './keystroke';

/** The two Shift keycaps, as the curriculum's key table names them. */
export const SHIFT_KEYCAPS = ['ShiftLeft', 'ShiftRight'] as const;
export type ShiftKeycap = (typeof SHIFT_KEYCAPS)[number];

/**
 * How many characters the Run typed with each Shift held: the First attempts
 * on which that side was down (both sides count for both). A side the Run
 * never used is absent. A Shift the game didn't see go down (`unknown`) can't
 * be told apart, so it lights neither side.
 */
export function shiftUses(
  log: FlightLog,
): Partial<Record<ShiftKeycap, number>> {
  const uses: Partial<Record<ShiftKeycap, number>> = {};
  for (const { firstAttempt, shift } of log) {
    if (!firstAttempt) continue;
    if (shift === 'left' || shift === 'both') {
      uses.ShiftLeft = (uses.ShiftLeft ?? 0) + 1;
    }
    if (shift === 'right' || shift === 'both') {
      uses.ShiftRight = (uses.ShiftRight ?? 0) + 1;
    }
  }
  return uses;
}
