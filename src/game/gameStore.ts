import { createStore, type StoreApi } from 'zustand/vanilla';
import type {
  FallingNote,
  LivePerformance,
  PlayerProfile,
  RunPhase,
  Stage,
  TrailColorTheme,
  AudioSynthCore,
  BeatTheme,
} from '../types/game';
import { CURRICULUM_SECTORS, getNoteLaneAndFinger } from '../data/curriculum';
import {
  DEFAULT_PROFILE,
  hydrateProfile,
  recordStageResult,
  validateProfileWithZod,
} from './profile';
import type { SaveStorage } from './save';
import type { Clock } from './clock';
import type { GameEffects } from './effects';
import {
  advanceDroneQueue,
  applyMiss,
  cadenceAfterHit,
  cadenceAfterMiss,
  chargeOverdrive,
  freshPerformance,
  IGNORED_KEYS,
  judge,
  moveDrones,
  multiplierForStreak,
  scoreForHit,
  scoreRun,
  seedDrones,
  telemetry,
} from './rules';

export interface VictoryResult {
  score: number;
  wpm: number;
  accuracy: number;
  maxStreak: number;
  starsEarned: number;
  creditsEarned: number;
  isNewHighScore: boolean;
  newStarsAwarded: number;
  cadenceConsistency?: number;
}

export interface GameStoreState {
  // The live Run, the Debrief and the Profile. The screen and the Run phase
  // are the machine's, not copied here.
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
  recentKeystrokeTimes: number[];

  // Run moves: the machine calls these, once per accepted move. Each one is
  // the data change and the sound that goes with the move.
  beginRun: (
    stage: Stage,
    customSpeed?: 'SLOW' | 'NORMAL' | 'FAST' | 'HYPER',
  ) => void;
  pauseRun: () => void;
  resumeRun: () => void;
  abandonRun: () => void;
  recordResult: () => void;

  // Player-driven actions
  processKeystroke: (key: string) => void;
  releaseKeystroke: (key?: string) => void;
  updateFallingNotesOnTick: () => void;
  updateTelemetryOnInterval: () => void;

  // Settings & Upgrades
  toggleGlobalMute: () => void;
  toggleSound: () => void;
  toggleMusic: () => void;
  setSoundVolume: (vol: number) => void;
  setMusicVolume: (vol: number) => void;
  setBeatTheme: (theme: BeatTheme) => void;
  cycleBeatTheme: () => void;
  toggleKeyboard: () => void;
  toggleHands: () => void;
  upgradeShields: (cost: number) => void;
  upgradeReactor: (cost: number) => void;
  upgradeSensors: (cost: number) => void;
  unlockOrEquipTheme: (theme: TrailColorTheme, cost: number) => void;
  unlockOrEquipAudio: (coreId: AudioSynthCore, cost: number) => void;
  importProfile: (json: string) => boolean;
  wipeCurriculumAchievements: () => void;
  resetProgress: () => void;
}

export interface GameStoreDeps {
  /** The machine's Run phase. The store reads it only to gate data changes. */
  getPhase: () => RunPhase;
  /** Tell the machine the last character was typed. */
  reportRunCleared: () => void;
  storage: SaveStorage;
  clock: Clock;
  effects: GameEffects;
}

/**
 * Builds the vanilla store for one game: the live Run, the Debrief result and
 * the Profile, with the rules in `./rules`. Time, Save storage and sound all
 * come in through `deps`.
 */
