/**
 * The Logbook, at the analytics interface: what `foldRun` makes of a cleared
 * Run, what it keeps for good and what it lets fade, and what `journeyReport`
 * reads back. The hand-built logs are small enough to read; the numbers in the
 * expectations are worked out by hand from them (a letter typed in 12 steps is
 * 60 WPM, in 24 steps 30 WPM), never from the code under test.
 */
import { describe, expect, it } from 'vitest';
import { evenly, logOf, withShift } from '../../tests/shared/flightLog';
import { FREE_FLIGHT, lettersAt, TODAY } from '../../tests/shared/logbooks';
import { addDays } from './days';
import {
  EMPTY_LOGBOOK,
  type FoldFacts,
  foldRun,
  journeyReport,
  type Logbook,
  LogbookSchema,
} from './logbook';

/** The Logbook after one Run of `log` on each of the `days`, oldest first. */
function flownOn(
  days: string[],
  log = lettersAt(51, 12),
  facts: FoldFacts = FREE_FLIGHT,
): Logbook {
  return days.reduce(
    (logbook, day) => foldRun(logbook, log, facts, day),
    EMPTY_LOGBOOK,
  );
}

describe('a Run folded into the Logbook', () => {
  // "ab c": "c" is missed once on its first try, then hit.
  const log = logOf('ab c', [
    ['a', 10],
    ['b', 20],
    [' ', 30],
    ['x', 5],
    ['c', 40],
  ]);

  it("adds a summary of the Run's typing, tallied by key, Mix-up and Letter pair", () => {
    const logbook = foldRun(EMPTY_LOGBOOK, log, FREE_FLIGHT, TODAY);

    expect(logbook.runs).toHaveLength(1);
    expect(logbook.runs[0]).toMatchObject({
      day: TODAY,
      where: null,
      runSteps: 600,
      characters: 4,
      words: 1,
      firstAttempts: 4,
      misses: 1,
      // Only "b" is a letter typed as a Clean hit, 20 steps after "a".
      letterCleanHits: 1,
      letterCleanSteps: 20,
      wpm: 20,
      accuracy: 100,
      rhythm: 90,
      mixUps: { c: { x: 1 } },
      pairs: {
        ab: { count: 1, steps: 20, misses: 0 },
        'b ': { count: 1, steps: 30, misses: 0 },
        ' c': { count: 0, steps: 0, misses: 1 },
      },
    });
    expect(logbook.runs[0].keys.b).toMatchObject({
      firstAttempts: 1,
      misses: 0,
      cleanHits: 1,
      cleanSteps: 20,
    });
    // The key was missed on its first try, so the retry that hit isn't timed.
    expect(logbook.runs[0].keys.c).toMatchObject({
      firstAttempts: 1,
      misses: 1,
      cleanHits: 0,
    });
  });

  it('copies where a Sector Stage was flown, and nothing for a Free Flight', () => {
    const where = {
      sector: { id: 'sector-1', name: 'Orion Belt' },
      stage: { id: 's1-l1', name: 'First Light' },
    };

    const sector = foldRun(
      EMPTY_LOGBOOK,
      log,
      { ...FREE_FLIGHT, where },
      TODAY,
    );
    const free = foldRun(EMPTY_LOGBOOK, log, FREE_FLIGHT, TODAY);

    expect(sector.runs[0].where).toEqual(where);
    expect(free.runs[0].where).toBeNull();
  });

  it('still folds a Run whose Sector the curriculum no longer has', () => {
    const where = {
      sector: { id: 'sector-gone', name: 'A Sector Since Removed' },
      stage: { id: 'gone-1', name: 'Gone' },
    };

    const logbook = foldRun(
      EMPTY_LOGBOOK,
      log,
      { ...FREE_FLIGHT, where },
      TODAY,
    );

    expect(logbook.runs[0].where).toEqual(where);
    expect(logbook.lifetime.runs).toBe(1);
  });

  it('counts the Shift of each shifted character on its First attempts only', () => {
    // "A", "S", "D", "F" and "G" are typed by left-hand fingers, so the right
    // Shift is the opposite hand's. "a" needs none: a Shift held for it is not counted.
    const text = 'ASDFGa';
    const shifted = withShift(logOf(text, evenly(text, 20)), [
      'right',
      'left',
      'both',
      'none',
      'unknown',
      'left',
    ]);

    const { keys } = foldRun(EMPTY_LOGBOOK, shifted, FREE_FLIGHT, TODAY)
      .runs[0];

    expect(keys.A).toMatchObject({ shiftOpposite: 1, shiftSame: 0 });
    expect(keys.S).toMatchObject({ shiftOpposite: 0, shiftSame: 1 });
    expect(keys.D).toMatchObject({ shiftBoth: 1 });
    expect(keys.F).toMatchObject({ shiftNone: 1 });
    expect(keys.G).toMatchObject({ shiftUnknown: 1 });
    expect(keys.a).toMatchObject({
      shiftOpposite: 0,
      shiftSame: 0,
      shiftBoth: 0,
      shiftNone: 0,
      shiftUnknown: 0,
    });
  });

  it('counts a shifted character missed on its First attempt, whatever Shift the retry held', () => {
    // "A" is hit by "q" first (a Miss with the right Shift), then right with the left.
    const miss = withShift(
      logOf('A', [
        ['q', 20],
        ['A', 20],
      ]),
      ['right', 'left'],
    );

    const { keys } = foldRun(EMPTY_LOGBOOK, miss, FREE_FLIGHT, TODAY).runs[0];

    expect(keys.A).toMatchObject({
      firstAttempts: 1,
      misses: 1,
      shiftOpposite: 1,
      shiftSame: 0,
    });
  });
});

