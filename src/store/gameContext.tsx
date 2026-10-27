import { createContext, type ReactNode, useContext, useMemo } from 'react';
import type { Game } from '../game/createGame';
import type { OnFrame } from '../game/frameLoop';

interface GameContextValue {
  game: Game;
  onFrame: OnFrame;
}

const GameContext = createContext<GameContextValue | null>(null);

/** A frame source that never has a frame: for a game with no loop (a DOM test). */
const noFrames: OnFrame = () => () => {};

/**
 * Hands the React tree what it renders: the game, and the Run clock's frames
 * for the Action Deck to draw from. The composition root provides the app's
 * own; a DOM test provides a headless game and, having no loop, no frames.
 */
export function GameProvider({
  game,
  onFrame = noFrames,
  children,
}: {
  game: Game;
  onFrame?: OnFrame;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ game, onFrame }), [game, onFrame]);
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

function useGameContext(): GameContextValue {
  const value = useContext(GameContext);
  if (!value) throw new Error('useGame needs a GameProvider above it');
  return value;
}

/** The game this tree renders. Throws outside a `GameProvider`. */
export function useGame(): Game {
  return useGameContext().game;
}

/** The Run clock's frames, for the Action Deck. */
export function useOnFrame(): OnFrame {
  return useGameContext().onFrame;
}
