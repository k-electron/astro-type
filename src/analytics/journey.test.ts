/**
 * The Journey's report at the analytics interface: the timeline over the last
 * 56 days (its speed floor, its Sector bands, its days away) and the facts of
 * the plain sentence Analytics opens with. The logs are small and hand-built,
 * so the numbers in the expectations are worked out by hand (a letter typed
 * 12 steps after the one before is 60 WPM).
 */
import { describe, expect, it } from 'vitest';
import { evenly, logOf, withShift } from '../../tests/shared/flightLog';
import {
  beginnerLogbook,
  EIGHT_WEEKS_OF_PLAY,
} from '../../tests/shared/beginnerTypist';
import { addDays } from './days';
import {
  EMPTY_LOGBOOK,
  type FoldFacts,
  foldRun,
  journeyReport,
  type Logbook,
} from './logbook';

const TODAY = '2026-11-23';
const daysAgo = (count: number) => addDays(TODAY, -count);

const FREE_FLIGHT: FoldFacts = {
  where: null,
  runSteps: 600,
  wpm: 20,
  accuracy: 100,
  rhythm: 90,
};

/** A Run flown in a Sector, by the id and name it copies. */
const inSector = (id: string, name = id): FoldFacts => ({
  ...FREE_FLIGHT,
  where: { sector: { id, name }, stage: { id: `${id}-1`, name: `${id} one` } },
});

/** A log of `letters` letters of "a", `gap` steps apart: `letters - 1` timed hits. */
const lettersAt = (letters: number, gap: number) =>
  logOf('a'.repeat(letters), evenly('a'.repeat(letters), gap));

/** The Logbook after each Run in turn: the day it was flown, its log and its facts. */
function flown(
  runs: {
    day: string;
    log?: ReturnType<typeof lettersAt>;
    facts?: FoldFacts;
  }[],
): Logbook {
  return runs.reduce(
    (logbook, { day, log = lettersAt(51, 12), facts = FREE_FLIGHT }) =>
      foldRun(logbook, log, facts, day),
    EMPTY_LOGBOOK,
  );
}

const dayOf = (logbook: Logbook, day: string, today = TODAY) => {
  const found = journeyReport(logbook, today).timeline.find(
    (point) => point.day === day,
  );
  if (!found) throw new Error(`${day} is not on the timeline`);
  return found;
};

describe('the timeline covers the 56 local days ending today', () => {
  it('has one point a day, oldest first, ending today', () => {
    const { timeline } = journeyReport(flown([{ day: TODAY }]), TODAY);

    expect(timeline).toHaveLength(56);
    expect(timeline[0].day).toBe(daysAgo(55));
    expect(timeline[55].day).toBe(TODAY);
  });
});

describe('letter speed per day', () => {
  it('is the speed of the day, from Clean hits on letters', () => {
    // 50 timed letters, 12 steps apart: 60 WPM.
    const logbook = flown([{ day: TODAY }]);

    expect(dayOf(logbook, TODAY).letterWpm).toBeCloseTo(60);
  });

  it('gets no dot with 49 letter Clean hits, and one with 50', () => {
    const forty9 = flown([{ day: TODAY, log: lettersAt(50, 12) }]);
    const fifty = flown([{ day: TODAY, log: lettersAt(51, 12) }]);

    expect(dayOf(forty9, TODAY).letterWpm).toBeNull();
    expect(dayOf(fifty, TODAY).letterWpm).not.toBeNull();
  });

  it('pools the Runs of one day towards the 50', () => {
    // Two Runs of 25 timed letters each.
    const logbook = flown([
      { day: TODAY, log: lettersAt(26, 12) },
      { day: TODAY, log: lettersAt(26, 12) },
    ]);

    expect(dayOf(logbook, TODAY).letterWpm).toBeCloseTo(60);
  });

  it('counts letters only: a day of number drills has no speed, and digits never slow a day of letters', () => {
    const digits = '1'.repeat(80);
    const drills = flown([
      { day: TODAY, log: logOf(digits, evenly(digits, 40)) },
    ]);
    // 51 letters at 12 steps, then 30 digits at 60 steps: still 60 WPM.
    const text = `${'a'.repeat(51)}${'1'.repeat(30)}`;
    const presses: [string, number][] = [
      ...evenly('a'.repeat(51), 12),
      ...evenly('1'.repeat(30), 60),
    ];
    const mixed = flown([{ day: TODAY, log: logOf(text, presses) }]);

    expect(dayOf(drills, TODAY).letterWpm).toBeNull();
    expect(dayOf(mixed, TODAY).letterWpm).toBeCloseTo(60);
  });

  it('is null on a day not played, never zero', () => {
    const logbook = flown([{ day: daysAgo(3) }, { day: TODAY }]);

    expect(dayOf(logbook, daysAgo(1))).toMatchObject({
      played: false,
      letterWpm: null,
      accuracy: null,
      rhythm: null,
      oppositeShiftShare: null,
    });
  });
});

