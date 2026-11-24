import { keyForCharacter } from '../curriculum/keyboardLayout';
import type { FingerZone } from '../curriculum/keyboardLayout';
import type { FlightLog, Keystroke } from './keystroke';

/**
 * The key measures of a Flight log: how often each key was typed right or
 * wrong, how long it took when the player knew it, and which keys rank as
 * slowest and least accurate. A key here is a character of the text, as the
 * Save has always counted them: a capital and its lower case are two.
 */

/** Steps of Run Time in a second. Restated here: analytics imports nothing from the game. */
export const STEPS_PER_SECOND = 60;

/** Run Time steps as milliseconds. */
export function stepsToMs(steps: number): number {
  return (steps * 1000) / STEPS_PER_SECOND;
}

/** The longest gap that still times a key: 5 s. A longer one is a pause, not typing. */
export const LONGEST_GAP_STEPS = 5 * STEPS_PER_SECOND;

/** A key is ranked slow only once it has been typed cleanly this often. */
export const MIN_CLEAN_HITS = 3;

/** A key is ranked inaccurate only with this many First attempts, a Miss among them. */
export const MIN_FIRST_ATTEMPTS = 3;

/** How many keys a ranking lists. */
export const LIST_LENGTH = 5;

/** What a Run's Flight log says of one key. */
export interface KeyTally {
  /** The key's characters that were typed, counting only the first Keystroke on each. */
  firstAttempts: number;
  /** How many of those First attempts were wrong. */
  misses: number;
  /** How many times the key was typed as a Clean hit, which is what times it. */
  cleanHits: number;
  /** The Run Time steps those Clean hits took, added up. */
  cleanSteps: number;
}

const isHit = (keystroke: Keystroke) =>
  keystroke.expected === keystroke.pressed;

/**
 * The time a Keystroke took, in steps, when it was a Clean hit: a First
 * attempt that hit, straight after a First-attempt hit on the character
 * before, its time the gap since that Keystroke. Null for any other
 * Keystroke, for the Run's first, and for a gap of 0 steps or over 5 s.
 */
export function cleanHitSteps(log: FlightLog): (number | null)[] {
  return log.map((keystroke, position) => {
    const before = log[position - 1];
    if (
      before === undefined ||
      !keystroke.firstAttempt ||
      !isHit(keystroke) ||
      !before.firstAttempt ||
      !isHit(before) ||
      before.index !== keystroke.index - 1
    ) {
      return null;
    }
    const gap = keystroke.step - before.step;
    return gap >= 1 && gap <= LONGEST_GAP_STEPS ? gap : null;
  });
}

/**
 * Each key's tally in a Flight log, by the character the text wanted. A
 * character is one First attempt, however many wrong keys it then got. Keys
 * the text never wanted have no entry.
 */
export function keyTallies(log: FlightLog): Record<string, KeyTally> {
  const tallies: Record<string, KeyTally> = {};
  const steps = cleanHitSteps(log);
  log.forEach((keystroke, position) => {
    const tally = tallies[keystroke.expected] ?? {
      firstAttempts: 0,
      misses: 0,
      cleanHits: 0,
      cleanSteps: 0,
    };
    tallies[keystroke.expected] = tally;
    if (keystroke.firstAttempt) {
      tally.firstAttempts += 1;
      if (!isHit(keystroke)) tally.misses += 1;
    }
    const took = steps[position];
    if (took !== null) {
      tally.cleanHits += 1;
      tally.cleanSteps += took;
    }
  });
  return tallies;
}

/**
 * The keycap a character is typed on (`keyForCharacter`'s keycap: a capital
 * and a Shift symbol are on their base key), or the character itself when the
 * keyboard doesn't type it.
 */
export function keycapOf(character: string): string {
  return keyForCharacter(character)?.keycap.key ?? character;
}

/** The keycaps a Flight log typed, each once, in the order the text first wanted them. */
export function keycapsTyped(log: FlightLog): string[] {
  const keycaps = new Set<string>();
  for (const keystroke of log) keycaps.add(keycapOf(keystroke.expected));
  return [...keycaps];
}

/** The tallies added up by keycap, so "A" and "a" are one key, as on the keyboard. */
export function keycapTallies(
  tallies: Record<string, KeyTally>,
): Record<string, KeyTally> {
  const byKeycap: Record<string, KeyTally> = {};
  for (const [character, tally] of Object.entries(tallies)) {
    const keycap = keycapOf(character);
    const total = byKeycap[keycap] ?? {
      firstAttempts: 0,
      misses: 0,
      cleanHits: 0,
      cleanSteps: 0,
    };
    byKeycap[keycap] = {
      firstAttempts: total.firstAttempts + tally.firstAttempts,
      misses: total.misses + tally.misses,
      cleanHits: total.cleanHits + tally.cleanHits,
      cleanSteps: total.cleanSteps + tally.cleanSteps,
    };
  }
  return byKeycap;
}

