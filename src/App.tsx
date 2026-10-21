import React, { useEffect, useState } from 'react';
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
import { StageSelectModal } from './components/StageSelectModal';
import { HangarUpgradesModal } from './components/HangarUpgradesModal';
import { AnalyticsModal } from './components/AnalyticsModal';
import { CustomPracticeModal } from './components/CustomPracticeModal';
import { LevelCompleteModal } from './components/LevelCompleteModal';
import { GlobalCosmicBackground } from './components/GlobalCosmicBackground';
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
    releaseKeystroke,
    updateFallingNotesOnTick,
    updateTelemetryOnInterval,
    launchNextStage,
    toggleGlobalMute,
    toggleSound,
    toggleMusic,
    setSoundVolume,
    setMusicVolume,
    setBeatTheme,
    cycleBeatTheme,
    toggleKeyboard,
    toggleHands,
    upgradeShields,
    upgradeReactor,
    upgradeSensors,
    unlockOrEquipTheme,
    unlockOrEquipAudio,
    importProfile,
    wipeCurriculumAchievements,
    resetProgress,
  } = useGameStore();

  // Track the source screen before opening modal to guarantee clean return navigation
  const [modalSourceState, setModalSourceState] = useState<'MENU' | 'PLAYING' | 'VICTORY' | 'STAGE_SELECT'>('MENU');

  const openModal = (target: 'STAGE_SELECT' | 'HANGAR' | 'ANALYTICS' | 'CUSTOM_PRACTICE') => {
    if (gameState === 'VICTORY') {
      setModalSourceState('VICTORY');
    } else if (gameState === 'PLAYING') {
      setModalSourceState('PLAYING');
    } else if (gameState === 'STAGE_SELECT') {
      setModalSourceState('STAGE_SELECT');
    } else {
      setModalSourceState('MENU');
    }
    setGameState(target);
  };

  useEffect(() => {
    (window as any).__astrotype = {
      useGameStore,
      CURRICULUM_SECTORS,
    };
  }, []);

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

  // Defensive guard against zombie flight deck: if gameState is PLAYING but stage was already completed, safely route to VICTORY or MENU
  useEffect(() => {
    if (
      gameState === 'PLAYING' &&
      currentStage.sampleText.length > 0 &&
      performance.currentCharIndex >= currentStage.sampleText.length
    ) {
      soundEngine.stopBeat();
      soundEngine.setOverdrive(false);
      if (victoryResult) {
        setGameState('VICTORY');
      } else {
        setGameState('MENU');
      }
    }
  }, [gameState, performance.currentCharIndex, currentStage.sampleText.length, victoryResult, setGameState]);

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

  // Main Keystroke Handler (Active touch-typing listener with down/up press duration tracking)
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

    const handleKeyUp = (e: KeyboardEvent) => {
      if (gameState !== 'PLAYING') return;
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
  }, [gameState, processKeystroke, releaseKeystroke]);

  const activeChar = currentStage.sampleText[performance.currentCharIndex] || null;
  const previousChar = performance.currentCharIndex > 0 ? currentStage.sampleText[performance.currentCharIndex - 1] : null;
  const nextChar = performance.currentCharIndex + 1 < currentStage.sampleText.length ? currentStage.sampleText[performance.currentCharIndex + 1] : null;
  const targetCharInfo = activeChar ? getNoteLaneAndFinger(activeChar) : null;

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden">
      {/* Global Cosmic Starfield Background: tranquil on home & modals; hyperwarp ONLY during active flight */}
      <GlobalCosmicBackground
        hyperspaceActive={gameState === 'PLAYING' && performance.hyperspaceActive}
        multiplier={gameState === 'PLAYING' ? performance.multiplier : 1}
      />

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
        onGoHome={() => setGameState('MENU')}
        onOpenStages={() => openModal('STAGE_SELECT')}
        onOpenHangar={() => openModal('HANGAR')}
        onOpenAnalytics={() => openModal('ANALYTICS')}
        onOpenCustom={() => openModal('CUSTOM_PRACTICE')}
        onQuickPlay={() => {
          if (gameState === 'PLAYING') {
            openModal('STAGE_SELECT');
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
                onClick={() => openModal('STAGE_SELECT')}
                className="px-6 py-3.5 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-medium text-sm sm:text-base transition-colors cursor-pointer"
              >
                View Galaxy Sectors (7 Sectors)
              </button>
            </div>

            {(profile.totalStars > 0 || Object.keys(profile.stagesProgress).length > 0) && (
              <div className="flex flex-wrap items-center justify-center gap-2 mb-8 px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-400">
                <span className="text-amber-400 font-bold">★ {profile.totalStars} Stars Earned</span>
                <span>·</span>
                <span className="text-slate-400">Curriculum updated?</span>
                <button
                  onClick={() => openModal('STAGE_SELECT')}
                  className="text-rose-400 hover:text-rose-300 font-bold underline cursor-pointer ml-1"
                >
                  Wipe Achievements & Replay
                </button>
              </div>
            )}

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
              onPause={() => {
                soundEngine.stopBeat();
                setGameState('PAUSED');
              }}
              onToggleKeyboard={toggleKeyboard}
              keyboardVisible={profile.keyboardVisible}
            />

            {/* Text Prompt Stream */}
            <TextPromptStream
              fullText={currentStage.sampleText}
              currentIndex={performance.currentCharIndex}
              errorIndices={errorIndices}
              targetWpm={currentStage.targetWpm}
              stageTitle={`${currentStage.title} · ${currentStage.subtitle}`}
              techniqueTip={currentStage.techniqueTip}
              focusFingers={currentStage.focusFingers}
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
              lastHitDrone={performance.lastHitDrone}
              trailTheme={profile.upgrades.equippedTrailTheme}
              activeChar={activeChar}
              previousChar={previousChar}
              nextChar={nextChar}
              lastPressedKey={lastPressedKey}
              keyboardVisible={profile.keyboardVisible}
              handsVisible={profile.handsVisible}
              onToggleHands={toggleHands}
            />
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
                  if (profile.musicEnabled && !profile.globalMuted && (profile.musicVolume ?? 0.4) > 0) {
                    soundEngine.startBeat();
                  }
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
                  setModalSourceState('MENU');
                  setGameState('STAGE_SELECT');
                }}
                className="w-full py-2.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-mono transition-colors cursor-pointer"
              >
                Exit to Galaxy Map
              </button>

              <button
                onClick={() => {
                  soundEngine.stopBeat();
                  setGameState('MENU');
                }}
                className="w-full py-2.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 text-xs font-mono transition-colors cursor-pointer"
              >
                Exit to Academy Home
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
          sourceState={modalSourceState}
          onSelectStage={(stage) => startStage(stage)}
          onReturnToDebrief={() => {
            soundEngine.stopBeat();
            setGameState('VICTORY');
          }}
          onReturnToMenu={() => {
            soundEngine.stopBeat();
            setGameState('MENU');
          }}
          onClose={() => {
            if (modalSourceState === 'MENU') {
              soundEngine.stopBeat();
              setGameState('MENU');
            } else if (
              modalSourceState === 'VICTORY' ||
              performance.currentCharIndex >= currentStage.sampleText.length ||
              victoryResult !== null
            ) {
              soundEngine.stopBeat();
              setGameState('VICTORY');
            } else {
              setGameState('PLAYING');
              if (profile.musicEnabled && !profile.globalMuted && (profile.musicVolume ?? 0.4) > 0) {
                soundEngine.startBeat();
              }
            }
          }}
          onOpenHangar={() => {
            setModalSourceState('STAGE_SELECT');
            setGameState('HANGAR');
          }}
          onOpenAnalytics={() => {
            setModalSourceState('STAGE_SELECT');
            setGameState('ANALYTICS');
          }}
          onWipeAchievements={wipeCurriculumAchievements}
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
          onClose={() => {
            if (modalSourceState === 'MENU') setGameState('MENU');
            else if (modalSourceState === 'VICTORY') setGameState('VICTORY');
            else if (modalSourceState === 'STAGE_SELECT') setGameState('STAGE_SELECT');
            else if (modalSourceState === 'PLAYING') {
              setGameState('PLAYING');
              if (profile.musicEnabled && !profile.globalMuted && (profile.musicVolume ?? 0.4) > 0) {
                soundEngine.startBeat();
              }
            } else setGameState('MENU');
          }}
        />
      )}

      {/* Performance Analytics & Heatmap Modal */}
      {gameState === 'ANALYTICS' && (
        <AnalyticsModal
          profile={profile}
          onClose={() => {
            if (modalSourceState === 'MENU') setGameState('MENU');
            else if (modalSourceState === 'VICTORY') setGameState('VICTORY');
            else if (modalSourceState === 'STAGE_SELECT') setGameState('STAGE_SELECT');
            else if (modalSourceState === 'PLAYING') {
              setGameState('PLAYING');
              if (profile.musicEnabled && !profile.globalMuted && (profile.musicVolume ?? 0.4) > 0) {
                soundEngine.startBeat();
              }
            } else setGameState('MENU');
          }}
          onImportProfile={importProfile}
          onWipeAchievements={wipeCurriculumAchievements}
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
          onClose={() => {
            if (modalSourceState === 'PLAYING') {
              setGameState('PLAYING');
              if (profile.musicEnabled && !profile.globalMuted && (profile.musicVolume ?? 0.4) > 0) {
                soundEngine.startBeat();
              }
            } else if (modalSourceState === 'STAGE_SELECT') {
              setGameState('STAGE_SELECT');
            } else {
              setGameState('MENU');
            }
          }}
        />
      )}

      {/* Victory / Level Complete Modal */}
      {gameState === 'VICTORY' && victoryResult && (
        <LevelCompleteModal
          stage={currentStage}
          result={victoryResult}
          totalStars={profile.totalStars}
          totalCredits={profile.totalCredits}
          hasUnlockedNextSector={victoryResult.newStarsAwarded > 0}
          hasNextStage={Boolean(getNextStage(currentStage.id))}
          onReplay={() => startStage(currentStage)}
          onNextStage={launchNextStage}
          onReturnToMap={() => {
            setModalSourceState('VICTORY');
            setGameState('STAGE_SELECT');
          }}
          onReturnToMenu={() => {
            soundEngine.stopBeat();
            setGameState('MENU');
          }}
        />
      )}
    </div>
  );
}
