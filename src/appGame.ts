import { soundEffects } from './audio/soundEffects';
import { createRealtimeClock } from './game/clock';
import { createGame } from './game/createGame';
import { createLocalStorageSave } from './utils/storage';

/**
 * The composition root: the one game the app builds at startup. Real time,
 * the Save in localStorage, and sound attached from outside.
 *
 * A move the machine refuses changes nothing; dev builds say so in the console.
 */
export const game = createGame({
  storage: createLocalStorageSave(),
  clock: createRealtimeClock(),
  effects: soundEffects,
  onRefusedMove: (error) => {
    if (import.meta.env.DEV) console.warn(error.message);
  },
});
