/**
 * Mix-ups, Shift hand and Letter pairs, at the analytics interface: what
 * `journeyReport` makes of the last 8 weeks of Run summaries for the sections
 * at the foot of Analytics. The logs are small and hand-built, folded on chosen
 * days, so each number is worked out by hand (a key typed 12 steps after the
 * one before took 200 ms; the first key of a Run is not timed).
 */
import { describe, expect, it } from 'vitest';
import { evenly, logOf, withShift } from '../../tests/shared/flightLog';
import { addDays } from './days';
import type { ShiftSide } from './keystroke';
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

type Log = ReturnType<typeof logOf>;

/** `text` typed right, `gap` steps between keys. */
const typed = (text: string, gap = 12): Log => logOf(text, evenly(text, gap));

/** The same Log on each of the last `days` days (3 is enough to be out of "rebuilding"). */
const everyDay = (log: Log, days = 3): Logbook =>
  Array.from({ length: days }, (_, at) => daysAgo(days - 1 - at)).reduce(
    (logbook, day) => foldRun(logbook, log, FREE_FLIGHT, day),
    EMPTY_LOGBOOK,
  );

/** The Logbook after each Run, on its day. */
const flown = (runs: { day: string; log: Log }[]): Logbook =>
  runs.reduce(
    (logbook, { day, log }) => foldRun(logbook, log, FREE_FLIGHT, day),
    EMPTY_LOGBOOK,
  );

/** One press of `wrong` on the first character of `text`, then it typed right, every key 12 steps apart. */
const slippedOnFirst = (text: string, wrong: string): Log =>
  logOf(text, [[wrong, 12], ...evenly(text, 12)]);

describe('Mix-ups', () => {
  it('are the most common of the last 8 weeks, a day added to a day, the most often first', () => {
    // f typed as g twice and j as h once on one day; j as h once more on the next.
    const first = logOf('ffj', [
      ['g', 12],
      ['f', 12],
      ['g', 12],
      ['f', 12],
      ['h', 12],
      ['j', 12],
    ]);
    const second = slippedOnFirst('j', 'h');

    const { mixUps } = journeyReport(
      flown([
        { day: daysAgo(2), log: first },
        { day: daysAgo(1), log: second },
        { day: TODAY, log: typed('ff') },
      ]),
      TODAY,
    );

    expect(
      mixUps.map(({ expected, pressed, count }) => [expected, pressed, count]),
    ).toEqual([
      ['f', 'g', 2],
      ['j', 'h', 2],
    ]);
  });

  it('count only the First attempt on a character, however many wrong keys follow', () => {
    const flailing = logOf('f', [
      ['g', 12],
      ['h', 12],
      ['g', 12],
      ['f', 12],
    ]);

    const { mixUps } = journeyReport(everyDay(flailing), TODAY);

    expect(mixUps).toHaveLength(1);
    expect(mixUps[0]).toMatchObject({ expected: 'f', pressed: 'g', count: 3 });
  });

  it('come from the last 8 weeks only', () => {
    const logbook = foldRun(
      EMPTY_LOGBOOK,
      slippedOnFirst('f', 'g'),
      FREE_FLIGHT,
      daysAgo(60),
    );

    expect(journeyReport(logbook, TODAY).mixUps).toEqual([]);
  });

  it.each([
    // [what the text wanted, what was pressed, the likely cause]
    ['f', 'g', 'next door'], // beside it on its row, and the same finger: next door says more
    ['f', 'r', 'next door'], // above it
    ['a', 'z', 'next door'], // below it, on the staggered row
    ['v', ' ', 'next door'], // Space is under the bottom row
    ['f', 'b', 'same finger'], // the left index reaches the b, two columns over
    ['f', 'j', 'other hand'], // its mirror, across the hands
    ['a', 'l', 'other hand'],
    ['f', 'e', 'same hand'], // the left hand, another finger, not beside it
    ['a', 'A', 'shift'], // the right key with Shift when none was wanted
    ['A', 'a', 'shift'], // a capital without Shift
    ['!', '1', 'shift'],
  ])('say why: %s typed as %s is %s', (expected, pressed, cause) => {
    const { mixUps } = journeyReport(
      everyDay(slippedOnFirst(expected, pressed)),
      TODAY,
    );

    expect(mixUps[0]).toMatchObject({ expected, pressed, cause });
  });

  it('say nothing of why when the keyboard has no such key', () => {
    const { mixUps } = journeyReport(everyDay(slippedOnFirst('f', 'é')), TODAY);

    expect(mixUps[0]).toMatchObject({
      expected: 'f',
      pressed: 'é',
      cause: null,
    });
  });
});

