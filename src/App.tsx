import { useEffect, useRef } from 'react';
import {
  CURRICULUM_SECTORS,
  getNextStage,
  getStageById,
} from './data/curriculum';
import { soundEngine } from './audio/soundEngine';
import { HeaderNav } from './components/HeaderNav';
import { HUD } from './components/HUD';
import { TextPromptStream } from './components/TextPromptStream';
import { StageSelectModal } from './components/StageSelectModal';
import { HangarUpgradesModal } from './components/HangarUpgradesModal';
import { AnalyticsModal } from './components/AnalyticsModal';
import { PixiActionDeck } from './components/pixi-deck/PixiActionDeck';
import { CustomPracticeModal } from './components/CustomPracticeModal';
import { LevelCompleteModal } from './components/LevelCompleteModal';
import { GlobalCosmicBackground } from './components/GlobalCosmicBackground';
import { useGame } from './store/gameContext';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from './store/useGameStore';
import { useOpener, useRunPhase, useScreen } from './store/useGameScreen';
import { Play, RotateCcw } from 'lucide-react';

/**
 * The starfield behind everything. It reads the two fields that speed it up
 * itself, so a change to either re-renders only the starfield, not the app.
 */
function CosmicBackdrop({ onFlightDeck }: { onFlightDeck: boolean }) {
  const { hyperspaceActive, multiplier } = useGameStore(
    useShallow((state) => ({
      hyperspaceActive: state.performance.hyperspaceActive,
      multiplier: state.performance.multiplier,
    })),
  );
  return (
    <GlobalCosmicBackground
      hyperspaceActive={onFlightDeck && hyperspaceActive}
      multiplier={onFlightDeck ? multiplier : 1}
    />
  );
}

