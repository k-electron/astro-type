import { create } from 'zustand';
import { createActor } from 'xstate';
import {
  FallingNote,
  GameState,
  LivePerformance,
  PlayerProfile,
  Stage,
  TrailColorTheme,
  AudioSynthCore,
} from '../types/game';
import {
  CURRICULUM_SECTORS,
  getNextStage,
  getNoteLaneAndFinger,
} from '../data/curriculum';
import {
  DEFAULT_PROFILE,
  loadProfile,
  recordStageResult,
  saveProfile,
} from '../utils/storage';
import { soundEngine } from '../audio/soundEngine';
import {
  LivePerformanceSchema,
  PlayerProfileSchema,
  ValidatedLivePerformance,
  ValidatedPlayerProfile,
} from './schemas';
import {
  gameMachine,
  mapGameStateToMachineEvent,
  mapMachineStateToGameState,
  GameMachineEvent,
} from './gameMachine';

// Initialize the XState actor instance
const gameActor = createActor(gameMachine);
gameActor.start();

export interface VictoryResult {
  score: number;
  wpm: number;
  accuracy: number;
  maxStreak: number;
  starsEarned: number;
  creditsEarned: number;
  isNewHighScore: boolean;
  newStarsAwarded: number;
}

export interface GameStoreState {
  // Machine & Game State
  gameState: GameState;
  currentStage: Stage;
  profile: PlayerProfile;
  performance: LivePerformance;
  activeLaneIndex: number | null;
  lastPressedKey: string | null;
  errorIndices: Set<number>;
  fallingNotes: FallingNote[];
  victoryResult: VictoryResult | null;

  // Runtime Tracking (non-persisted refs)
  stageStartTime: number | null;
  currentCharIndex: number;
  sessionKeyStats: Record<string, { hits: number; misses: number }>;

  // Actions
  sendGameEvent: (event: GameMachineEvent) => void;
  setGameState: (state: GameState) => void;
  setCurrentStage: (stage: Stage) => void;
  startStage: (stage: Stage, customSpeed?: 'SLOW' | 'NORMAL' | 'FAST' | 'HYPER') => void;
  processKeystroke: (key: string) => void;
  updateFallingNotesOnTick: () => void;
  updateTelemetryOnInterval: () => void;
  handleStageComplete: () => void;
  launchNextStage: () => void;

  // Settings & Upgrades
  toggleSound: () => void;
  toggleMusic: () => void;
  cycleBeatTheme: () => void;
  toggleKeyboard: () => void;
  upgradeShields: (cost: number) => void;
  upgradeReactor: (cost: number) => void;
  upgradeSensors: (cost: number) => void;
  unlockOrEquipTheme: (theme: TrailColorTheme, cost: number) => void;
  unlockOrEquipAudio: (coreId: AudioSynthCore, cost: number) => void;
  importProfile: (json: string) => boolean;
  resetProgress: () => void;
}

/**
 * Zod Validation Middleware:
 * Validates updates against Zod schemas before committing into Zustand state.
 */
function validateProfileWithZod(raw: unknown): PlayerProfile {
  const result = PlayerProfileSchema.safeParse(raw);
  if (!result.success) {
    console.warn('Profile schema validation warning:', result.error);
    return DEFAULT_PROFILE;
  }
  return result.data as PlayerProfile;
}

function validatePerformanceWithZod(raw: unknown): LivePerformance {
  const result = LivePerformanceSchema.safeParse(raw);
  if (!result.success) {
    console.warn('Performance schema validation warning:', result.error);
    return {
      score: 0,
      currentStreak: 0,
      maxStreak: 0,
      multiplier: 1,
      hyperspaceActive: false,
      hyperspaceEnergy: 0,
      shieldsRemaining: 0,
      correctKeystrokes: 0,
      incorrectKeystrokes: 0,
      totalKeystrokes: 0,
      grossWpm: 0,
      netWpm: 0,
      accuracy: 100,
      currentCharIndex: 0,
      timeElapsedSeconds: 0,
      timingFeedback: null,
      timingFeedbackKey: 0,
    };
  }
  return result.data as LivePerformance;
}

