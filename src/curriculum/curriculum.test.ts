import { describe, expect, it } from 'vitest';
import { BANNED_NAME } from '../../tests/shared/names';
import {
  CURRICULUM_SECTORS,
  FINGER_LANES,
  FREE_FLIGHT_EMPTY_TEXT_MESSAGE,
  FREE_FLIGHT_PRESETS,
  FreeFlightTextSchema,
  freeFlightStage,
  keyForCharacter,
} from './curriculum';
import type { FingerZone } from './keyboardLayout';

// The curriculum is checked here, not at load (#11, #27). Every rule below
// fails only when a Stage would break for the player. The shape of a Sector
// and a Stage is the `Sector` and `Stage` types in curriculum.ts, which
// `CURRICULUM_SECTORS` is declared with, so the typecheck already holds it;
// what a type cannot say is checked here.

const sectors = CURRICULUM_SECTORS;
const stages = sectors.flatMap((sector) => sector.stages);

/**
 * Every piece of copy a screen shows from a Sector or a Stage: all its text
 * except what the player types (`sampleText` is prose, and may say anything).
 */
function copyOf(value: unknown, path: string): [string, string][] {
  if (typeof value === 'string') return [[path, value]];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => copyOf(item, `${path}[${index}]`));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) =>
      key === 'sampleText' ? [] : copyOf(item, `${path}.${key}`),
    );
  }
  return [];
}

