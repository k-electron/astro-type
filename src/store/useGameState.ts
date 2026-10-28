import { useSyncExternalStore } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { GameState } from '../game/game';
import { useGame } from './gameContext';

/**
 * React's one view of the game: a selector over the settled snapshot. The
 * component re-renders when the selected value changes, compared shallowly, so
 * a selector may return a new object (or array) without looping or
 * over-rendering.
 */
export function useGameState<T>(selector: (state: GameState) => T): T {
  const game = useGame();
  const select = useShallow(selector);
  return useSyncExternalStore(game.subscribe, () => select(game.getState()));
}