describe('the other measures of a day', () => {
  it("are the Runs' accuracy and Rhythm as the game stamped them, weighted by characters", () => {
    // 20 characters at 100% and 80 at 90%: (20*100 + 80*90) / 100 = 92.
    const logbook = flown([
      {
        day: TODAY,
        log: lettersAt(20, 12),
        facts: { ...FREE_FLIGHT, accuracy: 100, rhythm: 80 },
      },
      {
        day: TODAY,
        log: lettersAt(80, 12),
        facts: { ...FREE_FLIGHT, accuracy: 90, rhythm: 70 },
      },
    ]);

    const day = dayOf(logbook, TODAY);
    expect(day.accuracy).toBeCloseTo(92);
    expect(day.rhythm).toBeCloseTo(72);
  });

  it('give the share of shifted characters typed with the opposite hand, and none without any', () => {
    // "A" and "B" are on the left hand's keys, so the opposite is the right Shift.
    const text = 'ABAB';
    const presses = evenly(text, 12);
    const log = withShift(logOf(text, presses), [
      'right',
      'right',
      'left',
      'none',
    ]);
    const logbook = flown([
      { day: TODAY, log },
      { day: daysAgo(1), log: lettersAt(10, 12) },
    ]);

    expect(dayOf(logbook, TODAY).oppositeShiftShare).toBeCloseTo(50);
    expect(dayOf(logbook, daysAgo(1)).oppositeShiftShare).toBeNull();
  });
});

describe('days away', () => {
  const logbook = flown([
    { day: daysAgo(20) },
    { day: daysAgo(17) },
    { day: daysAgo(1) },
  ]);

  it('are the days not played after the player began', () => {
    expect(dayOf(logbook, daysAgo(19)).away).toBe(true);
    expect(dayOf(logbook, daysAgo(10)).away).toBe(true);
    expect(dayOf(logbook, daysAgo(17)).away).toBe(false);
  });

  it("are not the days before the player's first, or today, which isn't over", () => {
    expect(dayOf(logbook, daysAgo(30)).away).toBe(false);
    expect(dayOf(logbook, TODAY)).toMatchObject({ played: false, away: false });
  });
});

describe('the Sector band behind each day', () => {
  const flownIn = (...days: [number, FoldFacts][]) =>
    flown(days.map(([ago, facts]) => ({ day: daysAgo(ago), facts })));

  it('is the latest new Sector reached by then', () => {
    const logbook = flownIn(
      [30, inSector('s1', 'Start')],
      [20, inSector('s2', 'Middle')],
    );

    expect(dayOf(logbook, daysAgo(40)).sector).toBeNull();
    expect(dayOf(logbook, daysAgo(25))?.sector?.name).toBe('Start');
    expect(dayOf(logbook, daysAgo(20))?.sector?.name).toBe('Middle');
    expect(dayOf(logbook, TODAY)?.sector?.name).toBe('Middle');
  });

  it('stays on the furthest Sector for a player sent back by a Star gate', () => {
    const logbook = flownIn(
      [30, inSector('s1')],
      [20, inSector('s2')],
      // Back in Sector 1 to earn Stars: the band stays on Sector 2.
      [10, inSector('s1')],
      [5, inSector('s1')],
    );

    expect(dayOf(logbook, daysAgo(10)).sector?.id).toBe('s2');
    expect(dayOf(logbook, daysAgo(5)).sector?.id).toBe('s2');
    expect(dayOf(logbook, daysAgo(7)).sector?.id).toBe('s2');
  });

  it('orders Sectors by when they were first reached, not by the curriculum', () => {
    // Sector "z" is reached first, then "a": a is the later band, whatever either's id sorts to.
    const logbook = flownIn([30, inSector('z')], [20, inSector('a')]);

    const { sectors } = journeyReport(logbook, TODAY);
    expect(sectors.map(({ id }) => id)).toEqual(['z', 'a']);
    expect(dayOf(logbook, daysAgo(15)).sector?.id).toBe('a');
  });

  it('leaves Free Flights in no Sector, and a day away on the band the player had reached', () => {
    const logbook = flownIn(
      [30, inSector('s1')],
      [20, FREE_FLIGHT],
      [1, inSector('s2')],
    );

    expect(dayOf(logbook, daysAgo(20)).sector?.id).toBe('s1');
    expect(dayOf(logbook, daysAgo(10)).sector?.id).toBe('s1');
  });

  it('reads a Sector by the name its Runs were flown with, renamed or not in the curriculum', () => {
    const logbook = flownIn(
      [30, inSector('gone', 'Old Name')],
      [20, inSector('gone', 'New Name')],
    );

    expect(dayOf(logbook, TODAY).sector?.name).toBe('New Name');
  });
});

