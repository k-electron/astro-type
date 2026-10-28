import { describe, expect, it } from 'vitest';
import {
  type Game,
  newGame,
  startFreeFlight,
  typeText,
  WRONG_KEY,
} from './testHelpers';

/**
 * Spec story 7: Accuracy is the share of the Run's keystrokes that were
 * right, worked out on every keystroke. WPM keeps its own refresh, twice a
 * second of Run Time.
 */

// Six different letters; the wrong key is never a target.
const TEXT = 'abcdef';

function flyingOn(text: string): Game {
  const game = newGame();
  startFreeFlight(game, text);
  return game;
}

const accuracy = (game: Game) => game.getState().run.accuracy;
const wpm = (game: Game) => game.getState().run.netWpm;

describe('Accuracy', () => {
  it('is correct keystrokes over all keystrokes at once after each one, with no time passing', () => {
    const game = flyingOn(TEXT);
    typeText(game, 'abc');
    expect(accuracy(game)).toBe(100);

    game.pressKey(WRONG_KEY);
    expect(accuracy(game)).toBe(75);

    game.pressKey(WRONG_KEY);
    expect(accuracy(game)).toBe(60);

    // 4 right keys of 6, to the nearest percent.
    game.pressKey('d');
    expect(accuracy(game)).toBe(67);

    // 4 of 7.
    game.pressKey(WRONG_KEY);
    expect(accuracy(game)).toBe(57);
  });

  it('leaves WPM to its own refresh: a keystroke does not move it, the next tick does', () => {
    const game = flyingOn(TEXT);
    typeText(game, 'abc');
    const before = wpm(game);

    game.pressKey('d');
    game.pressKey(WRONG_KEY);
    expect(wpm(game)).toBe(before);

    game.step(30);
    expect(wpm(game)).not.toBe(before);
  });
});
