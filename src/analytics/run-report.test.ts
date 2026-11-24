/**
 * The Run's report, at the analytics interface: what `runReport` works out of
 * a Flight log. The hand-built logs are small enough to read; the beginner
 * typist (tests/shared) gives a realistic one.
 */
import { describe, expect, it } from 'vitest';
import {
  beginnerFlightLog,
  beginnerPresses,
} from '../../tests/shared/beginnerTypist';
import type { FlightLog, Keystroke } from './keystroke';
import { type RunFacts, runReport } from './runReport';

const STEPS_PER_SECOND = 60;
const STEADY: RunFacts = { rhythm: 90, rhythmBand: 'Steady' };
const UNEVEN: RunFacts = { rhythm: 50, rhythmBand: 'Uneven' };

/**
 * A Flight log of `text` from presses of `[key, steps since the last key]`. A
 * right key moves on to the next character; a wrong one stays, and the next
 * key on that character is not a First attempt. The Run's own numbers are
 * not what this measures, so they are zero.
 */
function logOf(text: string, presses: [string, number][]): FlightLog {
  const log: Keystroke[] = [];
  let index = 0;
  let firstAttempt = true;
  let step = 0;
  for (const [pressed, gap] of presses) {
    step += gap;
    log.push({
      index,
      expected: text[index],
      pressed,
      firstAttempt,
      step,
      shift: 'none',
      streak: 0,
      accuracy: 100,
      rhythm: 100,
      wpm: null,
    });
    if (pressed === text[index]) {
      index += 1;
      firstAttempt = true;
    } else {
      firstAttempt = false;
    }
  }
  return log;
}

/** Every character of `text` typed right, `gap` steps apart. */
function evenly(text: string, gap: number): [string, number][] {
  return [...text].map((key) => [key, gap]);
}

/** The Clean-hit time (ms) the report gives each character of the text, in order. */
function timesOf(log: FlightLog): (number | null)[] {
  return runReport(log, STEADY).letters.map((letter) => letter.ms);
}

describe('Clean-hit timing', () => {
  it('times a hit by its gap since the First-attempt hit before, and leaves the first key untimed', () => {
    const log = logOf('abc', [
      ['a', 100],
      ['b', 12],
      ['c', 30],
    ]);

    expect(timesOf(log)).toEqual([null, 200, 500]);
  });

  it('keeps a gap of exactly 5 s and drops one step more', () => {
    const fiveSeconds = 5 * STEPS_PER_SECOND;

    const kept = logOf('ab', [
      ['a', 10],
      ['b', fiveSeconds],
    ]);
    const dropped = logOf('ab', [
      ['a', 10],
      ['b', fiveSeconds + 1],
    ]);

    expect(timesOf(kept)).toEqual([null, 5000]);
    expect(timesOf(dropped)).toEqual([null, null]);
  });

  it('drops a gap of 0 steps and keeps a gap of 1', () => {
    expect(
      timesOf(
        logOf('abc', [
          ['a', 10],
          ['b', 0],
          ['c', 1],
        ]),
      ),
    ).toEqual([null, null, 1000 / STEPS_PER_SECOND]);
  });

  it('times neither a key after a Miss nor the retry nor the key after the retry', () => {
    // "b" is missed once ("x"), then typed; "c" follows the retry.
    const log = logOf('abcd', [
      ['a', 10],
      ['x', 10],
      ['b', 10],
      ['c', 10],
      ['d', 10],
    ]);

    // Only "d" follows a First-attempt hit ("c") straight on.
    expect(timesOf(log)).toEqual([null, null, null, 10000 / 60]);
  });

  it('adds the Clean hits up per key', () => {
    const report = runReport(logOf('abab', evenly('abab', 6)), STEADY);

    expect(report.keys.a).toMatchObject({ cleanHits: 1, cleanSteps: 6 });
    expect(report.keys.b).toMatchObject({ cleanHits: 2, cleanSteps: 12 });
  });
});

describe('First attempts and Misses per key', () => {
  it('counts a character once however many wrong keys it got, and none of the retries', () => {
    const log = logOf('ab', [
      ['a', 10],
      ['x', 10],
      ['y', 10],
      ['b', 10],
    ]);

    const { keys } = runReport(log, STEADY);

    expect(keys.a).toMatchObject({ firstAttempts: 1, misses: 0 });
    expect(keys.b).toMatchObject({ firstAttempts: 1, misses: 1 });
  });
});

