import { fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { attachKeyboard } from '../../src/app/attachKeyboard';
import { type Game, startedGame } from '../../src/game/testHelpers';

/**
 * `attachKeyboard(game, window)` is the composition root's keys: keydowns,
 * Esc, and the page losing focus. What the App does with them (Esc pausing
 * and unwinding menus, a held key, Ctrl and Cmd shortcuts, blur and a hidden
 * tab) is proven through the App in session, flight-deck and navigation. This
 * file has what those can't see: that the keys reach whatever game they were
 * attached to, that the detach function lets go, and the Esc contract.
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

describe('Esc', () => {
  it('pauses the Run when it reaches the window', () => {
    const game = startedGame();
    attach(game);

    fireEvent.keyDown(addButton(), { key: 'Escape' });

    expect(game.getState().phase).toBe('paused');
  });

  it('is swallowed by an element that calls preventDefault first, and the game does not act on it', () => {
    const game = startedGame();
    attach(game);
    const button = addButton();
    button.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') event.preventDefault();
    });

    fireEvent.keyDown(button, { key: 'Escape' });

    expect(game.getState().phase).toBe('running');
    expect(game.getState().screen).toBe('flight-deck');
  });
});