describe('Shift hand', () => {
  // A capital F is typed by the left index, so the opposite hand's Shift is the right.
  const capitals = (sides: ShiftSide[]) =>
    withShift(typed('F'.repeat(sides.length)), sides);

  it('is the share of shifted characters typed with the other hand, the same hand, both, Caps Lock and a Shift the game never saw', () => {
    const sides: ShiftSide[] = [
      'right',
      'right',
      'right',
      'left',
      'both',
      'none',
      'unknown',
      'right',
      'right',
      'left',
    ];

    const { shiftHand } = journeyReport(everyDay(capitals(sides)), TODAY);

    // 10 First attempts a day for 3 days: 5 opposite, 2 same, 1 each of the rest.
    expect(shiftHand.total).toBe(30);
    expect(shiftHand.counts).toEqual({
      shiftOpposite: 15,
      shiftSame: 6,
      shiftBoth: 3,
      shiftNone: 3,
      shiftUnknown: 3,
    });
    expect(shiftHand.shares.shiftOpposite).toBeCloseTo(50);
    expect(shiftHand.shares.shiftSame).toBeCloseTo(20);
    expect(shiftHand.shares.shiftNone).toBeCloseTo(10);
    expect(shiftHand.shares.shiftUnknown).toBeCloseTo(10);
    expect(shiftHand.shares.shiftBoth).toBeCloseTo(10);
  });

  it('judges a right-hand capital by the left Shift', () => {
    // J is typed by the right index: the left Shift is the opposite hand's.
    const log = withShift(typed('JJ'), ['left', 'right']);

    const { shiftHand } = journeyReport(everyDay(log), TODAY);

    expect(shiftHand.counts.shiftOpposite).toBe(3);
    expect(shiftHand.counts.shiftSame).toBe(3);
  });

  it('counts lower-case keys for nothing, and has no shares for a player who typed no capitals', () => {
    const { shiftHand } = journeyReport(everyDay(typed('ffjj')), TODAY);

    expect(shiftHand.total).toBe(0);
    expect(shiftHand.shares.shiftOpposite).toBe(0);
  });

  it('agrees with the timeline strip on the share of other-hand Shift', () => {
    const log = capitals(['right', 'left', 'right', 'none']);

    const report = journeyReport(everyDay(log), TODAY);

    expect(report.shiftHand.shares.shiftOpposite).toBeCloseTo(
      report.timeline.at(-1)?.oppositeShiftShare ?? Number.NaN,
    );
  });
});

