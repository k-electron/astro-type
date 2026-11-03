import { fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { attachKeyboard } from '../../src/app/attachKeyboard';
import { type Game, newGame, startedGame } from '../shared/testHelpers';

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
