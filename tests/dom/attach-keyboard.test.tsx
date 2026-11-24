import { fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { attachKeyboard } from '../../src/app/attachKeyboard';
import {
  type Game,
  newGame,
  startedGame,
  startFreeFlight,
} from '../shared/testHelpers';

/**
 * `attachKeyboard(game, window)` is the composition root's keys: keydowns,
 * Esc, and the page losing focus. What the App does with them (Esc pausing
 * and unwinding menus, a held key, Ctrl and Cmd shortcuts, blur and a hidden
 * tab) is proven through the App in session, flight-deck and navigation. This
 * file has what those can't see: that the keys reach whatever game they were
 * attached to, that the detach function lets go, and that a running Run keeps
 * Tab and Enter from the page (default prevented) while a paused Run or no Run
 * leaves them alone. The Esc stack (the audio
 * panel, then a confirm, then the screen) is proven through the App in
 * navigation and wipe.
 */

const detachers: Array<() => void> = [];
const added: HTMLElement[] = [];

/** Attach the keys to `window` and remember how to detach, so no test leaks a listener. */
function attach(game: Game): () => void {
  const detach = attachKeyboard(game, window);
  detachers.push(detach);
  return detach;
}

function addButton(): HTMLButtonElement {
  const button = document.createElement('button');
  document.body.append(button);
  added.push(button);
  return button;
}

afterEach(() => {
  for (const detach of detachers.splice(0)) detach();
  for (const element of added.splice(0)) element.remove();
});

describe('attached keys', () => {
  it('reach the game, and stop reaching it once detached', () => {
    const game = startedGame();
    const detach = attach(game);

    fireEvent.keyDown(window, { key: 'f' });
    expect(game.getState().run.currentCharIndex).toBe(1);

    detach();
    fireEvent.keyDown(window, { key: ' ' });
    expect(game.getState().run.currentCharIndex).toBe(1);
  });

  it('pause the Run when the window loses focus, but not once detached', () => {
    const watched = startedGame();
    const detached = startedGame();
    attach(watched);
    const detach = attach(detached);
    detach();

    fireEvent.blur(window);

    expect(watched.getState().phase).toBe('paused');
    expect(detached.getState().phase).toBe('running');
  });
});

describe('Tab and Enter', () => {
  // `fireEvent` returns false when a listener called preventDefault, which is
  // what keeps the browser from moving focus or clicking a focused button.
  it('are kept from the page while a Run is running, Shift+Tab included', () => {
    const game = startedGame();
    attach(game);

    expect(fireEvent.keyDown(window, { key: 'Tab' })).toBe(false);
    expect(fireEvent.keyDown(window, { key: 'Tab', shiftKey: true })).toBe(
      false,
    );
    expect(fireEvent.keyDown(window, { key: 'Enter' })).toBe(false);
    expect(game.getState().phase).toBe('running');
  });

  it('are left to the page once the Run is paused', () => {
    const game = startedGame();
    attach(game);
    fireEvent.blur(window);
    expect(game.getState().phase).toBe('paused');

    expect(fireEvent.keyDown(window, { key: 'Tab' })).toBe(true);
    expect(fireEvent.keyDown(window, { key: 'Tab', shiftKey: true })).toBe(
      true,
    );
    expect(fireEvent.keyDown(window, { key: 'Enter' })).toBe(true);
  });

  it('are left to the page when no Run is under way', () => {
    attach(newGame());

    expect(fireEvent.keyDown(window, { key: 'Tab' })).toBe(true);
    expect(fireEvent.keyDown(window, { key: 'Enter' })).toBe(true);
  });
});

describe('Esc', () => {
  it('pauses the Run when it reaches the window', () => {
    const game = startedGame();
    attach(game);

    fireEvent.keyDown(addButton(), { key: 'Escape' });

    expect(game.getState().phase).toBe('paused');
  });
});

describe('the Shift side of a key', () => {
  // The capital is the last of the text, so no Run ends before it is typed.
  const TEXT = 'aaB';

  const shiftDown = (code: 'ShiftLeft' | 'ShiftRight') =>
    fireEvent.keyDown(window, { key: 'Shift', code, shiftKey: true });
  const shiftUp = (code: 'ShiftLeft' | 'ShiftRight', shiftKey = false) =>
    fireEvent.keyUp(window, { key: 'Shift', code, shiftKey });
  const typeLower = () => {
    fireEvent.keyDown(window, { key: 'a', code: 'KeyA', shiftKey: false });
  };
  const typeCapital = () => {
    fireEvent.keyDown(window, { key: 'B', code: 'KeyB', shiftKey: true });
  };

  /** A Free Flight with the keys attached and two lowercase characters typed. */
  function flying(): Game {
    const game = newGame();
    startFreeFlight(game, TEXT);
    attach(game);
    typeLower();
    typeLower();
    return game;
  }

  const lastShift = (game: Game) => {
    const stroke = game.getState().run.flightLog.at(-1);
    expect(stroke?.expected).toBe('B');
    return stroke?.shift;
  };

  it('is left for the left Shift', () => {
    const game = flying();
    shiftDown('ShiftLeft');
    typeCapital();
    expect(lastShift(game)).toBe('left');
  });

  it('is right for the right Shift', () => {
    const game = flying();
    shiftDown('ShiftRight');
    typeCapital();
    expect(lastShift(game)).toBe('right');
  });

  it('is both when both Shifts are down', () => {
    const game = flying();
    shiftDown('ShiftLeft');
    shiftDown('ShiftRight');
    typeCapital();
    expect(lastShift(game)).toBe('both');
  });

  it('follows a Shift let go: left released, right pressed, is right', () => {
    const game = flying();
    shiftDown('ShiftLeft');
    shiftUp('ShiftLeft');
    shiftDown('ShiftRight');
    typeCapital();
    expect(lastShift(game)).toBe('right');
  });

  it('is none for a key with no Shift flag, even after a Shift whose keyup was never seen', () => {
    // Lowercase text, so a Shift left down by a missed keyup is checked on a
    // key typed without Shift, then on a capital held with no Shift seen.
    const game = newGame();
    startFreeFlight(game, 'aaB');
    attach(game);
    shiftDown('ShiftLeft');
    // The keyup is never sent: the window lost it, say.
    typeLower();
    expect(game.getState().run.flightLog.at(-1)?.shift).toBe('none');

    // The stale left Shift is forgotten, so a Shift flag with no Shift seen
    // going down is unknown, not left.
    fireEvent.keyDown(window, { key: 'A', code: 'KeyA', shiftKey: true });
    expect(game.getState().run.flightLog.at(-1)?.shift).toBe('unknown');
  });

  it('is unknown for a Shift held before the page had focus', () => {
    const game = flying();
    // No Shift keydown was seen, but the key arrives with the Shift flag.
    typeCapital();
    expect(lastShift(game)).toBe('unknown');
  });

  it('is forgotten when the window loses focus', () => {
    const game = flying();
    shiftDown('ShiftLeft');
    fireEvent.blur(window);
    expect(game.getState().phase).toBe('paused');
    game.send({ type: 'PRESS_RESUME' });

    typeCapital();

    expect(lastShift(game)).toBe('unknown');
  });

  it('adds no Keystroke for a Shift press or a held key repeating', () => {
    const game = flying();
    const before = game.getState().run.flightLog.length;

    shiftDown('ShiftLeft');
    fireEvent.keyDown(window, {
      key: 'Shift',
      code: 'ShiftLeft',
      shiftKey: true,
      repeat: true,
    });
    fireEvent.keyDown(window, { key: 'a', code: 'KeyA', repeat: true });

    expect(game.getState().run.flightLog).toHaveLength(before);
  });
});
