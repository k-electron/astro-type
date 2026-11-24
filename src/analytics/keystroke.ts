/**
 * What the game records of one key the player presses in a Run: the
 * Keystroke, and the Flight log that holds a Run's Keystrokes in order. The
 * analytics module imports only the curriculum's key table (ADR-0004), so
 * nothing here knows a Stage, a Sector or the game's rules: the game builds
 * each Keystroke and this module keeps them.
 */

/**
 * Which Shift the player held for a Keystroke. `none` is no Shift at all (a
 * capital typed with Caps Lock is `none`); `unknown` is a Shift the game
 * didn't see go down, such as one held before the page had focus.
 */
export type ShiftSide = 'left' | 'right' | 'both' | 'none' | 'unknown';

/**
 * One key press the game judged. A hit or a Miss is whether `expected` equals
 * `pressed`, so it isn't stored. `streak`, `accuracy`, `rhythm` and `wpm` are
 * the Run's live numbers just after it, as the HUD shows them: `accuracy` is
 * exact and unrounded, and `wpm` is the HUD's own figure, which refreshes only
 * twice a second, so it is null until the first refresh after the second
 * character.
 */
export interface Keystroke {
  /** Which character of the text it was typed against. */
  index: number;
  expected: string;
  pressed: string;
  /** The first Keystroke on its character: later ones are tries after a Miss. */
  firstAttempt: boolean;
  /** The Run Time step it happened at. */
  step: number;
  shift: ShiftSide;
  streak: number;
  accuracy: number;
  rhythm: number;
  wpm: number | null;
}

/** A Run's Keystrokes, in the order they were pressed. */
export type FlightLog = readonly Keystroke[];

/** The Flight log with `keystroke` added at the end. */
export function recordKeystroke(
  log: FlightLog,
  keystroke: Keystroke,
): FlightLog {
  return [...log, keystroke];
}
