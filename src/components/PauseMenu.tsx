import type React from 'react';
import { useEffect, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { useGame } from '../store/gameContext';

export const PauseMenu: React.FC = () => {
  const { send } = useGame();

  // The Pause Menu takes focus itself, not a button, so a stray Enter or
  // Space (typing on after a focus-loss pause) has nothing to activate.
  const pauseMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    pauseMenuRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-x-0 bottom-0 top-[var(--header-height,0px)] z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div
        ref={pauseMenuRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pause-menu-title"
        tabIndex={-1}
        className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 text-center outline-none"
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
      </div>
    </div>
  );
};
