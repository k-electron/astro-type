/**
 * One game, built fresh: the machine, the one store (the Run and the Profile),
 * the clock and Save storage. The app builds one at startup and each test
 * builds its own.
 *
 * Nothing in this module's imports touches React, PixiJS, the DOM, browser
 * storage or the sound engine. Sound is attached from outside as `sound`.
 */
import { createActor } from 'xstate';
import { createStore } from 'zustand/vanilla';
import {
  freeFlightStage,
  nextStageOf,
  type StageAhead,
  stageAheadOf,
} from '../data/curriculum';
import {
  type GameMachineEvent,
  gameMachine,
  type PlayerEvent,
  type ScreenParams,
} from '../store/gameMachine';
import type {
  FallingNote,
  LivePerformance,
  PlayerProfile,
  RunPhase,
  Screen,
  Stage,
} from '../types/game';
import { type Clock, createRunClock, createSteppedClock } from './clock';
import type { KeyOptions, RunState } from './rules';
import type { Moment } from './moments';
import {
  cueFor,
  type Sound,
  sameSound,
  silentSound,
  soundStateOf,
} from './sound';
import { createProfileSlice, loadoutOf, type ProfileSlice } from './profile';
import { createRunSlice, type RunSlice, type VictoryResult } from './run';
import type { CatalogItemId } from './catalog';
import type { BackupImport, SaveStorage } from './save';
import type { Settings } from '../store/schemas';

export { createMemoryStorage } from './save';
export type { MemorySaveStorage, SaveStorage } from './save';
export type { Clock } from './clock';
export type { Cue, Sound, SoundState } from './sound';
export type { Judgement, KeyOptions } from './rules';
export type { Moment } from './moments';
export type { VictoryResult } from './run';
export type { PlayerEvent } from '../store/gameMachine';
export type { RunPhase, Screen } from '../types/game';

/** The machine refused a move: the event doesn't apply on this screen. A bug in whoever sent it. */
export class RefusedMoveError extends Error {
  constructor(
    readonly event: GameMachineEvent,
    readonly screen: Screen,
    readonly phase: RunPhase,
  ) {
    super(
      `Refused move: ${event.type} on the ${screen} screen (Run phase: ${phase})`,
    );
    this.name = 'RefusedMoveError';
  }
}

export interface GameOptions {
  /** Where the Save lives. Memory in tests, localStorage in the app. */
  storage: SaveStorage;
  /** Where the game's sound goes. Absent means silent. */
  sound?: Sound;
  /**
   * The wall clock, for timestamps only (when a Stage was last played). Run
   * Time doesn't come from it. Defaults to a hand-stepped one; the app passes
   * the real one.
   */
  clock?: Clock;
  /**
   * What to do with a move the machine refuses. The move changes nothing
   * either way. The default throws `RefusedMoveError`, so a test that triggers
   * one fails; the app passes a console warning for dev builds.
   */
  onRefusedMove?: (error: RefusedMoveError) => void;
}

/** The live Run: the performance numbers, plus the Drones and the Stage. */
export type Run = LivePerformance & {
  /** Today's falling notes. The lead Drone is first; the Strike Line is y=84. */
  drones: FallingNote[];
  currentStage: Stage;
  /** The positions in the text where a wrong key was pressed: the Miss marks. */
  errorIndices: ReadonlySet<number>;
  /** The key the player has down (the Action Deck's pressed keycap), or null. */
  lastPressedKey: string | null;
};

/**
 * Everything a screen shows, settled: the machine and the store have both
 * finished the move that made it. It is replaced, never changed in place, and
 * only when one of its fields changed; `run` is rebuilt only when the Run did.
 */
export interface GameState {
  screen: Screen;
  phase: RunPhase;
  /** The screen that opened this one (what Close returns to), or null when nothing did. */
  opener: Screen | null;
  /** The parameter the screen was opened with, or null when it takes none (none does yet). */
  screenParams: ScreenParams;
  /**
   * What follows the Run's Stage: another Stage for Next Stage to start, the
   * last Stage (Next Stage opens the Galaxy Map instead), or a Free Flight
   * (there is no Next Stage).
   */
  stageAhead: StageAhead;
  run: Run;
  debrief: VictoryResult | null;
  profile: PlayerProfile;
  /** Why the Save was set aside and the player started fresh, or null. */
  loadNotice: string | null;
  /** Run Time in milliseconds: how long the Run has been running, pauses left out. */
  runTime: number;
}

