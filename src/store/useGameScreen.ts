import { useSyncExternalStore } from 'react';
import { game } from '../appGame';
import type { RunPhase, Screen } from '../types/game';

/** React's view of the machine: which screen is showing, the Run phase, and what opened the screen. */
export function useScreen(): Screen {
  return useSyncExternalStore(game.subscribe, game.getScreen);
}

export function useRunPhase(): RunPhase {
  return useSyncExternalStore(game.subscribe, game.getPhase);
}

/** The screen Close returns to, or null when nothing opened this one. */
export function useOpener(): Screen | null {
  return useSyncExternalStore(game.subscribe, game.getOpener);
}
