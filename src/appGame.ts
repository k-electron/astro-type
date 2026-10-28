import { engineSound } from './audio/engineSound';
import { attachKeyboard } from './app/attachKeyboard';
import { createRealtimeClock } from './game/clock';
import { createGame } from './game/game';
import { browserFrameEnvironment, startFrameLoop } from './game/frameLoop';
import { createLocalStorageSave } from './utils/storage';

/**
 * The composition root: the one game the app builds at startup. Real time,
 * the Save in localStorage, and sound attached from outside.
 *
 * The Run clock's frame loop starts here too: it steps the game while the Run
 * is running and does nothing otherwise. So does the keyboard: keys, Esc and
 * the page losing focus reach the game from here, not from a component.
 *
 * A move the machine refuses changes nothing; dev builds say so in the console.
 */
export const game = createGame({
  storage: createLocalStorageSave(),
  clock: createRealtimeClock(),
  sound: engineSound,
  onRefusedMove: (error) => {
    if (import.meta.env.DEV) console.warn(error.message);
  },
});

type FrameListener = (stepFraction: number) => void;
const frameListeners = new Set<FrameListener>();

/**
 * Hear every frame of the Run clock's loop, after it has stepped the game,
 * with how far the frame is into the next step. The PixiJS Action Deck draws
 * from this. Returns the way to stop listening.
 */
export function onFrame(listener: FrameListener): () => void {
  frameListeners.add(listener);
  return () => {
    frameListeners.delete(listener);
  };
}

const stopFrameLoop = startFrameLoop(
  game,
  browserFrameEnvironment(),
  (stepFraction) => {
    for (const listener of frameListeners) listener(stepFraction);
  },
);
const detachKeyboard = attachKeyboard(game, window);
import.meta.hot?.dispose(() => {
  stopFrameLoop();
  detachKeyboard();
});
