import { describe, expect, it } from 'vitest';
import { completeSave, RETURNING_PLAYER } from '../../tests/shared/saves';
import {
  loadGame,
  newGame,
  SAMPLE_TEXT,
  STAGE_ID,
  startFreeFlight,
  startStage,
  typeText,
  typeTextWithMissMarks,
  WRONG_KEY,
} from '../../tests/shared/testHelpers';

/**
 * Free Flight is a curriculum concept (#73): the Game builds the Stage from
 * what the player sent, `{ text }` alone, and no screen builds one.
 * Free Flight is practice (#86): it earns no Stars and leaves no Stage entry,
 * it pays only the score part of the Credits, and its typing still goes into
 * the Logbook (#140, #155). What the Debrief shows for it is
 * in tests/dom/debrief.test.tsx.
 */

const TEXT = 'ab ba';

describe('launching a Free Flight from text alone', () => {
  it('starts a Run of exactly that text, on a Free Flight Stage', () => {
    const game = newGame();
    game.send({ type: 'LAUNCH_FREE_FLIGHT', text: TEXT });

    const state = game.getState();
    expect(state.screen).toBe('flight-deck');
    expect(state.run.stage.sampleText).toBe(TEXT);
    expect(state.run.stage.origin).toBe('free-flight');
  });
});

describe('where a Stage comes from', () => {
  it('a Stage picked from the curriculum is a Sector Stage', () => {
    const game = newGame();
    startStage(game, STAGE_ID);

    expect(game.getState().run.stage.origin).toBe('sector');
  });
});

describe("a cleared Free Flight leaves the Stars and the Save's Stages alone", () => {
  it('clearing the same text twice changes neither the Stars nor the Stage entries', () => {
    const { game, storage } = loadGame(RETURNING_PLAYER);
    const { stagesProgress, totalStars } = game.getState().profile;

    for (let flight = 0; flight < 2; flight++) {
      startFreeFlight(game, TEXT);
      expect(game.getState().screen).toBe('flight-deck');
      typeText(game, TEXT);
      expect(game.getState().screen).toBe('debrief');

      const profile = game.getState().profile;
      expect(profile.totalStars).toBe(totalStars);
      expect(profile.stagesProgress).toEqual(stagesProgress);
    }

    // And nothing of it went into the Save: the Run was cleared, so the Save was written.
    expect(storage.saved).not.toBeNull();
    expect(Object.keys(storage.saved?.stagesProgress ?? {})).toEqual(
      Object.keys(stagesProgress),
    );
  });
});

describe('what a Free Flight pays', () => {
  /** What one Free Flight of `text` adds to a returning player's Credits, and its Debrief. */
  const paidFor = (text: string) => {
    const game = newGame(RETURNING_PLAYER);
    startFreeFlight(game, text);
    typeText(game, text);
    const debrief = game.getState().debrief;
    if (!debrief) throw new Error('expected a Debrief after the Free Flight');
    return {
      debrief,
      paid:
        game.getState().profile.totalCredits - RETURNING_PLAYER.totalCredits,
    };
  };

  it('is the score part alone, round(score / 200): no flat 100 and no Star part', () => {
    for (const text of ['ab', TEXT, SAMPLE_TEXT]) {
      const { debrief, paid } = paidFor(text);

      expect(debrief.score, text).toBeGreaterThan(0);
      expect(paid, text).toBe(Math.round(debrief.score / 200));
      expect(debrief.creditsEarned, text).toBe(paid);
    }
    // A two-letter text: two hits and the bonus of its one word, 300 points.
    expect(paidFor('ab').debrief.score).toBe(300);
    expect(paidFor('ab').paid).toBe(2);
  });
});

describe('the characters of a Free Flight', () => {
  it('count in the Logbook: each key by how its character went, and the wrong keys pressed gain nothing', () => {
    // A fresh Save, so the numbers are the Run's own.
    const game = newGame();
    startFreeFlight(game, 'ab');
    typeTextWithMissMarks(game, 'ab', [1], { wrongKeys: 3 });

    // "a" was typed right the first time; "b" got three wrong keys, which are
    // one Miss mark on "b" and leave no hit for it.
    const [run] = game.getState().profile.logbook.runs;
    expect(run.keys.a).toMatchObject({ firstAttempts: 1, misses: 0 });
    expect(run.keys.b).toMatchObject({ firstAttempts: 1, misses: 1 });
    expect(run.keys[WRONG_KEY]).toBeUndefined();
  });

  it("add to the Logbook like a Sector Stage's, as a Run with no Sector: characters, Miss marks and words, with no Stage entry and no Stars", () => {
    // 8 characters, 3 of them marked (two wrong keys on each): 1.6 words.
    const text = 'abababab';
    const save = completeSave();
    const game = newGame(save);
    startFreeFlight(game, text);
    typeTextWithMissMarks(game, text, [1, 3, 5], { wrongKeys: 2 });

    expect(game.getState().screen).toBe('debrief');
    const profile = game.getState().profile;
    expect(profile.logbook.runs.at(-1)).toMatchObject({
      where: null,
      characters: text.length,
      misses: 3,
      words: Math.round(text.length / 5),
    });
    expect(profile.logbook.lifetime.runs).toBe(save.logbook.lifetime.runs + 1);
    expect(profile.totalStars).toBe(save.totalStars);
    expect(profile.stagesProgress).toEqual(save.stagesProgress);
  });

  it("give the Run's summary the Free Flight's own accuracy", () => {
    const text = 'abababab';
    const game = newGame();
    startFreeFlight(game, text);
    typeTextWithMissMarks(game, text, [1, 3, 5], { wrongKeys: 2 });

    const debrief = game.getState().debrief;
    if (!debrief) throw new Error('expected a Debrief after the Free Flight');
    const [run] = game.getState().profile.logbook.runs;
    expect(((run.characters - run.misses) / run.characters) * 100).toBeCloseTo(
      debrief.accuracy,
      6,
    );
  });
});
