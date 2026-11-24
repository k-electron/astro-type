import { describe, expect, it } from 'vitest';
import {
  type Game,
  newGame,
  startFreeFlight,
  typeText,
  WRONG_KEY,
} from '../../tests/shared/testHelpers';

/**
 * The Flight log (#152): every key the Run judges is one Keystroke, in press
 * order, kept on the Run until it is abandoned or replayed. The reports built
 * on it (#151) stand on these records, so this is where their truth is
 * checked. What the Profile keeps per key from the same Run is in
 * profile-stats.test.ts and free-flight.test.ts.
 */

// A capital in the middle, a space, and a last character the tests stop short of.
const TEXT = 'aBc dx';
const STEPS_BETWEEN_KEYS = 30;

function flyingOn(text = TEXT): Game {
  const game = newGame();
  startFreeFlight(game, text);
  return game;
}

const flightLog = (game: Game) => game.getState().run.flightLog;

/** The Run Time step, as the Keystroke is stamped with it. */
const stepNow = (game: Game) =>
  Math.round((game.getState().runTime * 60) / 1000);

/** Press `key` after the Drone has reached the Strike Line. */
function press(
  game: Game,
  key: string,
  options?: Parameters<Game['pressKey']>[1],
): void {
  game.step(STEPS_BETWEEN_KEYS);
  game.pressKey(key, options);
}

describe('the Flight log of a Run', () => {
  it('holds one Keystroke per judged key, in press order, with the index, the expected and the pressed key', () => {
    const game = flyingOn();
    expect(flightLog(game)).toEqual([]);

    press(game, 'a');
    press(game, 'B');
    press(game, WRONG_KEY);
    press(game, 'y');
    press(game, 'c');
    press(game, ' ');

    expect(
      flightLog(game).map(({ index, expected, pressed }) => ({
        index,
        expected,
        pressed,
      })),
    ).toEqual([
      { index: 0, expected: 'a', pressed: 'a' },
      { index: 1, expected: 'B', pressed: 'B' },
      { index: 2, expected: 'c', pressed: WRONG_KEY },
      { index: 2, expected: 'c', pressed: 'y' },
      { index: 2, expected: 'c', pressed: 'c' },
      { index: 3, expected: ' ', pressed: ' ' },
    ]);
  });

  it('marks only the first Keystroke on a character as its First attempt, a Miss included', () => {
    const game = flyingOn();

    press(game, 'a');
    press(game, WRONG_KEY);
    press(game, 'y');
    press(game, 'B');
    press(game, 'c');

    expect(flightLog(game).map(({ firstAttempt }) => firstAttempt)).toEqual([
      true, // "a", right first time
      true, // the first wrong key on "B" is its First attempt, a Miss
      false, // a second wrong key
      false, // the right key after a Miss is a retry, not a hit
      true, // "c", the next character, starts afresh
    ]);
  });

  it('stamps each Keystroke with the Run Time step it happened at', () => {
    const game = flyingOn();

    press(game, 'a');
    const first = stepNow(game);
    press(game, 'B');
    const second = stepNow(game);
    // Two wrong keys pressed with no Run Time between them share a step.
    game.pressKey(WRONG_KEY);
    game.pressKey('y');
    const third = stepNow(game);

    expect(second - first).toBe(STEPS_BETWEEN_KEYS);
    expect(flightLog(game).map(({ step }) => step)).toEqual([
      first,
      second,
      third,
      third,
    ]);
  });

  it("carries the Run's numbers just after the key, as the HUD shows them", () => {
    const game = flyingOn();
    const checked: number[] = [];

    // Enough keys, with a Miss among them, that the Streak, accuracy, Rhythm
    // and (every 30 steps) WPM have all moved by the end.
    for (const key of ['a', 'B', WRONG_KEY, 'c', ' ', 'd']) {
      press(game, key);
      const { run } = game.getState();
      expect(flightLog(game).at(-1)).toMatchObject({
        streak: run.currentStreak,
        accuracy: run.accuracy,
        rhythm: run.rhythm,
        wpm: run.wpm,
      });
      checked.push(run.currentStreak);
    }

    // The Miss broke the Streak, so the numbers did change along the way.
    expect(new Set(checked).size).toBeGreaterThan(1);
  });

  it('adds nothing for a key that types nothing', () => {
    const game = flyingOn();
    press(game, 'a');

    press(game, 'Shift');
    press(game, 'F1');
    press(game, 'Tab');

    expect(game.getState().phase).toBe('running');
    expect(flightLog(game)).toHaveLength(1);
    expect(game.getState().run.currentCharIndex).toBe(1);
  });

  it('adds nothing for Escape, which pauses, nor for a key pressed while paused', () => {
    const game = flyingOn();
    press(game, 'a');

    game.pressKey('Escape');
    expect(flightLog(game)).toHaveLength(1);
    game.send({ type: 'PRESS_ESC' });
    expect(game.getState().phase).toBe('paused');
    game.pressKey('B');

    expect(flightLog(game)).toHaveLength(1);

    // Typing goes on in the same log once the Run resumes.
    game.send({ type: 'PRESS_RESUME' });
    press(game, 'B');
    expect(flightLog(game).map(({ index }) => index)).toEqual([0, 1]);
  });
});

describe('the Shift side of a Keystroke', () => {
  it('is the side given to pressKey for a capital', () => {
    const game = flyingOn();
    press(game, 'a');

    press(game, 'B', { shift: 'right' });

    const stroke = flightLog(game).at(-1);
    expect(stroke).toMatchObject({
      expected: 'B',
      pressed: 'B',
      shift: 'right',
    });
  });

  it('is none when pressKey is given no side', () => {
    const game = flyingOn();
    press(game, 'a');

    press(game, 'B');

    const stroke = flightLog(game).at(-1);
    expect(stroke).toMatchObject({
      expected: 'B',
      pressed: 'B',
      shift: 'none',
    });
  });
});

describe('where a Flight log ends', () => {
  it('is dropped when the Run is abandoned, and a new Run starts with an empty one', () => {
    const game = flyingOn();
    press(game, 'a');
    press(game, 'B');
    expect(flightLog(game)).toHaveLength(2);

    game.send({ type: 'PRESS_HOME' });
    expect(game.getState().phase).toBe('abandoned');
    expect(flightLog(game)).toEqual([]);

    startFreeFlight(game, TEXT);
    expect(flightLog(game)).toEqual([]);
    press(game, 'a');
    expect(flightLog(game)).toHaveLength(1);
  });

  it('is replaced by an empty one when the Run is replayed from the Pause Menu', () => {
    const game = flyingOn();
    press(game, 'a');
    press(game, 'B');
    game.send({ type: 'PRESS_ESC' });
    expect(flightLog(game)).toHaveLength(2);

    game.send({ type: 'PRESS_REPLAY' });

    expect(game.getState().phase).toBe('running');
    expect(flightLog(game)).toEqual([]);
    press(game, 'a');
    expect(flightLog(game).map(({ index }) => index)).toEqual([0]);
  });

  it('still holds the key that cleared the Run on the Debrief, and Replay from the Debrief starts an empty one', () => {
    const game = newGame();
    startFreeFlight(game, 'ab');
    typeText(game, 'ab');
    expect(game.getState().screen).toBe('debrief');
    expect(flightLog(game).map(({ index }) => index)).toEqual([0, 1]);

    game.send({ type: 'PRESS_REPLAY' });

    expect(game.getState().phase).toBe('running');
    expect(flightLog(game)).toEqual([]);
  });
});