/** The mean time of every Clean hit in the tallies, in steps, or null when there is none. */
export function averageCleanSteps(
  tallies: Record<string, KeyTally>,
): number | null {
  let hits = 0;
  let steps = 0;
  for (const tally of Object.values(tallies)) {
    hits += tally.cleanHits;
    steps += tally.cleanSteps;
  }
  return hits === 0 ? null : steps / hits;
}

/** The finger that types a character, or null when the keyboard doesn't type it. */
export function fingerOf(character: string): FingerZone | null {
  return keyForCharacter(character)?.finger ?? null;
}

/** A key ranked slow: its mean Clean-hit time. */
export interface SlowKey {
  character: string;
  ms: number;
  cleanHits: number;
  finger: FingerZone | null;
}

/** The slowest keys, slowest first: only keys with at least 3 Clean hits. */
export function slowestKeys(
  tallies: Record<string, KeyTally>,
  length = LIST_LENGTH,
): SlowKey[] {
  return Object.entries(tallies)
    .filter(([, tally]) => tally.cleanHits >= MIN_CLEAN_HITS)
    .map(([character, tally]) => ({
      character,
      ms: stepsToMs(tally.cleanSteps / tally.cleanHits),
      cleanHits: tally.cleanHits,
      finger: fingerOf(character),
    }))
    .sort((a, b) => b.ms - a.ms || a.character.localeCompare(b.character))
    .slice(0, length);
}

/** A key ranked inaccurate: how many of its First attempts were Misses. */
export interface InaccurateKey {
  character: string;
  firstAttempts: number;
  misses: number;
  finger: FingerZone | null;
}

/**
 * The least accurate keys, worst first (by the share of their First attempts
 * that missed): only keys with at least 3 First attempts, a Miss among them.
 */
export function leastAccurateKeys(
  tallies: Record<string, KeyTally>,
  length = LIST_LENGTH,
): InaccurateKey[] {
  return Object.entries(tallies)
    .filter(
      ([, tally]) =>
        tally.firstAttempts >= MIN_FIRST_ATTEMPTS && tally.misses > 0,
    )
    .map(([character, tally]) => ({
      character,
      firstAttempts: tally.firstAttempts,
      misses: tally.misses,
      finger: fingerOf(character),
    }))
    .sort(
      (a, b) =>
        b.misses / b.firstAttempts - a.misses / a.firstAttempts ||
        b.misses - a.misses ||
        a.character.localeCompare(b.character),
    )
    .slice(0, length);
}

/** The key a player has most to work on now: how it ranked, and the finger that types it. */
export interface TrickiestKey {
  /** The keycap's own character ("a" for both "a" and "A"). */
  character: string;
  finger: FingerZone | null;
}

/**
 * The trickiest key in the tallies, as the Debrief ranks a Run's keys: the
 * least accurate key, and when none has repeated Misses to rank, the slowest.
 * Capitals and their lower case count as one key, as on the keyboard. Null
 * when nothing is typed often enough to tell.
 */
export function trickiestKey(
  tallies: Record<string, KeyTally>,
): TrickiestKey | null {
  const byKeycap = keycapTallies(tallies);
  const key =
    leastAccurateKeys(byKeycap, 1)[0] ?? slowestKeys(byKeycap, 1)[0] ?? null;
  return key === null ? null : { character: key.character, finger: key.finger };
}

/** The characters of a text that count as letters, for the speed the Journey follows. */
export const isLetter = (character: string): boolean =>
  /^[a-z]$/i.test(character);

/**
 * Words per minute over Clean hits: each hit is a character, five to a word,
 * and `steps` is the Run Time they took together. Null with no time to measure.
 */
export function cleanHitWpm(cleanHits: number, steps: number): number | null {
  if (cleanHits <= 0 || steps <= 0) return null;
  return (cleanHits * (STEPS_PER_SECOND * 60)) / 5 / steps;
}

/**
 * How many Clean hits on letters the Flight log has, and the Run Time they
 * took. Speed over days counts letters only, so a day of number drills
 * doesn't look like getting slower.
 */
export function letterCleanHits(log: FlightLog): {
  hits: number;
  steps: number;
} {
  const steps = cleanHitSteps(log);
  let hits = 0;
  let total = 0;
  log.forEach((keystroke, position) => {
    const took = steps[position];
    if (took !== null && isLetter(keystroke.expected)) {
      hits += 1;
      total += took;
    }
  });
  return { hits, steps: total };
}
