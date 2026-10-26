import { useSyncExternalStore } from 'react';
import { useGame } from './gameContext';
import type { RunPhase, Screen } from '../types/game';

/** React's view of the machine: which screen is showing, the Run phase, and what opened the screen. */
export function useScreen(): Screen {
  const game = useGame();
  return useSyncExternalStore(game.subscribe, game.getScreen);
}

export function useRunPhase(): RunPhase {
  const game = useGame();
  return useSyncExternalStore(game.subscribe, game.getPhase);
}

/** The screen Close returns to, or null when nothing opened this one. */
export function useOpener(): Screen | null {
  const game = useGame();
  return useSyncExternalStore(game.subscribe, game.getOpener);
}
