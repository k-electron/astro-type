import type { Game } from '../game/game';
import { closeTopEscLayer } from './escLayers';

/**
 * The keyboard, attached to a game from outside: the composition root calls
 * this once, and a test calls it on its own game. It owns what the browser
 * tells us about keys and focus, and turns it into what the player did:
 *
 * - a key goes down or up: `pressKey` / `releaseKey` while a Run is running.
 *   Which keys count (one character, no auto-repeat, no Cmd or Ctrl shortcut)
 *   is the game's call, so every keydown is passed on with its modifiers.
 *   While a Run is running it owns Space, Tab and Enter: the page never sees
 *   them, so Space can't scroll it and a stray Tab and Enter can't walk focus
 *   to a header button and click it, which would abandon the Run. Esc, and
 *   anything while paused or on a menu, is left to the page.
 * - Esc: the top open layer closes, or else `PRESS_ESC` on every screen, never
 *   a keystroke. The machine decides what it means there (the Esc contract,
 *   below).
 * - the window loses focus (blur) or the tab is hidden: the held key lets go,
 *   and `LOST_FOCUS` pauses a running Run.
 *
 * **The Esc contract.** Esc is a stack, and this listener is its one owner.
 * It is on `window`, so it sees an Esc whether it was sent to the window or
 * bubbled up from the focused element. The layers a screen holds open over
 * itself (`app/escLayers.ts`) are the top of the stack: the header's audio
 * panel, then a confirm. One Esc closes the top layer and nothing more. With
 * no layer open, the Esc is the game's: the machine closes the screen, or
 * pauses and resumes the Run, or opens the Galaxy Map from the Debrief. A held
 * key's repeats do nothing, so they can't close a second layer. No element
 * listens for Esc itself.
 *
 * Returns the function that detaches every listener it added.
 */
export function attachKeyboard(game: Game, win: Window): () => void {
  const isRunning = () => game.getState().phase === 'running';

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (event.repeat) return;
      if (!closeTopEscLayer()) game.send({ type: 'PRESS_ESC' });
      return;
    }

    if (!isRunning()) return;

    // The running Run owns Space, Tab (Shift+Tab too) and Enter: none of them
    // may scroll the page, move focus or click a focused button. The game
    // still gets every key and decides what counts.
    if (event.key === ' ' || event.key === 'Tab' || event.key === 'Enter') {
      event.preventDefault();
    }

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