describe('what the Logbook lets fade', () => {
  // Today is 2026-11-23: 56 days back is 2026-09-28, which has faded, and 55
  // days back is 2026-09-29, which is the oldest day kept.
  it('keeps a summary 55 days old and deletes one 56 days old', () => {
    const old = flownOn(['2026-09-28', '2026-09-29']);
    // Nothing is deleted while the two are still the last 56 days of their own fold.
    expect(old.runs).toHaveLength(2);

    const logbook = foldRun(old, lettersAt(5, 12), FREE_FLIGHT, TODAY);

    expect(logbook.runs.map((run) => run.day)).toEqual(['2026-09-29', TODAY]);
  });

  it('counts days on the calendar, so a daylight-saving change does not move the edge', () => {
    // The clocks go forward on 2026-03-29 (Europe) and 2026-03-08 (the US):
    // 2026-02-03 is 55 days before 2026-03-30, and 2026-02-02 is 56.
    const logbook = foldRun(
      flownOn(['2026-02-02', '2026-02-03']),
      lettersAt(5, 12),
      FREE_FLIGHT,
      '2026-03-30',
    );

    expect(logbook.runs.map((run) => run.day)).toEqual([
      '2026-02-03',
      '2026-03-30',
    ]);
  });

  it('keeps every lifetime total of the days it deleted', () => {
    const faded = flownOn(['2026-01-05', '2026-01-06']);

    const logbook = foldRun(faded, lettersAt(5, 12), FREE_FLIGHT, TODAY);

    expect(logbook.runs).toHaveLength(1);
    expect(logbook.lifetime).toMatchObject({
      firstDay: '2026-01-05',
      lastDay: TODAY,
      daysPlayed: 3,
      runs: 3,
      practiceSteps: 3 * FREE_FLIGHT.runSteps,
    });
  });

  it('reads only the last 56 days, even from a Save that has not folded since', () => {
    const stale = flownOn(['2026-09-01', '2026-11-20']);

    const report = journeyReport(stale, TODAY);

    // Only the Run of the 20th: 51 letters, one "a" each, on one day.
    expect(report.keyboards[TODAY]?.keys.a).toMatchObject({
      days: 1,
      tries: 51,
    });
  });
});

