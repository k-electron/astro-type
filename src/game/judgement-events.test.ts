import { describe, expect, it } from 'vitest';
import type { Judgement, Moment } from './createGame';
import {
  type Game,
  hitPerfect,
  newGame,
  SAMPLE_TEXT,
  startedGame,
  targetKey,
} from './testHelpers';

/**
 * Judgement events (#22): every keystroke that counts produces exactly one
 * event, and a key that doesn't count (or an auto-repeat keydown) produces none
 * and changes nothing.
 *
 * The grade a keystroke gets is by its distance to the Strike Line (y = 84).
 * Every Run moves at FAST: the lead Drone starts 22 from it and closes 2.2 a
 * step, so it is 22 - 2.2 x steps away. The windows are 8 for Perfect and 16
 * for Great, and each level of Precision Sensors widens both by 3.5. This file
 * holds the one table of those windows (no step count lands exactly on a
 * window's edge at this speed, so the table brackets each edge instead).
 */

/**
 * A listener that adds each Judgement moment to `into`, as the bare Judgement
 * it carries (a hit's Drone, lane and finger left off).
 */
function collectInto(into: Judgement[]): (moment: Moment) => void {
  return (moment) => {
    if (moment.type === 'hit') {
      const { type, grade, key, points, overdrive } = moment;
      into.push({ type, grade, key, points, overdrive });
    } else if (moment.type === 'miss' || moment.type === 'shield') {
      into.push({ type: moment.type, key: moment.key });
    }
  };
}

/** Collects every Judgement event the game announces from now on. */
function listen(game: Game): Judgement[] {
  const events: Judgement[] = [];
  game.onMoment(collectInto(events));
  return events;
}

describe('a hit', () => {
  it.each([
    // [Sensors level, steps before pressing, distance, grade, points at x1]
    [0, 0, 22, 'good', 50],
    [0, 2, 17.6, 'good', 50],
    [0, 3, 15.4, 'great', 75],
    [0, 6, 8.8, 'great', 75],
    [0, 7, 6.6, 'perfect', 100],
    [0, 10, 0, 'perfect', 100], // waiting on the Strike Line
    [0, 40, 0, 'perfect', 100], // the Drone waits; there is no timeout
    [1, 0, 22, 'good', 50],
    [1, 1, 19.8, 'good', 50], // Great window is 16 + 3.5 = 19.5
    [1, 2, 17.6, 'great', 75],
    [1, 4, 13.2, 'great', 75], // Perfect window is 8 + 3.5 = 11.5
    [1, 5, 11, 'perfect', 100],
    [2, 0, 22, 'great', 75], // Great window is 16 + 7 = 23
    [2, 3, 15.4, 'great', 75], // Perfect window is 15
    [2, 4, 13.2, 'perfect', 100],
    [3, 0, 22, 'great', 75],
    [3, 1, 19.8, 'great', 75], // Perfect window is 18.5
    [3, 2, 17.6, 'perfect', 100],
  ] as const)(
    'with Sensors level %i, %i steps in (%s from the line) is %s',
    (sensors, steps, _distance, grade, points) => {
      const game = startedGame({ precisionSensors: sensors });
      const events = listen(game);

      game.step(steps);
      game.pressKey(targetKey(game));

      expect(events).toEqual([
        { type: 'hit', grade, key: 'f', points, overdrive: false },
      ]);
    },
  );

  it('names the key that was pressed, Space included', () => {
    const game = startedGame();
    hitPerfect(game, 1); // the first character is "f"; the second is a space
    const events = listen(game);

    game.step(30);
    game.pressKey(' ');

    expect(events).toEqual([
      {
        type: 'hit',
        grade: 'perfect',
        key: ' ',
        points: 100,
        overdrive: false,
      },
    ]);
  });
});

