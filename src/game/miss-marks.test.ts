import { describe, expect, it } from 'vitest';
import {
  type Game,
  newGame,
  startFreeFlight,
  typeText,
  WRONG_KEY,
} from './testHelpers';

/**
 * Spec story 30: a wrong character key marks the character in the text prompt
 * at once, without waiting for the right key to move the cursor on. The mark
 * stays behind on that character, and the cursor stays where it is. The prompt
 * draws every index the Run lists in `errorIndices`.
 */

// Six different letters, so every index is easy to tell apart.
const TEXT = 'abcdef';

function flyingOn(text: string, save?: Record<string, unknown>): Game {
  const game = newGame(save);
  startFreeFlight(game, text);
  return game;
}

const marked = (game: Game) =>
  [...game.getState().run.errorIndices].sort((a, b) => a - b);
const cursor = (game: Game) => game.getState().run.currentCharIndex;

describe('the miss mark in the text prompt', () => {
  it('is on the current character at once, and the cursor stays on it', () => {
    const game = flyingOn(TEXT);
    typeText(game, 'abc');
    expect(marked(game)).toEqual([]);

    game.pressKey('z');

    expect(marked(game)).toEqual([3]);
    expect(cursor(game)).toBe(3);

    // The right key moves the cursor on; the mark stays behind on "d".
    typeText(game, 'd');
    expect(cursor(game)).toBe(4);
    expect(marked(game)).toEqual([3]);
  });

  it('is one mark, however many wrong keys the character got', () => {
    const game = flyingOn(TEXT);
    typeText(game, 'abc');

    for (const key of ['z', 'x', 'q']) game.pressKey(key);

    expect(marked(game)).toEqual([3]);
    expect(cursor(game)).toBe(3);

    typeText(game, 'd');
    expect(marked(game)).toEqual([3]);
  });

  it('is there on the first character too', () => {
    const game = flyingOn(TEXT);

    game.pressKey('z');

    expect(marked(game)).toEqual([0]);
    expect(cursor(game)).toBe(0);
  });

  it('is there when a shield absorbed the Miss', () => {
    // The shield only spares the Streak. The player still typed the wrong key.
    const game = flyingOn(TEXT, { upgrades: { deflectorShields: 2 } });
    typeText(game, 'abc');
    expect(game.getState().run.currentStreak).toBe(3);

    game.pressKey('z');

    expect(game.getState().run.currentStreak).toBe(3);
    expect(marked(game)).toEqual([3]);
  });

  it.each(['Backspace', 'Enter', 'ArrowLeft', 'ArrowDown', 'F2'])(
    'is not made by %s, which types no character',
    (key) => {
      const game = flyingOn(TEXT);
      typeText(game, 'abc');

      game.pressKey(key);
      typeText(game, 'd');

      expect(marked(game)).toEqual([]);
      expect(cursor(game)).toBe(4);
      expect(game.getState().run.incorrectKeystrokes).toBe(0);
    },
  );

  it('is not made by holding a right key down, and a held wrong key marks once', () => {
    const game = flyingOn(TEXT);

    // A held right key: the first keydown types it, its auto-repeats do nothing.
    game.pressKey('a');
    for (let i = 0; i < 5; i++) game.pressKey('a', { repeat: true });
    typeText(game, 'b');
    expect(cursor(game)).toBe(2);
    expect(marked(game)).toEqual([]);

    // A held wrong key marks the one character it was pressed on, and costs one Miss.
    game.pressKey(WRONG_KEY);
    for (let i = 0; i < 5; i++) game.pressKey(WRONG_KEY, { repeat: true });
    expect(marked(game)).toEqual([2]);
    expect(game.getState().run.incorrectKeystrokes).toBe(1);
  });

  it('is on a space too, when the space is the character to type', () => {
    const game = flyingOn('ab cd');
    typeText(game, 'ab');

    game.pressKey('z');

    expect(marked(game)).toEqual([2]);
    expect(cursor(game)).toBe(2);

    // The space key moves on; the mark stays on the space.
    typeText(game, ' ');
    expect(cursor(game)).toBe(3);
    expect(marked(game)).toEqual([2]);
  });
});
