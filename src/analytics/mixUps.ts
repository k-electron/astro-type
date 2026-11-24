import { keyForCharacter, nextDoor } from '../curriculum/keyboardLayout';
import { keycapOf, LIST_LENGTH } from './keys';
import type { FlightLog } from './keystroke';
import type { RunSummary } from './runs';

/** A key the player pressed in place of the one the text wanted, and how often. */
export interface MixUp {
  expected: string;
  pressed: string;
  count: number;
}

/**
 * Every Mix-up of the Run as counts, for the Logbook: for each character the
 * text wanted, the wrong keys pressed on its First attempt and how often.
 */
export function mixUpTallies(
  log: FlightLog,
): Record<string, Record<string, number>> {
  const tallies: Record<string, Record<string, number>> = {};
  for (const { firstAttempt, expected, pressed } of log) {
    if (!firstAttempt || expected === pressed) continue;
    tallies[expected] ??= {};
    tallies[expected][pressed] = (tallies[expected][pressed] ?? 0) + 1;
  }
  return tallies;
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

/**
 * Why a Mix-up probably happened, from the key table:
 * - `shift`: the right key, but with or without Shift when the other was wanted;
 * - `next door`: the key beside it, or above or below it;
 * - `same finger`: another key of the finger that types the wanted one;
 * - `other hand`: a key the other hand types;
 * - `same hand`: another finger of the same hand, not beside it.
 */
export type MixUpCause =
  | 'shift'
  | 'next door'
  | 'same finger'
  | 'other hand'
  | 'same hand';

/**
 * The likely cause of `pressed` typed for `expected`, the first that fits in
 * the order above (f typed as g is next door, though it is the same finger
 * too). Null when the keyboard doesn't type one of them, and for Space against
 * a key it isn't next to: the thumb is neither a hand nor a finger to compare.
 */
export function mixUpCause(
  expected: string,
  pressed: string,
): MixUpCause | null {
  const wanted = keyForCharacter(expected);
  const typed = keyForCharacter(pressed);
  if (wanted === undefined || typed === undefined) return null;
  if (wanted.keycap.key === typed.keycap.key) return 'shift';
  if (nextDoor(wanted.keycap.key, typed.keycap.key)) return 'next door';
  if (wanted.finger === typed.finger) return 'same finger';
  if (wanted.hand === 'thumb' || typed.hand === 'thumb') return null;
  return wanted.hand === typed.hand ? 'same hand' : 'other hand';
}

/** How many Mix-ups Analytics lists. */
export const JOURNEY_MIX_UPS = 8;

/** A Mix-up of the last 8 weeks, with its likely cause. */
export interface JourneyMixUp extends MixUp {
  cause: MixUpCause | null;
  /** The keycap of each key, when the keyboard types it: what a click opens the story of. */
  expectedKeycap: string | null;
  pressedKeycap: string | null;
}

/**
 * The most common Mix-ups of the Run summaries given, most often first, each
 * with its likely cause. A tie goes to the wanted key, then the pressed key,
 * in alphabetical order.
 */
export function journeyMixUps(
  runs: readonly RunSummary[],
  length = JOURNEY_MIX_UPS,
): JourneyMixUp[] {
  const counts = new Map<string, MixUp>();
  for (const run of runs) {
    for (const [expected, wrong] of Object.entries(run.mixUps)) {
      for (const [pressed, count] of Object.entries(wrong)) {
        const id = JSON.stringify([expected, pressed]);
        const mixUp = counts.get(id) ?? { expected, pressed, count: 0 };
        mixUp.count += count;
        counts.set(id, mixUp);
      }
    }
  }
  const typedOn = (character: string) =>
    keyForCharacter(character) === undefined ? null : keycapOf(character);
  return [...counts.values()]
    .sort(
      (a, b) =>
        b.count - a.count ||
        a.expected.localeCompare(b.expected) ||
        a.pressed.localeCompare(b.pressed),
    )
    .slice(0, length)
    .map((mixUp) => ({
      ...mixUp,
      cause: mixUpCause(mixUp.expected, mixUp.pressed),
      expectedKeycap: typedOn(mixUp.expected),
      pressedKeycap: typedOn(mixUp.pressed),
    }));
}
