import { fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { addDays } from '../../src/analytics/days';
import {
  EMPTY_LOGBOOK,
  type FoldFacts,
  foldRun,
  type Logbook,
} from '../../src/analytics/logbook';
import { COMMON_PAIRS } from '../../src/analytics/pairs';
import {
  COMMON_PAIRS_NO_TIME,
  habitsRebuilding,
  KEY_STORY_HEADING,
  keyStoryTitle,
  LETTER_PAIRS_SECTION,
  MIX_UP_CAUSES,
  MIX_UPS_SECTION,
  NO_PAIR_SLOWER,
  NO_PAIR_TIME,
  NOTHING_TO_SHOW_YET,
  pairTitle,
  SHIFT_HAND_SECTION,
  SHIFT_WAYS,
} from '../../src/screens/journeyLabels';
import { evenly, logOf, withShift } from '../shared/flightLog';
import { typed } from '../shared/logbooks';
import { TEST_DAY } from '../shared/testHelpers';
import { renderGame, screen, within } from './harness';

// Mix-ups, Shift hand and Letter pairs on Analytics. What each number is
// worked out from is in src/analytics/habits.test.ts; what is here is that the
// page shows each section with data, says "rebuilding" under 3 days played and
// lets a Mix-up open a key's story.

const FACTS: FoldFacts = {
  where: null,
  runSteps: 1200,
  wpm: 20,
  accuracy: 90,
  rhythm: 90,
};

type Log = ReturnType<typeof logOf>;

/** The Logbook after each of `logs` on each of the last `days` days. */
const everyDay = (days: number, logs: Log[]): Logbook =>
  Array.from({ length: days }, (_, at) => addDays(TEST_DAY, at + 1 - days))
    .flatMap((day) => logs.map((log) => ({ day, log })))
    .reduce(
      (logbook, { day, log }) => foldRun(logbook, log, FACTS, day),
      EMPTY_LOGBOOK,
    );

// f typed as g (next door) and a as l (the other hand), once a day each; 4
// capital Fs with the right Shift three times and the left once; "th" 9 times
// and "ht" 8, all 200 ms.
const SLIPS = logOf('fa', [
  ['g', 12],
  ['f', 12],
  ['l', 12],
  ['a', 12],
]);
const CAPITALS = withShift(logOf('FFFF', evenly('FFFF', 12)), [
  'right',
  'right',
  'right',
  'left',
]);
const PAIRS = logOf('th'.repeat(9), evenly('th'.repeat(9), 12));
const HABITS = [SLIPS, CAPITALS, PAIRS];

const section = (name: string) => within(screen.getByRole('region', { name }));

describe('Mix-ups, Shift hand and Letter pairs on Analytics', () => {
  it('lists the Mix-ups with why each happened', () => {
    const player = renderGame({ profile: { logbook: everyDay(3, HABITS) } });
    player.openHeader('Analytics');

    const mixUps = section(MIX_UPS_SECTION);
    expect(mixUps.getByText(MIX_UP_CAUSES['next door'])).toBeTruthy();
    expect(mixUps.getByText(MIX_UP_CAUSES['other hand'])).toBeTruthy();
    expect(mixUps.getAllByText('×3')).toHaveLength(2);
  });

  it('shows how Shift was held, as shares of the capitals typed', () => {
    const player = renderGame({ profile: { logbook: everyDay(3, HABITS) } });
    player.openHeader('Analytics');

    const shift = section(SHIFT_HAND_SECTION);
    const share = (field: string) =>
      shift.getByText(
        SHIFT_WAYS.find((way) => way.field === field)?.label ?? '',
      ).nextElementSibling?.textContent;
    // 9 of 12 with the other hand's Shift, 3 with the same hand's.
    expect(share('shiftOpposite')).toBe('75%');
    expect(share('shiftSame')).toBe('25%');
    expect(share('shiftNone')).toBe('0%');
  });

  it('shows the time on each common English pair, and says what a dash means', () => {
    const player = renderGame({ profile: { logbook: everyDay(3, HABITS) } });
    player.openHeader('Analytics');

    const pairs = section(LETTER_PAIRS_SECTION);
    // "th" is the common pair typed: 27 clean tries at 200 ms.
    expect(pairs.getAllByTitle(pairTitle('th', 200, 27))).toHaveLength(1);
    // Every other common pair was never typed.
    expect(pairs.getAllByTitle(NO_PAIR_TIME)).toHaveLength(
      COMMON_PAIRS.length - 1,
    );
    expect(pairs.getByText(COMMON_PAIRS_NO_TIME)).toBeTruthy();
  });

  it('says no pair is slower when every pair typed often is as quick as the average', () => {
    // Every pair in HABITS takes 200 ms, so none is slower than the average.
    const player = renderGame({ profile: { logbook: everyDay(3, HABITS) } });
    player.openHeader('Analytics');

    expect(
      section(LETTER_PAIRS_SECTION).getByText(NO_PAIR_SLOWER),
    ).toBeTruthy();
  });

  it('lists a pair slower than the average among the slowest', () => {
    // "bb" at 200 ms 30 times a day and "cc" at 400 ms 9 times a day.
    const quick = typed(`a${'b'.repeat(31)}`, 12);
    const slow = typed(`x${'c'.repeat(10)}`, 24);
    const player = renderGame({
      profile: { logbook: everyDay(3, [quick, slow]) },
    });
    player.openHeader('Analytics');

    const pairs = section(LETTER_PAIRS_SECTION);
    expect(pairs.getByTitle(pairTitle('cc', 400, 27))).toBeTruthy();
    expect(pairs.queryByTitle(pairTitle('bb', 200, 90))).toBeNull();
  });

  it.each([
    [MIX_UPS_SECTION, 'Mix-ups'],
    [SHIFT_HAND_SECTION, 'Shift habits'],
    [LETTER_PAIRS_SECTION, 'Letter pairs'],
  ])(
    'says %s is rebuilding, with no numbers, after fewer than 3 days played',
    (name, what) => {
      const player = renderGame({ profile: { logbook: everyDay(2, HABITS) } });
      player.openHeader('Analytics');

      const rebuilding = section(name);
      expect(rebuilding.getByText(habitsRebuilding(what, false))).toBeTruthy();
      expect(rebuilding.queryByText(MIX_UP_CAUSES['next door'])).toBeNull();
      expect(rebuilding.queryByText('75%')).toBeNull();
      expect(rebuilding.queryByTitle(pairTitle('th', 200, 18))).toBeNull();
    },
  );

  it('opens the story of a key in a Mix-up, and offers none for a key no text ever wanted', () => {
    // Every day, f is typed as g once, and j as f twice: j is missed most, so
    // its story opens first.
    const slip = logOf('fjj', [
      ['g', 12],
      ['f', 12],
      ['f', 12],
      ['j', 12],
      ['f', 12],
      ['j', 12],
    ]);
    const player = renderGame({
      profile: { logbook: everyDay(3, [slip]) },
    });
    player.openHeader('Analytics');
    const story = () => screen.getByRole('region', { name: KEY_STORY_HEADING });
    expect(within(story()).getByText(keyStoryTitle('j'))).toBeTruthy();

    const mixUps = section(MIX_UPS_SECTION);
    fireEvent.click(mixUps.getAllByRole('button', { name: 'F key' })[0]);

    expect(within(story()).getByText(keyStoryTitle('f'))).toBeTruthy();
    // No text wanted a g, so it has no story to open.
    expect(mixUps.queryByRole('button', { name: 'G key' })).toBeNull();
  });

  it('shows none of the sections before a Run is cleared', () => {
    const player = renderGame({});
    player.openHeader('Analytics');

    expect(screen.getByText(NOTHING_TO_SHOW_YET)).toBeTruthy();
    expect(screen.queryByRole('region', { name: MIX_UPS_SECTION })).toBeNull();
  });
});
