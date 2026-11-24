/**
 * The keyboard as it was on a day, at the analytics interface: what
 * `journeyReport` says each key was going as of a day (its last 5 days played,
 * each with at least 10 tries). The logs are small and hand-built, so the
 * numbers are worked out by hand (a letter typed 12 steps after the one before
 * took 200 ms; the first letter of a Run is not timed).
 */
import { describe, expect, it } from 'vitest';
import { evenly, logOf } from '../../tests/shared/flightLog';
import { daysAgo, flown, TODAY, typed } from '../../tests/shared/logbooks';
import { journeyReport, type Logbook } from './logbook';

/** What the keyboard says of `keycap` on `day`, looking from `today`. */
const keyOn = (logbook: Logbook, keycap: string, day: string, today = TODAY) =>
  journeyReport(logbook, today).keyboards[day]?.keys[keycap];

describe("a key's speed as of a day", () => {
  it('is its mean Clean-hit time: letters 12 steps apart took 200 ms', () => {
    const logbook = flown([{ day: TODAY, log: typed('a'.repeat(11)) }]);

    expect(keyOn(logbook, 'a', TODAY)?.ms).toBeCloseTo(200);
  });

  it('has none with fewer than 3 Clean hits', () => {
    // 10 tries of "a", each straight after a Miss on "b": none is timed.
    const log = logOf(
      'ab'.repeat(10),
      [...'ab'.repeat(10)].flatMap((key): [string, number][] =>
        key === 'b'
          ? [
              ['x', 12],
              ['b', 12],
            ]
          : [['a', 12]],
      ),
    );
    const logbook = flown([{ day: TODAY, log }]);

    expect(keyOn(logbook, 'a', TODAY)).toMatchObject({ days: 1, ms: null });
  });

  it('counts the days up to the cursor day and no later ones', () => {
    const logbook = flown([
      { day: daysAgo(2), log: typed('a'.repeat(10), 12) },
      { day: daysAgo(1), log: typed('a'.repeat(10), 24) },
    ]);

    // The first day alone: 200 ms. With the second (400 ms), 9 hits each: 300 ms.
    expect(keyOn(logbook, 'a', daysAgo(2))?.ms).toBeCloseTo(200);
    expect(keyOn(logbook, 'a', daysAgo(1))?.ms).toBeCloseTo(300);
  });

  it('carries on to the days after the last one played', () => {
    const logbook = flown([{ day: daysAgo(3), log: typed('a'.repeat(10)) }]);

    expect(keyOn(logbook, 'a', TODAY)?.ms).toBeCloseTo(200);
  });
});

describe("a key's last 5 days played", () => {
  it('drops the oldest when a 6th day has been played', () => {
    // The oldest day is fast (12 steps), the five after it slow (24 steps).
    const runs = [12, 24, 24, 24, 24, 24].map((gap, at) => ({
      day: daysAgo(6 - at),
      log: typed('a'.repeat(10), gap),
    }));
    const logbook = flown(runs);

    // On the 5th day all five count (one fast): mean over 45 hits.
    expect(keyOn(logbook, 'a', daysAgo(2))?.ms).toBeCloseTo(
      ((9 * 12 + 4 * 9 * 24) / 45) * (1000 / 60),
    );
    // On the 6th the fast day is out: all slow, 400 ms.
    expect(keyOn(logbook, 'a', daysAgo(1))?.ms).toBeCloseTo(400);
    expect(keyOn(logbook, 'a', daysAgo(1))?.days).toBe(5);
  });

  it('counts days by days played, not by calendar days', () => {
    // Two days played a month apart are the last two days played.
    const logbook = flown([
      { day: daysAgo(40), log: typed('a'.repeat(10), 12) },
      { day: daysAgo(2), log: typed('a'.repeat(10), 24) },
    ]);

    expect(keyOn(logbook, 'a', daysAgo(2))?.days).toBe(2);
  });

  it('skips a day with 9 tries and counts one with 10', () => {
    const nine = flown([{ day: TODAY, log: typed('a'.repeat(9)) }]);
    const ten = flown([{ day: TODAY, log: typed('a'.repeat(10)) }]);

    expect(keyOn(nine, 'a', TODAY)).toMatchObject({
      days: 0,
      ms: null,
      accuracy: null,
    });
    expect(keyOn(ten, 'a', TODAY)?.days).toBe(1);
  });

  it('adds the Runs of one day together: two Runs of 6 tries make a day of 12', () => {
    const logbook = flown([
      { day: TODAY, log: typed('a'.repeat(6)) },
      { day: TODAY, log: typed('a'.repeat(6)) },
    ]);

    expect(keyOn(logbook, 'a', TODAY)).toMatchObject({ days: 1, tries: 12 });
  });

  it('counts a letter and its capital, and a digit and its symbol, as one key', () => {
    const logbook = flown([
      { day: TODAY, log: typed('aaaaaAAAAA') },
      { day: TODAY, log: typed('1111!!!!!1') },
    ]);

    expect(keyOn(logbook, 'a', TODAY)?.tries).toBe(10);
    expect(keyOn(logbook, '1', TODAY)?.tries).toBe(10);
    expect(keyOn(logbook, 'A', TODAY)).toBeUndefined();
  });
});

