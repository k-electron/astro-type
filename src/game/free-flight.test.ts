import { describe, expect, it } from 'vitest';
import { RETURNING_PLAYER } from '../../tests/shared/saves';
import {
  loadGame,
  miss,
  newGame,
  SAMPLE_TEXT,
  STAGE_ID,
  startFreeFlight,
  startStage,
  typeText,
} from '../../tests/shared/testHelpers';

/**
 * Free Flight is a curriculum concept (#73): the Game builds the Stage from
 * what the player sent, `{ text, targetWpm }`, and no screen builds one.
 * Free Flight is practice (#86): it earns no Stars and leaves no Stage entry,
 * it pays only the score part of the Credits, and its keystrokes still count
 * in Analytics. What the Debrief shows for it is in tests/dom/debrief.test.tsx.
 */

const TEXT = 'ab ba';

describe('launching a Free Flight from { text, targetWpm }', () => {
  it('starts a Run of exactly that text, on a Free Flight Stage', () => {
    const game = newGame();
    game.send({ type: 'LAUNCH_FREE_FLIGHT', text: TEXT, targetWpm: 30 });

    const state = game.getState();
    expect(state.screen).toBe('flight-deck');
    expect(state.run.stage.sampleText).toBe(TEXT);
    expect(state.run.stage.origin).toBe('free-flight');
    expect(state.run.stage.targetWpm).toBe(30);
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
    // A two-letter text pays about 1.
    expect(paidFor('ab').paid).toBe(1);
  });
});

describe('the keystrokes of a Free Flight', () => {
  it('count in Analytics: each key hit, each Miss, and the lifetime totals', () => {
    // A fresh Save, so the numbers are the Run's own.
    const game = newGame();
    startFreeFlight(game, 'ab');
    typeText(game, 'a');
    miss(game);
    typeText(game, 'b');

    const profile = game.getState().profile;
    expect(profile.keyAnalytics.a.hits).toBe(1);
    expect(profile.keyAnalytics.b.hits).toBe(1);
    expect(
      Object.values(profile.keyAnalytics).reduce(
        (misses, key) => misses + key.misses,
        0,
      ),
    ).toBe(1);
    expect(profile.totalKeystrokes).toBe(3);
    expect(profile.totalErrors).toBe(1);
  });
});
