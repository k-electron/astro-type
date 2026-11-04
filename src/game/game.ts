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
} from '../curriculum/curriculum';
import {
  type GameMachineEvent,
  gameMachine,
  type PlayerEvent,
  type RunPhase,
  type Screen,
} from './machine';
import { type Clock, createRunClock, createSteppedClock } from './clock';
import type { KeyOptions, Run } from './rules';
import type { Moment } from './moments';
import {
  cueFor,
  type Sound,
  sameSound,
  silentSound,
  soundStateOf,
} from './sound';
import { createProfileSlice, loadoutOf, type ProfileSlice } from './profile';
import { createRunSlice, type RunSlice, type DebriefResult } from './run';
import type { CatalogItemId } from './catalog';
import type { BackupImport, SaveStorage } from './save';
import { type PlayerProfile, type Settings, totalStarsOf } from './schemas';

export type { Sound } from './sound';
export type { Judgement, Run } from './rules';
export type { Moment } from './moments';
export type { PlayerEvent, Screen } from './machine';

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

/**
 * The Profile as a screen reads it: the Save's fields, and the total of Stars
 * worked out from the Stages' Stars. The total is derived whenever the
 * Profile changes, and is never saved.
 */
export type GameProfile = PlayerProfile & { totalStars: number };

/**
 * Everything a screen shows, settled: the machine and the store have both
 * finished the move that made it. It is replaced, never changed in place, and
 * only when one of its fields changed; `run` is the store's own Run, a different object only when the Run changed.
 */
export interface GameState {
  screen: Screen;
  phase: RunPhase;
  /** The screen that opened this one (what Close returns to), or null when nothing did. */
  opener: Screen | null;
  /**
   * What follows the Run's Stage: another Stage for Next Stage to start, a
   * Stage in a Sector still locked or none at all (the last Stage), where the
   * Debrief offers the Galaxy Map instead and no event starts a Stage, or a
   * Free Flight (there is no Next Stage).
   */
  stageAhead: StageAhead;
  run: Run;
  debrief: DebriefResult | null;
  profile: GameProfile;
  /** Why the Save was set aside and the player started fresh, or null. It shows until dismissed. */
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
   * Hear what just happened: a new Run launching, each Judgement (a hit names
   * its Drone, lane and finger), Overdrive catching fire, the Stage clear and
   * a purchase. A moment is heard once the move that made it has settled, so
   * `getState()` already shows its effects (on a launch, the new Run; on a
   * clear, the Debrief). Returns the way to stop listening.
   */
  onMoment(listener: (moment: Moment) => void): () => void;
  /**
   * Advance the Run clock by `count` steps of 1/60 s. Does nothing unless the
   * Run phase is running: Run Time, the Drones and the live WPM stand still.
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
   * the Profile unchanged, when the Upgrade is at its last level, the
   * Cosmetic is the one already equipped, or the Credits fall short.
   */
  buy(itemId: CatalogItemId): boolean;
  /** Replace the Profile with a Backup's, if it passes the Save's checks. */
  importBackup(text: string): BackupImport;
  /** Wipe Stars and Stage progress; Credits and Upgrades stay. */
  wipeAchievements(): void;
  /** Back to a fresh Profile. */
  resetProgress(): void;
  /** Dismiss Academy Home's notice that the Save was moved aside; it stays gone after a reload. */
  dismissLoadNotice(): void;
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
  const totalStarsNow = () =>
    totalStarsOf(store.getState().profile.stagesProgress);

  const machine = gameMachine.provide({
    actions: {
      beginRun: (_, { stage }) => store.getState().beginRun(stage),
      beginFreeFlight: (_, { text, targetWpm }) =>
        store.getState().beginRun(freeFlightStage(text, targetWpm)),
      beginCurrentStage: () =>
        store.getState().beginRun(store.getState().run.stage),
      beginNextStage: () => {
        const next = nextStageOf(store.getState().run.stage, totalStarsNow());
        if (next) store.getState().beginRun(next);
      },
      abandonRun: () => store.getState().abandonRun(),
      recordResult: () => store.getState().recordResult(),
      releasePressedKey: () => store.getState().releaseKey(),
    },
    guards: {
      hasNextStage: () =>
        nextStageOf(store.getState().run.stage, totalStarsNow()) !== undefined,
    },
  });
  const actor = createActor(machine);

  const getPhase = (): RunPhase => actor.getSnapshot().context.phase;
  const getScreen = (): Screen => actor.getSnapshot().value as Screen;

  // Moments are queued as the store makes them and heard when the move has
  // settled (see `heardAfter`): sound plays their cues first, then everyone
  // else hears them. The continuous sound (the beat, its Overdrive layer,
  // mute, volumes, beat theme, Sound Kit) is not played from moments: it is derived
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
      { storage: options.storage, clock, emit },
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
    return openers[openers.length - 1] ?? null;
  };

  // The settled snapshot. A move can touch the machine and the store several
  // times (a clear starts in the store, goes through the machine, and ends in
  // the store again), so every move runs inside `move`: the snapshot is only
  // built when the outermost move ends, and listeners hear it once.
  const listeners = new Set<() => void>();
  let depth = 0;
  let hearing = false;

  // The Profile with its total of Stars, rebuilt only when the store's Profile
  // is a different object, so the snapshot stays the same while it is.
  let profileFrom: PlayerProfile | null = null;
  let profileView: GameProfile | null = null;
  const viewOf = (profile: PlayerProfile): GameProfile => {
    if (profileView && profileFrom === profile) return profileView;
    profileFrom = profile;
    profileView = {
      ...profile,
      totalStars: totalStarsOf(profile.stagesProgress),
    };
    return profileView;
  };

  const snapshotNow = (previous: GameState | null): GameState => {
    const state = store.getState();
    const profile = viewOf(state.profile);
    const next: GameState = {
      screen: getScreen(),
      phase: getPhase(),
      opener: getOpener(),
      stageAhead: stageAheadOf(state.run.stage, profile.totalStars),
      run: state.run,
      debrief: state.debrief,
      profile,
      loadNotice: state.loadNotice,
      runTime: runClock.runTimeMs(),
    };
    // Unchanged when every field is the very object it was: the snapshot is
    // then the same one, and nobody is told.
    const unchanged =
      previous !== null &&
      (Object.keys(next) as (keyof GameState)[]).every(
        (field) => next[field] === previous[field],
      );
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
    dismissLoadNotice: () => move(() => actions().dismissLoadNotice()),
    resetProgress: () =>
      move(() => {
        actions().resetProgress();
        backToFirstStageUnlessRun();
      }),
  };
}
