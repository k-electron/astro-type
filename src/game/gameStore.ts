import { createStore, type StoreApi } from 'zustand/vanilla';
import type {
  FallingNote,
  LivePerformance,
  PlayerProfile,
  RunPhase,
  Stage,
} from '../types/game';
import { CURRICULUM_SECTORS, getNoteLaneAndFinger } from '../data/curriculum';
import {
  DEFAULT_PROFILE,
  purchaseOf,
  recordStageResult,
  settingsAfter,
  unlocksSector,
} from './profile';
import { type CatalogItemId, catalogEntry } from './catalog';
import {
  type BackupImport,
  createSave,
  parseBackup,
  type SaveStorage,
} from './save';
import type { Settings } from '../store/schemas';
import type { Clock, RunClock } from './clock';
import {
  advanceDroneQueue,
  applyMiss,
  cadenceAfterHit,
  cadenceAfterMiss,
  chargeOverdrive,
  freshPerformance,
  countsAsKeystroke,
  judge,
  moveDrones,
  multiplierForStreak,
  scoreForHit,
  scoreRun,
  seedDrones,
  telemetry,
} from './rules';
import type { Moment } from './moments';

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
  // the move's data change.
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

  // The Profile's commands
  /** Changes some settings. Each one's rules are in `settingsAfter`. */
  changeSettings: (patch: Partial<Settings>) => void;
  /**
   * Buys an Upgrade's next level, or buys or equips a Cosmetic, at the price
   * the catalog gives. False, and nothing changes, when it is maxed, owned
   * (an Upgrade) or unaffordable.
   */
  buy: (itemId: CatalogItemId) => boolean;
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
  /** Told of each moment as it happens: the Judgement, Overdrive catching fire, a clear, a purchase. */
  emit: (moment: Moment) => void;
}

/**
 * Builds the vanilla store for one game: the live Run, the Debrief result and
 * the Profile, with the rules in `./rules`. Time and Save storage come in
 * through `deps`, and so does the way out for what happened that sounds.
 */
export function createGameStore({
  getPhase,
  reportRunCleared,
  storage,
  clock,
  runClock,
  emit,
}: GameStoreDeps): StoreApi<GameStoreState> {
  const save = createSave(storage);
  // Wiping or resetting sends the player back to the first Stage, unless a
  // Run is still on show (paused, or cleared with its Debrief to come back to).
  const backToFirstStageUnlessRun = () =>
    getPhase() === 'none' || getPhase() === 'abandoned'
      ? { currentStage: CURRICULUM_SECTORS[0].stages[0], victoryResult: null }
      : {};

  return createStore<GameStoreState>((set, get) => {
    // Load initial validated profile
    const { profile: savedProfile, notice: loadNotice } = save.load();

    // The one way the Profile changes: the new Profile, and the Save with it.
    // `alsoSet` is whatever else the same move changes, in the same update.
    const updateProfile = (
      patch: Partial<PlayerProfile>,
      alsoSet: Partial<GameStoreState> = {},
    ) => {
      const profile = { ...get().profile, ...patch };
      set({ ...alsoSet, profile });
      save.write(profile);
    };

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
        const { profile } = get();
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
        // Streak, Multiplier and Overdrive stay exactly as they were.
        set({ lastPressedKey: null });
      },

      resumeRun: () => {
        // Nothing to change: the Run's numbers were kept through the pause,
        // and the sound follows the Run phase.
      },

      abandonRun: () => {
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
          };

          set({
            performance: patchPerf,
            fallingNotes: nextFallingNotes,
            currentCharIndex: nextCharIndex,
            sessionKeyStats: updatedKeyStats,
            recentKeystrokeTimes: updatedKeystrokeTimes,
          });

          emit({
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
            // The Drone carries its lane and finger. The Run always keeps a
            // Drone for the next character; the key table is the fallback.
            droneId: matchingNote?.id ?? '',
            lane: matchingNote?.lane ?? targetInfo.lane,
            finger: matchingNote?.finger ?? targetInfo.finger,
          });
          // Overdrive catching fire comes right after the hit that lit it.
          if (charge.ignites) {
            emit({ type: 'ignition' });
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
          emit({
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

        emit({ type: 'cleared', stars: starsEarned });

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

        const peacefulPerf: LivePerformance = {
          ...state.performance,
          hyperspaceActive: false,
          hyperspaceEnergy: 0,
          multiplier: 1,
          currentStreak: 0,
        };

        updateProfile(updatedProfile, {
          performance: peacefulPerf,
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

      changeSettings: (patch) => {
        updateProfile(settingsAfter(get().profile, patch));
      },

      buy: (itemId) => {
        const purchase = purchaseOf(get().profile, itemId);
        if (!purchase) return false;
        updateProfile(purchase);
        // A Synthesizer Voice is sound state, not a moment: it just starts sounding.
        const { kind } = catalogEntry(itemId);
        if (kind === 'upgrade') emit({ type: 'upgrade' });
        else if (kind === 'trail') emit({ type: 'equip' });
        return true;
      },

      importProfile: (text: string): BackupImport => {
        const backup = parseBackup(text);
        if (backup.ok) updateProfile(backup.profile);
        return backup;
      },

      wipeCurriculumAchievements: () => {
        updateProfile(
          { totalStars: 0, stagesProgress: {} },
          backToFirstStageUnlessRun(),
        );
      },

      resetProgress: () => {
        updateProfile(DEFAULT_PROFILE, backToFirstStageUnlessRun());
      },
    };
  });
}
