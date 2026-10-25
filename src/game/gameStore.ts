import { createStore, type StoreApi } from 'zustand/vanilla';
import type { ActorRefFrom } from 'xstate';
import type {
  FallingNote,
  GameState,
  LivePerformance,
  PlayerProfile,
  Stage,
  TrailColorTheme,
  AudioSynthCore,
  BeatTheme,
} from '../types/game';
import {
  CURRICULUM_SECTORS,
  getNextStage,
  getNoteLaneAndFinger,
} from '../data/curriculum';
import { DEFAULT_PROFILE, recordStageResult, UPGRADE_CATALOG } from './profile';
import {
  type BackupImport,
  createSave,
  parseBackup,
  type SaveStorage,
} from './save';
import { MAX_UPGRADE_LEVEL } from '../store/schemas';
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
import {
  type gameMachine,
  mapGameStateToMachineEvent,
  mapMachineStateToGameState,
  type GameMachineEvent,
} from '../store/gameMachine';

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

export type UpgradeKind = 'shields' | 'reactor' | 'sensors';

const UPGRADE_FIELDS = {
  shields: 'deflectorShields',
  reactor: 'hyperdriveReactor',
  sensors: 'precisionSensors',
} as const;

export interface GameStoreState {
  // Machine & Game State
  gameState: GameState;
  currentStage: Stage;
  profile: PlayerProfile;
  /** Set when the Save couldn't be read and the player started fresh. */
  loadNotice: string | null;
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

  // Actions
  sendGameEvent: (event: GameMachineEvent) => void;
  setGameState: (state: GameState) => void;
  setCurrentStage: (stage: Stage) => void;
  startStage: (
    stage: Stage,
    customSpeed?: 'SLOW' | 'NORMAL' | 'FAST' | 'HYPER',
  ) => void;
  processKeystroke: (key: string) => void;
  releaseKeystroke: (key?: string) => void;
  updateFallingNotesOnTick: () => void;
  updateTelemetryOnInterval: () => void;
  handleStageComplete: () => void;
  launchNextStage: () => void;

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
  /** Buys the next level of an Upgrade. False, and nothing changes, when it is maxed or unaffordable. */
  buyUpgrade: (kind: UpgradeKind) => boolean;
  upgradeShields: () => void;
  upgradeReactor: () => void;
  upgradeSensors: () => void;
  unlockOrEquipTheme: (theme: TrailColorTheme, cost: number) => void;
  unlockOrEquipAudio: (coreId: AudioSynthCore, cost: number) => void;
  /**
   * Replaces the Profile with a Backup's, and saves it. A Backup that fails
   * the Save's checks is refused: the Profile and the Save are left as they were.
   */
  importProfile: (text: string) => BackupImport;
  wipeCurriculumAchievements: () => void;
  resetProgress: () => void;
}

