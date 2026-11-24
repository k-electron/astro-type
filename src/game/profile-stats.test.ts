import { describe, expect, it } from 'vitest';
import { completeSave } from '../../tests/shared/saves';
import {
  clearStage,
  newGame,
  SAMPLE_TEXT,
  STAGE_ID,
  startStage,
  WRONG_KEY,
} from '../../tests/shared/testHelpers';

/**
 * What a cleared Run records in the Logbook counts characters, the way the
 * Run's accuracy does (#140): a Miss mark is one per character however many
 * wrong keys it got, and it is charged to the key the text wanted, never to
 * the wrong key pressed. Every test clears Stage 1 (`clearStage`) and reads
 * the Run's summary in the Profile's Logbook; `clearStage`'s `missMarks` puts a
 * wrong key before each of the first characters and `missesFirst` puts more
 * wrong keys on the first one. Free Flight's share is in free-flight.test.ts;
 * the Run's own keystroke counters are in judgement.test.ts.
 *
 * These tests used to read the Profile's `keyAnalytics` and lifetime totals
 * (`totalCharactersTyped`, `totalMissMarks`, `totalWordsTyped`), which the
 * Logbook replaced (#155). Each guards the same rule as before, now on the
 * Run's summary and the Logbook's lifetime part. What the report says of a
 * Flight log is in src/analytics/run-report.test.ts, and what the fold keeps
 * and forgets is in src/analytics/logbook.test.ts.
 */

const CHARACTERS = Array.from(SAMPLE_TEXT);

type TestGame = ReturnType<typeof newGame>;

/** The summary of the latest Run in the Logbook. */
const lastRunOf = (game: TestGame) => {
  const run = game.getState().profile.logbook.runs.at(-1);
  if (!run) throw new Error('expected a Run in the Logbook');
  return run;
};

/** The key tally of `key` in the latest Run, zero for a key the Run never wanted. */
const tallyOf = (game: TestGame, key: string) => {
  const { firstAttempts, misses } = lastRunOf(game).keys[key] ?? {
    firstAttempts: 0,
    misses: 0,
  };
  return { hits: firstAttempts - misses, misses };
};

const occurrences = (key: string) =>
  CHARACTERS.filter((character) => character === key).length;

/** The distinct characters of the text. */
const KEYS = [...new Set(CHARACTERS)];

describe('the key tallies of a cleared Run: one miss for a character that carries a Miss mark', () => {
  it('three wrong keys on one character cost its key one miss, and that occurrence earns no hit', () => {
    const game = newGame();
    startStage(game, STAGE_ID);
    const first = SAMPLE_TEXT[0];

    clearStage(game, { seconds: 60, missesFirst: 3 });

    // The key's other occurrences were typed clean.
    expect(tallyOf(game, first)).toEqual({
      hits: occurrences(first) - 1,
      misses: 1,
    });
  });

  it('the wrong keys pressed gain nothing: they are no key of the Run, and three of them are one Mix-up', () => {
    const game = newGame();
    startStage(game, STAGE_ID);
    const first = SAMPLE_TEXT[0];

    clearStage(game, { seconds: 60, missesFirst: 3 });

    expect(CHARACTERS).not.toContain(WRONG_KEY);
    const run = lastRunOf(game);
    expect(run.keys[WRONG_KEY]).toBeUndefined();
    // Mix-ups count First attempts only: the 3 wrong keys on the first
    // character are one.
    expect(run.mixUps[first]).toEqual({ [WRONG_KEY]: 1 });
  });

  it("each key's hits and misses add up to its occurrences in the text, and all keys to the text length", () => {
    const game = newGame();
    startStage(game, STAGE_ID);
    const marked = 5; // the first 5 characters each carry a Miss mark
    const markedKeys = CHARACTERS.slice(0, marked);

    clearStage(game, { seconds: 60, missMarks: marked, missesFirst: 3 });

    const { keys } = lastRunOf(game);
    // Only the keys of the text have a tally: no wrong key made an entry.
    expect(Object.keys(keys).sort()).toEqual([...KEYS].sort());
    for (const key of KEYS) {
      const missed = markedKeys.filter((character) => character === key).length;
      expect(tallyOf(game, key), `key "${key}"`).toEqual({
        hits: occurrences(key) - missed,
        misses: missed,
      });
    }
    const total = Object.values(keys).reduce(
      (sum, { firstAttempts }) => sum + firstAttempts,
      0,
    );
    expect(total).toBe(SAMPLE_TEXT.length);
  });

  it('adds a summary to the Logbook the Save already had and leaves its other summaries as they were', () => {
    const save = completeSave();
    const game = newGame(save);
    startStage(game, STAGE_ID);

    clearStage(game, { seconds: 60 });

    const { runs } = game.getState().profile.logbook;
    expect(runs).toHaveLength(save.logbook.runs.length + 1);
    expect(runs.slice(0, -1)).toEqual(save.logbook.runs);
    // A clean Run adds a hit per occurrence of Space.
    expect(tallyOf(game, ' ')).toEqual({
      hits: occurrences(' '),
      misses: 0,
    });
  });
});

