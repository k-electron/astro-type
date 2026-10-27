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
  recordStageResult,
  UPGRADE_CATALOG,
  unlocksSector,
} from './profile';
import {
  type BackupImport,
  createSave,
  parseBackup,
  type SaveStorage,
} from './save';
import { MAX_UPGRADE_LEVEL } from '../store/schemas';
import type { Clock, RunClock } from './clock';
import type { GameEffects } from './effects';
import {
  advanceDroneQueue,
  applyMiss,
  cadenceAfterHit,
  cadenceAfterMiss,
  chargeOverdrive,
  freshPerformance,
  countsAsKeystroke,
  type Judgement,
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
  /** This Run's Stars took the fleet past a Sector's gate. */
  unlockedSector: boolean;
  cadenceConsistency?: number;
}

export type UpgradeKind = 'shields' | 'reactor' | 'sensors';

const UPGRADE_FIELDS = {
  shields: 'deflectorShields',
  reactor: 'hyperdriveReactor',
  sensors: 'precisionSensors',
} as const;

export interface GameStoreState {
  // The live Run, the Debrief and the Profile. The screen and the Run phase
  // are the machine's, not copied here.
  currentStage: Stage;
  profile: PlayerProfile;
  /** Set when the Save couldn't be read and the player started fresh. */
  loadNotice: string | null;
  performance: LivePerformance;
  lastPressedKey: string | null;
  errorIndices: Set<number>;
  fallingNotes: FallingNote[];
  victoryResult: VictoryResult | null;

  // Runtime Tracking (non-persisted refs)
  currentCharIndex: number;
  sessionKeyStats: Record<string, { hits: number; misses: number }>;
  recentKeystrokeTimes: number[];

  // Run moves: the machine calls these, once per accepted move. Each one is
  // the data change and the sound that goes with the move.
  beginRun: (stage: Stage) => void;
  pauseRun: () => void;
  resumeRun: () => void;
  abandonRun: () => void;
  recordResult: () => void;

