import { soundEffects } from './audio/soundEffects';
import { createRealtimeClock } from './game/clock';
import { createGame } from './game/createGame';
import { createLocalStorageSave } from './utils/storage';

/**
 * The composition root: the one game the app builds at startup. Real time,
 * the Save in localStorage, and sound attached from outside.
 */
export const game = createGame({
  storage: createLocalStorageSave(),
  clock: createRealtimeClock(),
  effects: soundEffects,
});
