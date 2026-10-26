import { createContext, type ReactNode, useContext } from 'react';
import type { Game } from '../game/createGame';

const GameContext = createContext<Game | null>(null);

/**
 * Hands the React tree the game it renders. The app's entry point provides
 * the one `appGame` builds; a DOM test provides a headless one.
 */
export function GameProvider({
  game,
  children,
}: {
  game: Game;
  children: ReactNode;
}) {
  return <GameContext.Provider value={game}>{children}</GameContext.Provider>;
}

/** The game this tree renders. Throws outside a `GameProvider`. */
export function useGame(): Game {
  const game = useContext(GameContext);
  if (!game) throw new Error('useGame needs a GameProvider above it');
  return game;
}
