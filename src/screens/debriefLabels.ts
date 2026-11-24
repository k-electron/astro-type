import type { FingerZone } from '../curriculum/keyboardLayout';
import { FINGER_DISPLAY_NAMES } from '../curriculum/curriculum';
import {
  type InaccurateKey,
  type KeyTally,
  type SlowKey,
  stepsToMs,
} from '../analytics/keys';
import type { LetterReport } from '../analytics/letters';
import type { MixUp } from '../analytics/mixUps';
import type { WorkOn } from '../analytics/workOn';

/** The Debrief's button that starts the same Stage again. */
export const REPLAY = 'Replay';

/** The Debrief's notice that the Run just cleared opened a Sector. */
export const NEW_SECTOR_UNLOCKED =
  'New Sector Unlocked! Find it on the Galaxy Map.';

/** What a Debrief Star bar row says of a bar this Run met, and of one it did not. */
export const BAR_ACHIEVED = 'ACHIEVED';
export const BAR_INCOMPLETE = 'INCOMPLETE';

/** The accessible name of the row of buttons at the foot of the Debrief. */
export const DEBRIEF_ACTIONS = 'What next';

// ---- What the Debrief says of how the Run was typed -------------------------

/** How the Debrief names a character: Space by name, a letter as its capital, as on a keycap. */
export function keyLabel(character: string): string {
  if (character === ' ') return 'Space';
  return /^[a-z]$/.test(character) ? character.toUpperCase() : character;
}

/** A finger as a sentence says it: "left pinky", and the thumb for Space. */
function fingerWords(finger: FingerZone): string {
  return finger === 'THUMB'
    ? 'thumb'
    : FINGER_DISPLAY_NAMES[finger].toLowerCase();
}

const typedWith = (finger: FingerZone | null): string =>
  finger === null ? '' : ` It is typed with your ${fingerWords(finger)}.`;

/**
 * The plain sentence on top of the Debrief: the one thing to work on. The
 * report picks it and gives its facts; this words it.
 */
export function workOnSentence(workOn: WorkOn): string {
  switch (workOn.kind) {
    case 'missed key':
      return `Work on the ${keyLabel(workOn.character)} key: you missed it ${workOn.misses} of ${workOn.firstAttempts} times.${typedWith(workOn.finger)}`;
    case 'slow key':
      return `Work on the ${keyLabel(workOn.character)} key: it was your slowest, at ${Math.round(workOn.ms)} ms a key against ${Math.round(workOn.averageMs)} ms for your whole Run.${typedWith(workOn.finger)}`;
    case 'uneven rhythm':
      return 'Your keys were accurate and quick, but your Rhythm was uneven. Try to give every key the same steady beat.';
    case 'clean run':
      return 'A clean, even Run: no key stood out as one to fix. Keep it up.';
  }
}

/** The heading over the Run's text. */
export const RUN_TEXT_HEADING = 'Your Run, letter by letter';

/** The words for a letter's shade and for a Miss, in the text's key and in a letter's tooltip. */
export const QUICK = 'quick';
export const SLOW = 'slow';
export const VERY_SLOW = 'very slow';
export const MISSED = 'missed';

/** What the shading is measured against. */
export const shadingNote = (averageMs: number): string =>
  `against your average, ${Math.round(averageMs)} ms a key`;

/** The tooltip of one letter of the text. */
export function letterTitle(letter: LetterReport): string {
  const parts = [
    letter.ms === null
      ? `${keyLabel(letter.character)}: no time`
      : `${keyLabel(letter.character)}: ${Math.round(letter.ms)} ms`,
  ];
  if (letter.pace === 'quick') parts.push(QUICK);
  if (letter.pace === 'slow') parts.push(SLOW);
  if (letter.pace === 'very slow') parts.push(VERY_SLOW);
  if (letter.missed) {
    parts.push(
      `${MISSED}, typed as ${letter.wrongKeys.map(keyLabel).join(', ')} first`,
    );
  }
  return parts.join(', ');
}

/** The caption under the text while a key is lit: how many letters it lights. */
export const litLettersCaption = (character: string, count: number): string =>
  `Showing every ${keyLabel(character)} in your text (${count})`;

export const KEYS_HEADING = 'Your keys';
export const KEYS_HINT =
  'Hover a key to find it in your text, click to hold it.';
export const SLOWEST_KEYS_HEADING = 'Slowest keys';
export const LEAST_ACCURATE_KEYS_HEADING = 'Least accurate keys';
export const MIX_UPS_HEADING = 'Mix-ups';
export const NO_SLOW_KEYS = 'Too few keys were typed often enough to tell.';
export const NO_MISSED_KEYS = 'No key was missed more than once.';
export const NO_MIX_UPS = 'No Mix-ups this Run.';

/** A key's entry in the slowest list. */
export const slowKeyLabel = (key: SlowKey): string =>
  `${keyLabel(key.character)} ${Math.round(key.ms)} ms`;

/** A key's entry in the least accurate list. */
export const inaccurateKeyLabel = (key: InaccurateKey): string =>
  `${keyLabel(key.character)} ${key.misses} of ${key.firstAttempts}`;

/** A Mix-up's entry: the key wanted, typed as another, and how often. */
export const mixUpLabel = (mixUp: MixUp): string =>
  `${keyLabel(mixUp.expected)} as ${keyLabel(mixUp.pressed)}${mixUp.count > 1 ? ` ×${mixUp.count}` : ''}`;

/** The tooltip of a keycap on the Debrief's keyboard: how it went, or that the Run never used it. */
export function keycapTitle(
  keycap: string,
  tally: KeyTally | undefined,
): string {
  if (!tally) return `${keyLabel(keycap)}: not in this Run`;
  const parts = [
    `${keyLabel(keycap)}: typed ${tally.firstAttempts} ${tally.firstAttempts === 1 ? 'time' : 'times'}`,
  ];
  if (tally.misses > 0) parts.push(`${MISSED} ${tally.misses}`);
  if (tally.cleanHits > 0) {
    parts.push(
      `${Math.round(stepsToMs(tally.cleanSteps / tally.cleanHits))} ms a key`,
    );
  }
  return parts.join(', ');
}