describe("a key's accuracy as of a day", () => {
  it('is the share of its tries that were not Misses: 2 Misses in 10 is 80%', () => {
    const log = logOf('a'.repeat(10), [
      ['x', 12],
      ['a', 12],
      ['x', 12],
      ['a', 12],
      ...evenly('a'.repeat(8), 12),
    ]);
    const logbook = flown([{ day: TODAY, log }]);

    expect(keyOn(logbook, 'a', TODAY)).toMatchObject({
      tries: 10,
      misses: 2,
      accuracy: 80,
    });
  });

  it('counts only the days that count: a day of 9 tries with Misses is left out', () => {
    const missed = logOf('a'.repeat(9), [
      ['x', 12],
      ['a', 12],
      ...evenly('a'.repeat(8), 12),
    ]);
    const logbook = flown([
      { day: daysAgo(1), log: missed },
      { day: TODAY, log: typed('a'.repeat(10)) },
    ]);

    expect(keyOn(logbook, 'a', TODAY)?.accuracy).toBe(100);
  });
});

describe('which keys are not yet typed', () => {
  it('has a key only from the day it was first typed', () => {
    const logbook = flown([
      { day: daysAgo(3), log: typed('a'.repeat(10)) },
      { day: daysAgo(1), log: typed('b'.repeat(10)) },
    ]);

    expect(keyOn(logbook, 'b', daysAgo(2))).toBeUndefined();
    expect(keyOn(logbook, 'b', daysAgo(1))).toBeDefined();
    expect(keyOn(logbook, 'a', daysAgo(2))).toBeDefined();
  });

  it('has a key typed too few times as typed, with no numbers', () => {
    const logbook = flown([{ day: TODAY, log: typed('q'.repeat(4)) }]);

    expect(keyOn(logbook, 'q', TODAY)).toMatchObject({
      days: 0,
      ms: null,
      accuracy: null,
    });
  });

  it('has a key whose Runs have faded as typed, with no numbers, and not as untouched', () => {
    const logbook = flown([{ day: daysAgo(70), log: typed('a'.repeat(10)) }]);

    expect(keyOn(logbook, 'a', TODAY)).toMatchObject({ days: 0, ms: null });
  });

  it('has a key nobody has typed nowhere on the keyboard', () => {
    const logbook = flown([{ day: TODAY, log: typed('a'.repeat(10)) }]);

    expect(keyOn(logbook, 'z', TODAY)).toBeUndefined();
  });
});

describe("a key's pace against the keyboard's own average", () => {
  it('is quick for a key twice as fast as the rest and slow for one half as fast again', () => {
    // 12 steps and 36 steps, the same number of hits each: the average is 24.
    const logbook = flown([
      { day: TODAY, log: typed('a'.repeat(10), 12) },
      { day: TODAY, log: typed('b'.repeat(10), 36) },
    ]);

    expect(keyOn(logbook, 'a', TODAY)?.pace).toBe('quick');
    expect(keyOn(logbook, 'b', TODAY)?.pace).toBe('slow');
  });

  it('is steady for the only key, which is its own average', () => {
    const logbook = flown([{ day: TODAY, log: typed('a'.repeat(10)) }]);

    expect(keyOn(logbook, 'a', TODAY)?.pace).toBe('steady');
  });
});