describe('curriculum', () => {
  it('gives every Sector Stages, and every Stage something to type at a bar a player can reach', () => {
    const problems: string[] = [];
    for (const sector of sectors) {
      if (sector.stages.length === 0)
        problems.push(`${sector.id} has no Stages`);
    }
    for (const { id, sampleText, targetWpm, starThresholds: t } of stages) {
      if (sampleText.length === 0) problems.push(`${id}: no text to type`);
      if (!(targetWpm > 0)) problems.push(`${id}: target WPM is not positive`);
      for (const accuracy of [
        t.oneStarAccuracy,
        t.twoStarAccuracy,
        t.threeStarAccuracy,
      ]) {
        if (!(accuracy >= 0 && accuracy <= 100)) {
          problems.push(`${id}: accuracy ${accuracy} is not a percentage`);
        }
      }
      if (!(t.twoStarWpm > 0 && t.threeStarWpm > 0)) {
        problems.push(`${id}: a star WPM is not positive`);
      }
      if (
        !(Number.isInteger(t.threeStarMinStreak) && t.threeStarMinStreak > 0)
      ) {
        problems.push(`${id}: the 3-star Streak is not a whole number above 0`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('names things as the Glossary does in the copy of every Sector and Stage', () => {
    const offenders = copyOf(sectors, 'sectors')
      .filter(([, text]) => BANNED_NAME.test(text))
      .map(([path, text]) => `${path}: ${text}`);

    expect(offenders).toEqual([]);
  });

  it('puts every Stage in the Sector that lists it', () => {
    const strays = sectors.flatMap((sector) =>
      sector.stages
        .filter((stage) => stage.sectorId !== sector.id)
        .map((stage) => `${stage.id} is listed in ${sector.id}`),
    );
    expect(strays).toEqual([]);
  });

  it('marks every Stage of a Sector as a Sector Stage', () => {
    const notSector = stages.filter((stage) => stage.origin !== 'sector');
    expect(notSector.map((stage) => stage.id)).toEqual([]);
  });

  it('gives every Sector and every Stage its own id', () => {
    const duplicates = (ids: string[]) =>
      ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(duplicates(sectors.map((sector) => sector.id))).toEqual([]);
    expect(duplicates(stages.map((stage) => stage.id))).toEqual([]);
  });

  it('gives every character in every Stage a lane and a finger', () => {
    const fingerOfLane = new Map(
      FINGER_LANES.map((lane) => [lane.laneIndex, lane.finger]),
    );
    const problems: string[] = [];
    for (const stage of stages) {
      const chars = new Set([...stage.sampleText, ...stage.targetKeys]);
      for (const char of chars) {
        const key = keyForCharacter(char);
        if (!key) {
          problems.push(`${stage.id}: ${JSON.stringify(char)} has no key`);
        } else if (fingerOfLane.get(key.lane) !== key.finger) {
          problems.push(
            `${stage.id}: ${JSON.stringify(char)} is on lane ${key.lane}, which is not ${key.finger}`,
          );
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('asks for more at each star level', () => {
    const problems = stages.flatMap(({ id, starThresholds: t }) => {
      const found: string[] = [];
      if (!(t.oneStarAccuracy < t.twoStarAccuracy)) {
        found.push(`${id}: 2-star accuracy is not above 1-star`);
      }
      if (!(t.twoStarAccuracy < t.threeStarAccuracy)) {
        found.push(`${id}: 3-star accuracy is not above 2-star`);
      }
      if (!(t.twoStarWpm < t.threeStarWpm)) {
        found.push(`${id}: 3-star WPM is not above 2-star`);
      }
      return found;
    });
    expect(problems).toEqual([]);
  });

  it('opens with an unlocked Sector, and no Sector asks for fewer Stars than the one before', () => {
    expect(sectors[0].requiredStarsToUnlock).toBe(0);
    const problems = sectors.flatMap((sector, i) =>
      i > 0 &&
      sector.requiredStarsToUnlock < sectors[i - 1].requiredStarsToUnlock
        ? [`${sector.id} asks for fewer Stars than ${sectors[i - 1].id}`]
        : [],
    );
    expect(problems).toEqual([]);
  });
});

// Where a character is typed. The expected keys are the US layout, held here
// as the oracle: a symbol is typed on its number or punctuation key, a capital
// on its letter's key, each with Shift held by the hand that is not typing it.
describe('the key for a character', () => {
  const EXPECTED: Array<{
    character: string;
    keycap: string;
    finger: FingerZone;
    shiftHand: 'left' | 'right' | null;
  }> = [
    { character: '!', keycap: '1', finger: 'LEFT_PINKY', shiftHand: 'right' },
    { character: '?', keycap: '/', finger: 'RIGHT_PINKY', shiftHand: 'left' },
    { character: '(', keycap: '9', finger: 'RIGHT_RING', shiftHand: 'left' },
    { character: '{', keycap: '[', finger: 'RIGHT_PINKY', shiftHand: 'left' },
    { character: '"', keycap: "'", finger: 'RIGHT_PINKY', shiftHand: 'left' },
    { character: ':', keycap: ';', finger: 'RIGHT_PINKY', shiftHand: 'left' },
    { character: 'A', keycap: 'a', finger: 'LEFT_PINKY', shiftHand: 'right' },
    { character: 'P', keycap: 'p', finger: 'RIGHT_PINKY', shiftHand: 'left' },
    { character: 'a', keycap: 'a', finger: 'LEFT_PINKY', shiftHand: null },
    { character: '1', keycap: '1', finger: 'LEFT_PINKY', shiftHand: null },
    { character: ' ', keycap: ' ', finger: 'THUMB', shiftHand: null },
  ];

  it.each(EXPECTED)(
    'puts "$character" on the $keycap key, under the $finger finger (Shift hand: $shiftHand)',
    ({ character, keycap, finger, shiftHand }) => {
      const key = keyForCharacter(character);

      expect(key?.keycap.key).toBe(keycap);
      expect(key?.finger).toBe(finger);
      // The lane is the finger's lane.
      expect(FINGER_LANES[key?.lane ?? -1]?.finger).toBe(finger);
      expect(key?.shiftRequired).toBe(shiftHand !== null);
      expect(key?.recommendedShiftHand).toBe(shiftHand);
    },
  );

  it('names the hand that types the key', () => {
    expect(keyForCharacter('!')?.hand).toBe('left');
    expect(keyForCharacter('P')?.hand).toBe('right');
    expect(keyForCharacter(' ')?.hand).toBe('thumb');
  });

  it('has no key for a character the keyboard cannot type', () => {
    expect(keyForCharacter('\u00E9')).toBeUndefined();
    expect(keyForCharacter('Enter')).toBeUndefined();
  });
});

// Free Flight is part of the curriculum (#73): the Stage it flies is built
// here, from the player's text and Target WPM, and judged by the same
// rules as a Sector's.
describe('a Free Flight Stage', () => {
  it('names itself as the Glossary does', () => {
    const stage = freeFlightStage('abc', 30);
    const offenders = copyOf(stage, 'stage')
      .filter(([, text]) => BANNED_NAME.test(text))
      .map(([path, text]) => `${path}: ${text}`);

    expect(offenders).toEqual([]);
  });

  const text = 'the quick fox';

  it('is a Stage of the text it was built from, marked as Free Flight', () => {
    const stage = freeFlightStage(text, 30);
    expect(stage.sampleText).toBe(text);
    expect(stage.targetWpm).toBe(30);
    expect(stage.origin).toBe('free-flight');
  });

  it('has a lane and a finger for every character of the text, as a Sector Stage does', () => {
    const stage = freeFlightStage(text, 30);
    const chars = new Set([...stage.sampleText, ...stage.targetKeys]);
    const problems = [...chars].filter((char) => !keyForCharacter(char));
    expect(problems).toEqual([]);
  });

  it('is offered by every preset as text that can be typed', () => {
    expect(FREE_FLIGHT_PRESETS.length).toBeGreaterThan(0);
    for (const preset of FREE_FLIGHT_PRESETS) {
      const checked = FreeFlightTextSchema.safeParse(preset.text);
      expect(checked.success, preset.name).toBe(true);
      expect(freeFlightStage(preset.text, preset.wpm).sampleText).toBe(
        preset.text,
      );
    }
  });
});

// The characters the Free Flight text check is about, written as escapes so
// they stay visible in the source.
const LEFT_DOUBLE_QUOTE = '\u201C';
const RIGHT_DOUBLE_QUOTE = '\u201D';
const CURLY_APOSTROPHE = '\u2019';
const EM_DASH = '\u2014';
const EN_DASH = '\u2013';

const untypeableOf = (text: string): string[] | undefined => {
  const result = FreeFlightTextSchema.safeParse(text);
  if (result.success) return undefined;
  for (const issue of result.error.issues) {
    const { params } = issue as { params?: { characters?: string[] } };
    if (params?.characters) return params.characters;
  }
  return undefined;
};

/** Test-name labels for a table of code points, such as "U+00AD soft hyphen". */
const labelled = (rows: [number, string][]): [string, number][] =>
  rows.map(([codePoint, name]) => [
    `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')} ${name}`,
    codePoint,
  ]);

describe('Free Flight text', () => {
  const JOINER = String.fromCodePoint(0x200d);
  const ZERO_WIDTH_SPACE = String.fromCodePoint(0x200b);
  const SOFT_HYPHEN = String.fromCodePoint(0xad);
  const BOM = String.fromCodePoint(0xfeff);
  const COMBINING_ACUTE = String.fromCodePoint(0x301);

  it('turns look-alike characters into plain keys', () => {
    const pasted = `${LEFT_DOUBLE_QUOTE}It${CURLY_APOSTROPHE}s${RIGHT_DOUBLE_QUOTE} ${EM_DASH} she said.\r\nNext\tline${EN_DASH}ok`;
    expect(FreeFlightTextSchema.parse(pasted)).toBe(
      '"It\'s" - she said. Next line-ok',
    );
  });

  it('accepts every plain key of the keyboard, shifted or not', () => {
    const printableAscii = Array.from({ length: 95 }, (_, i) =>
      String.fromCharCode(32 + i),
    ).join('');
    // Leading and trailing spaces are trimmed, so check the middle.
    expect(FreeFlightTextSchema.parse(`a${printableAscii}a`)).toBe(
      `a${printableAscii}a`,
    );
  });

  it('lists each character that still has no key, once', () => {
    const rocket = String.fromCodePoint(0x1f680);
    expect(untypeableOf(`caf${'\u00E9'} ${rocket} and ${rocket}`)).toEqual([
      '\u00E9',
      rocket,
    ]);
  });

  it('names a control character, which nothing can show, by its code', () => {
    expect(untypeableOf('go\u0007now')).toEqual(['U+0007']);
  });

  it('names each control character once, in the order they appear', () => {
    expect(untypeableOf('a\u0085b\u0007c\u0085d')).toEqual([
      'U+0085',
      'U+0007',
    ]);
  });

  it('refuses text with nothing to type', () => {
    expect(FreeFlightTextSchema.safeParse(' \n\t ').success).toBe(false);
  });

  it('removes an invisible formatting character glued to a letter', () => {
    expect(FreeFlightTextSchema.parse(`a${JOINER}b`)).toBe('ab');
    expect(FreeFlightTextSchema.parse(`go ${JOINER}now`)).toBe('go now');
    expect(FreeFlightTextSchema.parse(`${JOINER}go`)).toBe('go');
    expect(FreeFlightTextSchema.parse(`${JOINER}${JOINER}go`)).toBe('go');
  });

  it('removes a byte order mark at the start and a soft hyphen inside a word', () => {
    expect(FreeFlightTextSchema.parse(`${BOM}hello`)).toBe('hello');
    expect(FreeFlightTextSchema.parse(`co${SOFT_HYPHEN}operate`)).toBe(
      'cooperate',
    );
  });

  it.each(
    labelled([
      [0x00ad, 'soft hyphen'],
      [0x200b, 'zero-width space'],
      [0x200c, 'zero-width non-joiner'],
      [0x200d, 'zero-width joiner'],
      [0x200e, 'left-to-right mark'],
      [0x200f, 'right-to-left mark'],
      [0x202a, 'left-to-right embedding'],
      [0x202b, 'right-to-left embedding'],
      [0x202c, 'pop directional formatting'],
      [0x202d, 'left-to-right override'],
      [0x202e, 'right-to-left override'],
      [0x2060, 'word joiner'],
      [0x2061, 'function application'],
      [0x2062, 'invisible times'],
      [0x2063, 'invisible separator'],
      [0x2064, 'invisible plus'],
      [0xfeff, 'zero-width no-break space'],
      // "The rest of Cf": other members of the category.
      [0x061c, 'Arabic letter mark'],
      [0x180e, 'Mongolian vowel separator'],
      [0x2066, 'left-to-right isolate'],
      [0x206f, 'nominal digit shapes'],
      [0xe0001, 'language tag'],
    ]),
  )('removes %s from the middle of a word', (_, codePoint) => {
    const character = String.fromCodePoint(codePoint);
    expect(FreeFlightTextSchema.parse(`a${character}b`)).toBe('ab');
  });

  it('removes every invisible formatting character of Unicode, wherever it sits', () => {
    const notRemoved: string[] = [];
    for (let codePoint = 0; codePoint <= 0x10ffff; codePoint++) {
      const character = String.fromCodePoint(codePoint);
      if (!/^\p{Cf}$/u.test(character)) continue;
      const result = FreeFlightTextSchema.safeParse(`a${character}b`);
      if (!result.success || result.data !== 'ab') {
        notRemoved.push(`U+${codePoint.toString(16).toUpperCase()}`);
      }
    }
    expect(notRemoved).toEqual([]);
  });

  it('says to enter some text when only invisible formatting characters and whitespace are left', () => {
    // None of these is whitespace to `trim`, so only the cleanup empties them.
    for (const text of [
      ZERO_WIDTH_SPACE,
      `${JOINER}${SOFT_HYPHEN}`,
      ` ${ZERO_WIDTH_SPACE} \n${JOINER}\t`,
    ]) {
      const result = FreeFlightTextSchema.safeParse(text);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe(
        FREE_FLIGHT_EMPTY_TEXT_MESSAGE,
      );
    }
  });

  it('lists a family emoji as its separate parts, once each', () => {
    const [man, woman, girl] = [0x1f468, 0x1f469, 0x1f467].map((codePoint) =>
      String.fromCodePoint(codePoint),
    );
    const family = [man, woman, girl].join(JOINER);
    expect(untypeableOf(`${family} and ${family}`)).toEqual([man, woman, girl]);
  });

  it('turns a no-break space into a plain space', () => {
    expect(FreeFlightTextSchema.parse('no\u00A0break')).toBe('no break');
  });

  it.each(
    labelled([
      [0x2000, 'en quad'],
      [0x2001, 'em quad'],
      [0x2002, 'en space'],
      [0x2003, 'em space'],
      [0x2004, 'three-per-em space'],
      [0x2005, 'four-per-em space'],
      [0x2006, 'six-per-em space'],
      [0x2007, 'figure space'],
      [0x2008, 'punctuation space'],
      [0x2009, 'thin space'],
      [0x200a, 'hair space'],
      [0x202f, 'narrow no-break space'],
      [0x205f, 'medium mathematical space'],
      [0x3000, 'ideographic space'],
    ]),
  )('turns %s into a plain space', (_, codePoint) => {
    const space = String.fromCodePoint(codePoint);
    expect(FreeFlightTextSchema.parse(`no${space}break`)).toBe('no break');
  });

  it('does not turn the Ogham space mark, which draws a dash, into a space', () => {
    expect(FreeFlightTextSchema.safeParse('no\u1680break').success).toBe(false);
  });

  it('lists a cluster with a visible part whole, as itself', () => {
    // An x with a combining accent has no key, whatever its base letter is.
    const accentedX = `x${COMBINING_ACUTE}`;
    expect(untypeableOf(`an ${accentedX} here`)).toEqual([accentedX]);
  });

  it('says to enter some text when the text is empty or only whitespace', () => {
    for (const text of ['', ' \n\t ']) {
      const result = FreeFlightTextSchema.safeParse(text);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe(
        FREE_FLIGHT_EMPTY_TEXT_MESSAGE,
      );
    }
  });
});
