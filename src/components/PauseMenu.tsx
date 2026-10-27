import type React from 'react';
import { RotateCcw } from 'lucide-react';
import { useGame } from '../store/gameContext';
import { OverlayShell } from './OverlayShell';

/**
 * The Pause Menu. It takes focus itself when it opens, not a button, so a stray
 * Enter or Space (typing on after a focus-loss pause) has nothing to activate.
 */
export const PauseMenu: React.FC = () => {
  const { send } = useGame();

  return (
    <OverlayShell
      variant="pause"
      width="sm"
      labelledBy="pause-menu-title"
      focusOnOpen
    >
      <h3
        id="pause-menu-title"
        className="text-xl font-bold font-display text-white mb-1"
      >
        Mission Paused
      </h3>
      <p className="text-xs text-slate-400 mb-6">
        Rest your wrists and maintain posture.
      </p>

      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => send({ type: 'PRESS_RESUME' })}
          className="w-full py-2.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs font-mono transition-colors cursor-pointer"
        >
          Resume Flight
        </button>

        <button
          type="button"
          onClick={() => send({ type: 'PRESS_REPLAY' })}
          className="w-full py-2.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restart Mission</span>
        </button>

        <button
          type="button"
          onClick={() => send({ type: 'OPEN_GALAXY_MAP' })}
          className="w-full py-2.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-mono transition-colors cursor-pointer"
        >
          View Galaxy Map
        </button>

        <button
          type="button"
          onClick={() => send({ type: 'PRESS_HOME' })}
          className="w-full py-2.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 text-xs font-mono transition-colors cursor-pointer"
        >
          Exit to Academy Home
        </button>
      </div>
    </OverlayShell>
  );
};
