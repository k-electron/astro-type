/**
 * The Logbook's Sector summaries at the analytics interface: what `foldRun`
 * keeps of each Sector for good and what `journeyReport` reads back, one per
 * Sector reached, in the order first reached. The logs are small and
 * hand-built, so the expectations are worked out by hand (a letter typed 12
 * steps after the one before is 60 WPM, 24 steps is 30 WPM).
 */
import { describe, expect, it } from 'vitest';
import {
  daysAgo,
  FREE_FLIGHT,
  inSector,
  TODAY,
  typed,
} from '../../tests/shared/logbooks';
import {
  EMPTY_LOGBOOK,
  type FoldFacts,
  foldRun,
  journeyReport,
  type Logbook,
} from './logbook';

interface Flown {
  /** How many days before TODAY. */
  ago: number;
  facts?: FoldFacts;
  text?: string;
  gap?: number;
}

/** The Logbook after each Run in turn, oldest first as listed. */
function flown(runs: Flown[]): Logbook {
  return runs.reduce(
    (logbook, { ago, facts = FREE_FLIGHT, text = 'a'.repeat(51), gap }) =>
      foldRun(logbook, typed(text, gap), facts, daysAgo(ago)),
    EMPTY_LOGBOOK,
  );
}

const sectorsOf = (logbook: Logbook, today = TODAY) =>
  journeyReport(logbook, today).sectors;

const sectorNamed = (logbook: Logbook, id: string) => {
  const found = sectorsOf(logbook).find((sector) => sector.id === id);
  if (!found) throw new Error(`no summary for ${id}`);
  return found;
};

describe("a Sector summary's dates, days and Runs", () => {
  it('counts the days the Sector was flown once each, its Runs, and its Run Time', () => {
    const logbook = flown([
      { ago: 10, facts: inSector('s1', 'Start', { runSteps: 600 }) },
      { ago: 10, facts: inSector('s1', 'Start', { runSteps: 300 }) },
      { ago: 4, facts: inSector('s1', 'Start', { runSteps: 100 }) },
    ]);

    expect(sectorNamed(logbook, 's1')).toMatchObject({
      name: 'Start',
      firstDay: daysAgo(10),
      lastDay: daysAgo(4),
      days: 2,
      runs: 3,
      runSteps: 1000,
    });
  });
});

describe("a Sector summary's start and end", () => {
  // Three slow days (30 WPM, 80% accurate), then three quick ones (60 WPM, 100%).
  const slow = inSector('s1', 's1', { accuracy: 80 });
  const quick = inSector('s1', 's1', { accuracy: 100 });
  const logbook = flown([
    { ago: 30, facts: slow, gap: 24 },
    { ago: 29, facts: slow, gap: 24 },
    { ago: 28, facts: slow, gap: 24 },
    { ago: 5, facts: quick, gap: 12 },
    { ago: 4, facts: quick, gap: 12 },
    { ago: 3, facts: quick, gap: 12 },
  ]);

  it("are the letter speed and accuracy over the Sector's first 3 days and last 3 days", () => {
    const { start, end } = sectorNamed(logbook, 's1');

    expect(start.letterWpm).toBeCloseTo(30);
    expect(start.accuracy).toBeCloseTo(80);
    expect(end.letterWpm).toBeCloseTo(60);
    expect(end.accuracy).toBeCloseTo(100);
  });

  it('are the same while the Sector has had no more than 3 days', () => {
    const early = flown([
      { ago: 3, facts: slow, gap: 24 },
      { ago: 2, facts: quick, gap: 12 },
    ]);

    const { start, end } = sectorNamed(early, 's1');
    expect(end).toEqual(start);
    // 50 letters at 24 steps and 50 at 12 steps: 100 letters in 1800 steps is 40 WPM.
    expect(start.letterWpm).toBeCloseTo(40);
  });

  it('pool the Runs of a day, weighting accuracy by characters', () => {
    // 50 characters at 100% and 150 at 80%: (50 * 100 + 150 * 80) / 200 = 85.
    const pooled = flown([
      {
        ago: 1,
        facts: inSector('s1', 's1', { accuracy: 100 }),
        text: 'a'.repeat(50),
      },
      {
        ago: 1,
        facts: inSector('s1', 's1', { accuracy: 80 }),
        text: 'a'.repeat(150),
      },
    ]);

    expect(sectorNamed(pooled, 's1').start.accuracy).toBeCloseTo(85);
  });

  it('are kept for good: the first days stay after their Runs fade', () => {
    // The first 3 days are 30 WPM, and long gone by TODAY.
    const old = flown([
      { ago: 100, facts: slow, gap: 24 },
      { ago: 99, facts: slow, gap: 24 },
      { ago: 98, facts: slow, gap: 24 },
      { ago: 0, facts: quick, gap: 12 },
    ]);

    const summary = sectorNamed(old, 's1');
    expect(summary.start.letterWpm).toBeCloseTo(30);
    // The last 3 days played: two slow ones and today's, 150 letters in 3000 steps.
    expect(summary.end.letterWpm).toBeCloseTo(36);
    expect(summary.days).toBe(4);
  });
});

