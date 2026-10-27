import { soundEffects } from './audio/soundEffects';
import { createRealtimeClock } from './game/clock';
import { createGame } from './game/createGame';
import { browserFrameEnvironment, startFrameLoop } from './game/frameLoop';
import { createLocalStorageSave } from './utils/storage';

/**
 * The composition root: the one game the app builds at startup. Real time,
 * the Save in localStorage, and sound attached from outside.
 *
 * The Run clock's frame loop starts here too: it steps the game while the Run
 * is running and does nothing otherwise.
 *
 * A move the machine refuses changes nothing; dev builds say so in the console.
 */
export const game = createGame({
  storage: createLocalStorageSave(),
  clock: createRealtimeClock(),
  sound: soundEffects,
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
import.meta.hot?.dispose(stopFrameLoop);
