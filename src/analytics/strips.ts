import { STEPS_PER_SECOND } from './keys';
import type { FlightLog } from './keystroke';

/**
 * The series behind the Debrief's four strips, over Run Time: how fast the
 * player was going right then, how accurate over the last stretch, and the
 * Rhythm and Streak as the Run stamped them on each Keystroke. Analytics
 * judges nothing: the rolling numbers are plain counts over the Flight log,
 * and Rhythm and Streak are copied, so they are the HUD's own.
 */

/** Speed is measured over this many of the latest hits. */
export const ROLLING_HITS = 10;

/** Accuracy is measured over this many of the latest characters reached. */
export const ROLLING_LETTERS = 20;

/** The words in a character count, for WPM. */
const CHARACTERS_PER_WORD = 5;

/** One value of a strip, at a step of Run Time. */
export interface StripPoint {
  step: number;
  value: number;
}

/** One Keystroke's place on the axis, and the character it was typed against. */
export interface StripMoment {
  step: number;
  /** Which character of the text. */
  index: number;
  /** The key was right. */
  hit: boolean;
}

export interface RunStrips {
  /** The step of the Run's first Keystroke, where the axis starts, and of its last. */
  firstStep: number;
  lastStep: number;
  /**
   * WPM over the latest 10 hits, timed from the hit before them (so 10
   * characters over 10 gaps), at each hit from the 11th on. Misses are inside
   * the time, so a slip slows it.
   */
  speed: StripPoint[];
  /**
   * The share of the latest 20 characters reached that carry no Miss mark,
   * at each Keystroke from the one that reaches the 20th character. A
   * character is reached once it is typed or a wrong key is pressed on it,
   * and it carries one mark however many wrong keys it got, as in the game's
   * own Accuracy.
   */
  accuracy: StripPoint[];
  /** The Run's Rhythm after each Keystroke, as stamped. */
  rhythm: StripPoint[];
  /** The Run's Streak after each Keystroke, as stamped. */
  streak: StripPoint[];
  /** The steps of the Misses. */
  misses: number[];
  /** Every Keystroke, in order, to link a moment on the axis with a letter of the text. */
  moments: StripMoment[];
}

const isHit = (expected: string, pressed: string) => expected === pressed;

/** The Run's strips from its Flight log. */
export function runStrips(log: FlightLog): RunStrips {
  const first = log[0];
  const last = log[log.length - 1];
  const strips: RunStrips = {
    firstStep: first?.step ?? 0,
    lastStep: last?.step ?? 0,
    speed: [],
    accuracy: [],
    rhythm: [],
    streak: [],
    misses: [],
    moments: [],
  };
  const hitSteps: number[] = [];
  const marked = new Set<number>();
  for (const keystroke of log) {
    const hit = isHit(keystroke.expected, keystroke.pressed);
    const { step, index } = keystroke;
    strips.moments.push({ step, index, hit });
    strips.rhythm.push({ step, value: keystroke.rhythm });
    strips.streak.push({ step, value: keystroke.streak });
    if (hit) {
      hitSteps.push(step);
      const before = hitSteps[hitSteps.length - 1 - ROLLING_HITS];
      if (before !== undefined && step > before) {
        strips.speed.push({
          step,
          value:
            ROLLING_HITS /
            CHARACTERS_PER_WORD /
            ((step - before) / (STEPS_PER_SECOND * 60)),
        });
      }
    } else {
      marked.add(index);
      strips.misses.push(step);
    }
    const reached = index + 1;
    if (reached >= ROLLING_LETTERS) {
      let marks = 0;
      for (const at of marked) if (at >= reached - ROLLING_LETTERS) marks += 1;
      strips.accuracy.push({
        step,
        value: ((ROLLING_LETTERS - marks) * 100) / ROLLING_LETTERS,
      });
    }
  }
  return strips;
}

/** The Keystroke typed at `step`: the last one at or before it, or null before the first. */
export function momentAt(
  moments: readonly StripMoment[],
  step: number,
): StripMoment | null {
  let found: StripMoment | null = null;
  for (const moment of moments) {
    if (moment.step > step) break;
    found = moment;
  }
  return found;
}

/** The hit that typed a character of the text, or null when it was never hit. */
export function hitOn(
  moments: readonly StripMoment[],
  index: number,
): StripMoment | null {
  return moments.find((moment) => moment.hit && moment.index === index) ?? null;
}

/** A strip's value at `step`: its last point at or before it, or null before its first. */
export function valueAt(
  points: readonly StripPoint[],
  step: number,
): number | null {
  let found: number | null = null;
  for (const point of points) {
    if (point.step > step) break;
    found = point.value;
  }
  return found;
}