describe('the keys a Sector brought in', () => {
  it('are the keys first typed while in it, in the order they were typed', () => {
    const logbook = flown([
      { ago: 5, facts: inSector('s1'), text: 'ab' },
      { ago: 4, facts: inSector('s1'), text: 'abc' },
      { ago: 3, facts: inSector('s2'), text: 'dabc' },
    ]);

    expect(sectorNamed(logbook, 's1').keysBroughtIn).toEqual(['a', 'b', 'c']);
    expect(sectorNamed(logbook, 's2').keysBroughtIn).toEqual(['d']);
  });

  it('count a capital and its lower case as one key, as on the keyboard', () => {
    const logbook = flown([
      { ago: 2, facts: inSector('s1'), text: 'A' },
      { ago: 1, facts: inSector('s2'), text: 'aB' },
    ]);

    expect(sectorNamed(logbook, 's1').keysBroughtIn).toEqual(['a']);
    expect(sectorNamed(logbook, 's2').keysBroughtIn).toEqual(['b']);
  });

  it('leave out a key first met in a Free Flight, which is in no Sector', () => {
    const logbook = flown([
      { ago: 4, facts: inSector('s1'), text: 'ab' },
      { ago: 3, facts: FREE_FLIGHT, text: 'cd' },
      { ago: 2, facts: inSector('s2'), text: 'cde' },
    ]);

    expect(sectorNamed(logbook, 's2').keysBroughtIn).toEqual(['e']);
  });

  it('are remembered after the Runs that typed them have faded', () => {
    const logbook = flown([
      { ago: 100, facts: inSector('s1'), text: 'ab' },
      { ago: 0, facts: inSector('s2'), text: 'abc' },
    ]);

    expect(sectorNamed(logbook, 's2').keysBroughtIn).toEqual(['c']);
  });
});

describe("a Sector summary's sparkline", () => {
  const rising = (count: number) =>
    flown(
      Array.from({ length: count }, (_, run) => ({
        ago: 0,
        facts: inSector('s1', 's1', { wpm: run + 1 }),
      })),
    );

  it("lists each Run's speed while there are few", () => {
    expect(sectorNamed(rising(5), 's1').sparkline).toEqual([1, 2, 3, 4, 5]);
  });

  it('holds 48 points at most, merging neighbours, so a long journey keeps its shape', () => {
    const { sparkline } = sectorNamed(rising(200), 's1');

    expect(sparkline).toHaveLength(48);
    expect(sparkline).toEqual([...sparkline].sort((a, b) => a - b));
    // Neighbours are averaged, not dropped: the ends still say where it began and where it got to.
    expect(sparkline[0]).toBeLessThan(15);
    expect(sparkline[47]).toBeGreaterThan(190);
  });

  it('keeps the 48th Run at 48 points, whole', () => {
    expect(sectorNamed(rising(48), 's1').sparkline).toEqual(
      Array.from({ length: 48 }, (_, run) => run + 1),
    );
  });
});

describe('Free Flights', () => {
  it('make no summary and leave every summary as it was', () => {
    const inFlight = flown([{ ago: 3, facts: inSector('s1') }]);
    const before = sectorsOf(inFlight);

    const after = foldRun(inFlight, typed('a'.repeat(51)), FREE_FLIGHT, TODAY);

    expect(sectorsOf(after)).toEqual(before);
    expect(sectorsOf(flown([{ ago: 0 }]))).toEqual([]);
  });
});

describe('the order and the revamp guard', () => {
  it('lists the Sectors in the order they were first reached, however they sort or are flown later', () => {
    const logbook = flown([
      { ago: 30, facts: inSector('z') },
      { ago: 20, facts: inSector('a') },
      // Back in Sector z for Stars: it keeps its place.
      { ago: 10, facts: inSector('z') },
    ]);

    expect(sectorsOf(logbook).map(({ id }) => id)).toEqual(['z', 'a']);
  });

  it('keeps a renamed Sector under one summary, by the latest name it was flown with', () => {
    const logbook = flown([
      { ago: 30, facts: inSector('gone', 'Old Name') },
      { ago: 20, facts: inSector('gone', 'New Name') },
    ]);

    const summaries = sectorsOf(logbook);
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      id: 'gone',
      name: 'New Name',
      runs: 2,
    });
  });

  it('keeps the name a Sector was flown with when it is never flown again, whatever the curriculum says now', () => {
    const logbook = flown([{ ago: 30, facts: inSector('gone', 'Old Name') }]);

    expect(sectorsOf(logbook)).toMatchObject([
      { id: 'gone', name: 'Old Name' },
    ]);
  });

  it('keeps a Sector for good, and its band on the timeline, after its Runs have faded', () => {
    const logbook = flown([
      { ago: 100, facts: inSector('s1', 'Start') },
      { ago: 99, facts: inSector('s1', 'Start') },
      { ago: 98, facts: inSector('s1', 'Start') },
      { ago: 0, facts: FREE_FLIGHT },
    ]);

    const report = journeyReport(logbook, TODAY);
    expect(report.sectors.map(({ name }) => name)).toEqual(['Start']);
    // Not one Run of the Sector is in the last 56 days, and every day still reads its band.
    expect(report.timeline.every(({ sector }) => sector?.id === 's1')).toBe(
      true,
    );
  });

  it('names the furthest Sector ever reached in the sentence, not only the last 8 weeks', () => {
    const logbook = flown([
      { ago: 80, facts: inSector('s1', 'Start') },
      { ago: 70, facts: inSector('s2', 'Far Out') },
      { ago: 2 },
      { ago: 1 },
      { ago: 0 },
    ]);

    expect(journeyReport(logbook, TODAY).sentence).toMatchObject({
      kind: 'journey',
      furthestSector: 'Far Out',
    });
  });
});
