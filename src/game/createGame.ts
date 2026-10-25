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
import {
  gameMachine,
  mapGameStateToMachineEvent,
  mapMachineStateToGameState,
  type GameMachineEvent,
} from '../store/gameMachine';
import type {
  FallingNote,
  GameState,
  LivePerformance,
  PlayerProfile,
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
}

/** The live Run: the performance numbers, plus the Drones and the Stage. */
export type Run = LivePerformance & {
  /** Today's falling notes. The lead Drone is first; the Strike Line is y=84. */
  drones: FallingNote[];
  currentStage: Stage;
};

export interface Game {
  /** Begin a Run of a Stage (or a curriculum Stage id), at an optional speed. */
  startStage(stageOrId: Stage | string, speed?: HighwaySpeed): void;
  /**
   * Send a player event, as the app does today: navigation events run the
   * store's side effects first. The machine drops what it doesn't accept.
   */
  send(event: GameMachineEvent): void;
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
  getScreen(): GameState;
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

const NAVIGATION_TARGETS: GameState[] = [
  'MENU',
  'PLAYING',
  'PAUSED',
  'STAGE_SELECT',
  'HANGAR',
  'ANALYTICS',
  'CUSTOM_PRACTICE',
  'VICTORY',
];

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

  const actor = createActor(gameMachine);
  actor.start();

  const judgementListeners = new Set<(judgement: Judgement) => void>();
  const store = createGameStore({
    actor,
    storage: options.storage,
    clock,
    effects,
    onJudgement(judgement) {
      // Sound answers the Judgement first, once, then everyone else hears it.
      soundFor(judgement, effects);
      for (const listener of [...judgementListeners]) listener(judgement);
    },
  });

  const getScreen = () =>
    mapMachineStateToGameState(String(actor.getSnapshot().value));

  // The telemetry timer starts afresh each time the Flight Deck opens.
  let telemetrySteps = 0;
  let lastScreen = getScreen();
  actor.subscribe(() => {
    const screen = getScreen();
    if (screen !== lastScreen) {
      lastScreen = screen;
      telemetrySteps = 0;
    }
  });

  return {
    startStage(stageOrId, speed) {
      const stage =
        typeof stageOrId === 'string' ? getStageById(stageOrId) : stageOrId;
      if (!stage) throw new Error(`Unknown Stage: ${stageOrId}`);
      store.getState().startStage(stage, speed);
    },
    send(event) {
      // Today the app never sends these events to the machine itself: it goes
      // through setGameState, which runs the store's side effects (beat stop,
      // Streak reset, Run reset on Home) and then sends the machine its event.
      // Do the same, so a caller sees what a player sees. The machine rewrite
      // (#19) replaces this.
      const target = NAVIGATION_TARGETS.find(
        (screen) => mapGameStateToMachineEvent(screen).type === event.type,
      );
      if (target) {
        store.getState().setGameState(target);
      } else {
        actor.send(event);
      }
    },
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
        if (getScreen() !== 'PLAYING') continue;
        store.getState().updateFallingNotesOnTick();
        telemetrySteps += 1;
        if (telemetrySteps % TELEMETRY_EVERY_STEPS === 0) {
          store.getState().updateTelemetryOnInterval();
        }
      }
    },
    getScreen,
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