export interface Game {
  /** Send what the player did. A refused move changes nothing and goes to `onRefusedMove`. */
  send(event: PlayerEvent): void;
  /**
   * Press a key, as a keydown does; `key` is a `KeyboardEvent.key` value and
   * `options` are the keydown's `repeat`, `ctrlKey`, `metaKey` and `altKey`.
   * Only a key that types one character is judged. Everything else (Escape,
   * Backspace, Enter, arrows, function keys, Tab, modifiers), every
   * auto-repeat keydown and every Cmd or Ctrl shortcut is ignored and changes
   * nothing.
   */
  pressKey(key: string, options?: KeyOptions): void;
  /**
   * Hear what just happened: each Judgement (a hit names its Drone, lane and
   * finger), Overdrive catching fire, the Stage clear and a purchase. A moment
   * is heard once the move that made it has settled, so `getState()` already
   * shows its effects (on a clear, the Debrief). Returns the way to stop
   * listening.
   */
  onMoment(listener: (moment: Moment) => void): () => void;
  /**
   * Advance the Run clock by `count` steps of 1/60 s. Does nothing unless the
   * Run phase is running: Run Time, the Drones and the telemetry stand still.
   */
  step(count?: number): void;
  /** The settled snapshot. The same object until a move changes something in it. */
  getState(): GameState;
  /**
   * Call `listener` once per change to the snapshot, after the machine and the
   * store have both settled. A move that changes nothing does not call it.
   * Returns the unsubscribe function.
   */
  subscribe(listener: () => void): () => void;
  /** Let go of a key: the Action Deck's pressed keycap lifts. No key lets go of any. */
  releaseKey(key?: string): void;
  /**
   * Change some settings: the patch's fields change, and each one's rules
   * apply (a volume of 0 turns its channel off). Saved at once.
   */
  changeSettings(patch: Partial<Settings>): void;
  /**
   * Buy an item from the catalog at its catalog price: an Upgrade's next
   * level, or a Cosmetic (bought and equipped, or just equipped when it is
   * already owned). True when it bought or equipped something; false, with
   * the Profile unchanged, when the Upgrade is at its last level or the
   * Credits fall short.
   */
  buy(itemId: CatalogItemId): boolean;
  /** Replace the Profile with a Backup's, if it passes the Save's checks. */
  importBackup(text: string): BackupImport;
  /** Wipe Stars and Stage progress; Credits and Upgrades stay. */
  wipeAchievements(): void;
  /** Back to a fresh Profile. */
  resetProgress(): void;
}

/** The game's one store: the Run's part and the Profile's, side by side. */
type GameStoreState = RunSlice & ProfileSlice;