describe('Letter pairs', () => {
  /** 'a' then `count` more `b`s: the pair "bb" is timed `count - 1` times, "ab" once. */
  const bbTimedOver = (times: number): Log =>
    typed(`a${'b'.repeat(times + 1)}`);

  it('rank a pair only once it was typed cleanly 8 times', () => {
    const seven = journeyReport(
      foldRun(EMPTY_LOGBOOK, bbTimedOver(7), FREE_FLIGHT, TODAY),
      TODAY,
    );
    const eight = journeyReport(
      foldRun(EMPTY_LOGBOOK, bbTimedOver(8), FREE_FLIGHT, TODAY),
      TODAY,
    );

    expect(seven.pairs.slowest).toEqual([]);
    expect(eight.pairs.slowest).toEqual([{ pair: 'bb', count: 8, ms: 200 }]);
  });

  it('add up over the days, the slowest first', () => {
    // bb at 200 ms and dd at 400 ms, 4 times a day for 2 days.
    const fast = typed(`a${'b'.repeat(5)}`, 12);
    const slow = typed(`c${'d'.repeat(5)}`, 24);
    const logbook = foldRun(
      foldRun(everyDay(fast, 2), slow, FREE_FLIGHT, daysAgo(1)),
      slow,
      FREE_FLIGHT,
      TODAY,
    );

    const { pairs } = journeyReport(logbook, TODAY);

    expect(
      pairs.slowest.map(({ pair, count, ms }) => [pair, count, ms]),
    ).toEqual([
      ['dd', 8, 400],
      ['bb', 8, 200],
    ]);
  });

  it('leave out a pair with a Space in it, which is the start of a word and not a move between keys', () => {
    // "b b b ..." types "b " and " b" over and over, slowly.
    const log = typed('b '.repeat(12), 30);

    const { pairs } = journeyReport(everyDay(log), TODAY);

    expect(pairs.slowest).toEqual([]);
  });

  it('come from the last 8 weeks only', () => {
    const logbook = foldRun(
      EMPTY_LOGBOOK,
      bbTimedOver(20),
      FREE_FLIGHT,
      daysAgo(60),
    );

    expect(journeyReport(logbook, TODAY).pairs.slowest).toEqual([]);
  });

  it("give the player's time on the 10 most common English pairs, and none for one not typed enough", () => {
    // "th" typed 9 times (and "ht" 8): "th" is timed 9 times; "he" is never typed.
    const log = typed('th'.repeat(9));

    const { common } = journeyReport(everyDay(log, 3), TODAY).pairs;

    expect(common.map(({ pair }) => pair)).toEqual([
      'th',
      'he',
      'in',
      'er',
      'an',
      're',
      'on',
      'at',
      'en',
      'nd',
    ]);
    expect(common[0]).toMatchObject({ pair: 'th', ms: 200 });
    expect(common[1]).toMatchObject({ pair: 'he', ms: null });
  });

  it('give no time on a common pair typed fewer than 8 times', () => {
    // "th" typed 7 times: timed 7 times.
    const log = typed('th'.repeat(7));

    const { common } = journeyReport(everyDay(log, 1), TODAY).pairs;

    expect(common[0]).toMatchObject({ pair: 'th', ms: null });
  });

  it('say how long the player takes on all their pairs, to read the others against', () => {
    // bb at 200 ms, and dd at 400 ms, 8 times each: 300 ms on average.
    const logbook = foldRun(
      foldRun(
        EMPTY_LOGBOOK,
        typed(`a${'b'.repeat(9)}`, 12),
        FREE_FLIGHT,
        TODAY,
      ),
      typed(`c${'d'.repeat(9)}`, 24),
      FREE_FLIGHT,
      TODAY,
    );

    const { averageMs } = journeyReport(logbook, TODAY).pairs;

    // 8 bb + 1 ab at 200 ms, 8 dd + 1 cd at 400 ms.
    expect(averageMs).toBeCloseTo(300);
  });
});

describe('the trickiest key', () => {
  /** `text` typed 12 steps a key, a wrong `x` first on each character that `missed` says. */
  const missing = (text: string, missed: (at: number) => boolean): Log =>
    logOf(
      text,
      [...text].flatMap((key, at): [string, number][] =>
        missed(at)
          ? [
              ['x', 12],
              [key, 12],
            ]
          : [[key, 12]],
      ),
    );
  const T5_A20 = `${'t'.repeat(5)}${'a'.repeat(20)}`;

  it('is a key typed at least 10 times a day, not one that missed more of only 5', () => {
    // Every day: 3 of 5 t missed, 2 of 20 a missed.
    const log = missing(T5_A20, (at) => at < 3 || (at >= 5 && at < 7));

    const report = journeyReport(everyDay(log), TODAY);

    expect(report.startKey).toBe('a');
    expect(report.sentence).toMatchObject({
      kind: 'journey',
      trickiestKey: { character: 'a' },
    });
  });

  it('is still the key missed most when no key is typed 10 times a day', () => {
    const log = missing('ttttt', (at) => at < 3);

    expect(journeyReport(everyDay(log), TODAY).startKey).toBe('t');
  });
});
