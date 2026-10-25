import React from 'react';
import { Shield, Zap, Pause } from 'lucide-react';
import { LivePerformance } from '../types/game';

interface HUDProps {
  performance: LivePerformance;
  onPause: () => void;
  onToggleKeyboard: () => void;
  keyboardVisible: boolean;
}

export const HUD: React.FC<HUDProps> = ({
  performance,
  onPause,
  onToggleKeyboard,
  keyboardVisible,
}) => {
  const {
    score,
    currentStreak,
    multiplier,
    hyperspaceActive,
    hyperspaceEnergy,
    shieldsRemaining,
    netWpm,
    accuracy,
  } = performance;

  return (
    <section
      aria-label="HUD"
      className="w-full h-14 flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 rounded-xl border border-slate-800 bg-slate-900/90 shadow-lg backdrop-blur-md shrink-0 overflow-hidden"
    >
      {/* Left: Score & Multiplier */}
      <div className="flex items-center gap-3 sm:gap-5 shrink-0">
        <div>
          <span className="block text-[9px] uppercase font-mono tracking-wider text-slate-500 leading-none mb-0.5">
            Score
          </span>
          <span className="text-lg sm:text-xl font-bold font-mono tabular-nums text-white leading-none">
            {(score ?? 0).toLocaleString()}
          </span>
        </div>

        {/* Multiplier Badge */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center justify-center px-2 py-0.5 rounded-md font-mono font-bold text-xs sm:text-sm border transition-colors ${
              hyperspaceActive
                ? 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                : multiplier > 1
                  ? 'border-cyan-500 bg-cyan-950/50 text-cyan-300'
                  : 'border-slate-800 bg-slate-950 text-slate-400'
            }`}
          >
            {hyperspaceActive ? 'OVERDRIVE x4' : `x${multiplier}`}
          </div>

          {/* Overdrive Energy Meter */}
          <div className="hidden sm:flex flex-col gap-0.5">
            <span className="text-[8px] uppercase font-mono text-slate-500 leading-none">
              Warp Energy
            </span>
            <div className="w-16 sm:w-20 h-1.5 rounded bg-slate-800 overflow-hidden border border-slate-700/60">
              <div
                className={`h-full transition-all duration-150 ${
                  hyperspaceActive
                    ? 'bg-amber-400 shadow-[0_0_6px_#fbbf24]'
                    : 'bg-cyan-500'
                }`}
                style={{ width: `${hyperspaceEnergy}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Center: Live Typing Metrics (WPM & Accuracy) */}
      <div className="flex items-center gap-3 sm:gap-6 shrink-0">
        <div className="text-center min-w-[56px]">
          <span className="block text-[9px] uppercase font-mono tracking-wider text-slate-500 leading-none mb-0.5">
            Speed
          </span>
          <div className="flex items-baseline justify-center gap-0.5">
            <span className="text-lg sm:text-xl font-bold font-mono tabular-nums text-cyan-300 leading-none">
              {netWpm}
            </span>
            <span className="text-[10px] font-mono text-slate-500">WPM</span>
          </div>
        </div>

        <div className="text-center min-w-[60px]">
          <span className="block text-[9px] uppercase font-mono tracking-wider text-slate-500 leading-none mb-0.5">
            Accuracy
          </span>
          <span
            className={`text-lg sm:text-xl font-bold font-mono tabular-nums leading-none block ${
              accuracy >= 95
                ? 'text-emerald-400'
                : accuracy >= 88
                  ? 'text-cyan-300'
                  : 'text-amber-400'
            }`}
          >
            {accuracy}%
          </span>
        </div>

        <div className="text-center min-w-[52px]">
          <span className="block text-[9px] uppercase font-mono tracking-wider text-slate-500 leading-none mb-0.5">
            Streak
          </span>
          <div className="flex items-center justify-center gap-1 text-slate-200">
            <Zap
              className={`w-3 h-3 ${currentStreak >= 20 ? 'text-amber-400 fill-amber-400' : 'text-slate-500'}`}
            />
            <span className="text-lg sm:text-xl font-bold font-mono tabular-nums leading-none">
              {currentStreak}
            </span>
          </div>
        </div>

        {/* Steady Cadence & Rhythm Gauge */}
        <div className="hidden md:flex flex-col items-center min-w-[68px]">
          <span className="block text-[9px] uppercase font-mono tracking-wider text-slate-500 leading-none mb-0.5">
            Rhythm
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`w-2 h-2 rounded-full ${
                (performance.cadenceConsistency ?? 100) >= 85
                  ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse'
                  : (performance.cadenceConsistency ?? 100) >= 70
                    ? 'bg-cyan-400 shadow-[0_0_8px_#38bdf8]'
                    : 'bg-amber-400'
              }`}
            />
            <span
              className={`text-xs font-mono font-bold leading-none ${
                (performance.cadenceConsistency ?? 100) >= 85
                  ? 'text-emerald-300'
                  : (performance.cadenceConsistency ?? 100) >= 70
                    ? 'text-cyan-300'
                    : 'text-amber-300'
              }`}
            >
              {(performance.cadenceConsistency ?? 100) >= 85
                ? 'Steady'
                : (performance.cadenceConsistency ?? 100) >= 70
                  ? 'Paced'
                  : 'Uneven'}
            </span>
          </div>
        </div>

        {/* Shield Status */}
        <div className="w-12 h-6 flex items-center justify-center shrink-0">
          {shieldsRemaining > 0 ? (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-900 text-blue-300 text-[11px] font-mono">
              <Shield className="w-3 h-3 fill-blue-500/20" />
              <span>x{shieldsRemaining}</span>
            </div>
          ) : (
            <span className="text-[10px] font-mono text-slate-600">—</span>
          )}
        </div>
      </div>

      {/* Right: Flight Deck Navigation Controls */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onToggleKeyboard}
          className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap cursor-pointer ${
            keyboardVisible
              ? 'border-cyan-500/50 bg-cyan-950/40 text-cyan-300'
              : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle Cockpit Keyboard Guide"
        >
          {keyboardVisible ? 'Hide Deck' : 'Show Deck'}
        </button>

        <button
          onClick={onPause}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
        >
          <Pause className="w-3.5 h-3.5" />
          <span>Pause</span>
        </button>
      </div>
    </section>
  );
};
