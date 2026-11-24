/**
 * The Run module: the live Run and the Debrief in the game's one store, and
 * the moves that change them. The rules (`./rules`) work out what a keystroke
 * or a step does; this module only applies the result. A result goes in as
 * one `set`, its moments are told, and only then is a clear reported, so
 * nothing re-enters the Run mid-keystroke.
 *
 * The Run reads the Profile and never changes it, except by handing a cleared
 * Stage's result to the Profile's command. The Profile reads nothing of this
 * module.
 */
import { STEPS_PER_SECOND } from '../analytics/keys';
import {
  type RunFacts,
  type RunReport,
  runReport,
} from '../analytics/runReport';
import {
  CURRICULUM_SECTORS,
  FIRST_STAGE,
  type Stage,
} from '../curriculum/curriculum';
import type { RunPhase } from './machine';
import type { Clock, RunClock } from './clock';
import type { Moment } from './moments';
import type { ProfileSlice, StageRecord, StageResult } from './profile';
import {
  clearedRun,
  countsAsKeystroke,
  idleRun,
  type KeyOptions,
  type Run,
  rhythmBand,
  scoreRun,
  startRun,
  strike,
  tick,
} from './rules';

/**
 * What the Debrief shows of a cleared Run: its result, what it did to the
 * Profile, its Rhythm, and the report on how it was typed, worked out once at
 * the clear. The report lives and goes with the Debrief: the next Run, or
 * leaving for Academy Home and starting one, drops it.
 */
export type DebriefResult = Pick<
  StageResult,
  'score' | 'wpm' | 'accuracy' | 'starsEarned' | 'creditsEarned'
> &
  StageRecord & { rhythm: number; report: RunReport };

/** The Run's state in the store. */
export interface RunSliceState {
  run: Run;
  /** The Debrief of the last cleared Run, or null. */
  debrief: DebriefResult | null;
}

/**
 * The Run's moves. The machine calls the first three, once per accepted move;
 * the rest are the player's keys and the clock's steps.
 */
export interface RunMoves {
  beginRun: (stage: Stage) => void;
  abandonRun: () => void;
  recordResult: () => void;
  /** Back to the first Stage, with no Debrief. Whoever calls it decides when that is right. */
  showFirstStage: () => void;
  /** A key goes down. Only a key that types a character, while the Run is running, is judged. */
  pressKey: (key: string, options?: KeyOptions) => void;
  /** A key lets go. No key lets go of any. */
  releaseKey: (key?: string) => void;
  /** Advances the Run by `count` steps of 1/60 s. Stops short when the Run stops running. */
  step: (count: number) => void;
}

export type RunSlice = RunSliceState & RunMoves;

/**
 * Where a Stage was flown, as the Logbook copies it at the clear: the
 * Sector's and the Stage's ids and names as they are today. Null for a Free
 * Flight. The Logbook never looks them up again.
 */
function whereOf(stage: Stage): RunFacts['where'] {
  if (stage.origin !== 'sector') return null;
  const sector = CURRICULUM_SECTORS.find(({ id }) => id === stage.sectorId);
  return {
    sector: { id: stage.sectorId, name: sector?.name ?? stage.sectorId },
    stage: { id: stage.id, name: stage.title },
  };
}

/** The store the Run lives in: its own state, and the Profile it reads. */
export type RunStore = RunSlice & ProfileSlice;

export interface RunDeps {
  /** The machine's Run phase. The Run reads it only to gate data changes. */
  getPhase: () => RunPhase;
  /** Tell the machine the last character was typed. */
  reportRunCleared: () => void;
  /** Timestamps only: when a Stage was last played, a Drone's id. */
  clock: Clock;
  /** Run Time: what practice time, Rhythm and keystroke intervals (and so Typing Time) are measured in. */
  runClock: RunClock;
  /** Told of each moment as it happens: a launch, the Judgement, Overdrive catching fire, a clear. */
  emit: (moment: Moment) => void;
}

/**
 * The Run's part of the game's one store. `set` and `get` are the store's.
 */
export function createRunSlice(
  { getPhase, reportRunCleared, clock, runClock, emit }: RunDeps,
  set: (partial: Partial<RunSliceState>) => void,
  get: () => RunStore,
): RunSlice {
  return {
    run: idleRun(FIRST_STAGE),
    debrief: null,

    beginRun: (stage) => {
      runClock.reset();
      set({
        run: startRun(stage, clock.now()),
        debrief: null,
      });
      emit({ type: 'launched' });
    },

    abandonRun: () => {
      runClock.reset();
      set({ run: idleRun(get().run.stage), debrief: null });
    },

    showFirstStage: () => {
      const { run } = get();
      // Already on the first Stage: the Run stays the very object it was.
      set(
        run.stage === FIRST_STAGE
          ? { debrief: null }
          : { run: { ...run, stage: FIRST_STAGE }, debrief: null },
      );
    },

    pressKey: (key, options) => {
      if (getPhase() !== 'running') return;
      if (!countsAsKeystroke(key, options)) return;

      const result = strike(
        get().run,
        key,
        { steps: runClock.steps(), now: clock.now() },
        options?.shift,
      );
      set({ run: result.run });
      for (const moment of result.moments) emit(moment);
      if (result.cleared) reportRunCleared();
    },

    releaseKey: (key) => {
      const { run } = get();
      // Nothing is down, so there is nothing to let go of: the Run stays the
      // very object it was, and the snapshot with it.
      if (run.lastPressedKey === null) return;
      if (!key || run.lastPressedKey.toLowerCase() === key.toLowerCase()) {
        set({ run: { ...run, lastPressedKey: null } });
      }
    },

    step: (count) => {
      for (let i = 0; i < count; i++) {
        // A step can end the phase (nothing in a step does today, but the
        // phase is the machine's to say), so ask before each one.
        if (getPhase() !== 'running') return;
        clock.step(1);
        runClock.advance(1);
        set({ run: tick(get().run, runClock.steps()) });
      }
    },

    recordResult: () => {
      const { run } = get();
      const { stage } = run;

      const now = clock.now();

      const outcome = scoreRun(run, stage);
      const facts: RunFacts = {
        where: whereOf(stage),
        // A Run with no Run Time still counts as one second of practice, as it always has.
        runSteps: Math.max(STEPS_PER_SECOND, runClock.steps()),
        wpm: outcome.wpm,
        accuracy: outcome.accuracy,
        rhythm: run.rhythm,
        rhythmBand: rhythmBand(run.rhythm),
      };
      const report = runReport(run.flightLog, facts);

      emit({ type: 'cleared', stars: outcome.starsEarned });

      const result: StageResult = {
        ...outcome,
        score: run.score,
        maxStreak: run.maxStreak,
        flightLog: run.flightLog,
        facts,
      };
      const record = get().recordStageResult(
        stage.origin === 'sector' ? stage.id : null,
        result,
        now,
      );

      set({
        run: clearedRun(run),
        debrief: {
          ...outcome,
          score: result.score,
          ...record,
          rhythm: run.rhythm,
          report,
        },
      });
    },
  };
}
