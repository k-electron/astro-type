/**
 * One game, built fresh: the machine, the store, the clock and Save storage.
 * The app builds one at startup and each test builds its own.
 *
 * Nothing in this module's imports touches React, PixiJS, the DOM, browser
 * storage or the sound engine. Sound is attached from outside as `effects`.
 */
import { createActor } from 'xstate';
import type { StoreApi } from 'zustand/vanilla';
import { getStageById } from '../data/curriculum';
import { createGameMachine, type PlayerEvent } from '../store/gameMachine';
import type {
  FallingNote,
  LivePerformance,
  PlayerProfile,
  RunPhase,
  Screen,
  Stage,
} from '../types/game';
import { type Clock, createSteppedClock } from './clock';
import { getNoteLaneAndFinger } from '../data/curriculum';
import { type GameEffects, silentEffects } from './effects';
import type { Judgement } from './rules';
import {
  createGameStore,
  type GameStoreState,
  type UpgradeKind,
  type VictoryResult,
} from './gameStore';
import type { SaveStorage } from './save';

export { createMemoryStorage } from './save';
export type { MemorySaveStorage, SaveStorage } from './save';
export type { Clock } from './clock';
export type { GameEffects } from './effects';
export type { Judgement } from './rules';
export type { GameStoreState, UpgradeKind, VictoryResult } from './gameStore';
export type { PlayerEvent } from '../store/gameMachine';
export type { RunPhase, Screen } from '../types/game';

/** The machine refused a move: the player event doesn't apply on this screen. A bug in whoever sent it. */
export class RefusedMoveError extends Error {
  constructor(
    readonly event: PlayerEvent,
    readonly screen: Screen,
    readonly phase: RunPhase,
  ) {
    super(
      `Refused move: ${event.type} on the ${screen} screen (Run phase: ${phase})`,
    );
    this.name = 'RefusedMoveError';
  }
}

type HighwaySpeed = PlayerProfile['highwaySpeed'];

export interface GameOptions {
  /** Where the Save lives. Memory in tests, localStorage in the app. */
  storage: SaveStorage;
  /** Sound and other outside effects. Absent means silent. */
  effects?: Partial<GameEffects>;
  /**
   * The Run clock. Defaults to a clock that only moves when `step` is called.
   * The app passes a real-time one and drives `step` from a timer.
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
};

export interface Game {
  /** Begin a Run of a Stage (or a curriculum Stage id), at an optional speed. Sends PICK_STAGE or LAUNCH_FREE_FLIGHT. */
  startStage(stageOrId: Stage | string, speed?: HighwaySpeed): void;
  /** Send what the player did. A refused move changes nothing and goes to `onRefusedMove`. */
  send(event: PlayerEvent): void;
  /** Would the machine accept this event now? */
  canSend(event: PlayerEvent): boolean;
  /**
   * Press a key, as a keydown does; `key` is a `KeyboardEvent.key` value.
   * Only a key that types one character is judged. Everything else (Escape,
   * Backspace, Enter, arrows, function keys, Tab, modifiers) and every
   * auto-repeat keydown (`repeat: true`) is ignored and changes nothing.
   */
  pressKey(key: string, options?: { repeat?: boolean }): void;
  /**
   * Hear each Judgement as it happens: exactly one per keystroke that counts.
   * Returns the way to stop listening.
   */
  onJudgement(listener: (judgement: Judgement) => void): () => void;
  /** Advance the Run clock by `count` steps of 1/60 s. */
  step(count?: number): void;
  getScreen(): Screen;
  getPhase(): RunPhase;
  /** The screen that opened this one (what Close returns to), or null when nothing did. */
  getOpener(): Screen | null;
  /** Call `listener` after every move. Returns the unsubscribe function. */
  subscribe(listener: () => void): () => void;
  getRun(): Run;
  getDebrief(): VictoryResult | null;
  getProfile(): PlayerProfile;
  /**
   * Buy the next level of an Upgrade at its catalog cost. False, with the
   * Credits unchanged, when the Upgrade is at level 3 or the Credits fall short.
   */
  buyUpgrade(kind: UpgradeKind): boolean;
  /** Why the Save was set aside and the player started fresh, or null. */
  getLoadNotice(): string | null;
  /** The vanilla store, for the app's React hook. */
  readonly store: StoreApi<GameStoreState>;
}

/** The telemetry tick: every 30 steps, which is 500 ms at 60 steps a second. */
const TELEMETRY_EVERY_STEPS = 30;

