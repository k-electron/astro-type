import { describe, expect, it } from 'vitest';
import { scoreForHit } from '../../game/rules';
import { BANNED_NAME } from '../../../tests/shared/names';
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
  it('ends with the points the hit scored, and is one of the prepared texts, in its own colour, for every hit the rules can score', () => {
    // The deck caches a popup by its text and colour, so both must be prepared.
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
              const label = hitPopupLabel(stem, points);
              // The popup ends with the points the hit scored.
              expect(label.endsWith(`+${points}`), label).toBe(true);
              const drawn = `${label}|${hitPopupColor(kind)}`;
              if (!prepared.has(drawn)) missing.push(drawn);
            }
          }
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('uses the glossary names: never combo, hyperspace or warp', () => {
    // The sweep over the real page (journey J4) reads only the popups it
    // happens to draw; this reads every label the deck can draw.
    const offenders = hitPopupsToPrepare()
      .map(({ label }) => label)
      .filter((label) => BANNED_NAME.test(label));

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
