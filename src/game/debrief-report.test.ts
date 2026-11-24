import { describe, expect, it } from 'vitest';
import {
  beginnerPresses,
  playPresses,
  typingOn,
} from '../../tests/shared/beginnerTypist';
import {
  newGame,
  startFreeFlight,
  typeText,
  WRONG_KEY,
} from '../../tests/shared/testHelpers';

/**
 * The report on a cleared Run (#153): worked out once at the clear and carried
 * by the Debrief, with the rhythm the Run itself ended on. What the report
 * says of a Flight log is in src/analytics/run-report.test.ts.
 */

const TEXT = 'the quiet fox jumps over a lazy dog and the brave pilot';

function clearedBeginnerRun() {
  const game = newGame();
  startFreeFlight(game, TEXT);
  playPresses(typingOn(game), beginnerPresses(TEXT, 4));
  return game;
}

describe('the Debrief of a cleared Run', () => {
  it('carries a report of every character of the text', () => {
    const game = clearedBeginnerRun();

    const report = game.getState().debrief?.report;

    expect(game.getState().screen).toBe('debrief');
    expect(report?.letters.map((letter) => letter.character).join('')).toBe(
      TEXT,
    );
  });

  it('tells the player to work on a key missed twice', () => {
    const game = newGame();
    startFreeFlight(game, 'fjfjfj');
    // "f" is missed on its first two turns, "j" never.
    game.step(30);
    game.pressKey(WRONG_KEY);
    typeText(game, 'fj');
    game.step(30);
    game.pressKey(WRONG_KEY);
    typeText(game, 'fjfj');

    expect(game.getState().debrief?.report.workOn).toMatchObject({
      kind: 'missed key',
      character: 'f',
      misses: 2,
      finger: 'LEFT_INDEX',
    });
  });

  it('leaves the Profile its per-key hits and misses, as First attempts', () => {
    const game = clearedBeginnerRun();

    const report = game.getState().debrief?.report;
    const { keyAnalytics } = game.getState().profile;

    for (const [character, tally] of Object.entries(report?.keys ?? {})) {
      expect(keyAnalytics[character]).toEqual({
        hits: tally.firstAttempts - tally.misses,
        misses: tally.misses,
      });
    }
  });

  it('is dropped when the next Run begins', () => {
    const game = clearedBeginnerRun();
    expect(game.getState().debrief).not.toBeNull();

    game.send({ type: 'PRESS_REPLAY' });

    expect(game.getState().debrief).toBeNull();
  });
});