describe('what the Logbook keeps for good', () => {
  it('adds up the Runs, the practice time and the words typed', () => {
    const logbook = flownOn(['2026-11-01', '2026-11-01', '2026-11-05']);

    expect(logbook.lifetime).toMatchObject({
      firstDay: '2026-11-01',
      lastDay: '2026-11-05',
      daysPlayed: 2,
      runs: 3,
      practiceSteps: 1800,
      // 51 characters over 5 is 10.2 words: 10 for each Run.
      wordsTyped: 30,
    });
  });

  it('counts a day once, and does not count a day again when the clock moves back', () => {
    const logbook = flownOn(['2026-11-10', '2026-11-09']);

    expect(logbook.lifetime.daysPlayed).toBe(1);
    expect(logbook.lifetime.firstDay).toBe('2026-11-09');
    expect(logbook.lifetime.lastDay).toBe('2026-11-10');
  });

  describe("the best day's 50-letter floor", () => {
    it('counts a day with 50 letters typed as Clean hits', () => {
      // 51 letters make 50 timed hits, 12 steps each: 60 WPM.
      const logbook = flownOn([TODAY], lettersAt(51, 12));

      expect(logbook.lifetime.bestDay).toEqual({ day: TODAY, letterWpm: 60 });
    });

    it('leaves out a day with 49', () => {
      const logbook = flownOn([TODAY], lettersAt(50, 12));

      expect(logbook.lifetime.bestDay).toBeNull();
    });

    it("counts only letters: a day's digits and spaces don't make up the 50", () => {
      const text = `${'a'.repeat(30)}${'1 '.repeat(30)}`;
      const logbook = flownOn([TODAY], logOf(text, evenly(text, 12)));

      expect(logbook.lifetime.bestDay).toBeNull();
    });

    it('is the fastest day, and a faster day later replaces it', () => {
      const slow = flownOn(['2026-11-01'], lettersAt(51, 24));
      expect(slow.lifetime.bestDay).toEqual({
        day: '2026-11-01',
        letterWpm: 30,
      });

      const faster = foldRun(
        slow,
        lettersAt(51, 12),
        FREE_FLIGHT,
        '2026-11-02',
      );
      expect(faster.lifetime.bestDay).toEqual({
        day: '2026-11-02',
        letterWpm: 60,
      });

      const slower = foldRun(
        faster,
        lettersAt(51, 30),
        FREE_FLIGHT,
        '2026-11-03',
      );
      expect(slower.lifetime.bestDay).toEqual({
        day: '2026-11-02',
        letterWpm: 60,
      });
    });

    it("is the whole day's speed, so a slower Run later the same day pulls it down", () => {
      // 100 timed hits: 50 in 600 steps and 50 in 3000 steps, 3600 in all: 20 WPM.
      const first = foldRun(
        EMPTY_LOGBOOK,
        lettersAt(51, 12),
        FREE_FLIGHT,
        TODAY,
      );
      expect(first.lifetime.bestDay?.letterWpm).toBe(60);

      const second = foldRun(first, lettersAt(51, 60), FREE_FLIGHT, TODAY);

      expect(second.lifetime.bestDay).toEqual({ day: TODAY, letterWpm: 20 });
    });

    it("is not lost to a later day's best, which a slower Run then pulls down", () => {
      // Day A, a good while ago: 30 WPM. It fades while day B (60 WPM) is held.
      const a = flownOn(['2026-01-10'], lettersAt(51, 24));
      const b = foldRun(a, lettersAt(51, 12), FREE_FLIGHT, '2026-03-20');
      expect(b.runs.map((run) => run.day)).toEqual(['2026-03-20']);
      expect(b.lifetime.bestDay).toEqual({ day: '2026-03-20', letterWpm: 60 });

      // A slower Run later on day B brings that day down to 20 WPM, below A's 30.
      const slowerB = foldRun(b, lettersAt(51, 60), FREE_FLIGHT, '2026-03-20');

      expect(slowerB.lifetime.bestDay).toEqual({
        day: '2026-01-10',
        letterWpm: 30,
      });
    });

    it('survives its own day fading from the Logbook', () => {
      const fast = flownOn(['2026-01-10'], lettersAt(51, 12));

      const later = foldRun(fast, lettersAt(51, 24), FREE_FLIGHT, TODAY);

      expect(later.runs.map((run) => run.day)).toEqual([TODAY]);
      expect(later.lifetime.bestDay).toEqual({
        day: '2026-01-10',
        letterWpm: 60,
      });
    });
  });

  describe('the starting speed', () => {
    it("is the letter speed over the first 3 days played, and later days don't move it", () => {
      // Days 1 to 3 at 30 WPM, then a day at 60 WPM.
      const logbook = [
        ['2026-11-01', 24],
        ['2026-11-02', 24],
        ['2026-11-03', 24],
        ['2026-11-04', 12],
      ].reduce(
        (so_far, [day, gap]) =>
          foldRun(so_far, lettersAt(51, Number(gap)), FREE_FLIGHT, String(day)),
        EMPTY_LOGBOOK,
      );

      expect(journeyReport(logbook, '2026-11-04').startingLetterWpm).toBe(30);
    });

    it('still counts a first day that has long since faded', () => {
      // Three days a long time apart: the first two have faded by the third.
      // Together they are 150 timed hits over 2400 steps, 45 WPM; the third
      // day alone, the only one still held, would say 60.
      const logbook = [
        ['2026-01-01', 24],
        ['2026-05-01', 12],
        ['2026-11-01', 12],
        ['2026-11-20', 6],
      ].reduce(
        (so_far, [day, gap]) =>
          foldRun(so_far, lettersAt(51, Number(gap)), FREE_FLIGHT, String(day)),
        EMPTY_LOGBOOK,
      );

      expect(journeyReport(logbook, '2026-11-20').startingLetterWpm).toBe(45);
    });

    it('is not there before any letter was timed', () => {
      expect(journeyReport(EMPTY_LOGBOOK, TODAY).startingLetterWpm).toBeNull();
    });
  });
});