describe("the Run's summary: characters typed and Miss marks", () => {
  it('a clean Run is its characters and no Miss marks', () => {
    const game = newGame();
    startStage(game, STAGE_ID);

    clearStage(game, { seconds: 60 });

    expect(lastRunOf(game)).toMatchObject({
      characters: SAMPLE_TEXT.length,
      misses: 0,
    });
  });

  it('a Run with wrong keys is the characters of the text and one Miss mark per marked character, not per wrong key', () => {
    const game = newGame();
    startStage(game, STAGE_ID);

    // 4 marked characters; 2 more wrong keys on the first one: 6 wrong keys in all.
    clearStage(game, { seconds: 60, missMarks: 4, missesFirst: 2 });

    expect(lastRunOf(game)).toMatchObject({
      characters: SAMPLE_TEXT.length,
      misses: 4,
    });
  });

  it("the summary's characters and Miss marks give the Run's own accuracy", () => {
    const game = newGame();
    startStage(game, STAGE_ID);

    clearStage(game, { seconds: 60, missMarks: 4, missesFirst: 2 });

    const debrief = game.getState().debrief;
    if (!debrief)
      throw new Error('expected a Debrief after clearing the Stage');
    const { characters, misses, accuracy } = lastRunOf(game);
    expect(((characters - misses) / characters) * 100).toBeCloseTo(
      debrief.accuracy,
      6,
    );
    expect(accuracy).toBe(debrief.accuracy);
  });

  it('two Runs are two summaries, each with its own characters and Miss marks', () => {
    const game = newGame();
    for (const missMarks of [3, 0]) {
      startStage(game, STAGE_ID);
      clearStage(game, { seconds: 60, missMarks });
    }

    const { runs } = game.getState().profile.logbook;
    expect(runs.map(({ characters }) => characters)).toEqual([
      SAMPLE_TEXT.length,
      SAMPLE_TEXT.length,
    ]);
    expect(runs.map(({ misses }) => misses)).toEqual([3, 0]);
  });
});

describe('words typed: the characters typed over 5, rounded', () => {
  it('a Run adds its characters over 5 to the lifetime words, and the wrong keys pressed do not count', () => {
    const save = completeSave();
    const game = newGame(save);
    startStage(game, STAGE_ID);

    // 77 characters is 15.4 words; with the 3 wrong keys counted it would be 80 / 5 = 16.
    clearStage(game, { seconds: 60, missesFirst: 3 });

    const { lifetime } = game.getState().profile.logbook;
    expect(lifetime.wordsTyped - save.logbook.lifetime.wordsTyped).toBe(
      Math.round(SAMPLE_TEXT.length / 5),
    );
  });
});