/** Each Judgement plays exactly one sound. */
function soundFor(judgement: Judgement, effects: GameEffects): void {
  if (judgement.type === 'hit') {
    effects.playLaneHit(
      getNoteLaneAndFinger(judgement.key).lane,
      judgement.grade === 'perfect'
        ? 'PERFECT'
        : judgement.grade === 'great'
          ? 'GREAT'
          : 'GOOD',
      judgement.key === ' ',
    );
  } else if (judgement.type === 'shield') {
    effects.playShieldAbsorb();
  } else {
    effects.playMiss();
  }
}

export function createGame(options: GameOptions): Game {
  const clock = options.clock ?? createSteppedClock();
  const effects: GameEffects = { ...silentEffects, ...options.effects };
  const onRefusedMove =
    options.onRefusedMove ??
    ((error: RefusedMoveError) => {
      throw error;
    });

  // The machine drives the store's named Run actions; the store reads the
  // phase and reports "Run cleared". They meet here.
  const machine = createGameMachine({
    beginRun: (stage, speed) => store.getState().beginRun(stage, speed),
    pauseRun: () => store.getState().pauseRun(),
    resumeRun: () => store.getState().resumeRun(),
    abandonRun: () => store.getState().abandonRun(),
    recordResult: () => store.getState().recordResult(),
    currentStage: () => store.getState().currentStage,
  });
  const actor = createActor(machine);

  const getPhase = (): RunPhase => actor.getSnapshot().context.phase;
  const getScreen = (): Screen => actor.getSnapshot().value as Screen;

  const judgementListeners = new Set<(judgement: Judgement) => void>();
  const store = createGameStore({
    getPhase,
    reportRunCleared: () => actor.send({ type: 'RUN_CLEARED' }),
    storage: options.storage,
    clock,
    effects,
    onJudgement(judgement) {
      // Sound answers the Judgement first, once, then everyone else hears it.
      soundFor(judgement, effects);
      for (const listener of [...judgementListeners]) listener(judgement);
    },
  });

  // The telemetry timer starts afresh each time the Run starts running.
  let telemetrySteps = 0;
  let lastPhase = getPhase();
  actor.subscribe(() => {
    const phase = getPhase();
    if (phase !== lastPhase) {
      lastPhase = phase;
      telemetrySteps = 0;
    }
  });
  actor.start();

  const canSend = (event: PlayerEvent) => actor.getSnapshot().can(event);

  const send = (event: PlayerEvent) => {
    if (!canSend(event)) {
      onRefusedMove(new RefusedMoveError(event, getScreen(), getPhase()));
      return;
    }
    actor.send(event);
  };

  return {
    startStage(stageOrId, speed) {
      if (typeof stageOrId !== 'string') {
        send({ type: 'LAUNCH_FREE_FLIGHT', stage: stageOrId, speed });
        return;
      }
      const stage = getStageById(stageOrId);
      if (!stage) throw new Error(`Unknown Stage: ${stageOrId}`);
      if (speed) send({ type: 'LAUNCH_FREE_FLIGHT', stage, speed });
      else send({ type: 'PICK_STAGE', stageId: stageOrId });
    },
    send,
    canSend,
    pressKey(key, pressOptions) {
      store.getState().processKeystroke(key, pressOptions);
    },
    onJudgement(listener) {
      judgementListeners.add(listener);
      return () => {
        judgementListeners.delete(listener);
      };
    },
    step(count = 1) {
      for (let i = 0; i < count; i++) {
        clock.step(1);
        if (getPhase() !== 'running') continue;
        store.getState().updateFallingNotesOnTick();
        telemetrySteps += 1;
        if (telemetrySteps % TELEMETRY_EVERY_STEPS === 0) {
          store.getState().updateTelemetryOnInterval();
        }
      }
    },
    getScreen,
    getPhase,
    getOpener() {
      const { openers } = actor.getSnapshot().context;
      return openers[openers.length - 1] ?? null;
    },
    subscribe(listener) {
      const subscription = actor.subscribe(listener);
      return () => subscription.unsubscribe();
    },
    getRun() {
      const state = store.getState();
      return {
        ...state.performance,
        drones: state.fallingNotes,
        currentStage: state.currentStage,
      };
    },
    getDebrief: () => store.getState().victoryResult,
    getProfile: () => store.getState().profile,
    buyUpgrade: (kind) => store.getState().buyUpgrade(kind),
    getLoadNotice: () => store.getState().loadNotice,
    store,
  };
}