export default function App() {
  const game = useGame();
  const screen = useScreen();
  const phase = useRunPhase();
  const opener = useOpener();
  const runPaused = phase === 'paused';
  const { send } = game;

  // App reads only what it shows itself. The Run's moving fields (Drones,
  // score, Streak, the typed index) belong to the deck, the HUD and the text
  // prompt, which read them on their own.
  const currentStage = useGameStore((state) => state.currentStage);
  const profile = useGameStore((state) => state.profile);
  const loadNotice = useGameStore((state) => state.loadNotice);
  const victoryResult = useGameStore((state) => state.victoryResult);
  // The store's actions never change, so reading them off the store is stable.
  const {
    processKeystroke,
    releaseKeystroke,
    toggleGlobalMute,
    toggleSound,
    toggleMusic,
    setSoundVolume,
    setMusicVolume,
    setBeatTheme,
    upgradeShields,
    upgradeReactor,
    upgradeSensors,
    unlockOrEquipTheme,
    unlockOrEquipAudio,
    importProfile,
    wipeCurriculumAchievements,
    resetProgress,
  } = game.store.getState();

  // Synchronize audio engine with current profile settings
  useEffect(() => {
    soundEngine.setGlobalMute(Boolean(profile.globalMuted));
    soundEngine.setSoundEnabled(profile.soundEnabled);
    soundEngine.setSoundVolume(profile.soundVolume);
    soundEngine.setMusicEnabled(profile.musicEnabled !== false);
    soundEngine.setMusicVolume(profile.musicVolume ?? 0.4);
    soundEngine.setBeatTheme(profile.beatTheme || 'NEON_SYNTHWAVE');
    soundEngine.setCore(profile.upgrades.equippedAudioCore);
  }, [
    profile.globalMuted,
    profile.soundEnabled,
    profile.soundVolume,
    profile.musicEnabled,
    profile.musicVolume,
    profile.beatTheme,
    profile.upgrades.equippedAudioCore,
  ]);

  // Main Keystroke Handler (Active touch-typing listener with down/up press duration tracking)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc is a player event on every screen; the machine decides what it
      // means there. It is never a keystroke. A header dropdown that took the
      // Esc to close itself has already marked it handled.
      if (e.key === 'Escape') {
        if (!e.repeat && !e.defaultPrevented) send({ type: 'PRESS_ESC' });
        return;
      }

      if (phase !== 'running') return;

      // Prevent Spacebar from scrolling the page
      if (e.key === ' ') {
        e.preventDefault();
      }

      // A shortcut such as Cmd+R types nothing. (Ctrl with Alt is how some
      // layouts type AltGr characters, so that pair still counts.)
      if (e.metaKey || (e.ctrlKey && !e.altKey)) return;

      // Which keys count, and dropping auto-repeat, is the game's call.
      processKeystroke(e.key, { repeat: e.repeat });
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (phase !== 'running') return;
      releaseKeystroke(e.key);
    };

    const handleBlur = () => {
      releaseKeystroke();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [phase, send, processKeystroke, releaseKeystroke]);

  // Leaving the page (another window, another tab) is a player event: the
  // machine pauses a running Run and ignores it anywhere else.
  useEffect(() => {
    const handleLostFocus = () => send({ type: 'LOST_FOCUS' });
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') handleLostFocus();
    };
    window.addEventListener('blur', handleLostFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('blur', handleLostFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [send]);

  // The Pause Menu takes focus itself, not a button, so a stray Enter or
  // Space (typing on after a focus-loss pause) has nothing to activate.
  const pauseMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (screen === 'pause-menu') pauseMenuRef.current?.focus();
  }, [screen]);

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden">
      {/* Global Cosmic Starfield Background: tranquil on home & modals; hyperwarp ONLY during active flight */}
      <CosmicBackdrop onFlightDeck={screen === 'flight-deck'} />

      {/* Strict Top Bar Contract */}
      <HeaderNav
        totalStars={profile.totalStars}
        totalCredits={profile.totalCredits}
        isMuted={Boolean(profile.globalMuted)}
        soundEnabled={profile.soundEnabled}
        musicEnabled={profile.musicEnabled !== false}
        soundVolume={profile.soundVolume}
        musicVolume={profile.musicVolume ?? 0.4}
        beatTheme={profile.beatTheme || 'NEON_SYNTHWAVE'}
        audioCore={profile.upgrades.equippedAudioCore}
        onToggleGlobalMute={toggleGlobalMute}
        onToggleSound={toggleSound}
        onToggleMusic={toggleMusic}
        onSetSoundVolume={setSoundVolume}
        onSetMusicVolume={setMusicVolume}
        onSetBeatTheme={setBeatTheme}
        onSetAudioCore={(core) => unlockOrEquipAudio(core, 0)}
        onGoHome={() => send({ type: 'PRESS_HOME' })}
        onOpenStages={() => send({ type: 'OPEN_GALAXY_MAP' })}
        onOpenHangar={() => send({ type: 'OPEN_HANGAR' })}
        onOpenAnalytics={() => send({ type: 'OPEN_ANALYTICS' })}
        onOpenCustom={() => send({ type: 'OPEN_FREE_FLIGHT' })}
        onQuickPlay={() =>
          send({
            type: screen === 'flight-deck' ? 'PRESS_PAUSE' : 'PRESS_PLAY',
          })
        }
        isPlaying={screen === 'flight-deck'}
      />

      {/* Main Game Screen */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 flex flex-col gap-4">
        {screen === 'academy-home' ? (
          /* Title Screen / Academy Briefing */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-12 max-w-3xl mx-auto my-auto">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
              <span className="w-6 h-6 rounded-full bg-cyan-400 shadow-[0_0_12px_#38bdf8]" />
            </div>

            <span className="text-xs uppercase font-mono tracking-widest text-cyan-400 mb-2">
              Deep Space Flight Academy
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold font-display text-white tracking-tight mb-4">
              AstroType: Cosmic Touch Typing
            </h1>
            <p className="text-sm sm:text-base text-slate-400 leading-relaxed mb-8 max-w-xl">
              Master touch typing with a comprehensive structured curriculum.
              Guide falling laser notes down the cosmic rhythm highway, unlock
              interstellar sectors with 3-star ratings, and upgrade your
              starship shields.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
              <button
                type="button"
                onClick={() =>
                  send({
                    type: 'PICK_STAGE',
                    stageId: CURRICULUM_SECTORS[0].stages[0].id,
                  })
                }
                className="px-6 py-3.5 rounded-xl text-sm sm:text-base flex items-center gap-2 font-bold transition-all cursor-pointer bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-xl shadow-cyan-950"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Begin Home Row Mission</span>
              </button>

              <button
                type="button"
                onClick={() => send({ type: 'OPEN_GALAXY_MAP' })}
                className="px-6 py-3.5 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-medium text-sm sm:text-base transition-colors cursor-pointer"
              >
                View Galaxy Sectors (7 Sectors)
              </button>
            </div>

            {(profile.totalStars > 0 ||
              Object.keys(profile.stagesProgress).length > 0) && (
              <div className="flex flex-wrap items-center justify-center gap-2 mb-8 px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-400">
                <span className="text-amber-400 font-bold">
                  ★ {profile.totalStars} Stars Earned
                </span>
                <span>·</span>
                <span className="text-slate-400">Curriculum updated?</span>
                <button
                  type="button"
                  onClick={() => send({ type: 'OPEN_GALAXY_MAP' })}
                  className="text-rose-400 hover:text-rose-300 font-bold underline cursor-pointer ml-1"
                >
                  Wipe Achievements & Replay
                </button>
              </div>
            )}

            {loadNotice && (
              <p role="status" className="mb-8 text-xs text-slate-500">
                {loadNotice}
              </p>
            )}

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
                <span className="text-xs font-mono font-bold text-cyan-400 block mb-1">
                  Structured Curriculum
                </span>
                <p className="text-xs text-slate-400">
                  Home row anchor tactile alignment, top & bottom reaches, 100
                  common words, numbers, and code syntax.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
                <span className="text-xs font-mono font-bold text-amber-400 block mb-1">
                  Rhythm Space Highway
                </span>
                <p className="text-xs text-slate-400">
                  9-lane falling keystroke notes, PERFECT strike timing, Streak
                  Multipliers, and Overdrive.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
                <span className="text-xs font-mono font-bold text-emerald-400 block mb-1">
                  Sector Fleet Progression
                </span>
                <p className="text-xs text-slate-400">
                  Earn 3 stars per stage, unlock gated sectors, install
                  Deflector Shields, and equip custom audio synths.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Active Cockpit Flight Deck */
          <div className="flex-1 flex flex-col gap-4">
            {/* Top HUD Telemetry */}
            <HUD onPause={() => send({ type: 'PRESS_PAUSE' })} />

            {/* Text Prompt Stream */}
            <TextPromptStream />

            {/* Interactive Rhythm Keyboard Flight Deck */}
            <PixiActionDeck />
          </div>
        )}
      </main>

      {/* Pause Menu Modal */}
      {screen === 'pause-menu' && (
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
      )}

      {/* Stage Select Galaxy Modal */}
      {screen === 'galaxy-map' && (
        <StageSelectModal
          stagesProgress={profile.stagesProgress}
          totalStars={profile.totalStars}
          totalCredits={profile.totalCredits}
          opener={opener}
          runPaused={runPaused}
          onSelectStage={(stage) =>
            send({ type: 'PICK_STAGE', stageId: stage.id })
          }
          onGoToFlightDeck={() => send({ type: 'PRESS_PLAY' })}
          onReturnToDebrief={() => send({ type: 'PRESS_CLOSE' })}
          onReturnToMenu={() => send({ type: 'PRESS_HOME' })}
          onClose={() => send({ type: 'PRESS_CLOSE' })}
          onOpenHangar={() => send({ type: 'OPEN_HANGAR' })}
          onOpenAnalytics={() => send({ type: 'OPEN_ANALYTICS' })}
          onWipeAchievements={wipeCurriculumAchievements}
        />
      )}

      {/* Hangar Upgrades Modal */}
      {screen === 'hangar' && (
        <HangarUpgradesModal
          upgrades={profile.upgrades}
          totalCredits={profile.totalCredits}
          onUpgradeShields={upgradeShields}
          onUpgradeReactor={upgradeReactor}
          onUpgradeSensors={upgradeSensors}
          onUnlockOrEquipTheme={unlockOrEquipTheme}
          onUnlockOrEquipAudio={unlockOrEquipAudio}
          opener={opener}
          runPaused={runPaused}
          onGoToFlightDeck={() => send({ type: 'PRESS_PLAY' })}
          onClose={() => send({ type: 'PRESS_CLOSE' })}
        />
      )}

      {/* Performance Analytics & Heatmap Modal */}
      {screen === 'analytics' && (
        <AnalyticsModal
          profile={profile}
          opener={opener}
          runPaused={runPaused}
          onGoToFlightDeck={() => send({ type: 'PRESS_PLAY' })}
          onClose={() => send({ type: 'PRESS_CLOSE' })}
          onImportProfile={importProfile}
          onWipeAchievements={wipeCurriculumAchievements}
          onResetProgress={resetProgress}
        />
      )}

      {/* Custom Practice / Free Flight Modal */}
      {screen === 'free-flight' && (
        <CustomPracticeModal
          initialSpeed={profile.highwaySpeed}
          onStartCustom={(stage, speed) =>
            send({ type: 'LAUNCH_FREE_FLIGHT', stage, speed })
          }
          opener={opener}
          onClose={() => send({ type: 'PRESS_CLOSE' })}
        />
      )}

      {/* Victory / Level Complete Modal */}
      {screen === 'debrief' && victoryResult && (
        <LevelCompleteModal
          stage={currentStage}
          result={victoryResult}
          totalStars={profile.totalStars}
          totalCredits={profile.totalCredits}
          hasUnlockedNextSector={victoryResult.unlockedSector}
          hasNextStage={Boolean(getNextStage(currentStage.id))}
          isLastStage={
            getStageById(currentStage.id) !== undefined &&
            !getNextStage(currentStage.id)
          }
          onReplay={() => send({ type: 'PRESS_REPLAY' })}
          onNextStage={() => send({ type: 'PRESS_NEXT_STAGE' })}
          onReturnToMap={() => send({ type: 'OPEN_GALAXY_MAP' })}
          onReturnToMenu={() => send({ type: 'PRESS_HOME' })}
        />
      )}
    </div>
  );
}