describe('Mix-ups', () => {
  it('count First attempts only, most frequent first', () => {
    // "a" typed as "s" twice (each on its own character), "b" as "n" once; on
    // the last "a", a second wrong key "d" is a retry and is not a Mix-up.
    const text = 'aabba';
    const log = logOf(text, [
      ['s', 10],
      ['a', 10],
      ['s', 10],
      ['a', 10],
      ['b', 10],
      ['n', 10],
      ['b', 10],
      ['a', 10],
    ]);
    const withRetry = logOf(text, [
      ['s', 10],
      ['a', 10],
      ['s', 10],
      ['a', 10],
      ['b', 10],
      ['n', 10],
      ['d', 10],
      ['b', 10],
      ['a', 10],
    ]);

    expect(runReport(log, STEADY).mixUps).toEqual([
      { expected: 'a', pressed: 's', count: 2 },
      { expected: 'b', pressed: 'n', count: 1 },
    ]);
    expect(runReport(withRetry, STEADY).mixUps).toEqual(
      runReport(log, STEADY).mixUps,
    );
  });
});

describe('the ranking of keys', () => {
  it('ranks a key slow only from 3 Clean hits, slowest first', () => {
    // "f" 4 Clean hits at 10 steps, "j" 3 at 30, "k" 2 at 90 (too few).
    const text = 'fffffjjjkk';
    const log = logOf(text, [
      ...evenly('fffff', 10),
      ...evenly('jjj', 30),
      ...evenly('kk', 90),
    ]);

    const { slowestKeys } = runReport(log, STEADY);

    expect(slowestKeys.map((key) => key.character)).toEqual(['j', 'f']);
    expect(slowestKeys[0]).toMatchObject({ ms: 500, cleanHits: 3 });
  });

  it('ranks a key inaccurate only from 3 First attempts with a Miss among them', () => {
    // "a": 3 First attempts, 1 Miss. "b": 2 First attempts, both Misses.
    // "c": 3 First attempts, no Miss.
    const text = 'aaabbccc';
    const log = logOf(text, [
      ['a', 10],
      ['x', 10],
      ['a', 10],
      ['a', 10],
      ['y', 10],
      ['b', 10],
      ['z', 10],
      ['b', 10],
      ...evenly('ccc', 10),
    ]);

    const { leastAccurateKeys } = runReport(log, STEADY);

    expect(leastAccurateKeys).toEqual([
      expect.objectContaining({ character: 'a', firstAttempts: 3, misses: 1 }),
    ]);
  });

  it('puts the key missed the larger share of the time first', () => {
    // "a": 1 of 5. "b": 1 of 3.
    const text = 'aaaaabbb';
    const log = logOf(text, [
      ['x', 10],
      ...evenly('aaaaa', 10),
      ['y', 10],
      ...evenly('bbb', 10),
    ]);

    expect(
      runReport(log, STEADY).leastAccurateKeys.map((key) => key.character),
    ).toEqual(['b', 'a']);
  });
});

describe('the shade of each letter against the Run average', () => {
  it('is quick under 80%, steady up to 120%, slow from 120% and very slow from 160%', () => {
    // Six timed gaps averaging exactly 100 steps, after an untimed first key.
    const gaps = [80, 120, 160, 40, 100, 100];
    const text = 'abcdefg';
    const log = logOf(text, [
      [text[0], 5],
      ...gaps.map((gap, i): [string, number] => [text[i + 1], gap]),
    ]);

    const paces = runReport(log, STEADY).letters.map((letter) => letter.pace);

    expect(paces).toEqual([
      null,
      'steady', // 80%: not under 80%
      'slow', // 120%: slow from 120%
      'very slow', // 160%: very slow from 160%
      'quick', // 40%
      'steady',
      'steady',
    ]);
  });

  it('is unset for every letter when no key was timed', () => {
    const report = runReport(logOf('ab', [['a', 10]]), STEADY);

    expect(report.averageMs).toBeNull();
    expect(report.letters.map((letter) => letter.pace)).toEqual([null]);
  });

  it('marks a missed letter with the wrong keys that were pressed on it', () => {
    const log = logOf('ab', [
      ['a', 10],
      ['x', 10],
      ['y', 10],
      ['b', 10],
    ]);

    const [a, b] = runReport(log, STEADY).letters;

    expect(a).toMatchObject({ missed: false, wrongKeys: [] });
    expect(b).toMatchObject({ missed: true, wrongKeys: ['x', 'y'] });
  });
});

