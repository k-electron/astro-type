import { describe, expect, it } from 'vitest';
import { BANNED_NAME } from '../../tests/shared/names';
import { hitFeedback, hitPopupsToPrepare } from './hitPopups';

/**
 * What the deck shows for one hit (#137), read from the fields the hit
 * Judgement carries: a letter hit's colour by Multiplier tier and its popup, a
 * clean word's big explosion and "CLEAN +bonus", and the banners. Nothing here
 * draws: the pixels are in the local effects suite.
 *
 * The colours are written out on purpose: they are what the player reads (the
 * Glossary says a Cosmetic never changes the hit colours by Multiplier).
 */

type Hit = Parameters<typeof hitFeedback>[0];

const TIER_COLOR = { 1: '#38bdf8', 2: '#4ade80', 3: '#fbbf24', 4: '#e879f9' };
const OVERDRIVE_COLOR = '#f97316';
const CLEAN_COLOR = '#34d399';

/** A hit at x1 with nothing special about it; `overrides` say what is. */
function hitOf(overrides: Partial<Hit> = {}): Hit {
  return {
    points: 100,
    overdrive: false,
    streak: 1,
    multiplier: 1,
    milestone: false,
    cleanWord: null,
    cleanWords: 0,
    ...overrides,
  };
}

/** The hit a letter makes at `multiplier`, with the points the rules give it. */
function letterAt(multiplier: 1 | 2 | 3 | 4, overdrive = false): Hit {
  return hitOf({
    multiplier,
    overdrive,
    points: 100 * multiplier * (overdrive ? 2 : 1),
  });
}

