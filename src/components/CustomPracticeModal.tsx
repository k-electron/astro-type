import type React from 'react';
import { useState } from 'react';
import { Play } from 'lucide-react';
import {
  DEFAULT_FREE_FLIGHT_WPM,
  FREE_FLIGHT_PRESETS,
  FreeFlightTextSchema,
} from '../data/curriculum';
import { useGame } from '../store/gameContext';
import { OverlayCloseButton, OverlayShell } from './OverlayShell';

export const CustomPracticeModal: React.FC = () => {
  const { send } = useGame();
  const [customText, setCustomText] = useState<string>(
    FREE_FLIGHT_PRESETS[0].text,
  );
  const [targetWpm, setTargetWpm] = useState<number>(DEFAULT_FREE_FLIGHT_WPM);

  // Free Flight text is checked as it is typed, so Launch is disabled (with
  // the reason) before the player can start a Run that would get stuck.
  const checked = FreeFlightTextSchema.safeParse(customText);
  const untypeableMessage =
    !checked.success && customText.trim() !== ''
      ? checked.error.issues[0].message
      : null;

  const handleLaunch = () => {
    if (!checked.success) return;
    send({ type: 'LAUNCH_FREE_FLIGHT', text: checked.data, targetWpm });
  };

  return (
    <OverlayShell variant="form" width="2xl" labelledBy="free-flight-title">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
        <div>
          <span className="block text-xs uppercase font-mono text-cyan-400">
            Free Flight Simulator
          </span>
          <h2
            id="free-flight-title"
            className="text-xl sm:text-2xl font-bold font-display text-white"
          >
            Custom Typing Practice
          </h2>
        </div>

        <OverlayCloseButton />
      </div>

      {/* Presets */}
      <div className="mb-5">
        <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block mb-2">
          Load Quick Presets
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {FREE_FLIGHT_PRESETS.map((preset) => (
            <button
              type="button"
              key={preset.name}
              onClick={() => {
                setCustomText(preset.text);
                setTargetWpm(preset.wpm);
              }}
              className="text-left p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-cyan-500/50 hover:bg-slate-800/60 transition-all text-xs"
            >
              <div className="font-semibold text-slate-200">{preset.name}</div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                {preset.text}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Text Area */}
      <div className="mb-5">
        <label
          htmlFor="custom-drill-text"
          className="text-xs font-mono uppercase tracking-wider text-slate-400 block mb-2"
        >
          Custom Drill Text
        </label>
        <textarea
          id="custom-drill-text"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          rows={4}
          placeholder="Type or paste any text, article, or code you want to train on..."
          className="w-full p-3 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 font-mono text-xs sm:text-sm focus:outline-none focus:border-cyan-400 resize-none"
        />
        <div className="flex justify-between text-[11px] text-slate-500 font-mono mt-1">
          <span>{customText.length} characters</span>
          <span>
            Approx. {Math.round(customText.trim().split(/\s+/).length)} words
          </span>
        </div>
      </div>

      {/* Flight Parameters (Target WPM) */}
      <div className="mb-6">
        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-mono uppercase text-slate-400">
              Target Cadence
            </span>
            <span className="text-sm font-bold font-mono text-cyan-400">
              {targetWpm} WPM
            </span>
          </div>
          <input
            type="range"
            min={15}
            max={100}
            step={5}
            value={targetWpm}
            onChange={(e) => setTargetWpm(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
        </div>
      </div>

      {untypeableMessage && (
        <p role="alert" className="mb-3 text-xs font-mono text-rose-400">
          {untypeableMessage}
        </p>
      )}

      {/* Start Button */}
      <button
        type="button"
        disabled={!checked.success}
        onClick={handleLaunch}
        className="w-full py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50 transition-all cursor-pointer"
      >
        <Play className="w-4 h-4 fill-current" />
        <span>Launch Custom Flight</span>
      </button>
    </OverlayShell>
  );
};
