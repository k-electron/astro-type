import type React from 'react';
import { useEffect } from 'react';
import {
  Star,
  Sparkles,
  RotateCcw,
  ArrowRight,
  Map as MapIcon,
  CheckCircle2,
  Home,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getNextStage, getStageById } from '../data/curriculum';
import { useGame } from '../store/gameContext';
import { useGameState } from '../store/useGameState';

export const LevelCompleteModal: React.FC = () => {
  const { send } = useGame();
  const { stage, result, totalStars } = useGameState((state) => ({
    stage: state.run.currentStage,
    result: state.debrief,
    totalStars: state.profile.totalStars,
  }));
  const hasNextStage = Boolean(getNextStage(stage.id));
  // A Free Flight is no Stage of the curriculum, so it is never the last one.
  const isLastStage = getStageById(stage.id) !== undefined && !hasNextStage;
  const hasUnlockedNextSector = result?.unlockedSector ?? false;
  const onReplay = () => send({ type: 'PRESS_REPLAY' });
  const onNextStage = () => send({ type: 'PRESS_NEXT_STAGE' });
  const onReturnToMap = () => send({ type: 'OPEN_GALAXY_MAP' });
  const onReturnToMenu = () => send({ type: 'PRESS_HOME' });
  const earned = result?.starsEarned;
  const thresholds = stage.starThresholds;

  useEffect(() => {
    if (earned === 3) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#38bdf8', '#fbbf24', '#34d399', '#f43f5e'],
        });
      } catch {
        // Confetti fallback
      }
    }
  }, [earned]);

  if (!result) return null;
  const {
    starsEarned,
    score,
    wpm,
    accuracy,
    creditsEarned,
    isNewHighScore,
    newStarsAwarded,
  } = result;

  return (
    <div className="fixed inset-x-0 bottom-0 top-[var(--header-height,0px)] z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 sm:p-8 flex flex-col items-center text-center my-auto">
        {/* Stage Badge & Title */}
        <span className="text-xs uppercase font-mono tracking-wider text-cyan-400 mb-1">
          Mission Debriefing · {stage.id.toUpperCase()}
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold font-display text-white mb-1">
          {stage.title}
        </h2>
        <p className="text-xs font-mono text-slate-400 mb-5">
          {stage.subtitle}
        </p>

        {/* 3-Star Rating Animation Display */}
        <div className="flex items-center justify-center gap-3 mb-5">
          {[1, 2, 3].map((starNum) => {
            const isEarned = starNum <= starsEarned;
            return (
              <div
                key={starNum}
                className={`p-3 rounded-2xl border transition-all transform ${
                  isEarned
                    ? 'border-amber-400/80 bg-amber-500/20 scale-110 shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                    : 'border-slate-800 bg-slate-950/60 opacity-40'
                }`}
              >
                <Star
                  className={`w-8 h-8 sm:w-10 sm:h-10 ${
                    isEarned
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-600 fill-slate-800'
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Auto-Save & Stars Collection Notification Banner */}
        <div className="w-full mb-5 p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-950/30 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_0_20px_rgba(16,185,129,0.12)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono uppercase tracking-wide text-emerald-300">
                  Stars Collected & Auto-Saved
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Saved
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                All stars, credits, and unlocked sectors are securely recorded
                in your starship log.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:border-l sm:border-emerald-500/30 sm:pl-4 shrink-0">
            <div className="text-left font-mono">
              <span className="text-[10px] text-slate-400 uppercase block">
                Total Fleet Stars
              </span>
              <div className="flex items-center gap-1.5 text-amber-300 font-bold text-sm">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{totalStars} ★</span>
                {newStarsAwarded > 0 && (
                  <span className="text-[10px] text-emerald-400 font-semibold">
                    (+{newStarsAwarded} new)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Star Objectives Breakdown */}
        <div className="w-full bg-slate-950/60 border border-slate-800 rounded-xl p-3 mb-5 text-xs font-mono text-left space-y-1.5">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-2">
              <span
                className={
                  starsEarned >= 1
                    ? 'text-amber-400 font-bold'
                    : 'text-slate-600'
                }
              >
                ★ 1
              </span>
              <span>
                Baseline Touch Form (Acc &ge; {thresholds.oneStarAccuracy}%)
              </span>
            </span>
            <span
              className={
                accuracy >= thresholds.oneStarAccuracy
                  ? 'text-emerald-400 font-bold'
                  : 'text-rose-400'
              }
            >
              {accuracy >= thresholds.oneStarAccuracy ? 'ACHIEVED' : 'MISSED'}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-2">
              <span
                className={
                  starsEarned >= 2
                    ? 'text-amber-400 font-bold'
                    : 'text-slate-600'
                }
              >
                ★ 2
              </span>
              <span>
                Steady Cadence & Flow (Speed &ge; {thresholds.twoStarWpm} WPM &
                Acc &ge; {thresholds.twoStarAccuracy}%)
              </span>
            </span>
            <span
              className={
                wpm >= thresholds.twoStarWpm &&
                accuracy >= thresholds.twoStarAccuracy
                  ? 'text-emerald-400 font-bold'
                  : 'text-slate-500'
              }
            >
              {wpm >= thresholds.twoStarWpm &&
              accuracy >= thresholds.twoStarAccuracy
                ? 'ACHIEVED'
                : 'INCOMPLETE'}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-2">
              <span
                className={
                  starsEarned >= 3
                    ? 'text-amber-400 font-bold'
                    : 'text-slate-600'
                }
              >
                ★ 3
              </span>
              <span>
                Finger Form Mastery (Speed &ge; {thresholds.threeStarWpm} WPM,
                Acc &ge; {thresholds.threeStarAccuracy}%, Streak &ge;{' '}
                {thresholds.threeStarMinStreak})
              </span>
            </span>
            <span
              className={
                starsEarned >= 3
                  ? 'text-emerald-400 font-bold'
                  : 'text-slate-500'
              }
            >
              {starsEarned >= 3 ? 'ACHIEVED' : 'INCOMPLETE'}
            </span>
          </div>
        </div>

        {/* Performance Metrics Grid */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] uppercase font-mono text-slate-500 block">
              Score
            </span>
            <div className="flex items-center justify-center gap-1 font-mono font-bold text-white text-lg">
              {(score ?? 0).toLocaleString()}
            </div>
            {isNewHighScore && (
              <span className="text-[9px] font-mono text-amber-400 uppercase font-semibold">
                New Best!
              </span>
            )}
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] uppercase font-mono text-slate-500 block">
              Speed
            </span>
            <span className="font-mono font-bold text-cyan-400 text-lg">
              {wpm} <span className="text-xs text-slate-500">WPM</span>
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] uppercase font-mono text-slate-500 block">
              Accuracy
            </span>
            <span className="font-mono font-bold text-emerald-400 text-lg">
              {accuracy}%
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] uppercase font-mono text-slate-500 block">
              Credits
            </span>
            <div className="flex items-center justify-center gap-1 font-mono font-bold text-amber-400 text-lg">
              <Sparkles className="w-3.5 h-3.5" />
              <span>+{creditsEarned}</span>
            </div>
          </div>
        </div>

        {/* Form & Cadence Pedagogical Assessment Card */}
        <div className="w-full bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 mb-5 text-left">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[11px] font-mono uppercase font-bold text-cyan-400">
              Touch-Typing Technique Assessment
            </span>
            {result.cadenceConsistency !== undefined && (
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  result.cadenceConsistency >= 85
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : result.cadenceConsistency >= 70
                      ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300'
                      : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                }`}
              >
                Cadence Rhythm: {result.cadenceConsistency}% (
                {result.cadenceConsistency >= 85
                  ? 'Steady'
                  : result.cadenceConsistency >= 70
                    ? 'Paced'
                    : 'Uneven'}
                )
              </span>
            )}
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {accuracy >= 97
              ? 'Flawless finger discipline! You struck each key with accurate finger placement without rushing. This deliberate muscle memory is the true foundation of touch typing.'
              : accuracy >= 92
                ? 'Solid rhythm and finger control. Keep your hands relaxed and resting lightly on the home anchor bumps (F and J). Speed will naturally follow.'
                : 'Pacing advice: Slow down your stroke tempo! Touch typing is built on accurate finger selection, not raw speed. Practicing slowly with correct fingers prevents bad habits.'}
          </p>
        </div>

        {/* Sector Unlock Notification Banner */}
        {hasUnlockedNextSector && (
          <div className="w-full mb-5 p-3 rounded-xl border border-cyan-500/50 bg-cyan-950/40 text-cyan-200 text-xs font-mono flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>New Sector Unlocked! Find it on the Galaxy Map.</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="w-full flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={onReplay}
            className="flex-1 min-w-[120px] px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Replay</span>
          </button>

          <button
            type="button"
            onClick={onReturnToMap}
            className="flex-1 min-w-[130px] px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <MapIcon className="w-4 h-4 text-cyan-400" />
            <span>Galaxy Map</span>
          </button>

          <button
            type="button"
            onClick={onReturnToMenu}
            className="flex-1 min-w-[120px] px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Main Menu</span>
          </button>

          {/* On the last Stage, Next Stage opens the Galaxy Map instead. */}
          {(hasNextStage || isLastStage) && (
            <button
              type="button"
              onClick={onNextStage}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50 transition-all cursor-pointer"
            >
              <span>
                {hasNextStage ? 'Next Mission' : 'Back to Galaxy Map'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
