import { describe, expect, it } from 'vitest';
import {
  type Game,
  newGame,
  startFreeFlight,
  typeText,
  typeTextWithMissMarks,
  WRONG_KEY,
} from '../../tests/shared/testHelpers';

/**
 * Accuracy counts first attempts: the share of the characters reached that
 * carry no Miss mark, worked out on every keystroke. A character is reached
 * once it is typed, or once a wrong key is pressed on it. However many wrong
 * keys one character gets, it carries one Miss mark. The value is exact; the
 * screens round it down. WPM keeps its own refresh, twice a second of Run Time.
 */

// Six different letters; the wrong key is never a target.
const TEXT = 'abcdef';

function flyingOn(text: string): Game {
  const game = newGame();
  startFreeFlight(game, text);
  return game;
}

const accuracy = (game: Game) => game.getState().run.accuracy;
const wpm = (game: Game) => game.getState().run.wpm;

describe('Accuracy', () => {
  it('is 100% before the first key', () => {
    expect(accuracy(flyingOn(TEXT))).toBe(100);
  });

  it('counts only the characters reached, and drops at a wrong key before that character is typed', () => {
    const game = flyingOn(TEXT);
    typeText(game, 'ab');
    // Two reached, none marked. The four characters ahead do not count.
    expect(accuracy(game)).toBe(100);

    // "c" is reached by the wrong key: 2 clean of 3 reached, with no time passing.
    game.pressKey(WRONG_KEY);
    expect(accuracy(game)).toBeCloseTo(200 / 3);
    expect(game.getState().run.currentCharIndex).toBe(2);

    // Typing the marked character does not clean it.
    typeText(game, 'c');
    expect(accuracy(game)).toBeCloseTo(200 / 3);

    // A clean character reached brings the share up, 3 of 4 ...
    typeText(game, 'd');
    expect(accuracy(game)).toBeCloseTo(75);

    // ... and a wrong key on "e" takes it to 3 clean of 5 reached.
    game.pressKey(WRONG_KEY);
    expect(accuracy(game)).toBeCloseTo(60);

    typeText(game, 'ef');
    expect(accuracy(game)).toBeCloseTo(400 / 6);
  });

  it('is the same for three wrong keys on one character as for one', () => {
    const once = flyingOn(TEXT);
    typeText(once, 'ab');
    once.pressKey(WRONG_KEY);
    const onceAtTheKey = accuracy(once);
    typeText(once, 'cdef');

    const thrice = flyingOn(TEXT);
    typeText(thrice, 'ab');
    for (let i = 0; i < 3; i++) thrice.pressKey(WRONG_KEY);
    expect(accuracy(thrice)).toBe(onceAtTheKey);
    typeText(thrice, 'cdef');

    expect(accuracy(thrice)).toBe(accuracy(once));
    // The Run still counts the wrong keystrokes themselves.
    expect(thrice.getState().run.incorrectKeystrokes).toBe(3);
    expect(once.getState().run.incorrectKeystrokes).toBe(1);
  });

  it("counts a Free Flight's Debrief the same way: the whole text reached, a character marked once", () => {
    const game = flyingOn(TEXT);
    // "b" and "d" each get a wrong key: two Miss marks on six characters.
    typeTextWithMissMarks(game, TEXT, [1, 3]);
    const debrief = game.getState().debrief;
    if (!debrief) throw new Error('expected a Debrief after the Free Flight');

    expect(debrief.accuracy).toBeCloseTo(400 / 6);

    // Three wrong keys on each of them leave the same accuracy.
    const heavy = flyingOn(TEXT);
    typeTextWithMissMarks(heavy, TEXT, [1, 3], { wrongKeys: 3 });
    expect(heavy.getState().debrief?.accuracy).toBe(debrief.accuracy);
  });

  it('is 100% at the clear of a Run with no Miss mark', () => {
    const game = flyingOn(TEXT);
    typeText(game, TEXT);
    expect(game.getState().debrief?.accuracy).toBe(100);
  });

  it('leaves WPM to its own refresh: a keystroke does not move it, the next tick does', () => {
    const game = flyingOn(TEXT);
    typeText(game, 'abc');
    const before = wpm(game);
    expect(before).not.toBeNull();

    game.pressKey('d');
    game.pressKey(WRONG_KEY);
    expect(wpm(game)).toBe(before);

    game.step(30);
    expect(wpm(game)).not.toBe(before);
  });
});
