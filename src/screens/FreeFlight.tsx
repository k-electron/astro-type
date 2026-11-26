import type React from 'react';
import { useState } from 'react';
import { Play } from 'lucide-react';
import {
  FREE_FLIGHT_SUBTITLE,
  FREE_FLIGHT_TITLE,
  FREE_FLIGHT_PRESETS,
  FreeFlightTextSchema,
  cleanFreeFlightText,
  countCharacters,
} from '../curriculum/curriculum';
import { useGame } from '../app/useGame';
import {
  OverlayCloseButton,
  OverlayFlightDeckButton,
  OverlayShell,
} from './OverlayShell';
import { useGameState } from '../app/useGameState';

export const FreeFlight: React.FC = () => {
  const { send } = useGame();
  // A Run waiting (paused) is resumed from here, as from the other menus.
  const runWaiting = useGameState((state) => state.phase === 'paused');
  const [customText, setCustomText] = useState<string>(
    FREE_FLIGHT_PRESETS[0].text,
  );

  // Free Flight text is checked as it is typed, so Launch is disabled (with
  // the reason) before the player can start a Run that would get stuck.
  const checked = FreeFlightTextSchema.safeParse(customText);
  const untypeableMessage = checked.success
    ? null
    : checked.error.issues[0].message;
  // The counts are of the text the Run will type, whether or not it passes.
  const typed = cleanFreeFlightText(customText);
  const characterCount = countCharacters(typed);
  const wordCount = typed === '' ? 0 : typed.split(/\s+/).length;

  const handleLaunch = () => {
    if (!checked.success) return;
    send({ type: 'LAUNCH_FREE_FLIGHT', text: checked.data });
  };

  return (
    <OverlayShell variant="form" width="2xl" labelledBy="free-flight-title">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
        <div>
          <h2
            id="free-flight-title"
            className="text-xl sm:text-2xl font-bold font-display text-white"
          >
            {FREE_FLIGHT_TITLE}
          </h2>
          <p className="type-sentence text-cyan-400 mt-0.5">
            {FREE_FLIGHT_SUBTITLE}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5">
          {runWaiting && <OverlayFlightDeckButton />}
          <OverlayCloseButton />
        </div>
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
              }}
              className="text-left p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-cyan-500/50 hover:bg-slate-800/60 transition-all text-xs"
            >
              <div className="font-semibold text-slate-200">{preset.name}</div>
              <div className="type-caption text-slate-500 truncate mt-0.5">
                {preset.text}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Text Area */}
      <div className="mb-5">
        <label
          htmlFor="free-flight-text"
          className="text-xs font-mono uppercase tracking-wider text-slate-400 block mb-2"
        >
          Your Text
        </label>
        <textarea
          id="free-flight-text"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          rows={4}
          placeholder="Type or paste any text, article, or code you want to train on..."
          className="w-full p-3 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 font-mono text-xs sm:text-sm focus:outline-none focus:border-cyan-400 resize-none"
        />
        {/* Why Launch is off. The line keeps its space when empty, so nothing moves. */}
        <p role="alert" className="min-h-5 mt-1 type-sentence text-rose-400">
          {untypeableMessage}
        </p>
        <div className="flex justify-between type-caption text-slate-500 font-mono mt-1">
          <span>{characterCount} characters</span>
          <span>Approx. {wordCount} words</span>
        </div>
      </div>

      {/* Start Button */}
      <button
        type="button"
        disabled={!checked.success}
        onClick={handleLaunch}
        className="w-full py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50 transition-all cursor-pointer"
      >
        <Play className="w-4 h-4 fill-current" />
        <span>Start Free Flight</span>
      </button>
    </OverlayShell>
  );
};
