/**
 * Small hand-built Flight logs, for a test of an exact threshold: each
 * Keystroke is readable in the test. For a realistic Run use the beginner
 * typist (`beginnerTypist.ts`). This imports from no test runner.
 */
import type { FlightLog, Keystroke } from '../../src/analytics/keystroke';

/**
 * A Flight log of `text` from presses of `[key, steps since the last key]`. A
 * right key moves on to the next character; a wrong one stays, and the next
 * key on that character is not a First attempt. The Run's own numbers are
 * not what this measures, so they are zero.
 */
export function logOf(text: string, presses: [string, number][]): FlightLog {
  const log: Keystroke[] = [];
  let index = 0;
  let firstAttempt = true;
  let step = 0;
  for (const [pressed, gap] of presses) {
    step += gap;
    log.push({
      index,
      expected: text[index],
      pressed,
      firstAttempt,
      step,
      shift: 'none',
      streak: 0,
      accuracy: 100,
      rhythm: 100,
      wpm: null,
    });
    if (pressed === text[index]) {
      index += 1;
      firstAttempt = true;
    } else {
      firstAttempt = false;
    }
  }
  return log;
}

/** Every character of `text` typed right, `gap` steps apart. */
export function evenly(text: string, gap: number): [string, number][] {
  return [...text].map((key) => [key, gap]);
}

/** The log with the Shift held for each Keystroke, in order (`none` after the list ends). */
export function withShift(
  log: FlightLog,
  sides: Keystroke['shift'][],
): FlightLog {
  return log.map((key, at) => ({ ...key, shift: sides[at] ?? 'none' }));
}
