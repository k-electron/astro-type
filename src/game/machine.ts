/**
 * The machine: the only authority on which screen shows and what phase the
 * Run is in (ADR-0001). It remembers the chain of screens that opened the
 * current one, so Close always goes back to the opener.
 *
 * It holds what its guards and transitions read, and nothing else: the screen,
 * the Run phase, the openers and the current screen's parameters. Everything a
 * move does to the Run's data is an effect action it declares here by name
 * (see `effects`) and the Game fills in with `provide`, so a move it refuses
 * changes nothing.
 */
import { assign, setup } from 'xstate';
import { getStageById, type Stage } from '../curriculum/curriculum';

/** The screens, named as in GLOSSARY.md. The machine decides which one shows. */
export type Screen =
  | 'academy-home'
  | 'flight-deck'
  | 'pause-menu'
  | 'galaxy-map'
  | 'hangar'
  | 'analytics'
  | 'free-flight'
  | 'debrief';

/** Where the Run is: none yet since load, or running, paused, cleared or abandoned. */
export type RunPhase = 'none' | 'running' | 'paused' | 'cleared' | 'abandoned';

/**
 * The parameter a screen is opened with, by screen. A screen that takes none
 * is not listed, and none does yet: the first one is an entry here, sent as
 * `params` on its `OPEN_*` event, and the screen reads it from the snapshot's
 * `screenParams`.
 */
export type ScreenParamMap = Record<never, never>;

/** What the current screen was opened with: null when it takes no parameter. */
export type ScreenParams = ScreenParamMap[keyof ScreenParamMap] | null;

/** The `params` field an `OPEN_*` event carries, for a screen that takes one. */
type ParamsField<S extends Screen> = S extends keyof ScreenParamMap
  ? { params: ScreenParamMap[S] }
  : unknown;

/** The header screens: each one opens from any screen, over the one showing. */
const OPEN_EVENTS = {
  OPEN_GALAXY_MAP: 'galaxy-map',
  OPEN_HANGAR: 'hangar',
  OPEN_ANALYTICS: 'analytics',
  OPEN_FREE_FLIGHT: 'free-flight',
} as const;

type OpenEvent = {
  [E in keyof typeof OPEN_EVENTS]: { type: E } & ParamsField<
    (typeof OPEN_EVENTS)[E]
  >;
}[keyof typeof OPEN_EVENTS];

/** What the player did. Never where to go. */
export type PlayerEvent =
  | OpenEvent
  | { type: 'PRESS_CLOSE' }
  | { type: 'PRESS_PAUSE' }
  | { type: 'PRESS_RESUME' }
  | { type: 'PRESS_ESC' }
  | { type: 'PRESS_PLAY' }
  /** The header's Flight Deck button: pauses a running Run, otherwise plays. */
  | { type: 'PRESS_FLIGHT_DECK' }
  | { type: 'PRESS_HOME' }
  | { type: 'PICK_STAGE'; stageId: string }
  /** The player's own text (already checked as typeable) at a Target Cadence. */
  | { type: 'LAUNCH_FREE_FLIGHT'; text: string; targetWpm: number }
  | { type: 'PRESS_REPLAY' }
  | { type: 'PRESS_NEXT_STAGE' }
  | { type: 'LOST_FOCUS' };

/** The one event the store reports itself: the last character was typed. */
export type GameMachineEvent = PlayerEvent | { type: 'RUN_CLEARED' };

/** A screen the player can return to with Close, and the parameter it had. */
export interface Opener {
  screen: Screen;
  params: ScreenParams;
}

export interface GameMachineContext {
  /** The screens that opened the current one, oldest first. Close pops the last. */
  openers: Opener[];
  phase: RunPhase;
  /** What the current screen was opened with. */
  screenParams: ScreenParams;
}

/**
 * An effect the machine names and the Game provides. Until it does, running
 * one fails loudly instead of quietly doing nothing.
 */
const unprovided =
  <Params = undefined>(name: string) =>
  (_args: unknown, _params: Params): void => {
    throw new Error(`The Game has not provided the machine's ${name}`);
  };

const unprovidedGuard = (name: string) => (): boolean => {
  throw new Error(`The Game has not provided the machine's ${name}`);
};

const isLive = (phase: RunPhase) => phase === 'running' || phase === 'paused';

const paramsOf = (event: GameMachineEvent): ScreenParams =>
  'params' in event ? (event.params as ScreenParams) : null;

