/**
 * A made-up beginner touch typist, as a seeded generator, so every layer of
 * tests can have a realistic Run instead of hand-written Keystrokes. It
 * types at about 12 WPM and about 93% accuracy. Rewritten from the Debrief
 * prototype (#147).
 *
 * - Each finger has its own pace: pinkies and rings are slowest, the thumb is
 *   fastest. Reaching off the home row costs time, the bottom and number rows
 *   more than the top.
 * - The first letter of a word is slower (planning the word).
 * - Times vary a lot (log-normal), and now and then the player stops to look.
 * - Misses are likelier on ring and pinky keys and off the home row. A Miss is
 *   usually the key next door on its row, sometimes the mirror key on the
 *   other hand, sometimes the key above or below. After a Miss the player
 *   pauses, and sometimes misses again.
 * - A capital or symbol is slower, and typed with the opposite-hand Shift about
 *   half the time, the same-hand Shift mostly otherwise, and now and then with
 *   none (Caps Lock).
 * - They warm up a little over the Run.
 *
 * It makes presses, not Keystrokes: play them through a `Game` (or the DOM
 * harness's player) and the Run stamps every Keystroke as the game does, so
 * no rule is copied here. Same seed and text, same Run.
 */
import { KEYBOARD_ROWS } from '../../src/curriculum/keyboardLayout';
import type { FingerZone } from '../../src/curriculum/keyboardLayout';
import { keyForCharacter } from '../../src/curriculum/keyboardLayout';
import type { FlightLog, ShiftSide } from '../../src/analytics/keystroke';
import type { Game } from '../../src/game/game';
import { newGame, startFreeFlight } from './testHelpers';

/** One key the typist presses, and how long (in Run Time steps) after the one before. */
export interface Press {
  /** The key pressed: a character, ' ' for Space. */
  key: string;
  steps: number;
  /** The Shift held, for a character that needs one. Left out, none. */
  shift?: ShiftSide;
}

/** How a typist has come along: every field is optional. */
export interface Tuning {
  /** Multiplies every time: below 1 is faster. */
  pace?: number;
  /** Multiplies every chance of a Miss. */
  miss?: number;
  /** An extra time factor for one key, as a lower-case character, e.g. one still new to the player. */
  keyFactor?: (character: string) => number;
  /** The chance a shifted character is typed with the opposite-hand Shift. */
  shiftOpposite?: number;
}

const STEP_MS = 1000 / 60;

/** Milliseconds a finger takes on a key of the home row, before everything else. */
const FINGER_MS: Record<FingerZone, number> = {
  LEFT_PINKY: 860,
  LEFT_RING: 760,
  LEFT_MIDDLE: 640,
  LEFT_INDEX: 560,
  THUMB: 430,
  RIGHT_INDEX: 560,
  RIGHT_MIDDLE: 640,
  RIGHT_RING: 760,
  RIGHT_PINKY: 860,
};

/** Reaching to a row of the keyboard (numbers, top, home, bottom) costs this much. */
const ROW_FACTOR = [1.3, 1.2, 1.0, 1.3, 1.0];

/** The keys a Miss can land on, by row of the keyboard, for neighbours and mirrors. */
const MIX_UP_ROWS = ['1234567890', 'qwertyuiop', 'asdfghjkl;', 'zxcvbnm,./'];

/** A small seeded generator (a linear congruential one): the same seed gives the same numbers. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

/** The row of the keyboard (0 numbers, 1 top, 2 home, 3 bottom, 4 space) a character's key is on. */
function rowOfKey(key: string): number {
  return KEYBOARD_ROWS.findIndex((row) => row.some((cap) => cap.key === key));
}

/** Where a character's key is in `MIX_UP_ROWS`, or null for one outside them. */
function placeOf(character: string): { row: number; column: number } | null {
  const base = keyForCharacter(character)?.keycap.key;
  if (base === undefined) return null;
  for (let row = 0; row < MIX_UP_ROWS.length; row++) {
    const column = MIX_UP_ROWS[row].indexOf(base);
    if (column >= 0) return { row, column };
  }
  return null;
}