describe("the plain sentence's facts", () => {
  it('says there is nothing to show with no cleared Run', () => {
    const { sentence } = journeyReport(EMPTY_LOGBOOK, TODAY);

    expect(sentence).toEqual({ kind: 'empty' });
  });

  it('tells how far speed has come, the furthest Sector and the trickiest key', () => {
    // 3 early days at 24 steps a letter (30 WPM), then 3 recent days at 12 (60 WPM).
    // "k" is missed once in three First attempts on the later days.
    const slow = lettersAt(51, 24);
    const quick = lettersAt(51, 12);
    const text = 'kkk';
    const tricky = logOf(text, [
      ['x', 5],
      ['k', 15],
      ['k', 30],
      ['k', 45],
    ]);
    const logbook = flown([
      { day: daysAgo(40), log: slow, facts: inSector('s1', 'Start') },
      { day: daysAgo(39), log: slow },
      { day: daysAgo(38), log: slow },
      { day: daysAgo(2), log: quick, facts: inSector('s2', 'Event Horizon') },
      { day: daysAgo(1), log: quick },
      { day: TODAY, log: quick },
      { day: TODAY, log: tricky },
    ]);

    const { sentence } = journeyReport(logbook, TODAY);

    expect(sentence).toMatchObject({
      kind: 'journey',
      daysPlayed: 6,
      furthestSector: 'Event Horizon',
      trickiestKey: { character: 'k', finger: 'RIGHT_MIDDLE' },
    });
    if (sentence.kind !== 'journey') return;
    expect(sentence.startingLetterWpm).toBeCloseTo(30);
    // A little under 60: the slip's retries are slower than the rest.
    expect(sentence.nowLetterWpm).toBeGreaterThan(55);
    expect(sentence.nowLetterWpm).toBeLessThanOrEqual(60);
  });

  it('has no Sector to name when the last 8 weeks were Free Flights', () => {
    const logbook = flown([
      { day: daysAgo(2) },
      { day: daysAgo(1) },
      { day: TODAY },
    ]);

    expect(journeyReport(logbook, TODAY).sentence).toMatchObject({
      kind: 'journey',
      furthestSector: null,
    });
  });

  it('welcomes a player back with fewer than 3 days played in the last 8 weeks, and says how long they have been away', () => {
    const logbook = flown([
      { day: daysAgo(90) },
      { day: daysAgo(89) },
      { day: daysAgo(88) },
      { day: daysAgo(70) },
      { day: daysAgo(20) },
      { day: daysAgo(19) },
    ]);

    // Last played 19 days ago, with 2 days in the last 8 weeks.
    expect(journeyReport(logbook, TODAY).sentence).toEqual({
      kind: 'rebuilding',
      away: { days: 19, atLeast: false },
    });
  });

  it('still reads the time away after the first Run back, when the Logbook says they played today', () => {
    const logbook = flown([
      { day: daysAgo(70) },
      { day: daysAgo(69) },
      { day: daysAgo(30) },
      { day: TODAY },
    ]);

    // Today and 30 days ago are in the window; the fold at today's Run deleted the older days.
    expect(journeyReport(logbook, TODAY).sentence).toMatchObject({
      kind: 'rebuilding',
      away: { days: 30, atLeast: false },
    });
  });

  it('says only that it is more than 8 weeks when the days before the return have faded', () => {
    const logbook = flown([
      { day: daysAgo(100) },
      { day: daysAgo(99) },
      { day: daysAgo(98) },
      { day: TODAY },
    ]);

    // The fold at today's Run deleted the old summaries.
    expect(journeyReport(logbook, TODAY).sentence).toMatchObject({
      kind: 'rebuilding',
      away: { atLeast: true },
    });
  });

  it('does not call a new player, on their second day, away', () => {
    const logbook = flown([{ day: daysAgo(1) }, { day: TODAY }]);

    expect(journeyReport(logbook, TODAY).sentence).toEqual({
      kind: 'rebuilding',
      away: null,
    });
  });

  it('reads a Save opened long after it was written as rebuilding, from the old summaries it still holds', () => {
    const logbook = beginnerLogbook(EIGHT_WEEKS_OF_PLAY);
    const months = addDays(TODAY, 100);

    const report = journeyReport(logbook, months);

    expect(report.rebuilding).toBe(true);
    expect(report.sentence).toMatchObject({
      kind: 'rebuilding',
      away: { days: 100 },
    });
    expect(report.totals.daysPlayed).toBe(EIGHT_WEEKS_OF_PLAY.length);
  });
});
