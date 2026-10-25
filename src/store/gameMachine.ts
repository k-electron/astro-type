/**
 * The machine: the only authority on which screen shows and what phase the
 * Run is in (ADR-0001). It remembers the chain of screens that opened the
 * current one, so Close always goes back to the opener.
 *
 * It changes data only through the named store actions in `RunActions`, and
 * every side effect of a move (the beat, Overdrive off, setting up or
 * abandoning a Run, scoring and saving on a clear) runs inside those actions
 * when the machine accepts the move. A move it refuses changes nothing.
 */
import { assign, setup } from 'xstate';
import { getNextStage, getStageById } from '../data/curriculum';
import type { PlayerProfile, RunPhase, Screen, Stage } from '../types/game';

type HighwaySpeed = PlayerProfile['highwaySpeed'];

/** What the player did. Never where to go. */
export type PlayerEvent =
  | { type: 'PRESS_CLOSE' }
  | { type: 'PRESS_PAUSE' }
  | { type: 'PRESS_RESUME' }
  | { type: 'PRESS_ESC' }
  | { type: 'PRESS_PLAY' }
  | { type: 'PRESS_HOME' }
  | { type: 'OPEN_GALAXY_MAP' }
  | { type: 'OPEN_HANGAR' }
  | { type: 'OPEN_ANALYTICS' }
  | { type: 'OPEN_FREE_FLIGHT' }
  | { type: 'PICK_STAGE'; stageId: string }
  | { type: 'LAUNCH_FREE_FLIGHT'; stage: Stage; speed?: HighwaySpeed }
  | { type: 'PRESS_REPLAY' }
  | { type: 'PRESS_NEXT_STAGE' }
  | { type: 'LOST_FOCUS' };

/** The one event the store reports itself: the last character was typed. */
export type GameMachineEvent = PlayerEvent | { type: 'RUN_CLEARED' };

/** The named store actions the machine drives. Each one is a whole move's data and effects. */
export interface RunActions {
  /** Set up a fresh Run of a Stage (and start the beat). */
  beginRun(stage: Stage, speed?: HighwaySpeed): void;
  /** Stop the beat and Overdrive soundtrack. Streak, Multiplier and Overdrive stay as they were. */
  pauseRun(): void;
  /** Start the beat again. */
  resumeRun(): void;
  /** Drop the Run: stop the beat and Overdrive soundtrack. */
  abandonRun(): void;
  /** Score the cleared Run, award Stars and Credits, save, and play the victory sounds. */
  recordResult(): void;
  /** The Stage the Run (or the last Run) is of. */
  currentStage(): Stage;
}

export interface GameMachineContext {
  /** The screens that opened the current one, oldest first. Close pops the last. */
  openers: Screen[];
  phase: RunPhase;
}

const MENUS = ['galaxy-map', 'hangar', 'analytics', 'free-flight'] as const;
const SCREENS: Screen[] = [
  'academy-home',
  'flight-deck',
  'pause-menu',
  'galaxy-map',
  'hangar',
  'analytics',
  'free-flight',
  'debrief',
];

const OPEN_EVENTS = {
  OPEN_GALAXY_MAP: 'galaxy-map',
  OPEN_HANGAR: 'hangar',
  OPEN_ANALYTICS: 'analytics',
  OPEN_FREE_FLIGHT: 'free-flight',
} as const;

const isLive = (phase: RunPhase) => phase === 'running' || phase === 'paused';