/** The wrong key a beginner presses for `character`. */
function wrongKeyFor(character: string, random: () => number): string {
  const place = placeOf(character);
  if (!place) return 'x';
  const roll = random();
  if (roll < 0.6) {
    // The key next door.
    const direction = random() < 0.5 ? -1 : 1;
    let column = place.column + direction;
    if (column < 0 || column > 9) column = place.column - direction;
    return MIX_UP_ROWS[place.row][column];
  }
  // The mirror key under the other hand.
  if (roll < 0.8) return MIX_UP_ROWS[place.row][9 - place.column];
  // The key above or below.
  const row =
    place.row === 1 ? (random() < 0.5 ? 0 : 2) : place.row === 3 ? 2 : 1;
  return MIX_UP_ROWS[row][place.column];
}

/** The Shift a beginner holds for a character that needs one, from the key's hand. */
function shiftFor(
  character: string,
  oppositeChance: number,
  random: () => number,
): ShiftSide | undefined {
  const typed = keyForCharacter(character);
  if (!typed?.shiftRequired) return undefined;
  if (random() < oppositeChance) {
    return typed.hand === 'left' ? 'right' : 'left';
  }
  if (random() < 0.85) return typed.hand === 'left' ? 'left' : 'right';
  return 'none';
}

/** The presses of a beginner typing `text`: each character, with the wrong keys before it. */
export function beginnerPresses(
  text: string,
  seed: number,
  tuning: Tuning = {},
): Press[] {
  const { pace = 1, miss = 1, keyFactor, shiftOpposite = 0.5 } = tuning;
  const random = seeded(seed);
  const gauss = () =>
    Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());
  const presses: Press[] = [];
  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    const typed = keyForCharacter(character);
    const row = typed ? rowOfKey(typed.keycap.key) : -1;
    let ms = typed ? FINGER_MS[typed.finger] * ROW_FACTOR[row] : 430;
    if (i > 0 && text[i - 1] === ' ') ms *= 1.4;
    ms *= 1.1 - 0.15 * (i / text.length);
    ms *= pace * (keyFactor?.(character.toLowerCase()) ?? 1);
    if (typed?.shiftRequired) ms *= 1.5;
    ms *= Math.exp(0.35 * gauss());
    // Now and then they stop to look.
    if (random() < 0.05) ms += 1200 + random() * 1400;

    const outer =
      typed !== undefined &&
      (typed.finger.endsWith('PINKY') || typed.finger.endsWith('RING'));
    const missChance =
      character === ' '
        ? 0.01
        : (0.05 + (outer ? 0.06 : 0) + (row !== 2 ? 0.035 : 0)) * miss;
    const shift = shiftFor(character, shiftOpposite, random);

    let after = Math.max(90, ms);
    let tries = 0;
    while (character !== ' ' && random() < (tries === 0 ? missChance : 0.2)) {
      presses.push({
        key: wrongKeyFor(character, random),
        steps: Math.max(1, Math.round(after / STEP_MS)),
        shift,
      });
      after = 500 + random() * 600;
      tries++;
    }
    presses.push({
      key: character,
      steps: Math.max(1, Math.round(after / STEP_MS)),
      shift,
    });
  }
  return presses;
}

/** Whatever a test types on: a headless `Game` or the DOM harness's player. */
export interface TypesPresses {
  step(steps: number): void;
  press(key: string, shift?: ShiftSide): void;
}

/** Play the presses on `typist`: let the time pass, then press the key. */
export function playPresses(typist: TypesPresses, presses: Press[]): void {
  for (const { key, steps, shift } of presses) {
    typist.step(steps);
    typist.press(key, shift);
  }
}

/** A `Game` as something to type on. */
export function typingOn(game: Game): TypesPresses {
  return {
    step: (steps) => game.step(steps),
    press: (key, shift) => game.pressKey(key, shift ? { shift } : undefined),
  };
}

/**
 * The Flight log of a beginner's Free Flight of `text`, stamped by the game
 * itself: the Keystrokes of a cleared Run, in order.
 */
export function beginnerFlightLog(
  text: string,
  seed: number,
  tuning?: Tuning,
): FlightLog {
  const game = newGame();
  startFreeFlight(game, text);
  playPresses(typingOn(game), beginnerPresses(text, seed, tuning));
  return game.getState().run.flightLog;
}