export function createGame(options: GameOptions): Game {
  const clock = options.clock ?? createSteppedClock();
  const runClock = createRunClock();
  const sound = options.sound ?? silentSound;
  const onRefusedMove =
    options.onRefusedMove ??
    ((error: RefusedMoveError) => {
      throw error;
    });

  // The machine names its effects and the one guard that reads the Stage;
  // the Game fills them in from the store, which reads the phase and reports
  // "Run cleared". They meet here.
  const machine = gameMachine.provide({
    actions: {
      beginRun: (_, { stage }) => store.getState().beginRun(stage),
      beginFreeFlight: (_, { text, targetWpm, stage }) =>
        store.getState().beginRun(stage ?? freeFlightStage(text, targetWpm)),
      beginCurrentStage: () =>
        store.getState().beginRun(store.getState().run.stage),
      beginNextStage: () => {
        const next = nextStageOf(store.getState().run.stage);
        if (next) store.getState().beginRun(next);
      },
      abandonRun: () => store.getState().abandonRun(),
      recordResult: () => store.getState().recordResult(),
      releasePressedKey: () => store.getState().releaseKey(),
    },
    guards: {
      hasNextStage: () => nextStageOf(store.getState().run.stage) !== undefined,
    },
  });
  const actor = createActor(machine);

  const getPhase = (): RunPhase => actor.getSnapshot().context.phase;
  const getScreen = (): Screen => actor.getSnapshot().value as Screen;

  // Moments are queued as the store makes them and heard when the move has
  // settled (see `heardAfter`): sound plays their cues first, then everyone
  // else hears them. The continuous sound (the beat, its Overdrive layer,
  // mute, volumes, theme, voice) is not played from moments: it is derived
  // from the snapshot and synced when that changes.
  const momentListeners = new Set<(moment: Moment) => void>();
  const happened: Moment[] = [];
  const emit = (moment: Moment) => {
    happened.push(moment);
    // A change on the store itself, outside any move, is heard at once.
    if (depth === 0) heardAfter();
  };
  // One store, built from the Profile's part and the Run's. The Run reads the
  // Profile (its Loadout, and handing it a cleared Stage's result); the
  // Profile reads nothing of the Run. The Run starts with the Loadout of the
  // Profile the Save gave.
  const store = createStore<GameStoreState>()((set, get) => {
    const profile = createProfileSlice(
      { storage: options.storage, emit },
      set,
      get,
    );
    const run = createRunSlice(
      {
        getPhase,
        reportRunCleared: () => deliver({ type: 'RUN_CLEARED' }),
        clock,
        runClock,
        emit,
      },
      set,
      get,
      loadoutOf(profile.profile),
    );
    return { ...profile, ...run };
  });

  actor.start();

  // Every event, the store's "Run cleared" included, goes through the same
  // check: a move the machine refuses changes nothing and is reported.
  function deliver(event: GameMachineEvent) {
    if (!actor.getSnapshot().can(event)) {
      onRefusedMove(new RefusedMoveError(event, getScreen(), getPhase()));
      return;
    }
    actor.send(event);
  }

  const getOpener = (): Screen | null => {
    const { openers } = actor.getSnapshot().context;
    return openers[openers.length - 1]?.screen ?? null;
  };

  // The public Run is made of five things in the store's Run; it is rebuilt
  // only when one of them is a different object.
  let builtFrom: Pick<
    RunState,
    'performance' | 'drones' | 'stage' | 'errorIndices' | 'lastPressedKey'
  > | null = null;
  let builtRun: Run | null = null;
  const buildRun = ({
    performance,
    drones,
    stage,
    errorIndices,
    lastPressedKey,
  }: RunState): Run => {
    if (
      builtRun &&
      builtFrom?.performance === performance &&
      builtFrom.drones === drones &&
      builtFrom.stage === stage &&
      builtFrom.errorIndices === errorIndices &&
      builtFrom.lastPressedKey === lastPressedKey
    ) {
      return builtRun;
    }
    builtFrom = { performance, drones, stage, errorIndices, lastPressedKey };
    builtRun = {
      ...performance,
      drones,
      currentStage: stage,
      errorIndices,
      lastPressedKey,
    };
    return builtRun;
  };

  // The settled snapshot. A move can touch the machine and the store several
  // times (a clear starts in the store, goes through the machine, and ends in
  // the store again), so every move runs inside `move`: the snapshot is only
  // built when the outermost move ends, and listeners hear it once.
  const listeners = new Set<() => void>();
  let depth = 0;
  let hearing = false;

  const snapshotNow = (previous: GameState | null): GameState => {
    const state = store.getState();
    const next: GameState = {
      screen: getScreen(),
      phase: getPhase(),
      opener: getOpener(),
      screenParams: actor.getSnapshot().context.screenParams,
      stageAhead: stageAheadOf(state.run.stage),
      run: buildRun(state.run),
      debrief: state.debrief,
      profile: state.profile,
      loadNotice: state.loadNotice,
      runTime: runClock.runTimeMs(),
    };
    const unchanged =
      previous &&
      next.screen === previous.screen &&
      next.phase === previous.phase &&
      next.opener === previous.opener &&
      next.screenParams === previous.screenParams &&
      next.stageAhead === previous.stageAhead &&
      next.run === previous.run &&
      next.debrief === previous.debrief &&
      next.profile === previous.profile &&
      next.loadNotice === previous.loadNotice &&
      next.runTime === previous.runTime;
    return unchanged ? previous : next;
  };
  let snapshot = snapshotNow(null);

  const soundOf = (state: GameState) =>
    soundStateOf(state.profile, state.phase, state.run);
  let heardSound = soundOf(snapshot);
  sound.sync(heardSound);

  function settle() {
    if (depth > 0) return;
    const next = snapshotNow(snapshot);
    if (next === snapshot) return;
    snapshot = next;
    const nextSound = soundOf(next);
    if (!sameSound(nextSound, heardSound)) {
      heardSound = nextSound;
      sound.sync(nextSound);
    }
    for (const listener of [...listeners]) listener();
  }

  // Hears the queued moments, in order, once the snapshot has settled. A
  // listener that makes a move of its own queues more, heard in the same loop.
  function heardAfter() {
    if (hearing) return;
    hearing = true;
    try {
      for (let moment = happened.shift(); moment; moment = happened.shift()) {
        for (const cue of cueFor(moment)) sound.play(cue);
        for (const listener of [...momentListeners]) listener(moment);
      }
    } finally {
      hearing = false;
    }
  }

  function move<T>(change: () => T): T {
    depth++;
    try {
      return change();
    } finally {
      depth--;
      settle();
      if (depth === 0) heardAfter();
    }
  }

  // A change made on the store itself, outside any move, still settles.
  store.subscribe(settle);

  const send = (event: PlayerEvent) => move(() => deliver(event));

  const onMoment = (listener: (moment: Moment) => void) => {
    momentListeners.add(listener);
    return () => {
      momentListeners.delete(listener);
    };
  };

  const actions = () => store.getState();

  // The one step that crosses from the Profile to the Run: wiping or resetting
  // sends the player back to the first Stage, unless a Run is still on show
  // (paused, or cleared with its Debrief to come back to). The Profile never
  // reads the phase, so the Game, which holds both, decides.
  const backToFirstStageUnlessRun = () => {
    if (getPhase() === 'none' || getPhase() === 'abandoned') {
      actions().showFirstStage();
    }
  };

  return {
    send,
    pressKey: (key, pressOptions) =>
      move(() => actions().pressKey(key, pressOptions)),
    releaseKey: (key) => move(() => actions().releaseKey(key)),
    onMoment,
    step: (count = 1) => move(() => actions().step(count)),
    getState: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    changeSettings: (patch) => move(() => actions().changeSettings(patch)),
    buy: (itemId) => move(() => actions().buy(itemId)),
    importBackup: (text) => move(() => actions().importProfile(text)),
    wipeAchievements: () =>
      move(() => {
        actions().wipeCurriculumAchievements();
        backToFirstStageUnlessRun();
      }),
    resetProgress: () =>
      move(() => {
        actions().resetProgress();
        backToFirstStageUnlessRun();
      }),
  };
}
