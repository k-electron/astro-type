import type React from 'react';
import { useState } from 'react';
import {
  Star,
  Lock,
  Play,
  Trophy,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  ArrowLeft,
  Home,
  RotateCcw,
} from 'lucide-react';
import type { Screen, Stage, StageProgress } from '../types/game';
import { flightDeckLabel } from './closeLabel';
import { CURRICULUM_SECTORS } from '../data/curriculum';
import { isSectorUnlocked } from '../game/profile';

interface StageSelectModalProps {
  stagesProgress: Record<string, StageProgress>;
  totalStars: number;
  totalCredits: number;
  onSelectStage: (stage: Stage) => void;
  onClose: () => void;
  onGoToFlightDeck?: () => void;
  onOpenHangar: () => void;
  onOpenAnalytics: () => void;
  onWipeAchievements: () => void;
  /** The screen Close returns to. */
  opener?: Screen | null;
  /** A paused Run is waiting, so the Flight Deck button resumes it. */
  runPaused?: boolean;
  onReturnToDebrief?: () => void;
  onReturnToMenu?: () => void;
}

export const StageSelectModal: React.FC<StageSelectModalProps> = ({
  stagesProgress,
  totalStars,
  totalCredits,
  onSelectStage,
  onClose,
  onGoToFlightDeck,
  onOpenHangar,
  onOpenAnalytics,
  onWipeAchievements,
  opener = null,
  runPaused = false,
  onReturnToDebrief,
  onReturnToMenu,
}) => {
  const [selectedSectorId, setSelectedSectorId] = useState<string>('sector-1');
  const [showWipeConfirm, setShowWipeConfirm] = useState<boolean>(false);

  const activeSector =
    CURRICULUM_SECTORS.find((s) => s.id === selectedSectorId) ||
    CURRICULUM_SECTORS[0];
  const { unlocked: isCurrentUnlocked, starsRemaining } = isSectorUnlocked(
    selectedSectorId,
    totalStars,
  );

  return (
    <div className="fixed inset-x-0 bottom-0 top-[var(--header-height,0px)] z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-5xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-6 border-b border-slate-800 bg-slate-950/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono text-cyan-400">
                Interstellar Academy
              </span>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Progress Saved</span>
              </div>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-white mt-0.5">
              Flight Sectors & Missions
            </h2>
          </div>

          {/* Gamification Stats: Stars & Credits */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-950/30">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-lg font-bold text-amber-300 tabular-nums">
                    {totalStars}
                  </span>
                  <span className="text-xs text-amber-500">/ 84 Stars</span>
                </div>
              </div>

              {(totalStars > 0 || Object.keys(stagesProgress).length > 0) && (
                <button
                  type="button"
                  onClick={() => setShowWipeConfirm(true)}
                  title="Wipe curriculum achievements and reset stars to 0 for the classical touch-typing curriculum"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-rose-900/60 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-white text-xs font-mono transition-all cursor-pointer shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden sm:inline">Wipe Achievements</span>
                  <span className="sm:hidden">Wipe</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/30">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-lg font-bold text-cyan-300 tabular-nums">
                  {(totalCredits ?? 0).toLocaleString()}
                </span>
                <span className="text-xs text-cyan-500">Credits</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenHangar}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors whitespace-nowrap cursor-pointer"
              >
                Hangar Upgrades
              </button>
              <button
                type="button"
                onClick={onOpenAnalytics}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors whitespace-nowrap cursor-pointer"
              >
                Report
              </button>

              {opener === 'debrief' ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={onReturnToDebrief || onClose}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-cyan-500/50 bg-cyan-950/50 text-cyan-300 hover:bg-cyan-900/60 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Debriefing</span>
                  </button>
                  {onReturnToMenu && (
                    <button
                      type="button"
                      onClick={onReturnToMenu}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <Home className="w-3.5 h-3.5" />
                      <span>Menu</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  {onGoToFlightDeck && (
                    <button
                      type="button"
                      onClick={onGoToFlightDeck}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all flex items-center gap-1 cursor-pointer shadow-sm shadow-cyan-950 whitespace-nowrap"
                      title="Launch directly into the cockpit flight deck"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{flightDeckLabel(runPaused)}</span>
                    </button>
                  )}
                  {onReturnToMenu && opener !== 'academy-home' && (
                    <button
                      type="button"
                      onClick={onReturnToMenu}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <Home className="w-3.5 h-3.5" />
                      <span>Menu</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Split: Sector Navigator Sidebar + Stage Cards Grid */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left: Sector Navigation List */}
          <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/40 p-3 sm:p-4 overflow-y-auto flex flex-col gap-2">
            <span className="text-[11px] uppercase font-mono tracking-wider text-slate-500 px-2">
              Progression Sectors
            </span>

            {CURRICULUM_SECTORS.map((sector) => {
              const { unlocked } = isSectorUnlocked(sector.id, totalStars);
              const isSelected = sector.id === selectedSectorId;

              // Calculate stars earned in this sector
              const sectorStars = sector.stages.reduce((sum, stg) => {
                const prog = stagesProgress[stg.id];
                return sum + (prog?.starsEarned || 0);
              }, 0);

              return (
                <button
                  type="button"
                  key={sector.id}
                  onClick={() => setSelectedSectorId(sector.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'border-cyan-500/80 bg-slate-800/90 shadow-md'
                      : 'border-slate-800/60 bg-slate-900/50 hover:bg-slate-800/50 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs font-mono shrink-0 ${
                        !unlocked
                          ? 'bg-slate-800 text-slate-500'
                          : isSelected
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {!unlocked ? (
                        <Lock className="w-4 h-4" />
                      ) : (
                        sector.themeSymbol
                      )}
                    </div>

                    <div className="truncate">
                      <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
                        <span>{sector.codenick}</span>
                        {!unlocked && (
                          <span className="text-[10px] text-amber-400">
                            · Needs {sector.requiredStarsToUnlock}★
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-sm text-slate-200 truncate">
                        {sector.name}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {sector.curriculumCategory}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                    <div className="flex items-center gap-1 text-xs font-mono text-amber-400">
                      <Star className="w-3 h-3 fill-amber-400" />
                      <span>{sectorStars}/12</span>
                    </div>
                    <ChevronRight
                      className={`w-3.5 h-3.5 ${isSelected ? 'text-cyan-400' : 'text-slate-600'}`}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right: Active Sector Stage Grid */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-slate-900/40">
            {/* Sector Hero Info Banner */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
                  <span>{activeSector.codenick}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeSector.curriculumCategory}</span>
                </div>
                <h3 className="text-xl font-bold text-white mt-0.5">
                  {activeSector.name}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
                  {activeSector.description}
                </p>
              </div>

              {!isCurrentUnlocked && (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-500/40 bg-amber-950/30 text-amber-300 text-xs font-medium">
                  <Lock className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>
                    Sector Locked. Earn {starsRemaining} more stars to unlock
                    this Sector.
                  </span>
                </div>
              )}
            </div>

            {/* Stages Grid (4 stages per sector) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {activeSector.stages.map((stage) => {
                const progress = stagesProgress[stage.id];
                const stars = progress?.starsEarned || 0;
                const isCompleted = progress?.completed || false;

                return (
                  <div
                    key={stage.id}
                    className={`rounded-xl border p-4 sm:p-5 flex flex-col justify-between transition-all ${
                      !isCurrentUnlocked
                        ? 'border-slate-800/40 bg-slate-950/30 opacity-60'
                        : isCompleted
                          ? 'border-slate-800 bg-slate-950/70 hover:border-cyan-500/50'
                          : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Top status: Stage #, Difficulty & Stars */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                          <span className="text-cyan-400 font-semibold">
                            STAGE 0{stage.stageNumber}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{stage.difficulty}</span>
                        </div>

                        {/* 3-Star Rating */}
                        <div className="flex items-center gap-1">
                          {[1, 2, 3].map((starNum) => (
                            <Star
                              key={starNum}
                              className={`w-4 h-4 ${
                                starNum <= stars
                                  ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]'
                                  : 'text-slate-700 fill-slate-800'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <h4 className="text-base sm:text-lg font-bold text-white">
                          {stage.title}
                        </h4>
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono shrink-0">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Saved</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-mono text-cyan-400/90 mb-1">
                        {stage.subtitle}
                      </p>

                      {/* Pedagogical Finger Focus Badge */}
                      {stage.focusFingers && (
                        <div className="flex items-center gap-1.5 mb-2 text-[11px] font-mono">
                          <span className="px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-800/60 text-cyan-300 font-semibold">
                            Finger Focus: {stage.focusFingers}
                          </span>
                        </div>
                      )}

                      <p className="text-xs text-slate-400 mb-3 line-clamp-2">
                        {stage.description}
                      </p>

                      {/* Technique Tip */}
                      {stage.techniqueTip && (
                        <div className="p-2 rounded bg-slate-900/90 border border-slate-800/90 text-[11px] text-slate-300 italic mb-3">
                          "{stage.techniqueTip}"
                        </div>
                      )}

                      {/* Keys Trained & Cadence Requirement */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-[11px] font-mono">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-slate-500 mr-0.5">Keys:</span>
                          {stage.targetKeys.slice(0, 8).map((k) => (
                            <span
                              key={k}
                              className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60"
                            >
                              {k === ' ' ? '␣ Space' : k}
                            </span>
                          ))}
                        </div>
                        <span className="text-cyan-400/90 font-semibold bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                          Cadence: {stage.targetWpm} WPM (Acc &ge;{' '}
                          {stage.starThresholds.threeStarAccuracy}%)
                        </span>
                      </div>

                      {/* Personal Best Telemetry */}
                      {progress && (
                        <div className="flex items-center gap-4 py-2 px-3 rounded-lg bg-slate-900/80 border border-slate-800/80 text-xs font-mono mb-4 text-slate-400">
                          <div className="flex items-center gap-1">
                            <Trophy className="w-3.5 h-3.5 text-amber-400" />
                            <span>
                              {(progress.highScore ?? 0).toLocaleString()}
                            </span>
                          </div>
                          <span aria-hidden="true">·</span>
                          <div>
                            <span>
                              Best:{' '}
                              <strong className="text-slate-200">
                                {progress.bestWpm} WPM
                              </strong>
                            </span>
                          </div>
                          <span aria-hidden="true">·</span>
                          <div>
                            <span>
                              Acc:{' '}
                              <strong className="text-slate-200">
                                {progress.bestAccuracy}%
                              </strong>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Launch Mission Button */}
                    <button
                      type="button"
                      disabled={!isCurrentUnlocked}
                      onClick={() => onSelectStage(stage)}
                      className={`w-full py-2.5 px-4 rounded-lg font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        !isCurrentUnlocked
                          ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
                          : isCompleted
                            ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-950/50'
                            : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-900/40'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>
                        {isCompleted ? 'Replay Mission' : 'Launch Mission'}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal: Wipe Curriculum Achievements */}
      {showWipeConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-rose-900/80 bg-slate-900 shadow-2xl p-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-rose-950/60 border border-rose-500/50 flex items-center justify-center mx-auto mb-4 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
              <RotateCcw className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold font-display text-white mb-2">
              Wipe Curriculum Achievements?
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              The touch-typing curriculum has been upgraded with structured
              classical finger-building methodology. Wiping achievements will
              clear all{' '}
              <span className="text-amber-400 font-bold font-mono">
                {totalStars} ★ stars earned
              </span>{' '}
              and stage records, relocking sectors so you can master the
              progressive inside-out curriculum from Sector 1.
            </p>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-left mb-6 space-y-1.5">
              <div className="text-rose-400 font-bold flex items-center gap-1.5">
                <span>•</span> All 28 Stage Star Ratings reset to 0 ★
              </div>
              <div className="text-rose-400 font-bold flex items-center gap-1.5">
                <span>•</span> Interstellar Sectors relocked to Gate 0
              </div>
              <div className="text-emerald-400 flex items-center gap-1.5">
                <span>•</span> Starship Credits (
                {(totalCredits ?? 0).toLocaleString()} Cr) & Upgrades are
                preserved
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowWipeConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onWipeAchievements();
                  setSelectedSectorId('sector-1');
                  setShowWipeConfirm(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-mono transition-colors shadow-lg shadow-rose-950/50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Confirm Wipe</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
