import { describe, expect, it } from 'vitest';
import { FreeFlightTextSchema } from './schemas';

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