const { createMachine } = setup({
  types: {
    context: {} as GameMachineContext,
    events: {} as GameMachineEvent,
  },
  guards: {
    isLive: ({ context }) => isLive(context.phase),
    isPaused: ({ context }) => context.phase === 'paused',
    knownStage: ({ event }) =>
      event.type === 'PICK_STAGE' && getStageById(event.stageId) !== undefined,
    /** The one named crossing: reads the Stage the Run is of (see the curriculum's `nextStageOf`). */
    hasNextStage: unprovidedGuard('hasNextStage'),
    openerIs: ({ context }, params: { screen: Screen }) =>
      context.openers[context.openers.length - 1]?.screen === params.screen,
  },
  actions: {
    // Accepted, and there is nothing to do.
    ignore: () => {},

    // ---- Effects: named here, provided by the Game ----
    /** Set up a fresh Run of `stage`, whatever Run was there. */
    beginRun: unprovided<{ stage: Stage }>('beginRun'),
    /** Set up a fresh Run of a Free Flight of `text` at `targetWpm`; the Game builds its Stage. */
    beginFreeFlight: unprovided<{
      text: string;
      targetWpm: number;
      stage?: Stage;
    }>('beginFreeFlight'),
    /** Set up a fresh Run of the Stage the last Run was of. */
    beginCurrentStage: unprovided('beginCurrentStage'),
    /** Set up a fresh Run of the Stage after the current one. */
    beginNextStage: unprovided('beginNextStage'),
    /** Drop the Run. */
    abandonRun: unprovided('abandonRun'),
    /** Score the cleared Run, award Stars and Credits, and save. */
    recordResult: unprovided('recordResult'),
    /** The key the player has down lifts, as the Run pauses. */
    releasePressedKey: unprovided('releasePressedKey'),

    // ---- Context ----
    markRunning: assign({
      phase: 'running' as RunPhase,
      openers: [],
      screenParams: null,
    }),
    markPaused: assign({ phase: 'paused' as RunPhase }),
    markAbandoned: assign({
      phase: 'abandoned' as RunPhase,
      openers: [],
      screenParams: null,
    }),
    markCleared: assign({
      phase: 'cleared' as RunPhase,
      openers: [],
      screenParams: null,
    }),
    clearOpeners: assign({ openers: [], screenParams: null }),
    /** Close: back to the opener, with the parameter it had. */
    popOpener: assign(({ context }) => ({
      openers: context.openers.slice(0, -1),
      screenParams: context.openers[context.openers.length - 1]?.params ?? null,
    })),
    /**
     * Open a screen over `screen`, which Close returns to. The screen being
     * opened takes the parameter the `OPEN_*` event carries.
     */
    pushOpener: assign(({ context, event }, params: { screen: Screen }) => ({
      openers: [
        ...context.openers,
        { screen: params.screen, params: context.screenParams },
      ],
      screenParams: paramsOf(event),
    })),
  },
});

type GuardName =
  | 'isLive'
  | 'isPaused'
  | 'knownStage'
  | 'hasNextStage'
  | { type: 'openerIs'; params: { screen: Screen } };

type ActionRef =
  | 'ignore'
  | 'beginCurrentStage'
  | 'beginNextStage'
  | 'abandonRun'
  | 'recordResult'
  | 'releasePressedKey'
  | 'markRunning'
  | 'markPaused'
  | 'markAbandoned'
  | 'markCleared'
  | 'clearOpeners'
  | 'popOpener'
  | { type: 'pushOpener'; params: { screen: Screen } }
  | { type: 'beginRun'; params: typeof stageToBegin }
  | { type: 'beginFreeFlight'; params: typeof freeFlightToBegin };

interface Move {
  target?: Screen;
  guard?: GuardName;
  actions: ActionRef[];
}

const SCREEN_OF_OPEN_EVENT: Record<string, Screen> = OPEN_EVENTS;
const MENUS = Object.values(OPEN_EVENTS);
const SCREENS: Screen[] = [
  'academy-home',
  'flight-deck',
  'pause-menu',
  'debrief',
  ...MENUS,
];

/** The Stage a picked Stage begins. */
const stageToBegin = ({
  event,
}: {
  event: GameMachineEvent;
}): { stage: Stage } => {
  if (event.type === 'PICK_STAGE') {
    const stage = getStageById(event.stageId);
    if (stage) return { stage };
  }
  throw new Error(`${event.type} has no Stage to begin`);
};

/** What a Free Flight launch carries, for the Game to build the Stage from. */
const freeFlightToBegin = ({
  event,
}: {
  event: GameMachineEvent;
}): { text: string; targetWpm: number } => {
  if (event.type !== 'LAUNCH_FREE_FLIGHT') {
    throw new Error(`${event.type} is no Free Flight launch`);
  }
  return { text: event.text, targetWpm: event.targetWpm };
};

const ignore: Move = { actions: ['ignore'] };

/** Close: back to whatever opened this screen. */
const close: Move[] = SCREENS.map((opener) => ({
  target: opener,
  guard: { type: 'openerIs', params: { screen: opener } },
  actions: ['popOpener'],
}));