export const useGameStore = create<GameStoreState>((set, get) => {
  // Load initial validated profile
  const savedProfile = validateProfileWithZod(loadProfile());

  // Connect XState Actor to Zustand store updates
  gameActor.subscribe((snapshot) => {
    const nextGameState = mapMachineStateToGameState(String(snapshot.value));
    set({ gameState: nextGameState });
  });

  return {
    gameState: 'MENU',
    currentStage: CURRICULUM_SECTORS[0].stages[0],
    profile: savedProfile,
    performance: {
      score: 0,
      currentStreak: 0,
      maxStreak: 0,
      multiplier: 1,
      hyperspaceActive: false,
      hyperspaceEnergy: 0,
      shieldsRemaining: savedProfile.upgrades.deflectorShields,
      correctKeystrokes: 0,
      incorrectKeystrokes: 0,
      totalKeystrokes: 0,
      grossWpm: 0,
      netWpm: 0,
      accuracy: 100,
      currentCharIndex: 0,
      timeElapsedSeconds: 0,
      timingFeedback: null,
      timingFeedbackKey: 0,
    },
    activeLaneIndex: null,
    lastPressedKey: null,
    errorIndices: new Set<number>(),
    fallingNotes: [],
    victoryResult: null,
    stageStartTime: null,
    currentCharIndex: 0,
    sessionKeyStats: {},

    sendGameEvent: (event: GameMachineEvent) => {
      gameActor.send(event);
    },

    setGameState: (nextState: GameState) => {
      const event = mapGameStateToMachineEvent(nextState);
      gameActor.send(event);
    },

    setCurrentStage: (stage: Stage) => {
      set({ currentStage: stage });
    },

    startStage: (stage: Stage, customSpeed?: 'SLOW' | 'NORMAL' | 'FAST' | 'HYPER') => {
      soundEngine.init();
      const { profile } = get();
      if (profile.musicEnabled) {
        soundEngine.startBeat();
      }

      gameActor.send({ type: 'START', stageId: stage.id });

      const initialShields = profile.upgrades.deflectorShields;

      // Seed initial falling notes queue
      const initialNotes: FallingNote[] = [];
      const textToQueue = stage.sampleText.slice(0, 7);

      for (let i = 0; i < textToQueue.length; i++) {
        const char = textToQueue[i];
        const { lane, finger } = getNoteLaneAndFinger(char);
        const isTarget = i === 0;

        initialNotes.push({
          id: `note-${i}-${char}-${Date.now()}`,
          char,
          displayChar: char === ' ' ? '␣' : char,
          lane,
          finger,
          targetTimeMs: Date.now() + 2000,
          yPercent: isTarget ? 84 : Math.max(6, 84 - i * 16),
          status: 'PENDING',
          isTargetLocked: isTarget,
        });
      }

      const freshPerf: LivePerformance = {
        score: 0,
        currentStreak: 0,
        maxStreak: 0,
        multiplier: 1,
        hyperspaceActive: false,
        hyperspaceEnergy: 0,
        shieldsRemaining: initialShields,
        correctKeystrokes: 0,
        incorrectKeystrokes: 0,
        totalKeystrokes: 0,
        grossWpm: 0,
        netWpm: 0,
        accuracy: 100,
        currentCharIndex: 0,
        timeElapsedSeconds: 0,
        timingFeedback: null,
        timingFeedbackKey: 0,
      };

      set({
        currentStage: stage,
        errorIndices: new Set<number>(),
        sessionKeyStats: {},
        stageStartTime: Date.now(),
        currentCharIndex: 0,
        fallingNotes: initialNotes,
        performance: validatePerformanceWithZod(freshPerf),
        activeLaneIndex: null,
        lastPressedKey: null,
        victoryResult: null,
      });
    },

    processKeystroke: (pressedKey: string) => {
      const state = get();
      if (state.gameState !== 'PLAYING') return;

      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(pressedKey)) {
        return;
      }

      set({ lastPressedKey: pressedKey });

      const targetText = state.currentStage.sampleText;
      const currentCharIdx = state.currentCharIndex;
      const targetChar = targetText[currentCharIdx];
      if (!targetChar) return;

      const isMatch = pressedKey === targetChar;
      const targetInfo = getNoteLaneAndFinger(targetChar);
      const pressedInfo = getNoteLaneAndFinger(pressedKey);

      set({ activeLaneIndex: pressedInfo.lane });

      // Track per-key analytics
      const updatedKeyStats = { ...state.sessionKeyStats };
      if (!updatedKeyStats[targetChar]) {
        updatedKeyStats[targetChar] = { hits: 0, misses: 0 };
      }

      if (isMatch) {
        updatedKeyStats[targetChar].hits += 1;

        // Evaluate Falling Note Strike Timing
        const matchingNote = state.fallingNotes.find(
          (n) => n.char === targetChar && n.status === 'PENDING'
        );

        let rating: 'PERFECT' | 'GREAT' | 'GOOD' = 'GREAT';
        if (matchingNote) {
          const sensorBonus = state.profile.upgrades.precisionSensors * 3.5;
          const diff = Math.abs(matchingNote.yPercent - 84);
          if (diff <= 8 + sensorBonus) {
            rating = 'PERFECT';
          } else if (diff <= 16 + sensorBonus) {
            rating = 'GREAT';
          } else {
            rating = 'GOOD';
          }
        }

        soundEngine.playLaneHit(targetInfo.lane, rating);

        const nextStreak = state.performance.currentStreak + 1;
        const newMaxStreak = Math.max(state.performance.maxStreak, nextStreak);

        let nextMultiplier = 1;
        if (nextStreak >= 30) nextMultiplier = 4;
        else if (nextStreak >= 20) nextMultiplier = 3;
        else if (nextStreak >= 10) nextMultiplier = 2;

        const baseScore = rating === 'PERFECT' ? 100 : rating === 'GREAT' ? 75 : 50;
        const earnedScore = baseScore * nextMultiplier * (state.performance.hyperspaceActive ? 2 : 1);

        const reactorBonus = 1 + state.profile.upgrades.hyperdriveReactor * 0.2;
        const nextEnergy = Math.min(100, state.performance.hyperspaceEnergy + 3.5 * reactorBonus);
        const shouldTriggerHyperspace = nextEnergy >= 100 && !state.performance.hyperspaceActive;

        if (shouldTriggerHyperspace) {
          soundEngine.playHyperspaceIgnition();
        }

        const nextCharIndex = currentCharIdx + 1;

        // Advance note conveyor
        const remainingNotes = state.fallingNotes.filter(
          (n) => n.id !== matchingNote?.id && n.status !== 'PROCESSED'
        );

        const upcomingIdx = nextCharIndex + 6;
        if (upcomingIdx < targetText.length) {
          const nextChar = targetText[upcomingIdx];
          const { lane, finger } = getNoteLaneAndFinger(nextChar);
          remainingNotes.push({
            id: `note-${upcomingIdx}-${nextChar}-${Date.now()}`,
            char: nextChar,
            displayChar: nextChar === ' ' ? '␣' : nextChar,
            lane,
            finger,
            targetTimeMs: Date.now() + 2000,
            yPercent: 0,
            status: 'PENDING',
            isTargetLocked: false,
          });
        }

        const nextFallingNotes = remainingNotes.map((n, idx) => {
          if (idx === 0) {
            return { ...n, isTargetLocked: true };
          }
          return n;
        });

        const patchPerf: LivePerformance = {
          ...state.performance,
          score: state.performance.score + earnedScore,
          currentStreak: nextStreak,
          maxStreak: newMaxStreak,
          multiplier: nextMultiplier,
          hyperspaceActive: shouldTriggerHyperspace ? true : state.performance.hyperspaceActive,
          hyperspaceEnergy: shouldTriggerHyperspace ? 100 : nextEnergy,
          correctKeystrokes: state.performance.correctKeystrokes + 1,
          totalKeystrokes: state.performance.totalKeystrokes + 1,
          currentCharIndex: nextCharIndex,
          timingFeedback: rating,
          timingFeedbackKey: state.performance.timingFeedbackKey + 1,
        };

        set({
          performance: validatePerformanceWithZod(patchPerf),
          fallingNotes: nextFallingNotes,
          currentCharIndex: nextCharIndex,
          sessionKeyStats: updatedKeyStats,
        });

        // Stage completed check
        if (nextCharIndex >= targetText.length) {
          get().handleStageComplete();
        }
      } else {
        // Keystroke Error Miss
        updatedKeyStats[targetChar].misses += 1;
        const newErrorIndices = new Set(state.errorIndices);
        newErrorIndices.add(currentCharIdx);

        if (state.performance.shieldsRemaining > 0) {
          soundEngine.playShieldAbsorb();
          const patchPerf: LivePerformance = {
            ...state.performance,
            shieldsRemaining: state.performance.shieldsRemaining - 1,
            incorrectKeystrokes: state.performance.incorrectKeystrokes + 1,
            totalKeystrokes: state.performance.totalKeystrokes + 1,
            timingFeedback: 'GOOD',
            timingFeedbackKey: state.performance.timingFeedbackKey + 1,
          };
          set({
            errorIndices: newErrorIndices,
            sessionKeyStats: updatedKeyStats,
            performance: validatePerformanceWithZod(patchPerf),
          });
        } else {
          soundEngine.playMiss();
          const patchPerf: LivePerformance = {
            ...state.performance,
            currentStreak: 0,
            multiplier: 1,
            hyperspaceActive: false,
            hyperspaceEnergy: Math.max(0, state.performance.hyperspaceEnergy - 25),
            incorrectKeystrokes: state.performance.incorrectKeystrokes + 1,
            totalKeystrokes: state.performance.totalKeystrokes + 1,
            timingFeedback: 'MISS',
            timingFeedbackKey: state.performance.timingFeedbackKey + 1,
          };
          set({
            errorIndices: newErrorIndices,
            sessionKeyStats: updatedKeyStats,
            performance: validatePerformanceWithZod(patchPerf),
          });
        }
      }
    },

    updateFallingNotesOnTick: () => {
      const state = get();
      if (state.gameState !== 'PLAYING') return;

      const updated = state.fallingNotes.map((note, idx) => {
        if (note.status === 'PROCESSED') return note;

        if (idx === 0 || note.isTargetLocked || note.yPercent >= 83.5) {
          return { ...note, yPercent: 84, isTargetLocked: true };
        }

        const slotY = Math.max(6, 84 - idx * 16);
        const nextY = note.yPercent + (slotY - note.yPercent) * 0.18;
        return {
          ...note,
          yPercent: nextY,
          isTargetLocked: false,
        };
      });

      set({ fallingNotes: updated });
    },

    updateTelemetryOnInterval: () => {
      const state = get();
      if (state.gameState !== 'PLAYING' || !state.stageStartTime) return;

      const elapsedSeconds = Math.max(1, (Date.now() - state.stageStartTime) / 1000);
      const minutes = elapsedSeconds / 60;
      const prev = state.performance;

      const grossWpm = Math.round((prev.totalKeystrokes / 5) / minutes) || 0;
      const netWpm = Math.max(
        0,
        Math.round(((prev.correctKeystrokes - prev.incorrectKeystrokes) / 5) / minutes)
      ) || 0;
      const accuracy = prev.totalKeystrokes > 0
        ? Math.max(0, Math.min(100, Math.round((prev.correctKeystrokes / prev.totalKeystrokes) * 100)))
        : 100;

      const patchPerf: LivePerformance = {
        ...prev,
        timeElapsedSeconds: Math.round(elapsedSeconds),
        grossWpm,
        netWpm,
        accuracy,
      };

      set({ performance: validatePerformanceWithZod(patchPerf) });
    },

    handleStageComplete: () => {
      const state = get();
      gameActor.send({ type: 'STAGE_CLEAR' });
      soundEngine.stopBeat();
      soundEngine.playStageVictory();

      const elapsedSeconds = state.stageStartTime
        ? Math.max(1, (Date.now() - state.stageStartTime) / 1000)
        : 30;
      const minutes = elapsedSeconds / 60;

      const finalNetWpm = Math.max(
        0,
        Math.round(((state.performance.correctKeystrokes - state.performance.incorrectKeystrokes) / 5) / minutes)
      );
      const finalAccuracy =
        state.performance.totalKeystrokes > 0
          ? Math.max(0, Math.min(100, Math.round((state.performance.correctKeystrokes / state.performance.totalKeystrokes) * 100)))
          : 100;

      const thresh = state.currentStage.starThresholds;
      let starsEarned = 0;
      if (finalAccuracy >= thresh.oneStarAccuracy) starsEarned = 1;
      if (starsEarned >= 1 && finalNetWpm >= thresh.twoStarWpm && finalAccuracy >= thresh.twoStarAccuracy) {
        starsEarned = 2;
      }
      if (
        starsEarned >= 2 &&
        finalNetWpm >= thresh.threeStarWpm &&
        finalAccuracy >= thresh.threeStarAccuracy &&
        state.performance.maxStreak >= thresh.threeStarMinStreak
      ) {
        starsEarned = 3;
      }

      if (starsEarned >= 1) setTimeout(() => soundEngine.playStarChime(1), 300);
      if (starsEarned >= 2) setTimeout(() => soundEngine.playStarChime(2), 700);
      if (starsEarned >= 3) setTimeout(() => soundEngine.playStarChime(3), 1100);

      const creditsEarned = 100 + starsEarned * 75 + Math.round(state.performance.score / 200);

      const { updatedProfile, newStarsAwarded, isNewHighScore } = recordStageResult(
        state.profile,
        state.currentStage.id,
        {
          score: state.performance.score,
          wpm: finalNetWpm,
          accuracy: finalAccuracy,
          maxStreak: state.performance.maxStreak,
          starsEarned,
          creditsEarned,
          keystrokesCount: state.performance.totalKeystrokes,
          errorsCount: state.performance.incorrectKeystrokes,
          practiceSeconds: Math.round(elapsedSeconds),
          keyStats: state.sessionKeyStats,
        }
      );

      const validatedProfile = validateProfileWithZod(updatedProfile);
      saveProfile(validatedProfile);

      set({
        profile: validatedProfile,
        victoryResult: {
          score: state.performance.score,
          wpm: finalNetWpm,
          accuracy: finalAccuracy,
          maxStreak: state.performance.maxStreak,
          starsEarned,
          creditsEarned,
          isNewHighScore,
          newStarsAwarded,
        },
      });
    },

    launchNextStage: () => {
      const state = get();
      const next = getNextStage(state.currentStage.id);
      if (next) {
        get().startStage(next);
      } else {
        gameActor.send({ type: 'SELECT_STAGE' });
      }
    },

    toggleSound: () => {
      const { profile } = get();
      const next = !profile.soundEnabled;
      const updated = validateProfileWithZod({ ...profile, soundEnabled: next });
      set({ profile: updated });
      saveProfile(updated);
      soundEngine.setSoundEnabled(next);
    },

    toggleMusic: () => {
      const { profile } = get();
      const next = !profile.musicEnabled;
      const updated = validateProfileWithZod({ ...profile, musicEnabled: next });
      set({ profile: updated });
      saveProfile(updated);
      soundEngine.setMusicEnabled(next);
    },

    cycleBeatTheme: () => {
      const { profile } = get();
      const nextTheme = soundEngine.cycleBeatTheme();
      const updated = validateProfileWithZod({ ...profile, beatTheme: nextTheme });
      set({ profile: updated });
      saveProfile(updated);
    },

    toggleKeyboard: () => {
      const { profile } = get();
      const updated = validateProfileWithZod({ ...profile, keyboardVisible: !profile.keyboardVisible });
      set({ profile: updated });
      saveProfile(updated);
    },

    upgradeShields: (cost: number) => {
      const { profile } = get();
      if (profile.totalCredits < cost) return;
      const updated = validateProfileWithZod({
        ...profile,
        totalCredits: profile.totalCredits - cost,
        upgrades: {
          ...profile.upgrades,
          deflectorShields: profile.upgrades.deflectorShields + 1,
        },
      });
      set({ profile: updated });
      saveProfile(updated);
      soundEngine.playShieldUpgrade();
    },

    upgradeReactor: (cost: number) => {
      const { profile } = get();
      if (profile.totalCredits < cost) return;
      const updated = validateProfileWithZod({
        ...profile,
        totalCredits: profile.totalCredits - cost,
        upgrades: {
          ...profile.upgrades,
          hyperdriveReactor: profile.upgrades.hyperdriveReactor + 1,
        },
      });
      set({ profile: updated });
      saveProfile(updated);
      soundEngine.playShieldUpgrade();
    },

    upgradeSensors: (cost: number) => {
      const { profile } = get();
      if (profile.totalCredits < cost) return;
      const updated = validateProfileWithZod({
        ...profile,
        totalCredits: profile.totalCredits - cost,
        upgrades: {
          ...profile.upgrades,
          precisionSensors: profile.upgrades.precisionSensors + 1,
        },
      });
      set({ profile: updated });
      saveProfile(updated);
      soundEngine.playShieldUpgrade();
    },

    unlockOrEquipTheme: (theme: TrailColorTheme, cost: number) => {
      const { profile } = get();
      const isUnlocked = profile.upgrades.unlockedThemes.includes(theme);
      if (!isUnlocked) {
        if (profile.totalCredits < cost) return;
        const updated = validateProfileWithZod({
          ...profile,
          totalCredits: profile.totalCredits - cost,
          upgrades: {
            ...profile.upgrades,
            unlockedThemes: [...profile.upgrades.unlockedThemes, theme],
            equippedTrailTheme: theme,
          },
        });
        set({ profile: updated });
        saveProfile(updated);
        soundEngine.playEquipCosmetic();
      } else {
        const updated = validateProfileWithZod({
          ...profile,
          upgrades: {
            ...profile.upgrades,
            equippedTrailTheme: theme,
          },
        });
        set({ profile: updated });
        saveProfile(updated);
        soundEngine.playEquipCosmetic();
      }
    },

    unlockOrEquipAudio: (coreId: AudioSynthCore, cost: number) => {
      const { profile } = get();
      const isUnlocked = profile.upgrades.unlockedAudioCores.includes(coreId);
      if (!isUnlocked) {
        if (profile.totalCredits < cost) return;
        const updated = validateProfileWithZod({
          ...profile,
          totalCredits: profile.totalCredits - cost,
          upgrades: {
            ...profile.upgrades,
            unlockedAudioCores: [...profile.upgrades.unlockedAudioCores, coreId],
            equippedAudioCore: coreId,
          },
        });
        set({ profile: updated });
        saveProfile(updated);
        soundEngine.setCore(coreId);
      } else {
        const updated = validateProfileWithZod({
          ...profile,
          upgrades: {
            ...profile.upgrades,
            equippedAudioCore: coreId,
          },
        });
        set({ profile: updated });
        saveProfile(updated);
        soundEngine.setCore(coreId);
      }
    },

    importProfile: (json: string): boolean => {
      try {
        const parsed = JSON.parse(json);
        const validated = validateProfileWithZod(parsed);
        set({ profile: validated });
        saveProfile(validated);
        return true;
      } catch {
        return false;
      }
    },

    resetProgress: () => {
      set({ profile: DEFAULT_PROFILE });
      saveProfile(DEFAULT_PROFILE);
    },
  };
});