export interface GameStoreDeps {
  actor: ActorRefFrom<typeof gameMachine>;
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
  actor: gameActor,
  storage,
  clock,
  effects,
}: GameStoreDeps): StoreApi<GameStoreState> {
  const save = createSave(storage);
  const saveProfile = (profile: PlayerProfile) => save.write(profile);

  return createStore<GameStoreState>((set, get) => {
    // Load initial validated profile
    const { profile: savedProfile, notice: loadNotice } = save.load();

    // Connect XState Actor to store updates
    gameActor.subscribe((snapshot) => {
      const nextGameState = mapMachineStateToGameState(String(snapshot.value));
      set({ gameState: nextGameState });
    });

    return {
      gameState: 'MENU',
      currentStage: CURRICULUM_SECTORS[0].stages[0],
      profile: savedProfile,
      loadNotice,
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

      sendGameEvent: (event: GameMachineEvent) => {
        gameActor.send(event);
      },

      setGameState: (nextState: GameState) => {
        if (nextState !== 'PLAYING') {
          effects.stopBeat();
          effects.setOverdrive(false);
          const currentPerf = get().performance;
          set({
            performance: {
              ...currentPerf,
              hyperspaceActive: false,
              multiplier: 1,
              currentStreak: 0,
              hyperspaceEnergy: 0,
            },
            activeLaneIndex: null,
            lastPressedKey: null,
          });
        }
        if (nextState === 'MENU') {
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
        }
        const event = mapGameStateToMachineEvent(nextState);
        gameActor.send(event);
      },

      setCurrentStage: (stage: Stage) => {
        set({ currentStage: stage });
      },

      startStage: (
        stage: Stage,
        customSpeed?: 'SLOW' | 'NORMAL' | 'FAST' | 'HYPER',
      ) => {
        effects.init();
        const { profile } = get();
        if (customSpeed && customSpeed !== profile.highwaySpeed) {
          const speedProfile = {
            ...profile,
            highwaySpeed: customSpeed,
          };
          set({ profile: speedProfile });
          saveProfile(speedProfile);
        }
        if (profile.musicEnabled) {
          effects.startBeat();
        }

        gameActor.send({ type: 'START', stageId: stage.id });

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

      processKeystroke: (pressedKey: string) => {
        const state = get();
        if (state.gameState !== 'PLAYING') return;

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
            get().handleStageComplete();
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
        if (state.gameState !== 'PLAYING') return;

        set({
          fallingNotes: moveDrones(
            state.fallingNotes,
            state.profile.highwaySpeed,
          ),
        });
      },

      updateTelemetryOnInterval: () => {
        const state = get();
        if (state.gameState !== 'PLAYING' || state.stageStartTime === null) {
          return;
        }

        const elapsedSeconds = Math.max(
          1,
          (clock.now() - state.stageStartTime) / 1000,
        );

        set({ performance: telemetry(state.performance, elapsedSeconds) });
      },

      handleStageComplete: () => {
        const state = get();
        gameActor.send({ type: 'STAGE_CLEAR' });
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

        saveProfile(updatedProfile);

        const peacefulPerf: LivePerformance = {
          ...state.performance,
          hyperspaceActive: false,
          hyperspaceEnergy: 0,
          multiplier: 1,
          currentStreak: 0,
        };

        set({
          performance: peacefulPerf,
          profile: updatedProfile,
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

      launchNextStage: () => {
        const state = get();
        const next = getNextStage(state.currentStage.id);
        if (next) {
          get().startStage(next);
        } else {
          gameActor.send({ type: 'SELECT_STAGE' });
        }
      },

      toggleGlobalMute: () => {
        const { profile, gameState } = get();
        const nextMuted = !profile.globalMuted;
        const updated = {
          ...profile,
          globalMuted: nextMuted,
        };
        set({ profile: updated });
        saveProfile(updated);
        effects.setGlobalMute(nextMuted);
        if (
          !nextMuted &&
          profile.musicEnabled &&
          (profile.musicVolume ?? 0.4) > 0 &&
          gameState === 'PLAYING'
        ) {
          effects.startBeat();
        }
      },

      toggleSound: () => {
        const { profile } = get();
        const next = !profile.soundEnabled;
        const updated = {
          ...profile,
          soundEnabled: next,
        };
        set({ profile: updated });
        saveProfile(updated);
        effects.setSoundEnabled(next);
      },

      toggleMusic: () => {
        const { profile, gameState } = get();
        const next = !profile.musicEnabled;
        const updated = {
          ...profile,
          musicEnabled: next,
        };
        set({ profile: updated });
        saveProfile(updated);
        effects.setMusicEnabled(next);
        if (
          next &&
          !profile.globalMuted &&
          (profile.musicVolume ?? 0.4) > 0 &&
          gameState === 'PLAYING'
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
        const updated = {
          ...profile,
          soundVolume: clamped,
          soundEnabled: enabled,
        };
        set({ profile: updated });
        saveProfile(updated);
        effects.setSoundEnabled(enabled);
        effects.setSoundVolume(clamped);
      },

      setMusicVolume: (vol: number) => {
        const { profile, gameState } = get();
        const clamped = Math.max(0, Math.min(1, vol));
        const enabled = clamped > 0;
        const updated = {
          ...profile,
          musicVolume: clamped,
          musicEnabled: enabled,
        };
        set({ profile: updated });
        saveProfile(updated);
        effects.setMusicEnabled(enabled);
        effects.setMusicVolume(clamped);
        if (enabled && !profile.globalMuted && gameState === 'PLAYING') {
          effects.startBeat();
        } else if (!enabled) {
          effects.stopBeat();
        }
      },

      setBeatTheme: (theme: BeatTheme) => {
        const { profile } = get();
        const updated = {
          ...profile,
          beatTheme: theme,
        };
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
        const updated = {
          ...profile,
          beatTheme: nextTheme,
        };
        set({ profile: updated });
        saveProfile(updated);
      },

      toggleKeyboard: () => {
        const { profile } = get();
        const updated = {
          ...profile,
          keyboardVisible: !profile.keyboardVisible,
        };
        set({ profile: updated });
        saveProfile(updated);
      },

      toggleHands: () => {
        const { profile } = get();
        const updated = {
          ...profile,
          handsVisible: !profile.handsVisible,
        };
        set({ profile: updated });
        saveProfile(updated);
      },

      buyUpgrade: (kind: UpgradeKind): boolean => {
        const { profile } = get();
        const field = UPGRADE_FIELDS[kind];
        const level = profile.upgrades[field];
        // The catalog has one entry per level still to buy.
        const next =
          level < MAX_UPGRADE_LEVEL ? UPGRADE_CATALOG[field][level] : null;
        if (!next || profile.totalCredits < next.cost) return false;
        const updated = {
          ...profile,
          totalCredits: profile.totalCredits - next.cost,
          upgrades: { ...profile.upgrades, [field]: level + 1 },
        };
        set({ profile: updated });
        saveProfile(updated);
        effects.playShieldUpgrade();
        return true;
      },

      upgradeShields: () => void get().buyUpgrade('shields'),
      upgradeReactor: () => void get().buyUpgrade('reactor'),
      upgradeSensors: () => void get().buyUpgrade('sensors'),

      unlockOrEquipTheme: (theme: TrailColorTheme, cost: number) => {
        const { profile } = get();
        const isUnlocked = profile.upgrades.unlockedThemes.includes(theme);
        if (!isUnlocked) {
          if (profile.totalCredits < cost) return;
          const updated = {
            ...profile,
            totalCredits: profile.totalCredits - cost,
            upgrades: {
              ...profile.upgrades,
              unlockedThemes: [...profile.upgrades.unlockedThemes, theme],
              equippedTrailTheme: theme,
            },
          };
          set({ profile: updated });
          saveProfile(updated);
          effects.playEquipCosmetic();
        } else {
          const updated = {
            ...profile,
            upgrades: {
              ...profile.upgrades,
              equippedTrailTheme: theme,
            },
          };
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
          const updated = {
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
          };
          set({ profile: updated });
          saveProfile(updated);
          effects.setCore(coreId);
        } else {
          const updated = {
            ...profile,
            upgrades: {
              ...profile.upgrades,
              equippedAudioCore: coreId,
            },
          };
          set({ profile: updated });
          saveProfile(updated);
          effects.setCore(coreId);
        }
      },

      importProfile: (text: string): BackupImport => {
        const backup = parseBackup(text);
        if (backup.ok) {
          set({ profile: backup.profile });
          saveProfile(backup.profile);
        }
        return backup;
      },

      wipeCurriculumAchievements: () => {
        const { profile } = get();
        const updated: PlayerProfile = {
          ...profile,
          totalStars: 0,
          stagesProgress: {},
        };
        set({
          profile: updated,
          currentStage: CURRICULUM_SECTORS[0].stages[0],
          victoryResult: null,
        });
        saveProfile(updated);
      },

      resetProgress: () => {
        set({
          profile: DEFAULT_PROFILE,
          currentStage: CURRICULUM_SECTORS[0].stages[0],
          victoryResult: null,
        });
        saveProfile(DEFAULT_PROFILE);
      },
    };
  });
}
