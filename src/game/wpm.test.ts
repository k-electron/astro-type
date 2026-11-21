import { describe, expect, it } from 'vitest';
import {
  expectedWpm,
  type Game,
  newGame,
  startFreeFlight,
  typeText,
  typeTextWithMissMarks,
  WRONG_KEY,
} from '../../tests/shared/testHelpers';

/**
 * WPM is gross WPM over Typing Time: (characters typed - 1) / 5 / Typing Time
 * in minutes, with nothing taken off for wrong keys. Typing Time runs from the
 * Run Time of the first keystroke, right or wrong, to the keystroke that
 * clears the Run. The value is exact; the screens round it down. The live
 * value refreshes every 30 steps and is none (null) until the second
 * character is typed.
 *
 * Free Flight uses the same WPM as a Sector Stage, so these Runs are Free
 * Flights of a short text, typed with `typeText` (stars.test.ts has the Stage
 * clears): a wait of
 * `k` steps before each key gives a Typing Time of `(characters - 1) * k`
 * steps, so every such Run reads 720 / k WPM (24 at 30 steps a key), whatever
 * its length. One minute is 3600 steps.
 */

const TEXT = 'abcdef';

const wpm = (game: Game) => game.getState().run.wpm;

function flyingOn(text: string): Game {
  const game = newGame();
  startFreeFlight(game, text);
  return game;
}

/** The Debrief's WPM of a cleared Run. */
function finalWpm(game: Game): number {
  const debrief = game.getState().debrief;
  if (!debrief) throw new Error('expected a Debrief after clearing the Run');
  return debrief.wpm;
}

describe('the live WPM', () => {
  it('is none until the second character is typed, then follows the characters typed over Typing Time', () => {
    const game = flyingOn(TEXT);
    expect(wpm(game)).toBeNull();

    // The first key lands at 30 steps. One character is not enough, however
    // long the Run goes on.
    typeText(game, 'a');
    game.step(30);
    expect(wpm(game)).toBeNull();

    // The second key lands at 60 steps. The next refresh, at 90, sees two
    // characters over 60 steps of Typing Time: (2 - 1) / 5 / (60 / 3600) = 12.
    typeText(game, 'b', 0);
    expect(wpm(game)).toBeNull();
    game.step(30);
    expect(wpm(game)).toBeCloseTo(expectedWpm(2, 60), 6);
  });

  it('is exact, not rounded, and sinks between keystrokes because Typing Time keeps running', () => {
    const game = flyingOn(TEXT);
    typeText(game, 'ab');

    // Two characters, and Typing Time 60, 90, 120 and 150 steps at the next
    // four refreshes: 12, 8, 6 and 4.8.
    const readings: (number | null)[] = [];
    for (let i = 0; i < 4; i++) {
      game.step(30);
      readings.push(wpm(game));
    }

    expect(readings).toHaveLength(4);
    [60, 90, 120, 150].forEach((typingSteps, i) => {
      expect(readings[i]).toBeCloseTo(expectedWpm(2, typingSteps), 6);
    });
    expect(readings[3]).toBeCloseTo(4.8, 6);
  });

  it('is refreshed every 30 steps and not by a keystroke', () => {
    const game = flyingOn(TEXT);
    typeText(game, 'ab'); // keys at 30 and 60 steps: no refresh has seen two characters
    expect(wpm(game)).toBeNull();

    game.step(29);
    expect(wpm(game)).toBeNull();
    game.step(1); // 90 steps: two characters over 60 steps of Typing Time
    expect(wpm(game)).toBeCloseTo(expectedWpm(2, 60), 6);

    // A third character at 90 steps moves nothing until the refresh at 120.
    typeText(game, 'c', 0);
    expect(wpm(game)).toBeCloseTo(expectedWpm(2, 60), 6);
    game.step(29);
    expect(wpm(game)).toBeCloseTo(expectedWpm(2, 60), 6);
    game.step(1);
    expect(wpm(game)).toBeCloseTo(expectedWpm(3, 90), 6);
  });
});