  // Player-driven actions
  processKeystroke: (key: string, options?: { repeat?: boolean }) => void;
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
  /** The machine's Run phase. The store reads it only to gate data changes. */
  getPhase: () => RunPhase;
  /** Tell the machine the last character was typed. */
  reportRunCleared: () => void;
  storage: SaveStorage;
  /** Timestamps only: when a Stage was last played, a Drone's id. */
  clock: Clock;
  /** Run Time: what WPM, Stars, cadence and keystroke intervals are measured in. */
  runClock: RunClock;
  effects: GameEffects;
  /** Told of each Judgement as it happens, after the Run has changed. */
  onJudgement: (judgement: Judgement) => void;
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
  runClock,
  effects,
  onJudgement,
}: GameStoreDeps): StoreApi<GameStoreState> {
  const save = createSave(storage);
  const saveProfile = (profile: PlayerProfile) => save.write(profile);
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
    const { profile: savedProfile, notice: loadNotice } = save.load();

    return {
      currentStage: CURRICULUM_SECTORS[0].stages[0],
      profile: savedProfile,
      loadNotice,
      performance: freshPerformance(savedProfile.upgrades.deflectorShields),
      lastPressedKey: null,
      errorIndices: new Set<number>(),
      fallingNotes: [],
      victoryResult: null,
      currentCharIndex: 0,
      sessionKeyStats: {},
      recentKeystrokeTimes: [],

      beginRun: (stage: Stage) => {
        effects.init();
        const { profile } = get();
        // A fresh Run starts with Overdrive off, so its beat does too.
        effects.setOverdrive(false);
        if (beatAllowed(profile)) {
          effects.startBeat();
        }

        runClock.reset();
        const now = clock.now();

        set({
          currentStage: stage,
          errorIndices: new Set<number>(),
          sessionKeyStats: {},
          recentKeystrokeTimes: [],
          currentCharIndex: 0,
          fallingNotes: seedDrones(stage, now),
          performance: freshPerformance(profile.upgrades.deflectorShields),
          lastPressedKey: null,
          victoryResult: null,
        });
      },

      pauseRun: () => {
        effects.stopBeat();
        effects.setOverdrive(false);
        // Streak, Multiplier and Overdrive stay exactly as they were.
        set({ lastPressedKey: null });
      },

      resumeRun: () => {
        if (beatAllowed(get().profile)) {
          effects.startBeat();
        }
        // Overdrive was kept through the pause, so its beat comes back with it.
        effects.setOverdrive(get().performance.hyperspaceActive);
      },

      abandonRun: () => {
        effects.stopBeat();
        effects.setOverdrive(false);
        runClock.reset();
        set({
          performance: freshPerformance(
            get().profile.upgrades.deflectorShields,
          ),
          lastPressedKey: null,
          fallingNotes: [],
          errorIndices: new Set(),
          victoryResult: null,
          sessionKeyStats: {},
        });
      },

      processKeystroke: (pressedKey: string, options) => {
        const state = get();
        if (getPhase() !== 'running') return;

        if (!countsAsKeystroke(pressedKey, options?.repeat)) {
          return;
        }

        set({ lastPressedKey: pressedKey });

        const targetText = state.currentStage.sampleText;
        const currentCharIdx = state.currentCharIndex;
        const targetChar = targetText[currentCharIdx];
        if (!targetChar) return;

        const isMatch = pressedKey === targetChar;
        const targetInfo = getNoteLaneAndFinger(targetChar);

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
          const nextCharIndex = currentCharIdx + 1;
          const now = clock.now();
          const runTimeMs = runClock.runTimeMs();

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
            runTimeMs,
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

          onJudgement({
            type: 'hit',
            grade:
              rating === 'PERFECT'
                ? 'perfect'
                : rating === 'GREAT'
                  ? 'great'
                  : 'good',
            key: pressedKey,
            points: earnedScore,
            overdrive: state.performance.hyperspaceActive,
          });
          // Overdrive catching fire is its own sound, after the hit's.
          if (charge.ignites) {
            effects.setOverdrive(true);
            effects.playHyperspaceIgnition();
          }

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

          set({
            errorIndices: newErrorIndices,
            sessionKeyStats: updatedKeyStats,
            performance: perf,
          });
          // A Miss no shield absorbs ends Overdrive, and its beat with it.
          if (!perf.hyperspaceActive) {
            effects.setOverdrive(false);
          }
          onJudgement({
            type: shielded ? 'shield' : 'miss',
            key: pressedKey,
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
          fallingNotes: moveDrones(state.fallingNotes),
        });
      },

      updateTelemetryOnInterval: () => {
        const state = get();
        if (getPhase() !== 'running') return;

        const elapsedSeconds = Math.max(1, runClock.runTimeMs() / 1000);

        set({ performance: telemetry(state.performance, elapsedSeconds) });
      },

      recordResult: () => {
        const state = get();
        effects.stopBeat();
        effects.setOverdrive(false);
        effects.playStageVictory();

        const now = clock.now();
        const elapsedSeconds = Math.max(1, runClock.runTimeMs() / 1000);

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
            unlockedSector: unlocksSector(
              state.profile.totalStars,
              updatedProfile.totalStars,
            ),
            cadenceConsistency: state.performance.cadenceConsistency ?? 100,
          },
        });
      },

      toggleGlobalMute: () => {
        const { profile } = get();
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
          getPhase() === 'running'
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
        const { profile } = get();
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
        const { profile } = get();
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
        if (enabled && !profile.globalMuted && getPhase() === 'running') {
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
        set({ profile: updated, ...backToFirstStageUnlessRun() });
        saveProfile(updated);
      },

      resetProgress: () => {
        set({ profile: DEFAULT_PROFILE, ...backToFirstStageUnlessRun() });
        saveProfile(DEFAULT_PROFILE);
      },
    };
  });
}