describe('the one thing to work on', () => {
  it('is the key missed most, with its finger, when a key was missed more than once', () => {
    // "a" (left pinky) missed twice, "s" once.
    const text = 'asasas';
    const log = logOf(text, [
      ['q', 10],
      ['a', 10],
      ['s', 10],
      ['q', 10],
      ['a', 10],
      ['w', 10],
      ['s', 10],
      ['a', 10],
      ['s', 10],
    ]);

    expect(runReport(log, STEADY).workOn).toEqual({
      kind: 'missed key',
      character: 'a',
      misses: 2,
      firstAttempts: 3,
      finger: 'LEFT_PINKY',
    });
  });

  it('is the slowest key, with its finger, when nothing was missed twice', () => {
    // "f" is quick and "j" slow, and nothing was missed.
    const text = 'ffffjjjj';
    const log = logOf(text, [...evenly('ffff', 10), ...evenly('jjjj', 40)]);

    const { workOn, averageMs } = runReport(log, STEADY);

    expect(workOn).toMatchObject({
      kind: 'slow key',
      character: 'j',
      finger: 'RIGHT_INDEX',
    });
    expect(workOn.kind === 'slow key' && workOn.averageMs).toBeCloseTo(
      averageMs ?? 0,
    );
  });

  it('is uneven Rhythm when the keys are accurate and none is slow, and the Rhythm was uneven', () => {
    const log = logOf('ffffjjjj', evenly('ffffjjjj', 10));

    expect(runReport(log, UNEVEN).workOn).toEqual({
      kind: 'uneven rhythm',
      rhythm: 50,
    });
  });

  it('is an even Run with no Misses to mention when the Run was clean and even', () => {
    const log = logOf('ffffjjjj', evenly('ffffjjjj', 10));

    expect(runReport(log, STEADY).workOn).toEqual({
      kind: 'even run',
      misses: 0,
    });
  });

  it('counts single Misses on different keys, so an even Run is not called clean', () => {
    // "f", "j" and "d" each missed once; nothing slow, Rhythm steady.
    const text = 'ffjjdd';
    const log = logOf(text, [
      ['x', 10],
      ['f', 10],
      ['f', 10],
      ['y', 10],
      ['j', 10],
      ['j', 10],
      ['z', 10],
      ['d', 10],
      ['d', 10],
    ]);

    expect(runReport(log, STEADY).workOn).toEqual({
      kind: 'even run',
      misses: 3,
    });
  });

  it('puts accuracy before speed: a repeated Miss beats a slower key', () => {
    const text = 'aaaajjjjjj';
    const log = logOf(text, [
      ['x', 10],
      ['a', 10],
      ['a', 10],
      ['x', 10],
      ['a', 10],
      ['a', 10],
      ...evenly('jjjjjj', 40),
    ]);

    expect(runReport(log, STEADY).workOn).toMatchObject({
      kind: 'missed key',
      character: 'a',
    });
  });
});

describe('a beginner typist Run', () => {
  const TEXT =
    'the quiet fox jumps over a lazy dog and the brave pilot flies past bright stars';
  const log = beginnerFlightLog(TEXT, 3);
  const report = runReport(log, STEADY);

  it('reports every character of the text in order', () => {
    expect(report.letters.map((letter) => letter.character).join('')).toBe(
      TEXT,
    );
  });

  it('counts each character as one First attempt, and the Misses as the letters marked missed', () => {
    const firstAttempts = Object.values(report.keys).reduce(
      (sum, key) => sum + key.firstAttempts,
      0,
    );
    expect(firstAttempts).toBe(TEXT.length);

    // A letter carries a Miss mark when its First attempt was wrong; later
    // wrong keys on it are retries.
    const firstAttemptMisses = log.filter(
      (key) => key.firstAttempt && key.pressed !== key.expected,
    ).length;
    const misses = Object.values(report.keys).reduce(
      (sum, key) => sum + key.misses,
      0,
    );
    expect(misses).toBe(firstAttemptMisses);
    expect(misses).toBeGreaterThan(0);
  });

  it('lists at most five of each ranking, each key only once', () => {
    for (const list of [
      report.slowestKeys,
      report.leastAccurateKeys,
      report.mixUps,
    ]) {
      expect(list.length).toBeLessThanOrEqual(5);
    }
    const slow = report.slowestKeys.map((key) => key.character);
    expect(new Set(slow).size).toBe(slow.length);
  });
});

describe('the beginner typist', () => {
  const TEXT =
    'the quiet fox jumps over a lazy dog and the brave pilot flies past bright stars while the crew sings softly in the hold';

  it('types the same Run for the same seed and a different one for another', () => {
    expect(beginnerPresses(TEXT, 5)).toEqual(beginnerPresses(TEXT, 5));
    expect(beginnerPresses(TEXT, 5)).not.toEqual(beginnerPresses(TEXT, 6));
  });

  it('is a beginner: about 12 WPM and 93% accuracy over many Runs', () => {
    let wpm = 0;
    let accuracy = 0;
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    for (const seed of seeds) {
      const log = beginnerFlightLog(TEXT, seed);
      const typingSteps = log[log.length - 1].step - log[0].step;
      wpm += (TEXT.length - 1) / 5 / (typingSteps / 3600);
      const marks = new Set(
        log.filter((key) => key.pressed !== key.expected).map((k) => k.index),
      ).size;
      accuracy += ((TEXT.length - marks) * 100) / TEXT.length;
    }
    expect(wpm / seeds.length).toBeGreaterThan(10);
    expect(wpm / seeds.length).toBeLessThan(15);
    expect(accuracy / seeds.length).toBeGreaterThan(90);
    expect(accuracy / seeds.length).toBeLessThan(96);
  });
});