/**
 * Open a header screen from `from`. Leaving the Flight Deck pauses the Run,
 * and the Pause Menu is what Close returns to.
 */
const open = (from: Screen, to: Screen): Move => {
  // Pressing the button for the screen already showing does nothing, so one
  // Close always gets back.
  if (from === to) return ignore;
  if (from === 'flight-deck') {
    return {
      target: to,
      actions: [
        'releasePressedKey',
        'markPaused',
        { type: 'pushOpener', params: { screen: 'pause-menu' } },
      ],
    };
  }
  return {
    target: to,
    actions: [{ type: 'pushOpener', params: { screen: from } }],
  };
};

const pause: Move = {
  target: 'pause-menu',
  actions: ['releasePressedKey', 'markPaused'],
};
const resume: Move = { target: 'flight-deck', actions: ['markRunning'] };

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
  for (const [event, to] of Object.entries(SCREEN_OF_OPEN_EVENT)) {
    headers[event] = [open(from, to)];
  }
  return {
    ...headers,
    PRESS_HOME: home,
    PICK_STAGE: [
      {
        target: 'flight-deck',
        guard: 'knownStage',
        actions: [
          {
            type: 'beginRun',
            params: stageToBegin,
          },
          'markRunning',
        ],
      },
    ] as Move[],
    LAUNCH_FREE_FLIGHT: [
      {
        target: 'flight-deck',
        actions: [
          {
            type: 'beginFreeFlight',
            params: freeFlightToBegin,
          },
          'markRunning',
        ],
      },
    ] as Move[],
  };
};

/** Play: resume a paused Run straight away, otherwise start the current Stage fresh. */
const play: Move[] = [
  { target: 'flight-deck', guard: 'isPaused', actions: ['markRunning'] },
  { target: 'flight-deck', actions: ['beginCurrentStage', 'markRunning'] },
];
const replay: Move[] = [
  { target: 'flight-deck', actions: ['beginCurrentStage', 'markRunning'] },
];
const resumeWhenPaused: Move[] = [{ ...resume, guard: 'isPaused' }];

const menuState = (from: (typeof MENUS)[number]) => ({
  on: {
    ...everywhere(from),
    PRESS_CLOSE: close,
    PRESS_ESC: close,
    PRESS_PLAY: play,
    PRESS_FLIGHT_DECK: play,
    PRESS_RESUME: resumeWhenPaused,
    LOST_FOCUS: [ignore],
  },
});

/** The Run's last character was typed: score it and show the Debrief. */
const runCleared: Move[] = [
  { target: 'debrief', actions: ['recordResult', 'markCleared'] },
];

const nextStage: Move[] = [
  {
    target: 'flight-deck',
    guard: 'hasNextStage',
    actions: ['beginNextStage', 'markRunning'],
  },
  // No next Stage (the last Stage, or a Free Flight, which has none): Next
  // Stage opens the Galaxy Map from the Debrief.
  {
    target: 'galaxy-map',
    actions: [{ type: 'pushOpener', params: { screen: 'debrief' } }],
  },
];

const menuStates = Object.fromEntries(
  MENUS.map((menu) => [menu, menuState(menu)]),
) as Record<(typeof MENUS)[number], ReturnType<typeof menuState>>;

const states = {
  'academy-home': {
    on: {
      ...everywhere('academy-home'),
      PRESS_PLAY: play,
      PRESS_FLIGHT_DECK: play,
      PRESS_ESC: [ignore],
      LOST_FOCUS: [ignore],
    },
  },
  'flight-deck': {
    on: {
      ...everywhere('flight-deck'),
      PRESS_PAUSE: [pause],
      PRESS_FLIGHT_DECK: [pause],
      PRESS_ESC: [pause],
      LOST_FOCUS: [pause],
      PRESS_PLAY: [ignore],
      RUN_CLEARED: runCleared,
    },
  },
  'pause-menu': {
    on: {
      ...everywhere('pause-menu'),
      PRESS_RESUME: [resume],
      PRESS_ESC: [resume],
      PRESS_PLAY: play,
      PRESS_FLIGHT_DECK: play,
      PRESS_REPLAY: replay,
      LOST_FOCUS: [ignore],
    },
  },
  ...menuStates,
  debrief: {
    on: {
      ...everywhere('debrief'),
      PRESS_PLAY: play,
      PRESS_FLIGHT_DECK: play,
      PRESS_REPLAY: replay,
      PRESS_NEXT_STAGE: nextStage,
      PRESS_ESC: [ignore],
      LOST_FOCUS: [ignore],
    },
  },
} satisfies Record<Screen, unknown>;

export const gameMachine = createMachine({
  id: 'astrotypeGame',
  initial: 'academy-home',
  context: { openers: [], phase: 'none' as RunPhase, screenParams: null },
  states,
});

export type GameMachine = typeof gameMachine;
