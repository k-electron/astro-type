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
  Home,
} from 'lucide-react';
import { useGame } from '../app/useGame';
import { useGameState } from '../app/useGameState';
import {
  OverlayCloseButton,
  OverlayFlightDeckButton,
  OverlayShell,
} from './OverlayShell';
import {
  CURRICULUM_SECTORS,
  CURRICULUM_TOTALS,
  furthestUnlockedSector,
  isSectorUnlocked,
  maxStarsOf,
  STAR_NUMBERS,
  type Stage,
} from '../curriculum/curriculum';

export const GalaxyMap: React.FC = () => {
  const { send } = useGame();
  const { stagesProgress, totalStars, totalCredits, opener } = useGameState(
    (state) => ({
      stagesProgress: state.profile.stagesProgress,
      totalStars: state.profile.totalStars,
      totalCredits: state.profile.totalCredits,
      opener: state.opener,
    }),
  );
  const onSelectStage = (stage: Stage) =>
    send({ type: 'PICK_STAGE', stageId: stage.id });
  const onOpenHangar = () => send({ type: 'OPEN_HANGAR' });
  const onOpenAnalytics = () => send({ type: 'OPEN_ANALYTICS' });
  const onReturnHome = () => send({ type: 'PRESS_HOME' });
  const [selectedSectorId, setSelectedSectorId] = useState<string>(
    () => furthestUnlockedSector(totalStars).id,
  );

  const activeSector =
    CURRICULUM_SECTORS.find((s) => s.id === selectedSectorId) ||
    CURRICULUM_SECTORS[0];
  const { unlocked: isCurrentUnlocked, starsRemaining } = isSectorUnlocked(
    selectedSectorId,
    totalStars,
  );

  return (
    <OverlayShell variant="window" width="5xl" labelledBy="galaxy-map-title">
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
          <h2
            id="galaxy-map-title"
            className="text-xl sm:text-2xl font-bold font-display text-white mt-0.5"
          >
            Galaxy Map
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
                <span className="text-xs text-amber-500">
                  / {CURRICULUM_TOTALS.stars} Stars
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/30">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-lg font-bold text-cyan-300 tabular-nums">
                {totalCredits.toLocaleString()}
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
              Analytics
            </button>

            {opener === 'debrief' ? (
              <div className="flex items-center gap-1.5">
                <OverlayCloseButton look="back" />
                <button
                  type="button"
                  onClick={onReturnHome}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Academy Home</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <OverlayFlightDeckButton look="compact" />
                {opener !== 'academy-home' && (
                  <button
                    type="button"
                    onClick={onReturnHome}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <Home className="w-3.5 h-3.5" />
                    <span>Academy Home</span>
                  </button>
                )}
                <OverlayCloseButton look="compact" />
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
            Sectors
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
                    <span>
                      {sectorStars}/{maxStarsOf(sector)}
                    </span>
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
                  Sector Locked. Earn {starsRemaining} more stars to unlock this
                  Sector.
                </span>
              </div>
            )}
          </div>

          {/* Stages Grid (4 stages per sector) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeSector.stages.map((stage) => {
              const progress = stagesProgress[stage.id];
              const stars = progress?.starsEarned || 0;
              const isCompleted = progress?.completed;

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

                      {/* 3-Star display */}
                      <div className="flex items-center gap-1">
                        {STAR_NUMBERS.map((starNum) => (
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

                    {/* Keys Trained & Target WPM */}
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
                        Target WPM: {stage.targetWpm} (Acc &ge;{' '}
                        {stage.starThresholds.threeStarAccuracy}%)
                      </span>
                    </div>

                    {/* Personal Best Telemetry */}
                    {progress && (
                      <div className="flex items-center gap-4 py-2 px-3 rounded-lg bg-slate-900/80 border border-slate-800/80 text-xs font-mono mb-4 text-slate-400">
                        <div className="flex items-center gap-1">
                          <Trophy className="w-3.5 h-3.5 text-amber-400" />
                          <span>{progress.highScore.toLocaleString()}</span>
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

                  {/* Launch Stage Button */}
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
                    <span>{isCompleted ? 'Replay Stage' : 'Launch Stage'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </OverlayShell>
  );
};