export function createGameMachine(run: RunActions) {
  const { createMachine } = setup({
    types: {
      context: {} as GameMachineContext,
      events: {} as GameMachineEvent,
    },
    guards: {
      isLive: ({ context }) => isLive(context.phase),
      isPaused: ({ context }) => context.phase === 'paused',
      knownStage: ({ event }) =>
        event.type === 'PICK_STAGE' &&
        getStageById(event.stageId) !== undefined,
      hasNextStage: () => getNextStage(run.currentStage().id) !== undefined,
      openerIs: ({ context }, params: { screen: Screen }) =>
        context.openers[context.openers.length - 1] === params.screen,
    },
    actions: {
      // Accepted, and there is nothing to do.
      ignore: () => {},

      // ---- Run moves (the store does the data and the sound) ----
      startPickedStage: ({ context, event }) => {
        if (event.type !== 'PICK_STAGE') return;
        const stage = getStageById(event.stageId);
        if (!stage) return;
        if (isLive(context.phase)) run.abandonRun();
        run.beginRun(stage);
      },
      startFreeFlight: ({ context, event }) => {
        if (event.type !== 'LAUNCH_FREE_FLIGHT') return;
        if (isLive(context.phase)) run.abandonRun();
        run.beginRun(event.stage, event.speed);
      },
      startCurrentStage: ({ context }) => {
        if (isLive(context.phase)) run.abandonRun();
        run.beginRun(run.currentStage());
      },
      startNextStage: ({ context }) => {
        const next = getNextStage(run.currentStage().id);
        if (!next) return;
        if (isLive(context.phase)) run.abandonRun();
        run.beginRun(next);
      },
      pauseRun: () => run.pauseRun(),
      resumeRun: () => run.resumeRun(),
      abandonRun: () => run.abandonRun(),
      recordResult: () => run.recordResult(),

      // ---- Context ----
      markRunning: assign({ phase: 'running' as RunPhase, openers: [] }),
      markPaused: assign({ phase: 'paused' as RunPhase }),
      markAbandoned: assign({ phase: 'abandoned' as RunPhase, openers: [] }),
      markCleared: assign({ phase: 'cleared' as RunPhase, openers: [] }),
      clearOpeners: assign({ openers: [] }),
      popOpener: assign({
        openers: ({ context }) => context.openers.slice(0, -1),
      }),
      pushAcademyHome: assign({
        openers: ({ context }) => [
          ...context.openers,
          'academy-home' as Screen,
        ],
      }),
      pushPauseMenu: assign({
        openers: ({ context }) => [...context.openers, 'pause-menu' as Screen],
      }),
      pushGalaxyMap: assign({
        openers: ({ context }) => [...context.openers, 'galaxy-map' as Screen],
      }),
      pushHangar: assign({
        openers: ({ context }) => [...context.openers, 'hangar' as Screen],
      }),
      pushAnalytics: assign({
        openers: ({ context }) => [...context.openers, 'analytics' as Screen],
      }),
      pushFreeFlight: assign({
        openers: ({ context }) => [...context.openers, 'free-flight' as Screen],
      }),
      pushDebrief: assign({
        openers: ({ context }) => [...context.openers, 'debrief' as Screen],
      }),
    },
  });

  type ActionName =
    | 'ignore'
    | 'startPickedStage'
    | 'startFreeFlight'
    | 'startCurrentStage'
    | 'startNextStage'
    | 'pauseRun'
    | 'resumeRun'
    | 'abandonRun'
    | 'recordResult'
    | 'markRunning'
    | 'markPaused'
    | 'markAbandoned'
    | 'markCleared'
    | 'clearOpeners'
    | 'popOpener'
    | 'pushAcademyHome'
    | 'pushPauseMenu'
    | 'pushGalaxyMap'
    | 'pushHangar'
    | 'pushAnalytics'
    | 'pushFreeFlight'
    | 'pushDebrief';

  type GuardName =
    | 'isLive'
    | 'isPaused'
    | 'knownStage'
    | 'hasNextStage'
    | { type: 'openerIs'; params: { screen: Screen } };

  interface Move {
    target?: Screen;
    guard?: GuardName;
    actions: ActionName[];
  }

  const PUSH_SELF: Record<Screen, ActionName | null> = {
    'academy-home': 'pushAcademyHome',
    'flight-deck': null,
    'pause-menu': 'pushPauseMenu',
    'galaxy-map': 'pushGalaxyMap',
    hangar: 'pushHangar',
    analytics: 'pushAnalytics',
    'free-flight': 'pushFreeFlight',
    debrief: 'pushDebrief',
  };

  /** Close: back to whatever opened this screen. */
  const close: Move[] = SCREENS.map((opener) => ({
    target: opener,
    guard: { type: 'openerIs', params: { screen: opener } },
    actions: ['popOpener'],
  }));

  /** Open a header screen from `from`. Leaving the Flight Deck pauses the Run. */
  const open = (from: Screen, to: Screen): Move => {
    // Pressing the button for the screen already showing does nothing, so
    // one Close always gets back.
    if (from === to) return ignore;
    if (from === 'flight-deck') {
      return {
        target: to,
        actions: ['pauseRun', 'markPaused', 'pushPauseMenu'],
      };
    }
    return { target: to, actions: [PUSH_SELF[from] as ActionName] };
  };

  const pause: Move = {
    target: 'pause-menu',
    actions: ['pauseRun', 'markPaused'],
  };
  const resume: Move = {
    target: 'flight-deck',
    actions: ['resumeRun', 'markRunning'],
  };
  const ignore: Move = { actions: ['ignore'] };

  /** Home abandons a Run that is running or paused; a cleared Run is already over. */
  const home: Move[] = [
    {
      target: 'academy-home',
      guard: 'isLive',
      actions: ['abandonRun', 'markAbandoned'],
    },
    { target: 'academy-home', actions: ['clearOpeners'] },
  ];

  /** What the events every screen accepts do, from `from`. */
  const everywhere = (from: Screen) => {
    const headers: Record<string, Move[]> = {};
    for (const [event, to] of Object.entries(OPEN_EVENTS)) {
      headers[event] = [open(from, to)];
    }
    return {
      ...headers,
      PRESS_HOME: home,
      PICK_STAGE: [
        {
          target: 'flight-deck',
          guard: 'knownStage',
          actions: ['startPickedStage', 'markRunning'],
        },
      ] as Move[],
      LAUNCH_FREE_FLIGHT: [
        {
          target: 'flight-deck',
          actions: ['startFreeFlight', 'markRunning'],
        },
      ] as Move[],
    };
  };

  /** Play: resume a paused Run straight away, otherwise start the current Stage fresh. */
  const play: Move[] = [
    {
      target: 'flight-deck',
      guard: 'isPaused',
      actions: ['resumeRun', 'markRunning'],
    },
    {
      target: 'flight-deck',
      actions: ['startCurrentStage', 'markRunning'],
    },
  ];
  const replay: Move[] = [
    { target: 'flight-deck', actions: ['startCurrentStage', 'markRunning'] },
  ];
  const resumeWhenPaused: Move[] = [{ ...resume, guard: 'isPaused' }];

  const menuState = (from: (typeof MENUS)[number]) => ({
    on: {
      ...everywhere(from),
      PRESS_CLOSE: close,
      PRESS_ESC: close,
      PRESS_PLAY: play,
      PRESS_RESUME: resumeWhenPaused,
      LOST_FOCUS: [ignore],
    },
  });

  return createMachine({
    id: 'astrotypeGame',
    initial: 'academy-home',
    context: { openers: [], phase: 'none' as RunPhase },
    states: {
      'academy-home': {
        on: {
          ...everywhere('academy-home'),
          PRESS_PLAY: play,
          PRESS_ESC: [ignore],
          LOST_FOCUS: [ignore],
        },
      },
      'flight-deck': {
        on: {
          ...everywhere('flight-deck'),
          PRESS_PAUSE: [pause],
          PRESS_ESC: [pause],
          LOST_FOCUS: [pause],
          PRESS_PLAY: [ignore],
          RUN_CLEARED: [
            {
              target: 'debrief',
              actions: ['recordResult', 'markCleared'],
            },
          ],
        },
      },
      'pause-menu': {
        on: {
          ...everywhere('pause-menu'),
          PRESS_RESUME: [resume],
          PRESS_ESC: [resume],
          PRESS_PLAY: play,
          PRESS_REPLAY: replay,
          LOST_FOCUS: [ignore],
        },
      },
      'galaxy-map': menuState('galaxy-map'),
      hangar: menuState('hangar'),
      analytics: menuState('analytics'),
      'free-flight': menuState('free-flight'),
      debrief: {
        on: {
          ...everywhere('debrief'),
          PRESS_PLAY: play,
          PRESS_REPLAY: replay,
          PRESS_NEXT_STAGE: [
            {
              target: 'flight-deck',
              guard: 'hasNextStage',
              actions: ['startNextStage', 'markRunning'],
            },
            // Next Stage on the last Stage opens the Galaxy Map from the Debrief.
            { target: 'galaxy-map', actions: ['pushDebrief'] },
          ],
          PRESS_ESC: [ignore],
          LOST_FOCUS: [ignore],
        },
      },
    },
  });
}

export type GameMachine = ReturnType<typeof createGameMachine>;
