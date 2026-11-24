/**
 * One key's story, at the analytics interface: what `journeyReport` says of a
 * key (its first day, how often it was typed, its first days against now, its
 * smoothed trend, its Mix-ups) and what `foldRun` keeps of it for good (the
 * first 3 days played, the best). The logs are small and hand-built, so the
 * numbers are worked out by hand (a letter typed 12 steps after the one before
 * took 200 ms, and the first letter of a Run is not timed).
 */
import { describe, expect, it } from 'vitest';
import { evenly, logOf } from '../../tests/shared/flightLog';
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

/** `text` typed right, `gap` steps between keys. */
const typed = (text: string, gap = 12) => logOf(text, evenly(text, gap));

/** `text` typed right except for a wrong `x` before its first `misses` characters. */
const typedWithMisses = (text: string, misses: number, gap = 12) =>
  logOf(
    text,
    [...text].flatMap((key, at): [string, number][] =>
      at < misses
        ? [
            ['x', gap],
            [key, gap],
          ]
        : [[key, gap]],
    ),
  );

type Run = { day: string; log: ReturnType<typeof typed> };

const flown = (runs: Run[]) =>
  runs.reduce(
    (logbook: Logbook, { day, log }) => foldRun(logbook, log, FREE_FLIGHT, day),
    EMPTY_LOGBOOK,
  );

const storyOf = (logbook: Logbook, keycap: string, today = TODAY) =>
  journeyReport(logbook, today).keyStories[keycap];

/** `gaps.length` days ending today, one Run of 10 `a`s each, typed with that gap. */
const dailyA = (gaps: number[]): Run[] =>
  gaps.map((gap, at) => ({
    day: daysAgo(gaps.length - 1 - at),
    log: typed('a'.repeat(10), gap),
  }));

describe("a key's first days", () => {
  it('are the first 3 days it was typed, and stay as they were after that', () => {
    // 3 fast days (200 ms), then 3 slow ones (400 ms).
    const logbook = flown(dailyA([12, 12, 12, 24, 24, 24]));

    const story = storyOf(logbook, 'a');
    expect(story.first.days).toBe(3);
    expect(story.first.tries).toBe(30);
    expect(story.first.ms).toBeCloseTo(200);
  });

  it('take in every Run of those days, a day counting once', () => {
    const logbook = flown([
      { day: daysAgo(3), log: typed('a'.repeat(10), 12) },
      { day: daysAgo(3), log: typed('a'.repeat(10), 12) },
      { day: daysAgo(2), log: typed('a'.repeat(10), 12) },
      { day: daysAgo(1), log: typed('a'.repeat(10), 12) },
      { day: TODAY, log: typed('a'.repeat(10), 36) },
    ]);

    const story = storyOf(logbook, 'a');
    expect(story.first.days).toBe(3);
    expect(story.first.tries).toBe(40);
  });

  it('count the days the key was typed, not the days the player played', () => {
    // Two days with other keys come first: the key's own first day is the third.
    const logbook = flown([
      { day: daysAgo(5), log: typed('b'.repeat(10)) },
      { day: daysAgo(4), log: typed('b'.repeat(10)) },
      { day: daysAgo(3), log: typed('a'.repeat(10)) },
    ]);

    const story = storyOf(logbook, 'a');
    expect(story.firstDay).toBe(daysAgo(3));
    expect(story.first.days).toBe(1);
  });

  it('read accuracy from the same days: 2 Misses in 10 tries is 80%', () => {
    const logbook = flown([
      { day: TODAY, log: typedWithMisses('a'.repeat(10), 2) },
    ]);

    expect(storyOf(logbook, 'a').first.accuracy).toBe(80);
  });

  it('have no speed with fewer than 3 Clean hits', () => {
    const logbook = flown([{ day: TODAY, log: typed('a'.repeat(3)) }]);

    expect(storyOf(logbook, 'a').first).toMatchObject({ days: 1, ms: null });
  });

  it('stay in the story when every Run they came from has faded', () => {
    const logbook = flown([
      { day: daysAgo(100), log: typed('a'.repeat(10), 12) },
      { day: TODAY, log: typed('b'.repeat(10)) },
    ]);

    const story = storyOf(logbook, 'a');
    expect(story.first.ms).toBeCloseTo(200);
    expect(story.firstDay).toBe(daysAgo(100));
    expect(story.now).toBeNull();
    expect(story.trend).toEqual([]);
  });

  it('count a capital and its lower case as one key', () => {
    const logbook = flown([{ day: TODAY, log: typed('aaaaaAAAAA') }]);

    expect(storyOf(logbook, 'a').first.tries).toBe(10);
    expect(storyOf(logbook, 'A')).toBeUndefined();
  });
});

