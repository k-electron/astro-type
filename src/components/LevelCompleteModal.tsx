import React, { useEffect } from 'react';
import { Star, Trophy, Sparkles, RotateCcw, ArrowRight, Map } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Stage, StageProgress } from '../types/game';

interface LevelCompleteModalProps {
  stage: Stage;
  result: {
    score: number;
    wpm: number;
    accuracy: number;
    maxStreak: number;
    starsEarned: number;
    creditsEarned: number;
    isNewHighScore: boolean;
    newStarsAwarded: number;
  };
  hasUnlockedNextSector: boolean;
  hasNextStage: boolean;
  onReplay: () => void;
  onNextStage: () => void;
  onReturnToMap: () => void;
}

export const LevelCompleteModal: React.FC<LevelCompleteModalProps> = ({
  stage,
  result,
  hasUnlockedNextSector,
  hasNextStage,
  onReplay,
  onNextStage,
  onReturnToMap,
}) => {
  const { starsEarned, score, wpm, accuracy, maxStreak, creditsEarned, isNewHighScore } = result;
  const thresholds = stage.starThresholds;

  useEffect(() => {
    if (starsEarned === 3) {
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
  }, [starsEarned]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 sm:p-8 flex flex-col items-center text-center">
        {/* Stage Badge & Title */}
        <span className="text-xs uppercase font-mono tracking-wider text-cyan-400 mb-1">
          Mission Debriefing · {stage.id.toUpperCase()}
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold font-display text-white mb-1">
          {stage.title}
        </h2>
        <p className="text-xs font-mono text-slate-400 mb-6">{stage.subtitle}</p>

        {/* 3-Star Rating Animation Display */}
        <div className="flex items-center justify-center gap-3 mb-6">
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
                    isEarned ? 'fill-amber-400 text-amber-400' : 'text-slate-600 fill-slate-800'
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Star Objectives Breakdown */}
        <div className="w-full bg-slate-950/60 border border-slate-800 rounded-xl p-3 mb-6 text-xs font-mono text-left space-y-1.5">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-2">
              <span className={starsEarned >= 1 ? 'text-amber-400 font-bold' : 'text-slate-600'}>★ 1</span>
              <span>Complete Stage (Acc &ge; {thresholds.oneStarAccuracy}%)</span>
            </span>
            <span className={accuracy >= thresholds.oneStarAccuracy ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
              {accuracy >= thresholds.oneStarAccuracy ? 'ACHIEVED' : 'MISSED'}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-2">
              <span className={starsEarned >= 2 ? 'text-amber-400 font-bold' : 'text-slate-600'}>★ 2</span>
              <span>Target Cadence ({thresholds.twoStarWpm} WPM & Acc &ge; {thresholds.twoStarAccuracy}%)</span>
            </span>
            <span className={wpm >= thresholds.twoStarWpm && accuracy >= thresholds.twoStarAccuracy ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
              {wpm >= thresholds.twoStarWpm && accuracy >= thresholds.twoStarAccuracy ? 'ACHIEVED' : 'INCOMPLETE'}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-2">
              <span className={starsEarned >= 3 ? 'text-amber-400 font-bold' : 'text-slate-600'}>★ 3</span>
              <span>Grandmaster Flight ({thresholds.threeStarWpm} WPM & Acc &ge; {thresholds.threeStarAccuracy}%)</span>
            </span>
            <span className={wpm >= thresholds.threeStarWpm && accuracy >= thresholds.threeStarAccuracy ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
              {wpm >= thresholds.threeStarWpm && accuracy >= thresholds.threeStarAccuracy ? 'ACHIEVED' : 'INCOMPLETE'}
            </span>
          </div>
        </div>

        {/* Performance Metrics Grid */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] uppercase font-mono text-slate-500 block">Score</span>
            <div className="flex items-center justify-center gap-1 font-mono font-bold text-white text-lg">
              {score.toLocaleString()}
            </div>
            {isNewHighScore && (
              <span className="text-[9px] font-mono text-amber-400 uppercase font-semibold">New Best!</span>
            )}
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] uppercase font-mono text-slate-500 block">Speed</span>
            <span className="font-mono font-bold text-cyan-400 text-lg">
              {wpm} <span className="text-xs text-slate-500">WPM</span>
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] uppercase font-mono text-slate-500 block">Accuracy</span>
            <span className="font-mono font-bold text-emerald-400 text-lg">
              {accuracy}%
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] uppercase font-mono text-slate-500 block">Credits</span>
            <div className="flex items-center justify-center gap-1 font-mono font-bold text-amber-400 text-lg">
              <Sparkles className="w-3.5 h-3.5" />
              <span>+{creditsEarned}</span>
            </div>
          </div>
        </div>

        {/* Sector Unlock Notification Banner */}
        {hasUnlockedNextSector && (
          <div className="w-full mb-6 p-3 rounded-xl border border-cyan-500/50 bg-cyan-950/40 text-cyan-200 text-xs font-mono flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Warp Gate Opened: New Interstellar Sector Unlocked!</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onReplay}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Replay Mission</span>
          </button>

          <button
            onClick={onReturnToMap}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Map className="w-4 h-4" />
            <span>Galaxy Map</span>
          </button>

          {hasNextStage && (
            <button
              onClick={onNextStage}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50 transition-all"
            >
              <span>Next Mission</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
