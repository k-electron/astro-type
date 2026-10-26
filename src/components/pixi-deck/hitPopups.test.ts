import { describe, expect, it } from 'vitest';
import { scoreForHit } from '../../game/rules';
import {
  type HitKind,
  hitPopupColor,
  hitPopupLabel,
  hitPopupStems,
  hitPopupsToPrepare,
} from './hitPopups';

/**
 * The popup of every hit ends with the points that hit scored, and the deck
 * draws the texts it prepared at start-up: a hit whose text was not prepared
 * would make the first hit of its kind cost more than the rest.
 */
const RATINGS = [
  ['perfect', 'PERFECT'],
  ['great', 'GREAT'],
  ['good', 'GOOD'],
] as const;

describe('the popup of a hit', () => {
  it('is one of the prepared texts, in its own colour, for every hit the rules can score', () => {
    const prepared = new Set(
      hitPopupsToPrepare().map(({ label, color }) => `${label}|${color}`),
    );
    const missing: string[] = [];
    for (const [grade, rating] of RATINGS) {
      for (const isSpace of [false, true]) {
        for (const overdrive of [false, true]) {
          for (const multiplier of [1, 2, 3, 4]) {
            const kind: HitKind = { grade, isSpace, overdrive };
            const points = scoreForHit(rating, multiplier, overdrive);
            for (const stem of hitPopupStems(kind)) {
              const drawn = `${hitPopupLabel(stem, points)}|${hitPopupColor(kind)}`;
              if (!prepared.has(drawn)) missing.push(drawn);
            }
          }
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('prepares the real texts, for example a Good at x2 and a Space in Overdrive at x4', () => {
    const prepared = hitPopupsToPrepare();
    expect(prepared).toContainEqual({
      label: '✨ GRAZED! +100',
      color: '#facc15',
    });
    expect(prepared).toContainEqual({
      label: '💥 FLAGSHIP OBLITERATED! +800',
      color: '#34d399',
    });
  });

  it('uses the glossary names: never combo, hyperspace or warp', () => {
    // The deck draws these on the canvas, where a screen-text sweep can't see
    // them. The game says Streak and Overdrive (GLOSSARY.md lists these as
    // words to avoid). `\b` keeps this to whole words; the endings cover
    // "combos", "warped", "warping" and "hyper-space".
    const bannedName = /\b(?:combos?|hyper[\s-]?space|warp(?:s|ed|ing)?)\b/i;

    const offenders = hitPopupsToPrepare()
      .map(({ label }) => label)
      .filter((label) => bannedName.test(label));

    expect(offenders).toEqual([]);
  });

  it('is an ordinary Perfect unless Overdrive doubled the hit: the hit that lights Overdrive is not a strike', () => {
    const strike = (kind: HitKind) =>
      hitPopupStems(kind).some((stem) => /OVERDRIVE STRIKE/.test(stem));
    expect(strike({ grade: 'perfect', isSpace: false, overdrive: true })).toBe(
      true,
    );
    expect(strike({ grade: 'perfect', isSpace: false, overdrive: false })).toBe(
      false,
    );
    expect(strike({ grade: 'perfect', isSpace: true, overdrive: true })).toBe(
      false,
    );
    expect(strike({ grade: 'great', isSpace: false, overdrive: true })).toBe(
      false,
    );
  });
});