describe('a hit says the points it scored', () => {
  /** Plays one Perfect hit and returns its event with the score it added. */
  function strike(game: Game) {
    const events = listen(game);
    const before = game.getState().run.score;
    hitPerfect(game, 1);
    const [event] = events;
    if (event?.type !== 'hit') throw new Error('Expected a hit');
    return { event, added: game.getState().run.score - before };
  }

  it('under a Multiplier, counting the Streak the hit makes', () => {
    const game = startedGame();
    hitPerfect(game, 8);
    const ninth = strike(game);
    const tenth = strike(game); // Streak 10 is already x2
    expect(ninth.event.points).toBe(ninth.added);
    expect(tenth.event.points).toBe(tenth.added);
    expect(tenth.event.points).toBe(200);
    expect(tenth.event.overdrive).toBe(false);
  });

  it('doubled in Overdrive, but not on the hit that starts it', () => {
    const game = startedGame();
    hitPerfect(game, 28);
    const igniting = strike(game);
    expect(game.getState().run.hyperspaceActive).toBe(true);
    expect(igniting.event).toMatchObject({ points: 300, overdrive: false });
    expect(igniting.event.points).toBe(igniting.added);

    const doubled = strike(game); // Streak 30: x4, doubled
    expect(doubled.event).toMatchObject({ points: 800, overdrive: true });
    expect(doubled.event.points).toBe(doubled.added);
  });
});

describe('a Miss', () => {
  it.each([
    ['another letter', 'x'],
    ['a space where a letter is wanted', ' '],
    ['a capital where a lower-case letter is wanted', 'F'],
    ['a digit', '7'],
    ['a symbol', ';'],
  ])('is one event on the key pressed for %s', (_what, key) => {
    const game = startedGame();
    const events = listen(game);

    game.pressKey(key);

    expect(events).toEqual([{ type: 'miss', key }]);
    // The Drone is still the one to hit.
    expect(game.getState().run.currentCharIndex).toBe(0);
  });

  it('is a shield event while a shield absorbs it, then a Miss', () => {
    const game = startedGame({ deflectorShields: 1 });
    hitPerfect(game, 3);
    const events = listen(game);

    game.pressKey('x');
    expect(events).toEqual([{ type: 'shield', key: 'x' }]);
    expect(game.getState().run.shieldsRemaining).toBe(0);
    expect(game.getState().run.currentStreak).toBe(3);

    game.pressKey('y');
    expect(events).toEqual([
      { type: 'shield', key: 'x' },
      { type: 'miss', key: 'y' },
    ]);
    expect(game.getState().run.currentStreak).toBe(0);
  });
});

describe('one event per counted keystroke', () => {
  it('holds from the first key of a Run to the one that clears it', () => {
    const game = startedGame({ deflectorShields: 1 });
    const events = listen(game);

    // Three wrong keys up front (a shield, then two Misses), then the whole text.
    for (const wrong of ['x', 'y', 'z']) game.pressKey(wrong);
    hitPerfect(game, SAMPLE_TEXT.length);

    expect(game.getState().debrief).not.toBeNull();
    expect(events).toHaveLength(3 + SAMPLE_TEXT.length);
    expect(events.map((event) => event.type)).toEqual([
      'shield',
      'miss',
      'miss',
      ...Array.from({ length: SAMPLE_TEXT.length }, () => 'hit'),
    ]);
    // Typed in order: each hit names the character it typed.
    expect(events.slice(3).map((event) => event.key)).toEqual([...SAMPLE_TEXT]);
  });

  it('gives the event as the key is pressed, not later', () => {
    const game = startedGame();
    const events = listen(game);

    game.pressKey('x');

    expect(events).toHaveLength(1);
  });

  it('is not given when no Run is running', () => {
    const game = newGame();
    const events = listen(game);

    game.pressKey('f'); // on Academy Home, before any Run

    expect(events).toEqual([]);
  });

  it('is not given for keys pressed after the Run is cleared', () => {
    const game = startedGame();
    hitPerfect(game, SAMPLE_TEXT.length);
    expect(game.getState().debrief).not.toBeNull();
    const events = listen(game);

    game.pressKey('f');
    game.pressKey('x');

    expect(events).toEqual([]);
  });

  it('stops once the listener unsubscribes, and only for that listener', () => {
    const game = startedGame();
    const first: Judgement[] = [];
    const second: Judgement[] = [];
    const stopFirst = game.onMoment(collectInto(first));
    game.onMoment(collectInto(second));

    game.pressKey('x');
    stopFirst();
    game.pressKey('y');

    expect(first).toEqual([{ type: 'miss', key: 'x' }]);
    expect(second).toEqual([
      { type: 'miss', key: 'x' },
      { type: 'miss', key: 'y' },
    ]);
  });
});

