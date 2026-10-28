import type { Game } from '../game/game';

/**
 * The keyboard, attached to a game from outside: the composition root calls
 * this once, and a test calls it on its own game. It owns what the browser
 * tells us about keys and focus, and turns it into what the player did:
 *
 * - a key goes down or up: `pressKey` / `releaseKey` while a Run is running.
 *   Which keys count (one character, no auto-repeat, no Cmd or Ctrl shortcut)
 *   is the game's call, so every keydown is passed on with its modifiers.
 *   Space is kept from scrolling the page while a Run is running.
 * - Esc: `PRESS_ESC` on every screen, never a keystroke. The machine decides
 *   what it means there.
 * - the window loses focus (blur) or the tab is hidden: the held key lets go,
 *   and `LOST_FOCUS` pauses a running Run.
 *
 * **The Esc contract.** The listener is on `window`, so an element on the page
 * sees an Esc first. An element that uses Esc for itself (a dropdown closing)
 * swallows it by calling `preventDefault()` on the keydown before it reaches
 * the window; this adapter then ignores it. An Esc nobody swallowed is the
 * game's.
 *
 * Returns the function that detaches every listener it added.
 */
export function attachKeyboard(game: Game, win: Window): () => void {
  const isRunning = () => game.getState().phase === 'running';

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (!event.repeat && !event.defaultPrevented) {
        game.send({ type: 'PRESS_ESC' });
      }
      return;
    }

    if (!isRunning()) return;

    // Space must not scroll the page.
    if (event.key === ' ') event.preventDefault();

    game.pressKey(event.key, {
      repeat: event.repeat,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      altKey: event.altKey,
    });
  };

  const onKeyUp = (event: KeyboardEvent) => {
    if (!isRunning()) return;
    game.releaseKey(event.key);
  };

  // Leaving the page (another window, another tab) is a player event: the
  // machine pauses a running Run and ignores it anywhere else.
  const onBlur = () => {
    game.releaseKey();
    game.send({ type: 'LOST_FOCUS' });
  };
  const onVisibilityChange = () => {
    if (win.document.visibilityState === 'hidden') {
      game.send({ type: 'LOST_FOCUS' });
    }
  };

  win.addEventListener('keydown', onKeyDown);
  win.addEventListener('keyup', onKeyUp);
  win.addEventListener('blur', onBlur);
  win.document.addEventListener('visibilitychange', onVisibilityChange);
  return () => {
    win.removeEventListener('keydown', onKeyDown);
    win.removeEventListener('keyup', onKeyUp);
    win.removeEventListener('blur', onBlur);
    win.document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}