describe('how often a key was typed', () => {
  it('is every try of it ever, including those of Runs that have faded', () => {
    const logbook = flown([
      { day: daysAgo(100), log: typed('a'.repeat(7)) },
      { day: daysAgo(1), log: typed('a'.repeat(10)) },
      { day: TODAY, log: typed('a'.repeat(12)) },
    ]);

    expect(storyOf(logbook, 'a').typed).toBe(29);
  });
});

describe("a key's best", () => {
  it('is kept when the key later slows down', () => {
    // 5 days at 200 ms, then 5 at 400 ms.
    const logbook = flown(dailyA([12, 12, 12, 12, 12, 24, 24, 24, 24, 24]));

    const story = storyOf(logbook, 'a');
    expect(story.now?.ms).toBeCloseTo(400);
    expect(story.best.ms).toBeCloseTo(200);
  });

  it('keeps the best accuracy when the key later gets missed more', () => {
    const logbook = flown([
      ...dailyA([12, 12, 12]),
      { day: TODAY, log: typedWithMisses('a'.repeat(10), 5) },
    ]);

    const story = storyOf(logbook, 'a');
    expect(story.best.accuracy).toBe(100);
    // Over its last 4 days: 5 Misses in 40 tries.
    expect(story.now?.accuracy).toBeCloseTo(87.5);
  });

  it('is a smoothed value: one quick day among slow ones does not set it', () => {
    // 1 day at 200 ms after 4 days at 400 ms: the last 5 days average 360 ms,
    // not the 200 of the quick day.
    const logbook = flown(dailyA([24, 24, 24, 24, 12]));

    expect(storyOf(logbook, 'a').best.ms).toBeCloseTo(360);
  });

  it('has no speed until the key has been timed, and still has an accuracy', () => {
    const logbook = flown([{ day: TODAY, log: typed('a'.repeat(10)) }]);
    // 10 tries but only the Run's first letter is not timed: 9 Clean hits.
    expect(storyOf(logbook, 'a').best.ms).toBeCloseTo(200);

    const untimed = flown([
      {
        day: TODAY,
        log: logOf(
          'ab'.repeat(10),
          [...'ab'.repeat(10)].flatMap((key): [string, number][] =>
            key === 'b'
              ? [
                  ['x', 12],
                  ['b', 12],
                ]
              : [['a', 12]],
          ),
        ),
      },
    ]);
    expect(storyOf(untimed, 'a').best).toEqual({ ms: null, accuracy: 100 });
  });

  it('is not set by a day of fewer than 10 tries', () => {
    const logbook = flown([{ day: TODAY, log: typed('a'.repeat(9)) }]);

    expect(storyOf(logbook, 'a').best).toEqual({ ms: null, accuracy: null });
  });
});

describe("a key's trend", () => {
  it('has a point for each day it had at least 10 tries, and none for a day of 9', () => {
    const logbook = flown([
      { day: daysAgo(3), log: typed('a'.repeat(10)) },
      { day: daysAgo(2), log: typed('a'.repeat(9)) },
      { day: daysAgo(1), log: typed('a'.repeat(10)) },
    ]);

    expect(storyOf(logbook, 'a').trend.map((point) => point.day)).toEqual([
      daysAgo(3),
      daysAgo(1),
    ]);
  });

  it('smooths each point over its last 5 days played with 10 tries, and a day of 9 changes none', () => {
    // Days at 200 ms, with one very slow day (1200 ms) as the sixth; a day of 9
    // slow tries in between, which must not move anything.
    const runs: Run[] = [
      ...dailyA([12, 12, 12, 12, 12]).map((run, at) => ({
        ...run,
        day: daysAgo(7 - at),
      })),
      { day: daysAgo(2), log: typed('a'.repeat(9), 600) },
      { day: daysAgo(1), log: typed('a'.repeat(10), 72) },
    ];
    const trend = storyOf(flown(runs), 'a').trend;

    expect(trend).toHaveLength(6);
    expect(trend[0].ms).toBeCloseTo(200);
    expect(trend[4].ms).toBeCloseTo(200);
    // Days 2 to 6: four at 200 ms and one at 1200 ms, 9 hits each.
    expect(trend[5].ms).toBeCloseTo(400);
    expect(trend[5].day).toBe(daysAgo(1));
  });

  it('puts the same smoothed numbers into "now"', () => {
    const logbook = flown(dailyA([12, 12, 12, 12, 12, 72]));

    const story = storyOf(logbook, 'a');
    expect(story.now?.ms).toBeCloseTo(400);
    expect(story.now?.days).toBe(5);
    expect(story.trend.at(-1)?.ms).toBeCloseTo(400);
  });

  it('has no "now" when no recent day has 10 tries of the key', () => {
    const logbook = flown([{ day: TODAY, log: typed('a'.repeat(4)) }]);

    const story = storyOf(logbook, 'a');
    expect(story.now).toBeNull();
    expect(story.trend).toEqual([]);
  });
});

