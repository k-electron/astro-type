import { describe, expect, it } from 'vitest';
import { BANNED_NAME } from '../../tests/shared/names';
import {
  CURRICULUM_SECTORS,
  FINGER_LANES,
  FREE_FLIGHT_PRESETS,
  FreeFlightTextSchema,
  freeFlightStage,
  KEY_FINGER_MAP,
} from './curriculum';

// The curriculum is checked here, not at load (#11, #27). Every rule below
// fails only when a Stage would break for the player. The shape of a Sector
// and a Stage is the `Sector` and `Stage` types in curriculum.ts, which
// `CURRICULUM_SECTORS` is declared with, so the typecheck already holds it;
// what a type cannot say is checked here.

const sectors = CURRICULUM_SECTORS;
const stages = sectors.flatMap((sector) => sector.stages);

// A key the player can press: the character itself, or a capital letter
// typed with Shift on its lowercase key.
function keyFor(char: string) {
  return (
    KEY_FINGER_MAP[char] ??
    (char !== char.toLowerCase()
      ? KEY_FINGER_MAP[char.toLowerCase()]
      : undefined)
  );
}

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
        const key = keyFor(char);
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

// Free Flight is part of the curriculum (#73): the Stage it flies is built
// here, from the player's text and Target Cadence, and judged by the same
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

  it('is a Stage of the text it was built from, marked as Free Flight with a custom id', () => {
    const stage = freeFlightStage(text, 30);
    expect(stage.sampleText).toBe(text);
    expect(stage.targetWpm).toBe(30);
    expect(stage.origin).toBe('free-flight');
    expect(stage.id).toMatch(/^custom-/);
  });

  it('has a lane and a finger for every character of the text, as a Sector Stage does', () => {
    const stage = freeFlightStage(text, 30);
    const chars = new Set([...stage.sampleText, ...stage.targetKeys]);
    const problems = [...chars].filter((char) => !keyFor(char));
    expect(problems).toEqual([]);
  });

  it.each([20, 40, 80])(
    'asks for more at each star level at %i WPM',
    (targetWpm) => {
      const { starThresholds: t } = freeFlightStage(text, targetWpm);
      expect(t.oneStarAccuracy).toBeLessThan(t.twoStarAccuracy);
      expect(t.twoStarAccuracy).toBeLessThan(t.threeStarAccuracy);
      expect(t.twoStarWpm).toBeLessThan(t.threeStarWpm);
      expect(t.threeStarAccuracy).toBeLessThanOrEqual(100);
    },
  );

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
const NO_BREAK_SPACE = '\u00A0';

const untypeableOf = (text: string): string[] | undefined => {
  const result = FreeFlightTextSchema.safeParse(text);
  if (result.success) return undefined;
  for (const issue of result.error.issues) {
    const { params } = issue as { params?: { characters?: string[] } };
    if (params?.characters) return params.characters;
  }
  return undefined;
};

describe('Free Flight text', () => {
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

  it('names an invisible character by its code', () => {
    expect(untypeableOf(`no${NO_BREAK_SPACE}break`)).toEqual(['U+00A0']);
  });

  it('refuses text with nothing to type', () => {
    expect(FreeFlightTextSchema.safeParse(' \n\t ').success).toBe(false);
  });
});