describe('a letter hit', () => {
  it.each([
    [1, '+100'],
    [2, 'x2  +200'],
    [3, 'x3  +300'],
    [4, 'x4  +400'],
  ] as const)(
    'at x%i is a mid-size popup %j in the tier’s colour',
    (multiplier, label) => {
      expect(hitFeedback(letterAt(multiplier))).toEqual({
        big: false,
        color: TIER_COLOR[multiplier],
        label,
        banner: null,
      });
    },
  );

  it('is orange in Overdrive, with the doubled points, and says the Multiplier above x1', () => {
    expect(hitFeedback(letterAt(1, true))).toMatchObject({
      big: false,
      color: OVERDRIVE_COLOR,
      label: '+200',
    });
    expect(hitFeedback(letterAt(4, true))).toMatchObject({
      color: OVERDRIVE_COLOR,
      label: 'x4  +800',
    });
  });

  it('has a popup the deck prepared at start-up, whatever the Multiplier and Overdrive', () => {
    // The deck draws a popup from a cache keyed by its text and colour, so a
    // text that was not prepared would make the first hit of its kind slower.
    const prepared = new Set(
      hitPopupsToPrepare().map(({ label, color }) => `${label}|${color}`),
    );
    const missing: string[] = [];
    for (const multiplier of [1, 2, 3, 4] as const) {
      for (const overdrive of [false, true]) {
        const { label, color } = hitFeedback(letterAt(multiplier, overdrive));
        if (!prepared.has(`${label}|${color}`))
          missing.push(`${label}|${color}`);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('the hit that finishes a clean word', () => {
  const clean = (overrides: Partial<Hit> = {}) =>
    hitOf({
      cleanWord: { word: 'home.', bonus: 250 },
      cleanWords: 5,
      ...overrides,
    });

  it('is the big explosion in green, with the bonus on its popup', () => {
    expect(hitFeedback(clean())).toEqual({
      big: true,
      color: CLEAN_COLOR,
      label: 'CLEAN +250',
      banner: null,
    });
  });

  it('is green in Overdrive and at any Multiplier too', () => {
    expect(
      hitFeedback(clean({ multiplier: 3, overdrive: true })),
    ).toMatchObject({ big: true, color: CLEAN_COLOR, label: 'CLEAN +250' });
  });

  it.each([1, 2, 3])(
    'shows a banner with the word for clean word %i of the Run',
    (cleanWords) => {
      expect(hitFeedback(clean({ cleanWords })).banner).toEqual({
        label: '✨ CLEAN  home.',
        color: CLEAN_COLOR,
      });
    },
  );

  it('shows no banner from the fourth clean word on, and is still the big explosion', () => {
    const feedback = hitFeedback(clean({ cleanWords: 4 }));

    expect(feedback.banner).toBeNull();
    expect(feedback.big).toBe(true);
  });
});

describe('a milestone', () => {
  it.each([
    [10, 2, 'x2 MULTIPLIER — STREAK 10'],
    [20, 3, 'x3 MULTIPLIER — STREAK 20'],
  ] as const)(
    'at Streak %i is a banner for the Multiplier it reached, in that tier’s colour',
    (streak, multiplier, label) => {
      const feedback = hitFeedback(
        hitOf({
          streak,
          multiplier,
          milestone: true,
          points: 100 * multiplier,
        }),
      );

      expect(feedback.banner).toEqual({
        label,
        color: TIER_COLOR[multiplier],
      });
      // The popup is still the hit's own, in the same colour.
      expect(feedback).toMatchObject({
        big: false,
        color: TIER_COLOR[multiplier],
      });
    },
  );

  it('at Streak 30 is a banner for x4. Overdrive is on by then (the 29th hit lights it), so the popup is orange; the colour of the banner in Overdrive is not pinned', () => {
    const feedback = hitFeedback(
      hitOf({
        streak: 30,
        multiplier: 4,
        milestone: true,
        overdrive: true,
        points: 800,
      }),
    );

    expect(feedback.banner?.label).toBe('x4 MULTIPLIER — STREAK 30');
    expect(feedback).toMatchObject({ big: false, color: OVERDRIVE_COLOR });
  });

  it.each([55, 80, 105])(
    'at Streak %i is a flame banner in magenta',
    (streak) => {
      const feedback = hitFeedback(
        hitOf({
          streak,
          multiplier: 4,
          milestone: true,
          overdrive: true,
          points: 800,
        }),
      );

      expect(feedback.banner).toEqual({
        label: `🔥 STREAK ${streak}!`,
        color: TIER_COLOR[4],
      });
    },
  );

  it('wins over the clean word’s banner when both land on one hit, which is still a clean word’s big explosion', () => {
    const feedback = hitFeedback(
      hitOf({
        streak: 20,
        multiplier: 3,
        milestone: true,
        points: 300,
        cleanWord: { word: 'ab', bonus: 300 },
        cleanWords: 1,
      }),
    );

    expect(feedback.banner?.label).toBe('x3 MULTIPLIER — STREAK 20');
    expect(feedback).toMatchObject({ big: true, label: 'CLEAN +300' });
  });

  it('is not announced on a hit that is not one', () => {
    expect(
      hitFeedback(hitOf({ streak: 11, multiplier: 2, points: 200 })).banner,
    ).toBeNull();
  });
});

describe('the words the deck says', () => {
  it('are never a grade, and never a name the Glossary drops', () => {
    // The sweep over the real page (journey J4) reads only the popups it
    // happens to draw; this reads every label the deck can make.
    const said: string[] = hitPopupsToPrepare().map(({ label }) => label);
    for (const multiplier of [1, 2, 3, 4] as const) {
      for (const overdrive of [false, true]) {
        const { label } = hitFeedback(letterAt(multiplier, overdrive));
        said.push(label);
      }
    }
    for (const cleanWords of [1, 2, 3, 4]) {
      const { label, banner } = hitFeedback(
        hitOf({ cleanWord: { word: 'home.', bonus: 250 }, cleanWords }),
      );
      said.push(label, banner?.label ?? '');
    }
    for (const streak of [10, 20, 30, 55, 80]) {
      const { banner } = hitFeedback(
        hitOf({ streak, multiplier: 4, milestone: true }),
      );
      said.push(banner?.label ?? '');
    }

    expect(said.filter((text) => BANNED_NAME.test(text))).toEqual([]);
  });
});