describe('what a key gets typed as instead', () => {
  /** `a` wanted five times in a row, each typed first as the key given (null: right). */
  const mixUpRun = (instead: (string | null)[]): Run => ({
    day: TODAY,
    log: logOf(
      'a'.repeat(instead.length),
      instead.flatMap((key): [string, number][] =>
        key === null
          ? [['a', 12]]
          : [
              [key, 12],
              ['a', 12],
            ],
      ),
    ),
  });

  it('lists the keys it was typed as, the most often first', () => {
    const logbook = flown([mixUpRun(['s', 'd', 's', null, 's', 'd'])]);

    expect(storyOf(logbook, 'a').mixUps).toEqual([
      { pressed: 's', count: 3 },
      { pressed: 'd', count: 2 },
    ]);
  });

  it('counts a capital with its key, and leaves out a capital typed without Shift', () => {
    const run: Run = {
      day: TODAY,
      log: logOf('AAA', [
        ['s', 12],
        ['A', 12],
        ['a', 12], // right key, no Shift: not another key
        ['A', 12],
        ['A', 12],
      ]),
    };

    expect(storyOf(flown([run]), 'a').mixUps).toEqual([
      { pressed: 's', count: 1 },
    ]);
  });

  it('has none for a key that is never missed', () => {
    const logbook = flown([mixUpRun([null, null, null])]);

    expect(storyOf(logbook, 'a').mixUps).toEqual([]);
  });

  it('reads the last 8 weeks only', () => {
    const logbook = flown([
      { ...mixUpRun(['s', 's']), day: daysAgo(70) },
      mixUpRun(['d']),
    ]);

    expect(storyOf(logbook, 'a').mixUps).toEqual([{ pressed: 'd', count: 1 }]);
  });
});

describe('the key the story starts on', () => {
  it('is the trickiest key: the one missed most of its tries', () => {
    // 'b' is missed on 3 of its 4 tries; 'a' is never missed.
    const log = logOf(
      'abababab',
      [...'abababab'].flatMap((key, at): [string, number][] =>
        key === 'b' && at < 7
          ? [
              ['x', 12],
              ['b', 12],
            ]
          : [[key, 12]],
      ),
    );
    const logbook = flown([
      { day: daysAgo(2), log },
      { day: daysAgo(1), log },
      { day: TODAY, log },
    ]);

    expect(journeyReport(logbook, TODAY).startKey).toBe('b');
  });

  it('is the most typed key when no key is missed or slow enough to rank', () => {
    // Keys 0 steps apart are not timed, and none is missed.
    const logbook = flown(
      [2, 1, 0].map((back) => ({
        day: daysAgo(back),
        log: typed('a'.repeat(3) + 'b'.repeat(8), 0),
      })),
    );

    expect(journeyReport(logbook, TODAY).startKey).toBe('b');
  });

  it('is none before any key has been typed', () => {
    expect(journeyReport(EMPTY_LOGBOOK, TODAY).startKey).toBeNull();
  });

  it('is the most typed key while the picture is rebuilding', () => {
    const logbook = flown([
      { day: TODAY, log: typedWithMisses('a'.repeat(5) + 'b'.repeat(12), 3) },
    ]);

    expect(journeyReport(logbook, TODAY).rebuilding).toBe(true);
    expect(journeyReport(logbook, TODAY).startKey).toBe('b');
  });
});

describe('the story of a Free Flight and of a Sector Stage', () => {
  it('is the same: a Stage Run types keys like any other', () => {
    const stage: FoldFacts = {
      ...FREE_FLIGHT,
      where: {
        sector: { id: 'sx', name: 'Sector X' },
        stage: { id: 'sx-1', name: 'Stage 1' },
      },
    };
    const logbook = foldRun(EMPTY_LOGBOOK, typed('a'.repeat(10)), stage, TODAY);

    expect(storyOf(logbook, 'a').typed).toBe(10);
  });
});
