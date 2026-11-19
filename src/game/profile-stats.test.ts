import { describe, expect, it } from 'vitest';
import { completeSave } from '../../tests/shared/saves';
import {
  clearStage,
  newGame,
  SAMPLE_TEXT,
  STAGE_ID,
  startedGame,
  startStage,
  WRONG_KEY,
} from '../../tests/shared/testHelpers';

/**
 * What a cleared Run records on the Profile counts characters, the way the
 * Run's accuracy does (#140): a Miss mark is one per character however many
 * wrong keys it got, and it is charged to the key the text wanted, never to
 * the wrong key pressed. Every test clears Stage 1 (`clearStage`) and reads
 * the Profile; `clearStage`'s `missMarks` puts a wrong key before each of the
 * first characters and `missesFirst` puts more wrong keys on the first one.
 * Free Flight's share is in free-flight.test.ts; the Run's own keystroke
 * counters are in judgement.test.ts.
 */

const CHARACTERS = Array.from(SAMPLE_TEXT);

const profileOf = (game: ReturnType<typeof newGame>) => game.getState().profile;

/** The key stats of `key`, zero for a key the Profile has no entry for. */
const statsOf = (game: ReturnType<typeof newGame>, key: string) =>
  profileOf(game).keyAnalytics[key] ?? { hits: 0, misses: 0 };

const occurrences = (key: string) =>
  CHARACTERS.filter((character) => character === key).length;

/** The distinct characters of the text, each with how often it occurs. */
const KEYS = [...new Set(CHARACTERS)];

describe('the key stats of a cleared Run: one miss for a character that carries a Miss mark', () => {
  it('three wrong keys on one character cost its key one miss, and that occurrence earns no hit', () => {
    const game = newGame();
    startStage(game, STAGE_ID);
    const first = SAMPLE_TEXT[0];

    clearStage(game, { seconds: 60, missesFirst: 3 });

    // The key's other occurrences were typed clean.
    expect(statsOf(game, first)).toEqual({
      hits: occurrences(first) - 1,
      misses: 1,
    });
  });

  it('the wrong keys pressed gain nothing', () => {
    const game = newGame();
    startStage(game, STAGE_ID);

    clearStage(game, { seconds: 60, missesFirst: 3, missMarks: 5 });

    expect(CHARACTERS).not.toContain(WRONG_KEY);
    expect(statsOf(game, WRONG_KEY)).toEqual({ hits: 0, misses: 0 });
  });

  it("each key's hits and misses add up to its occurrences in the text, and all keys to the text length", () => {
    const game = newGame();
    startStage(game, STAGE_ID);
    const marked = 5; // the first 5 characters each carry a Miss mark
    const markedKeys = CHARACTERS.slice(0, marked);

    clearStage(game, { seconds: 60, missMarks: marked, missesFirst: 3 });

    const { keyAnalytics } = profileOf(game);
    // Only the keys of the text have stats: no wrong key made an entry.
    expect(Object.keys(keyAnalytics).sort()).toEqual([...KEYS].sort());
    for (const key of KEYS) {
      const missed = markedKeys.filter((character) => character === key).length;
      expect(statsOf(game, key), `key "${key}"`).toEqual({
        hits: occurrences(key) - missed,
        misses: missed,
      });
    }
    const total = Object.values(keyAnalytics).reduce(
      (sum, { hits, misses }) => sum + hits + misses,
      0,
    );
    expect(total).toBe(SAMPLE_TEXT.length);
  });

  it('a wrong key a shield absorbs still marks the character as a miss', () => {
    const game = startedGame({ deflectorShields: 3 });
    const first = SAMPLE_TEXT[0];

    clearStage(game, { seconds: 60, missesFirst: 3 });

    expect(statsOf(game, first)).toEqual({
      hits: occurrences(first) - 1,
      misses: 1,
    });
    expect(profileOf(game).totalMissMarks).toBe(1);
  });

  it('adds to the key stats the Save already had', () => {
    const save = completeSave();
    const game = newGame(save);
    startStage(game, STAGE_ID);

    clearStage(game, { seconds: 60 });

    // Space is in the Save and in the text: a clean Run adds a hit per occurrence.
    expect(statsOf(game, ' ')).toEqual({
      hits: save.keyAnalytics[' '].hits + occurrences(' '),
      misses: save.keyAnalytics[' '].misses,
    });
  });
});

describe('the lifetime stats of a cleared Run: characters typed and Miss marks', () => {
  it('a clean Run adds its characters and no Miss marks', () => {
    const game = newGame();
    startStage(game, STAGE_ID);

    clearStage(game, { seconds: 60 });

    expect(profileOf(game).totalCharactersTyped).toBe(SAMPLE_TEXT.length);
    expect(profileOf(game).totalMissMarks).toBe(0);
  });

  it('a Run with wrong keys adds the characters of the text and one Miss mark per marked character, not per wrong key', () => {
    const save = completeSave();
    const game = newGame(save);
    startStage(game, STAGE_ID);

    // 4 marked characters; 2 more wrong keys on the first one: 6 wrong keys in all.
    clearStage(game, { seconds: 60, missMarks: 4, missesFirst: 2 });

    const profile = profileOf(game);
    expect(profile.totalCharactersTyped - save.totalCharactersTyped).toBe(
      SAMPLE_TEXT.length,
    );
    expect(profile.totalMissMarks - save.totalMissMarks).toBe(4);
  });

  it("lifetime accuracy, (characters - Miss marks) / characters, is the Run's accuracy for a single Run", () => {
    const game = newGame();
    startStage(game, STAGE_ID);

    clearStage(game, { seconds: 60, missMarks: 4, missesFirst: 2 });

    const debrief = game.getState().debrief;
    if (!debrief)
      throw new Error('expected a Debrief after clearing the Stage');
    const { totalCharactersTyped, totalMissMarks } = profileOf(game);
    expect(
      ((totalCharactersTyped - totalMissMarks) / totalCharactersTyped) * 100,
    ).toBeCloseTo(debrief.accuracy, 6);
  });

  it('two Runs add up: the second Run adds its own characters and Miss marks', () => {
    const game = newGame();
    for (const missMarks of [3, 0]) {
      startStage(game, STAGE_ID);
      clearStage(game, { seconds: 60, missMarks });
    }

    expect(profileOf(game).totalCharactersTyped).toBe(2 * SAMPLE_TEXT.length);
    expect(profileOf(game).totalMissMarks).toBe(3);
  });
});

describe('words typed: the characters typed over 5, rounded', () => {
  it('a Run adds its characters over 5, and the wrong keys pressed do not count', () => {
    const save = completeSave();
    const game = newGame(save);
    startStage(game, STAGE_ID);

    // 77 characters is 15.4 words; with the 3 wrong keys counted it would be 80 / 5 = 16.
    clearStage(game, { seconds: 60, missesFirst: 3 });

    expect(profileOf(game).totalWordsTyped - save.totalWordsTyped).toBe(
      Math.round(SAMPLE_TEXT.length / 5),
    );
  });
});