describe('a key that types no character', () => {
  it.each([
    'Escape',
    'Backspace',
    'Delete',
    'Enter',
    'Tab',
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'Home',
    'End',
    'PageUp',
    'PageDown',
    'Insert',
    'F1',
    'F5',
    'F12',
    'Shift',
    'Control',
    'Alt',
    'Meta',
    'CapsLock',
    'NumLock',
    'ContextMenu',
    'Dead',
    'Unidentified',
  ])('%s counts as nothing: no event, and the Run is untouched', (key) => {
    // A Run with a Streak, Overdrive charge and shields to lose.
    const game = startedGame({ deflectorShields: 2 });
    hitPerfect(game, 3);
    const before = structuredClone(game.getState().run);
    const events = listen(game);

    game.pressKey(key);

    expect(events).toEqual([]);
    expect(game.getState().run).toEqual(before);
    expect(before.currentStreak).toBe(3);
    expect(before.shieldsRemaining).toBe(2);
  });

  it('does not count even when it comes between right keys', () => {
    const game = startedGame();
    const events = listen(game);

    game.step(30);
    game.pressKey('f');
    game.pressKey('Backspace');
    game.pressKey('Enter');
    game.pressKey('ArrowLeft');
    game.step(30);
    game.pressKey(' ');

    expect(events.map((event) => event.type)).toEqual(['hit', 'hit']);
    expect(game.getState().run.currentStreak).toBe(2);
    expect(game.getState().run.incorrectKeystrokes).toBe(0);
  });
});

describe('an auto-repeat keydown', () => {
  it('is ignored completely, even on the right key', () => {
    const game = startedGame({ deflectorShields: 2 });
    hitPerfect(game, 3);
    game.step(30);
    const before = structuredClone(game.getState().run);
    const events = listen(game);

    game.pressKey(targetKey(game), { repeat: true });
    game.pressKey('x', { repeat: true });

    expect(events).toEqual([]);
    expect(game.getState().run).toEqual(before);
  });

  it('after a held right key scores that one hit and nothing more, even on a repeated letter', () => {
    const game = startedGame();
    hitPerfect(game, 8); // the next two characters are both "f"
    const events = listen(game);

    game.step(30);
    game.pressKey('f'); // the keydown
    for (let i = 0; i < 5; i++) game.pressKey('f', { repeat: true });

    expect(events).toEqual([
      {
        type: 'hit',
        grade: 'perfect',
        key: 'f',
        points: 100,
        overdrive: false,
      },
    ]);
    expect(game.getState().run.currentCharIndex).toBe(9);
    expect(game.getState().run.incorrectKeystrokes).toBe(0);

    // Letting go and pressing again is a new keystroke, and counts.
    game.step(30);
    game.pressKey('f', { repeat: false });
    expect(events).toHaveLength(2);
    expect(game.getState().run.currentCharIndex).toBe(10);
  });

  it('after a held wrong key is one Miss, and uses up one shield', () => {
    const game = startedGame({ deflectorShields: 2 });
    hitPerfect(game, 3);
    const events = listen(game);

    game.pressKey('x'); // the keydown
    for (let i = 0; i < 5; i++) game.pressKey('x', { repeat: true });

    expect(events).toEqual([{ type: 'shield', key: 'x' }]);
    expect(game.getState().run.shieldsRemaining).toBe(1);
    expect(game.getState().run.incorrectKeystrokes).toBe(1);
    expect(game.getState().run.currentStreak).toBe(3);
  });

  it('on a key that types no character is ignored too', () => {
    const game = startedGame();
    const events = listen(game);

    game.pressKey('Backspace', { repeat: true });
    game.pressKey('ArrowLeft', { repeat: true });

    expect(events).toEqual([]);
  });
});