describe('the Journey', () => {
  it('reads the totals kept for good, and the keys of the last 56 days added up', () => {
    const logbook = flownOn([addDays(TODAY, -3), addDays(TODAY, -1)]);

    const report = journeyReport(logbook, TODAY);

    expect(report.totals).toMatchObject({
      daysPlayed: 2,
      practiceSteps: 1200,
      wordsTyped: 20,
    });
    expect(report.keyboards[TODAY]?.keys.a).toMatchObject({
      days: 2,
      tries: 102,
      misses: 0,
    });
  });

  it('is empty for a player who has not cleared a Run', () => {
    const report = journeyReport(EMPTY_LOGBOOK, TODAY);

    expect(report.totals).toEqual({
      daysPlayed: 0,
      practiceSteps: 0,
      wordsTyped: 0,
      bestDay: null,
    });
    expect(report.keyboards[TODAY]?.keys ?? {}).toEqual({});
  });
});

describe('reading a Logbook out of a Save', () => {
  const good = flownOn([TODAY]);

  it('reads a Logbook it wrote back as it was', () => {
    expect(LogbookSchema.parse(JSON.parse(JSON.stringify(good)))).toEqual(good);
  });

  it.each([
    ['nothing', undefined],
    ['text', 'all of it'],
    ['a list', [1, 2]],
    ['null', null],
  ])('reads %s as an empty Logbook, never failing', (_, stored) => {
    expect(LogbookSchema.parse(stored)).toEqual(EMPTY_LOGBOOK);
  });

  it('drops a summary that is damaged and keeps the others', () => {
    const stored = {
      ...good,
      runs: [
        good.runs[0],
        { ...good.runs[0], day: 'yesterday' },
        'a Run',
        { ...good.runs[0], day: '2026-11-22' },
      ],
    };

    const read = LogbookSchema.parse(stored);

    expect(read.runs.map((run) => run.day)).toEqual([TODAY, '2026-11-22']);
  });

  it('reads a damaged lifetime part as empty and keeps the Runs', () => {
    const read = LogbookSchema.parse({ ...good, lifetime: 'broken' });

    expect(read.runs).toEqual(good.runs);
    expect(read.lifetime).toEqual(EMPTY_LOGBOOK.lifetime);
  });

  it('reads a wrong number in a summary as 0 and keeps the rest of it', () => {
    const stored = {
      ...good,
      runs: [{ ...good.runs[0], wpm: 'fast', misses: -3 }],
    };

    const [run] = LogbookSchema.parse(stored).runs;

    expect(run.wpm).toBe(0);
    expect(run.misses).toBe(0);
    expect(run.keys).toEqual(good.runs[0].keys);
  });
});
