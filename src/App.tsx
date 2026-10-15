import React, { useEffect } from 'react';
import {
  CURRICULUM_SECTORS,
  getNextStage,
  getNoteLaneAndFinger,
} from './data/curriculum';
import { soundEngine } from './audio/soundEngine';
import { HeaderNav } from './components/HeaderNav';
import { HUD } from './components/HUD';
import { TextPromptStream } from './components/TextPromptStream';
import { IntegratedLanesKeyboard } from './components/IntegratedLanesKeyboard';
import { ErgonomicHandsStation } from './components/ErgonomicHandsStation';
import { StageSelectModal } from './components/StageSelectModal';
import { HangarUpgradesModal } from './components/HangarUpgradesModal';
import { AnalyticsModal } from './components/AnalyticsModal';
import { CustomPracticeModal } from './components/CustomPracticeModal';
import { LevelCompleteModal } from './components/LevelCompleteModal';
import { useGameStore } from './store/useGameStore';
import { Play, RotateCcw } from 'lucide-react';

export default function App() {
  const {
    gameState,
    currentStage,
    profile,
    performance,
    activeLaneIndex,
    lastPressedKey,
    errorIndices,
    fallingNotes,
    victoryResult,
    setGameState,
    startStage,
    processKeystroke,
    updateFallingNotesOnTick,
    updateTelemetryOnInterval,
    launchNextStage,
    toggleSound,
    toggleMusic,
    cycleBeatTheme,
    toggleKeyboard,
    upgradeShields,
    upgradeReactor,
    upgradeSensors,
    unlockOrEquipTheme,
    unlockOrEquipAudio,
    importProfile,
    resetProgress,
  } = useGameStore();

  // Synchronize audio engine with current profile settings
  useEffect(() => {
    soundEngine.setSoundEnabled(profile.soundEnabled);
    soundEngine.setSoundVolume(profile.soundVolume);
    soundEngine.setMusicEnabled(profile.musicEnabled !== false);
    soundEngine.setMusicVolume(profile.musicVolume ?? 0.4);
    soundEngine.setBeatTheme(profile.beatTheme || 'NEON_SYNTHWAVE');
    soundEngine.setCore(profile.upgrades.equippedAudioCore);
  }, [profile]);

  // Falling Notes Highway Motion & Conveyor Loop (60 FPS)
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const interval = setInterval(() => {
      updateFallingNotesOnTick();
    }, 1000 / 60);

    return () => clearInterval(interval);
  }, [gameState, updateFallingNotesOnTick]);

  // Live WPM and accuracy calculation timer (every 500ms)
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const interval = setInterval(() => {
      updateTelemetryOnInterval();
    }, 500);

    return () => clearInterval(interval);
  }, [gameState, updateTelemetryOnInterval]);

  // Main Keystroke Handler (Active touch-typing listener)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'PLAYING') return;

      // Ignore functional modifier keystrokes alone
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) {
        return;
      }

      // Prevent Spacebar from scrolling the page
      if (e.key === ' ') {
        e.preventDefault();
      }

      processKeystroke(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, processKeystroke]);

  const activeChar = currentStage.sampleText[performance.currentCharIndex] || null;
  const targetCharInfo = activeChar ? getNoteLaneAndFinger(activeChar) : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Strict Top Bar Contract */}
      <HeaderNav
        totalStars={profile.totalStars}
        totalCredits={profile.totalCredits}
        onOpenStages={() => setGameState('STAGE_SELECT')}
        onOpenHangar={() => setGameState('HANGAR')}
        onOpenAnalytics={() => setGameState('ANALYTICS')}
        onOpenCustom={() => setGameState('CUSTOM_PRACTICE')}
        onQuickPlay={() => {
          if (gameState === 'PLAYING') {
            setGameState('STAGE_SELECT');
          } else {
            startStage(currentStage);
          }
        }}
        isPlaying={gameState === 'PLAYING'}
      />

      {/* Main Game Screen */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 flex flex-col gap-4">
        {gameState === 'MENU' ? (
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
              Master touch typing with a comprehensive structured curriculum. Guide falling laser notes
              down the cosmic rhythm highway, unlock interstellar sectors with 3-star ratings, and upgrade
              your starship shields.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
              <button
                onClick={() => startStage(CURRICULUM_SECTORS[0].stages[0])}
                className="px-6 py-3.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-sm sm:text-base flex items-center gap-2 shadow-xl shadow-cyan-950 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Begin Home Row Mission</span>
              </button>

              <button
                onClick={() => setGameState('STAGE_SELECT')}
                className="px-6 py-3.5 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-medium text-sm sm:text-base transition-colors cursor-pointer"
              >
                View Galaxy Sectors (7 Sectors)
              </button>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
                <span className="text-xs font-mono font-bold text-cyan-400 block mb-1">
                  Structured Curriculum
                </span>
                <p className="text-xs text-slate-400">
                  Home row anchor tactile alignment, top & bottom reaches, 100 common words, numbers, and code syntax.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
                <span className="text-xs font-mono font-bold text-amber-400 block mb-1">
                  Rhythm Space Highway
                </span>
                <p className="text-xs text-slate-400">
                  9-lane falling keystroke notes, PERFECT strike timing, combo multipliers, and Hyperspace warp drive.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
                <span className="text-xs font-mono font-bold text-emerald-400 block mb-1">
                  Sector Fleet Progression
                </span>
                <p className="text-xs text-slate-400">
                  Earn 3 stars per stage, unlock gated sectors, install Deflector Shields, and equip custom audio synths.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Active Cockpit Flight Deck */
          <div className="flex-1 flex flex-col gap-4">
            {/* Top HUD Telemetry */}
            <HUD
              performance={performance}
              soundEnabled={profile.soundEnabled}
              onToggleSound={toggleSound}
              onPause={() => {
                soundEngine.stopBeat();
                setGameState('PAUSED');
              }}
              onToggleKeyboard={toggleKeyboard}
              keyboardVisible={profile.keyboardVisible}
              musicEnabled={profile.musicEnabled}
              onToggleMusic={toggleMusic}
              beatTheme={profile.beatTheme}
              onCycleBeatTheme={cycleBeatTheme}
            />

            {/* Text Prompt Stream */}
            <TextPromptStream
              fullText={currentStage.sampleText}
              currentIndex={performance.currentCharIndex}
              errorIndices={errorIndices}
              targetWpm={currentStage.targetWpm}
              stageTitle={`${currentStage.title} · ${currentStage.subtitle}`}
            />

            {/* Interactive Rhythm Keyboard Flight Deck */}
            <IntegratedLanesKeyboard
              notes={fallingNotes}
              hyperspaceActive={performance.hyperspaceActive}
              multiplier={performance.multiplier}
              currentStreak={performance.currentStreak}
              activeLaneIndex={activeLaneIndex}
              targetLaneIndex={targetCharInfo ? targetCharInfo.lane : null}
              timingFeedback={performance.timingFeedback}
              timingFeedbackKey={performance.timingFeedbackKey}
              trailTheme={profile.upgrades.equippedTrailTheme}
              activeChar={activeChar}
              lastPressedKey={lastPressedKey}
            />

            {/* Ergonomic Hand & Finger Technique Guide */}
            {profile.keyboardVisible && (
              <ErgonomicHandsStation
                activeChar={activeChar}
                lastPressedKey={lastPressedKey}
              />
            )}
          </div>
        )}
      </main>

      {/* Pause Menu Modal */}
      {gameState === 'PAUSED' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 text-center">
            <h3 className="text-xl font-bold font-display text-white mb-1">Mission Paused</h3>
            <p className="text-xs text-slate-400 mb-6">Rest your wrists and maintain posture.</p>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => {
                  setGameState('PLAYING');
                  if (profile.musicEnabled) soundEngine.startBeat();
                }}
                className="w-full py-2.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs font-mono transition-colors cursor-pointer"
              >
                Resume Flight
              </button>

              <button
                onClick={() => startStage(currentStage)}
                className="w-full py-2.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restart Mission</span>
              </button>

              <button
                onClick={() => {
                  soundEngine.stopBeat();
                  setGameState('STAGE_SELECT');
                }}
                className="w-full py-2.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 text-xs font-mono transition-colors cursor-pointer"
              >
                Exit to Galaxy Map
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stage Select Galaxy Modal */}
      {gameState === 'STAGE_SELECT' && (
        <StageSelectModal
          stagesProgress={profile.stagesProgress}
          totalStars={profile.totalStars}
          totalCredits={profile.totalCredits}
          onSelectStage={(stage) => startStage(stage)}
          onClose={() => {
            setGameState('PLAYING');
            if (profile.musicEnabled) soundEngine.startBeat();
          }}
          onOpenHangar={() => setGameState('HANGAR')}
          onOpenAnalytics={() => setGameState('ANALYTICS')}
        />
      )}

      {/* Hangar Upgrades Modal */}
      {gameState === 'HANGAR' && (
        <HangarUpgradesModal
          upgrades={profile.upgrades}
          totalCredits={profile.totalCredits}
          onUpgradeShields={upgradeShields}
          onUpgradeReactor={upgradeReactor}
          onUpgradeSensors={upgradeSensors}
          onUnlockOrEquipTheme={unlockOrEquipTheme}
          onUnlockOrEquipAudio={unlockOrEquipAudio}
          onClose={() => setGameState('STAGE_SELECT')}
        />
      )}

      {/* Performance Analytics & Heatmap Modal */}
      {gameState === 'ANALYTICS' && (
        <AnalyticsModal
          profile={profile}
          onClose={() => setGameState('STAGE_SELECT')}
          onImportProfile={importProfile}
          onResetProgress={resetProgress}
        />
      )}

      {/* Custom Practice / Free Flight Modal */}
      {gameState === 'CUSTOM_PRACTICE' && (
        <CustomPracticeModal
          initialSpeed={profile.highwaySpeed}
          onStartCustom={(customStage, speed) => {
            startStage(customStage, speed);
          }}
          onClose={() => setGameState('MENU')}
        />
      )}

      {/* Victory / Level Complete Modal */}
      {gameState === 'VICTORY' && victoryResult && (
        <LevelCompleteModal
          stage={currentStage}
          result={victoryResult}
          hasUnlockedNextSector={victoryResult.newStarsAwarded > 0}
          hasNextStage={Boolean(getNextStage(currentStage.id))}
          onReplay={() => startStage(currentStage)}
          onNextStage={launchNextStage}
          onReturnToMap={() => setGameState('STAGE_SELECT')}
        />
      )}
    </div>
  );
}
