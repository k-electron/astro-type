import { describe, expect, it } from 'vitest';
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
 * Distances are the ones in judgement.test.ts: on the first Stage at normal
 * speed the lead Drone starts 22 from the Strike Line and closes 1.5 a step.
 */

type Judgement =
  | { type: 'hit'; grade: 'perfect' | 'great' | 'good'; key: string }
  | { type: 'miss'; key: string }
  | { type: 'shield'; key: string };

/** Collects every Judgement event the game announces from now on. */
function listen(game: Game): Judgement[] {
  const events: Judgement[] = [];
  game.onJudgement((event) => events.push(event as Judgement));
  return events;
}

describe('a hit', () => {
  it.each([
    // [Sensors level, steps before pressing, distance, grade]
    [0, 0, 22, 'good'],
    [0, 4, 16, 'great'], // the Great window's edge is inclusive
    [0, 10, 7, 'perfect'],
    [0, 40, 0, 'perfect'], // the Drone waits on the Strike Line
    [1, 0, 22, 'good'],
    [2, 0, 22, 'great'], // Sensors widen the windows
    [3, 3, 17.5, 'perfect'],
  ] as const)(
    'with Sensors level %i, %i steps in (%s from the line) is %s',
    (sensors, steps, _distance, grade) => {
      const game = startedGame({ precisionSensors: sensors });
      const events = listen(game);

      game.step(steps);
      game.pressKey(targetKey(game));

      expect(events).toEqual([{ type: 'hit', grade, key: 'f' }]);
    },
  );

  it('names the key that was pressed, Space included', () => {
    const game = startedGame();
    hitPerfect(game, 1); // the first character is "f"; the second is a space
    const events = listen(game);

    game.step(30);
    game.pressKey(' ');

    expect(events).toEqual([{ type: 'hit', grade: 'perfect', key: ' ' }]);
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
    expect(game.getRun().currentCharIndex).toBe(0);
  });

  it('is a shield event while a shield absorbs it, then a Miss', () => {
    const game = startedGame({ deflectorShields: 1 });
    hitPerfect(game, 3);
    const events = listen(game);

    game.pressKey('x');
    expect(events).toEqual([{ type: 'shield', key: 'x' }]);
    expect(game.getRun().shieldsRemaining).toBe(0);
    expect(game.getRun().currentStreak).toBe(3);

    game.pressKey('y');
    expect(events).toEqual([
      { type: 'shield', key: 'x' },
      { type: 'miss', key: 'y' },
    ]);
    expect(game.getRun().currentStreak).toBe(0);
  });
});

describe('one event per counted keystroke', () => {
  it('holds from the first key of a Run to the one that clears it', () => {
    const game = startedGame({ deflectorShields: 1 });
    const events = listen(game);

    // Three wrong keys up front (a shield, then two Misses), then the whole text.
    for (const wrong of ['x', 'y', 'z']) game.pressKey(wrong);
    hitPerfect(game, SAMPLE_TEXT.length);

    expect(game.getDebrief()).not.toBeNull();
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
    expect(game.getDebrief()).not.toBeNull();
    const events = listen(game);

    game.pressKey('f');
    game.pressKey('x');

    expect(events).toEqual([]);
  });

  it('stops once the listener unsubscribes, and only for that listener', () => {
    const game = startedGame();
    const first: Judgement[] = [];
    const second: Judgement[] = [];
    const stopFirst = game.onJudgement((event) =>
      first.push(event as Judgement),
    );
    game.onJudgement((event) => second.push(event as Judgement));

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
    const before = structuredClone(game.getRun());
    const events = listen(game);

    game.pressKey(key);

    expect(events).toEqual([]);
    expect(game.getRun()).toEqual(before);
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
    expect(game.getRun().currentStreak).toBe(2);
    expect(game.getRun().incorrectKeystrokes).toBe(0);
  });
});

describe('an auto-repeat keydown', () => {
  it('is ignored completely, even on the right key', () => {
    const game = startedGame({ deflectorShields: 2 });
    hitPerfect(game, 3);
    game.step(30);
    const before = structuredClone(game.getRun());
    const events = listen(game);

    game.pressKey(targetKey(game), { repeat: true });
    game.pressKey('x', { repeat: true });

    expect(events).toEqual([]);
    expect(game.getRun()).toEqual(before);
  });

  it('after a held right key scores that one hit and nothing more, even on a repeated letter', () => {
    const game = startedGame();
    hitPerfect(game, 8); // the next two characters are both "f"
    const events = listen(game);

    game.step(30);
    game.pressKey('f'); // the keydown
    for (let i = 0; i < 5; i++) game.pressKey('f', { repeat: true });

    expect(events).toEqual([{ type: 'hit', grade: 'perfect', key: 'f' }]);
    expect(game.getRun().currentCharIndex).toBe(9);
    expect(game.getRun().incorrectKeystrokes).toBe(0);

    // Letting go and pressing again is a new keystroke, and counts.
    game.step(30);
    game.pressKey('f', { repeat: false });
    expect(events).toHaveLength(2);
    expect(game.getRun().currentCharIndex).toBe(10);
  });

  it('after a held wrong key is one Miss, and uses up one shield', () => {
    const game = startedGame({ deflectorShields: 2 });
    hitPerfect(game, 3);
    const events = listen(game);

    game.pressKey('x'); // the keydown
    for (let i = 0; i < 5; i++) game.pressKey('x', { repeat: true });

    expect(events).toEqual([{ type: 'shield', key: 'x' }]);
    expect(game.getRun().shieldsRemaining).toBe(1);
    expect(game.getRun().incorrectKeystrokes).toBe(1);
    expect(game.getRun().currentStreak).toBe(3);
  });

  it('on a key that types no character is ignored too', () => {
    const game = startedGame();
    const events = listen(game);

    game.pressKey('Backspace', { repeat: true });
    game.pressKey('ArrowLeft', { repeat: true });

    expect(events).toEqual([]);
  });
});