export function createGameStore({
  getPhase,
  reportRunCleared,
  storage,
  clock,
  effects,
}: GameStoreDeps): StoreApi<GameStoreState> {
  const saveProfile = (profile: PlayerProfile) => storage.save(profile);
  // Wiping or resetting sends the player back to the first Stage, unless a
  // Run is still on show (paused, or cleared with its Debrief to come back to).
  const backToFirstStageUnlessRun = () =>
    getPhase() === 'none' || getPhase() === 'abandoned'
      ? { currentStage: CURRICULUM_SECTORS[0].stages[0], victoryResult: null }
      : {};
  const beatAllowed = (profile: PlayerProfile) =>
    profile.musicEnabled &&
    !profile.globalMuted &&
    (profile.musicVolume ?? 0.4) > 0;

  return createStore<GameStoreState>((set, get) => {
    // Load initial validated profile
    const savedProfile = validateProfileWithZod(hydrateProfile(storage.load()));

    return {
      currentStage: CURRICULUM_SECTORS[0].stages[0],
      profile: savedProfile,
      performance: freshPerformance(savedProfile.upgrades.deflectorShields),
      activeLaneIndex: null,
      lastPressedKey: null,
      errorIndices: new Set<number>(),
      fallingNotes: [],
      victoryResult: null,
      stageStartTime: null,
      currentCharIndex: 0,
      sessionKeyStats: {},
      recentKeystrokeTimes: [],

      beginRun: (
        stage: Stage,
        customSpeed?: 'SLOW' | 'NORMAL' | 'FAST' | 'HYPER',
      ) => {
        effects.init();
        const { profile } = get();
        if (customSpeed && customSpeed !== profile.highwaySpeed) {
          const speedProfile = validateProfileWithZod({
            ...profile,
            highwaySpeed: customSpeed,
          });
          set({ profile: speedProfile });
          saveProfile(speedProfile);
        }
        if (beatAllowed(profile)) {
          effects.startBeat();
        }

        const now = clock.now();

        set({
          currentStage: stage,
          errorIndices: new Set<number>(),
          sessionKeyStats: {},
          recentKeystrokeTimes: [],
          stageStartTime: now,
          currentCharIndex: 0,
          fallingNotes: seedDrones(stage, now),
          performance: freshPerformance(profile.upgrades.deflectorShields),
          activeLaneIndex: null,
          lastPressedKey: null,
          victoryResult: null,
        });
      },

      pauseRun: () => {
        effects.stopBeat();
        effects.setOverdrive(false);
        // Streak, Multiplier and Overdrive stay exactly as they were.
        set({ activeLaneIndex: null, lastPressedKey: null });
      },

      resumeRun: () => {
        if (beatAllowed(get().profile)) {
          effects.startBeat();
        }
      },

      abandonRun: () => {
        effects.stopBeat();
        effects.setOverdrive(false);
        set({
          performance: freshPerformance(
            get().profile.upgrades.deflectorShields,
          ),
          activeLaneIndex: null,
          lastPressedKey: null,
          fallingNotes: [],
          errorIndices: new Set(),
          victoryResult: null,
          stageStartTime: null,
          sessionKeyStats: {},
        });
      },

      processKeystroke: (pressedKey: string) => {
        const state = get();
        if (getPhase() !== 'running') return;

        if (IGNORED_KEYS.includes(pressedKey)) {
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

          // Judge the Strike against the lead Drone for this character
          const matchingNote = state.fallingNotes.find(
            (n) => n.char === targetChar && n.status === 'PENDING',
          );
          const rating = judge(
            matchingNote?.yPercent,
            state.profile.upgrades.precisionSensors,
          );

          effects.playLaneHit(targetInfo.lane, rating, targetChar === ' ');

          const nextStreak = state.performance.currentStreak + 1;
          const newMaxStreak = Math.max(
            state.performance.maxStreak,
            nextStreak,
          );
          const nextMultiplier = multiplierForStreak(nextStreak);
          const earnedScore = scoreForHit(
            rating,
            nextMultiplier,
            state.performance.hyperspaceActive,
          );

          const charge = chargeOverdrive(
            state.performance.hyperspaceEnergy,
            state.performance.hyperspaceActive,
            state.profile.upgrades.hyperdriveReactor,
          );
          if (charge.ignites) {
            effects.playHyperspaceIgnition();
          }

          const nextCharIndex = currentCharIdx + 1;
          const now = clock.now();

          const nextFallingNotes = advanceDroneQueue(
            state.fallingNotes,
            matchingNote,
            nextCharIndex,
            targetText,
            now,
          );

          // Track inter-keystroke intervals for steady cadence and rhythm scoring
          const updatedKeystrokeTimes = [
            ...state.recentKeystrokeTimes,
            now,
          ].slice(-10);
          const liveCadence = cadenceAfterHit(
            updatedKeystrokeTimes,
            state.performance.cadenceConsistency ?? 100,
          );

          const patchPerf: LivePerformance = {
            ...state.performance,
            score: state.performance.score + earnedScore,
            currentStreak: nextStreak,
            maxStreak: newMaxStreak,
            multiplier: nextMultiplier,
            hyperspaceActive: charge.ignites
              ? true
              : state.performance.hyperspaceActive,
            hyperspaceEnergy: charge.energy,
            correctKeystrokes: state.performance.correctKeystrokes + 1,
            totalKeystrokes: state.performance.totalKeystrokes + 1,
            currentCharIndex: nextCharIndex,
            timingFeedback: rating,
            timingFeedbackKey: state.performance.timingFeedbackKey + 1,
            cadenceConsistency: liveCadence,
            lastHitDrone: {
              id: matchingNote?.id,
              char: targetChar,
              yPercent: matchingNote ? matchingNote.yPercent : 84,
              lane: targetInfo.lane,
            },
          };

          set({
            performance: patchPerf,
            fallingNotes: nextFallingNotes,
            currentCharIndex: nextCharIndex,
            sessionKeyStats: updatedKeyStats,
            recentKeystrokeTimes: updatedKeystrokeTimes,
          });

          // Stage completed check
          if (nextCharIndex >= targetText.length) {
            reportRunCleared();
          }
        } else {
          // Keystroke Error Miss
          updatedKeyStats[targetChar].misses += 1;
          const newErrorIndices = new Set(state.errorIndices);
          newErrorIndices.add(currentCharIdx);
          const { perf, shielded } = applyMiss(
            state.performance,
            cadenceAfterMiss(state.performance.cadenceConsistency ?? 100),
          );

          if (shielded) {
            effects.playShieldAbsorb();
          } else {
            effects.playMiss();
          }
          set({
            errorIndices: newErrorIndices,
            sessionKeyStats: updatedKeyStats,
            performance: perf,
          });
        }
      },

      releaseKeystroke: (key?: string) => {
        const state = get();
        if (!key || state.lastPressedKey?.toLowerCase() === key.toLowerCase()) {
          set({ lastPressedKey: null });
        }
      },

      updateFallingNotesOnTick: () => {
        const state = get();
        if (getPhase() !== 'running') return;

        set({
          fallingNotes: moveDrones(
            state.fallingNotes,
            state.profile.highwaySpeed,
          ),
        });
      },

      updateTelemetryOnInterval: () => {
        const state = get();
        if (getPhase() !== 'running' || state.stageStartTime === null) {
          return;
        }

        const elapsedSeconds = Math.max(
          1,
          (clock.now() - state.stageStartTime) / 1000,
        );

        set({ performance: telemetry(state.performance, elapsedSeconds) });
      },

      recordResult: () => {
        const state = get();
        effects.stopBeat();
        effects.setOverdrive(false);
        effects.playStageVictory();

        const now = clock.now();
        const elapsedSeconds =
          state.stageStartTime !== null
            ? Math.max(1, (now - state.stageStartTime) / 1000)
            : 30;

        const {
          wpm: finalNetWpm,
          accuracy: finalAccuracy,
          starsEarned,
          creditsEarned,
        } = scoreRun(
          state.performance,
          elapsedSeconds,
          state.currentStage.starThresholds,
        );

        effects.playStarChimes(starsEarned);

        const { updatedProfile, newStarsAwarded, isNewHighScore } =
          recordStageResult(
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
            },
            now,
          );

        const validatedProfile = validateProfileWithZod(updatedProfile);
        saveProfile(validatedProfile);

        const peacefulPerf: LivePerformance = {
          ...state.performance,
          hyperspaceActive: false,
          hyperspaceEnergy: 0,
          multiplier: 1,
          currentStreak: 0,
        };

        set({
          performance: peacefulPerf,
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
            cadenceConsistency: state.performance.cadenceConsistency ?? 100,
          },
        });
      },

      toggleGlobalMute: () => {
        const { profile } = get();
        const nextMuted = !profile.globalMuted;
        const updated = validateProfileWithZod({
          ...profile,
          globalMuted: nextMuted,
        });
        set({ profile: updated });
        saveProfile(updated);
        effects.setGlobalMute(nextMuted);
        if (
          !nextMuted &&
          profile.musicEnabled &&
          (profile.musicVolume ?? 0.4) > 0 &&
          getPhase() === 'running'
        ) {
          effects.startBeat();
        }
      },

      toggleSound: () => {
        const { profile } = get();
        const next = !profile.soundEnabled;
        const updated = validateProfileWithZod({
          ...profile,
          soundEnabled: next,
        });
        set({ profile: updated });
        saveProfile(updated);
        effects.setSoundEnabled(next);
      },

      toggleMusic: () => {
        const { profile } = get();
        const next = !profile.musicEnabled;
        const updated = validateProfileWithZod({
          ...profile,
          musicEnabled: next,
        });
        set({ profile: updated });
        saveProfile(updated);
        effects.setMusicEnabled(next);
        if (
          next &&
          !profile.globalMuted &&
          (profile.musicVolume ?? 0.4) > 0 &&
          getPhase() === 'running'
        ) {
          effects.startBeat();
        } else if (!next) {
          effects.stopBeat();
        }
      },

      setSoundVolume: (vol: number) => {
        const { profile } = get();
        const clamped = Math.max(0, Math.min(1, vol));
        const enabled = clamped > 0;
        const updated = validateProfileWithZod({
          ...profile,
          soundVolume: clamped,
          soundEnabled: enabled,
        });
        set({ profile: updated });
        saveProfile(updated);
        effects.setSoundEnabled(enabled);
        effects.setSoundVolume(clamped);
      },

      setMusicVolume: (vol: number) => {
        const { profile } = get();
        const clamped = Math.max(0, Math.min(1, vol));
        const enabled = clamped > 0;
        const updated = validateProfileWithZod({
          ...profile,
          musicVolume: clamped,
          musicEnabled: enabled,
        });
        set({ profile: updated });
        saveProfile(updated);
        effects.setMusicEnabled(enabled);
        effects.setMusicVolume(clamped);
        if (enabled && !profile.globalMuted && getPhase() === 'running') {
          effects.startBeat();
        } else if (!enabled) {
          effects.stopBeat();
        }
      },

      setBeatTheme: (theme: BeatTheme) => {
        const { profile } = get();
        const updated = validateProfileWithZod({
          ...profile,
          beatTheme: theme,
        });
        set({ profile: updated });
        saveProfile(updated);
        effects.setBeatTheme(theme);
      },

      cycleBeatTheme: () => {
        const { profile } = get();
        const themes: BeatTheme[] = [
          'NEON_SYNTHWAVE',
          'CYBER_PULSE',
          'COSMIC_LOFI',
        ];
        const nextTheme =
          themes[(themes.indexOf(profile.beatTheme) + 1) % themes.length];
        effects.setBeatTheme(nextTheme);
        const updated = validateProfileWithZod({
          ...profile,
          beatTheme: nextTheme,
        });
        set({ profile: updated });
        saveProfile(updated);
      },

      toggleKeyboard: () => {
        const { profile } = get();
        const updated = validateProfileWithZod({
          ...profile,
          keyboardVisible: !profile.keyboardVisible,
        });
        set({ profile: updated });
        saveProfile(updated);
      },

      toggleHands: () => {
        const { profile } = get();
        const updated = validateProfileWithZod({
          ...profile,
          handsVisible: !profile.handsVisible,
        });
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
        effects.playShieldUpgrade();
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
        effects.playShieldUpgrade();
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
        effects.playShieldUpgrade();
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
          effects.playEquipCosmetic();
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
          effects.playEquipCosmetic();
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
              unlockedAudioCores: [
                ...profile.upgrades.unlockedAudioCores,
                coreId,
              ],
              equippedAudioCore: coreId,
            },
          });
          set({ profile: updated });
          saveProfile(updated);
          effects.setCore(coreId);
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
          effects.setCore(coreId);
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

      wipeCurriculumAchievements: () => {
        const { profile } = get();
        const updated: PlayerProfile = {
          ...profile,
          totalStars: 0,
          stagesProgress: {},
        };
        const validated = validateProfileWithZod(updated);
        set({ profile: validated, ...backToFirstStageUnlessRun() });
        saveProfile(validated);
      },

      resetProgress: () => {
        set({ profile: DEFAULT_PROFILE, ...backToFirstStageUnlessRun() });
        saveProfile(DEFAULT_PROFILE);
      },
    };
  });
}
