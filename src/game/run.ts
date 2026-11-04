/**
 * The Run module: the live Run and the Debrief in the game's one store, and
 * the moves that change them. The rules (`./rules`) work out what a keystroke
 * or a step does; this module only applies the result. A result goes in as
 * one `set`, its moments are told, and only then is a clear reported, so
 * nothing re-enters the Run mid-keystroke.
 *
 * The Run reads the Profile through `loadoutOf` and never changes it, except
 * by handing a cleared Stage's result to the Profile's command. The Profile
 * reads nothing of this module.
 */
import { FIRST_STAGE } from '../curriculum/curriculum';
import type { Stage } from '../curriculum/curriculum';
import type { RunPhase } from './machine';
import type { Clock, RunClock } from './clock';
import type { Moment } from './moments';
import {
  type Loadout,
  loadoutOf,
  type ProfileSlice,
  type StageRecord,
  type StageResult,
} from './profile';
import {
  clearedRun,
  countsAsKeystroke,
  idleRun,
  type KeyOptions,
  type Run,
  scoreRun,
  startRun,
  strike,
  tick,
} from './rules';

/** What the Debrief shows of a cleared Run: its result, what it did to the Profile, and its Rhythm. */
export type DebriefResult = Pick<
  StageResult,
  'score' | 'wpm' | 'accuracy' | 'starsEarned' | 'creditsEarned'
> &
  StageRecord & { rhythm: number };

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

/** The store the Run lives in: its own state, and the Profile it reads. */
export type RunStore = RunSlice & ProfileSlice;

export interface RunDeps {
  /** The machine's Run phase. The Run reads it only to gate data changes. */
  getPhase: () => RunPhase;
  /** Tell the machine the last character was typed. */
  reportRunCleared: () => void;
  /** Timestamps only: when a Stage was last played, a Drone's id. */
  clock: Clock;
  /** Run Time: what WPM, Stars, Rhythm and keystroke intervals are measured in. */
  runClock: RunClock;
  /** Told of each moment as it happens: a launch, the Judgement, Overdrive catching fire, a clear. */
  emit: (moment: Moment) => void;
}

/**
 * The Run's part of the game's one store. `set` and `get` are the store's,
 * `loadout` is what the Profile loaded from the Save gives the first Run.
 */
export function createRunSlice(
  { getPhase, reportRunCleared, clock, runClock, emit }: RunDeps,
  set: (partial: Partial<RunSliceState>) => void,
  get: () => RunStore,
  loadout: Loadout,
): RunSlice {
  // The Profile as the Run reads it, live on each call: a Sensors or Reactor
  // bought mid-Run counts at once, and a Shield only from the next Run.
  const currentLoadout = () => loadoutOf(get().profile);

  return {
    run: idleRun(FIRST_STAGE, loadout),
    debrief: null,

    beginRun: (stage) => {
      runClock.reset();
      set({
        run: startRun(stage, currentLoadout(), clock.now()),
        debrief: null,
      });
      emit({ type: 'launched' });
    },

    abandonRun: () => {
      runClock.reset();
      set({ run: idleRun(get().run.stage, currentLoadout()), debrief: null });
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

      const result = strike(get().run, key, currentLoadout(), {
        steps: runClock.steps(),
        now: clock.now(),
      });
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
      const elapsedSeconds = Math.max(1, runClock.runTimeMs() / 1000);

      const outcome = scoreRun(run, elapsedSeconds, stage);

      emit({ type: 'cleared', stars: outcome.starsEarned });

      const result: StageResult = {
        ...outcome,
        score: run.score,
        maxStreak: run.maxStreak,
        keystrokesCount: run.totalKeystrokes,
        errorsCount: run.incorrectKeystrokes,
        practiceSeconds: Math.round(elapsedSeconds),
        keyStats: run.keyStats,
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
        },
      });
    },
  };
}
