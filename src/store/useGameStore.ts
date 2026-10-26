import { useStore } from 'zustand';
import { useGame } from './gameContext';
import type { GameStoreState } from '../game/gameStore';

/** React's view of the app's game: a thin hook over the game's vanilla store. */
export function useGameStore(): GameStoreState;
export function useGameStore<T>(selector: (state: GameStoreState) => T): T;
export function useGameStore<T>(selector?: (state: GameStoreState) => T) {
  const { store } = useGame();
  return useStore(store, selector as (state: GameStoreState) => T);
}
