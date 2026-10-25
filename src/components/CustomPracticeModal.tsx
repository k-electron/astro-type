import type React from 'react';
import { useState } from 'react';
import { Play } from 'lucide-react';
import { FreeFlightTextSchema } from '../store/schemas';
import type { Stage } from '../types/game';

interface CustomPracticeModalProps {
  onStartCustom: (
    customStage: Stage,
    speed: 'SLOW' | 'NORMAL' | 'FAST' | 'HYPER',
  ) => void;
  onClose: () => void;
  initialSpeed: 'SLOW' | 'NORMAL' | 'FAST' | 'HYPER';
}

const PRESET_TEXTS = [
  {
    name: 'Cosmic Exploration Quotes',
    text: 'Across the sea of space, the stars are other suns. We have entered the cosmic ocean, and the journey of discovery has only just begun.',
    wpm: 40,
  },
  {
    name: 'JavaScript / Web Tech Code',
    text: 'const canvas = document.createElement("canvas"); const ctx = canvas.getContext("2d"); function animate() { requestAnimationFrame(animate); }',
    wpm: 35,
  },
  {
    name: 'Astral Number Coordinates',
    text: 'Coordinate 398.24 bearing 072 sector 44 azimuth 189 velocity 24500 telemetry 8891 status nominal.',
    wpm: 30,
  },
  {
    name: 'Classic Pangram Marathon',
    text: 'The quick brown fox jumps over the lazy dog. Sphinx of black quartz, judge my vow. How vexingly quick daft zebras jump!',
    wpm: 45,
  },
];

export const CustomPracticeModal: React.FC<CustomPracticeModalProps> = ({
  onStartCustom,
  onClose,
  initialSpeed,
}) => {
  const [customText, setCustomText] = useState<string>(PRESET_TEXTS[0].text);
  const [targetWpm, setTargetWpm] = useState<number>(40);
  const [speed, setSpeed] = useState<'SLOW' | 'NORMAL' | 'FAST' | 'HYPER'>(
    initialSpeed,
  );

  // Free Flight text is checked as it is typed, so Launch is disabled (with
  // the reason) before the player can start a Run that would get stuck.
  const checked = FreeFlightTextSchema.safeParse(customText);
  const untypeableMessage =
    !checked.success && customText.trim() !== ''
      ? checked.error.issues[0].message
      : null;

  const handleLaunch = () => {
    if (!checked.success) return;
    const cleanText = checked.data;

    const customStage: Stage = {
      id: `custom-${Date.now()}`,
      sectorId: 'sector-custom',
      stageNumber: 0,
      title: 'Free Flight Drill',
      subtitle: 'Custom Practice Mission',
      description: 'Player tailored free-form typing session.',
      targetKeys: Array.from(new Set(cleanText.toLowerCase().split(''))),
      sampleText: cleanText,
      difficulty:
        targetWpm > 50
          ? 'Expert'
          : targetWpm > 35
            ? 'Advanced'
            : 'Intermediate',
      targetWpm,
      focusFingers: 'Free Flight Custom Selection',
      techniqueTip:
        'Maintain relaxed posture and steady keystroke cadence across your custom text.',
      drillPatternType: 'CADENCE_FLOW',
      starThresholds: {
        oneStarAccuracy: 75,
        twoStarWpm: targetWpm,
        twoStarAccuracy: 90,
        threeStarWpm: Math.round(targetWpm * 1.3),
        threeStarAccuracy: 96,
        threeStarMinStreak: 20,
      },
    };

    onStartCustom(customStage, speed);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 top-[var(--header-height,0px)] z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div>
            <span className="block text-xs uppercase font-mono text-cyan-400">
              Free Flight Simulator
            </span>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
              Custom Typing Practice
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>

        {/* Presets */}
        <div className="mb-5">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block mb-2">
            Load Quick Presets
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRESET_TEXTS.map((preset) => (
              <button
                type="button"
                key={preset.name}
                onClick={() => {
                  setCustomText(preset.text);
                  setTargetWpm(preset.wpm);
                }}
                className="text-left p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-cyan-500/50 hover:bg-slate-800/60 transition-all text-xs"
              >
                <div className="font-semibold text-slate-200">
                  {preset.name}
                </div>
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

        {/* Flight Parameters (Target WPM & Highway Drop Speed) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
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

          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-mono uppercase text-slate-400">
                Highway Note Speed
              </span>
              <span className="text-[10px] font-mono text-cyan-400/80">
                {speed}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mb-2">
              Visual scroll & descent velocity of approaching notes (does not
              alter target WPM).
            </p>
            <div className="grid grid-cols-4 gap-1">
              {(['SLOW', 'NORMAL', 'FAST', 'HYPER'] as const).map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setSpeed(s)}
                  title={`${s === 'SLOW' ? 'Relaxed approach (0.9x)' : s === 'NORMAL' ? 'Standard rhythm (1.5x)' : s === 'FAST' ? 'High-speed tempo (2.2x)' : 'Hyper-velocity reflex (3.4x)'}`}
                  className={`py-1.5 text-[11px] font-mono rounded font-medium transition-colors cursor-pointer ${
                    speed === s
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
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
      </div>
    </div>
  );
};