describe('the final WPM', () => {
  it('is (characters - 1) / 5 over Typing Time, so the first character is only where the clock starts', () => {
    // The first key at Run Time 0, then five more 30 steps apart: 6
    // characters over 150 steps, so 5 / 5 / (150 / 3600) = 24. Not taking the
    // one off would read 28.8.
    const game = flyingOn(TEXT);
    game.pressKey('a');
    typeText(game, 'bcdef');
    expect(finalWpm(game)).toBeCloseTo(expectedWpm(6, 150), 6);
    expect(finalWpm(game)).toBeCloseTo(24, 6);
  });

  it('is the same however long the text, at the same pace', () => {
    // 30 steps a key: 24 WPM at any length.
    const short = flyingOn(TEXT);
    typeText(short, TEXT);
    expect(finalWpm(short)).toBeCloseTo(24, 6);

    const long = flyingOn('abcdefghijklmnopqrst');
    typeText(long, 'abcdefghijklmnopqrst');
    expect(finalWpm(long)).toBeCloseTo(24, 6);
  });

  it('is exact, not rounded', () => {
    // 29 steps a key: 720 / 29 = 24.83.
    const game = flyingOn(TEXT);
    typeText(game, TEXT, 29);
    expect(finalWpm(game)).toBeCloseTo(expectedWpm(6, 5 * 29), 6);
    expect(finalWpm(game)).not.toBe(Math.round(finalWpm(game)));
  });

  it('takes nothing off for wrong keys: a Run with them has the WPM of one without, in the same Typing Time', () => {
    const clean = flyingOn(TEXT);
    typeText(clean, TEXT);

    // Wrong keys take no Run Time, so Typing Time is the same.
    const wrong = flyingOn(TEXT);
    typeTextWithMissMarks(wrong, TEXT, [1, 2, 4], { wrongKeys: 3 });

    expect(wrong.getState().run.incorrectKeystrokes).toBe(9);
    expect(finalWpm(wrong)).toBeCloseTo(finalWpm(clean), 6);
    expect(finalWpm(wrong)).toBeCloseTo(24, 6);
  });

  it('does not count the time before the first keystroke', () => {
    const atOnce = flyingOn(TEXT);
    typeText(atOnce, TEXT);

    // Ten minutes go by before the first key.
    const waited = flyingOn(TEXT);
    waited.step(10 * 3600);
    typeText(waited, TEXT);

    expect(finalWpm(waited)).toBeCloseTo(finalWpm(atOnce), 6);
    expect(finalWpm(waited)).toBeCloseTo(24, 6);
  });

  it('counts a gap between keystrokes in full, with no cap on how long it may be', () => {
    // Ten minutes in the middle of the Run, with nothing typed.
    const IDLE = 10 * 3600;
    const game = flyingOn('abcdefghij');
    typeText(game, 'abcde');
    game.step(IDLE);
    typeText(game, 'fghij');

    // Keys at 30..150 steps, then 30..150 more after the gap: Typing Time is
    // the 270 steps of typing and the gap.
    expect(finalWpm(game)).toBeCloseTo(expectedWpm(10, 270 + IDLE), 6);
  });
});

describe('the first keystroke starts Typing Time, right or wrong', () => {
  // Typing 'abcdef' at 30 steps a key after a wrong key at Run Time T takes
  // the Run from T to T + 180 steps (the wait before the first right key, and
  // five more): 5 / 5 / (180 / 3600) = 20 WPM. Counted from the first right
  // key it would be 24.
  it('starts at a wrong key that comes first, after time has already passed', () => {
    const game = flyingOn(TEXT);
    game.step(300);
    game.pressKey(WRONG_KEY);
    typeText(game, TEXT);

    expect(finalWpm(game)).toBeCloseTo(expectedWpm(6, 180), 6);
    expect(finalWpm(game)).toBeCloseTo(20, 6);
  });

  it('starts at a wrong key pressed at the very start of the Run, at Run Time 0', () => {
    const game = flyingOn(TEXT);
    game.pressKey(WRONG_KEY);
    typeText(game, TEXT);

    expect(finalWpm(game)).toBeCloseTo(expectedWpm(6, 180), 6);
  });
});

describe('a cleared Run with no Typing Time to measure', () => {
  it('has WPM 0, not infinite or not a number, when its keys were pressed with no time between them', () => {
    const game = flyingOn(TEXT);
    typeText(game, TEXT, 0);

    expect(game.getState().screen).toBe('debrief');
    expect(finalWpm(game)).toBe(0);
  });

  it('has WPM 0 when the text is one character, which has no WPM', () => {
    const game = flyingOn('a');
    typeText(game, 'a');

    expect(game.getState().screen).toBe('debrief');
    expect(finalWpm(game)).toBe(0);
  });
});

describe('practice seconds follow Run Time, not Typing Time', () => {
  it('counts the time before the first key, which Typing Time leaves out', () => {
    const game = flyingOn(TEXT);
    const before = game.getState().profile.totalPracticeSeconds;
    game.step(60); // one second before the first key
    typeText(game, TEXT); // 6 keys, 30 steps each: three more seconds

    // Run Time is 4 s; Typing Time is 2.5 s.
    expect(game.getState().profile.totalPracticeSeconds - before).toBe(4);
  });

  it('counts a Run with no Run Time as one second, as it always has', () => {
    const game = flyingOn(TEXT);
    const before = game.getState().profile.totalPracticeSeconds;
    typeText(game, TEXT, 0);

    expect(game.getState().profile.totalPracticeSeconds - before).toBe(1);
  });
});
