import { setup } from 'xstate';
import { GameState } from '../types/game';

export interface GameMachineContext {
  stageId: string | null;
  stageStartTime: number | null;
}

export type GameMachineEvent =
  | { type: 'START'; stageId?: string }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'STAGE_CLEAR' }
  | { type: 'SELECT_STAGE' }
  | { type: 'OPEN_HANGAR' }
  | { type: 'OPEN_ANALYTICS' }
  | { type: 'OPEN_CUSTOM' }
  | { type: 'RETURN_MENU' }
  | { type: 'CLOSE_MODAL' };

export const gameMachine = setup({
  types: {
    context: {} as GameMachineContext,
    events: {} as GameMachineEvent,
  },
}).createMachine({
  id: 'astrotypeGame',
  initial: 'menu',
  context: {
    stageId: null,
    stageStartTime: null,
  },
  states: {
    menu: {
      on: {
        START: {
          target: 'playing',
          actions: ({ event }) => {
            // Context update can happen if needed
          },
        },
        SELECT_STAGE: 'stage_select',
        OPEN_HANGAR: 'hangar',
        OPEN_ANALYTICS: 'analytics',
        OPEN_CUSTOM: 'custom_practice',
      },
    },
    playing: {
      on: {
        PAUSE: 'paused',
        STAGE_CLEAR: 'victory',
        SELECT_STAGE: 'stage_select',
        OPEN_HANGAR: 'hangar',
        OPEN_ANALYTICS: 'analytics',
        OPEN_CUSTOM: 'custom_practice',
        RETURN_MENU: 'menu',
      },
    },
    paused: {
      on: {
        RESUME: 'playing',
        START: 'playing',
        SELECT_STAGE: 'stage_select',
        RETURN_MENU: 'menu',
      },
    },
    stage_select: {
      on: {
        START: 'playing',
        OPEN_HANGAR: 'hangar',
        OPEN_ANALYTICS: 'analytics',
        OPEN_CUSTOM: 'custom_practice',
        RETURN_MENU: 'menu',
        CLOSE_MODAL: 'playing',
      },
    },
    hangar: {
      on: {
        CLOSE_MODAL: 'stage_select',
        SELECT_STAGE: 'stage_select',
        RETURN_MENU: 'menu',
      },
    },
    analytics: {
      on: {
        CLOSE_MODAL: 'stage_select',
        SELECT_STAGE: 'stage_select',
        RETURN_MENU: 'menu',
      },
    },
    custom_practice: {
      on: {
        START: 'playing',
        CLOSE_MODAL: 'menu',
        RETURN_MENU: 'menu',
      },
    },
    victory: {
      on: {
        START: 'playing',
        SELECT_STAGE: 'stage_select',
        RETURN_MENU: 'menu',
      },
    },
  },
});

export function mapMachineStateToGameState(stateValue: string): GameState {
  switch (stateValue) {
    case 'menu':
      return 'MENU';
    case 'playing':
      return 'PLAYING';
    case 'paused':
      return 'PAUSED';
    case 'stage_select':
      return 'STAGE_SELECT';
    case 'hangar':
      return 'HANGAR';
    case 'analytics':
      return 'ANALYTICS';
    case 'custom_practice':
      return 'CUSTOM_PRACTICE';
    case 'victory':
      return 'VICTORY';
    default:
      return 'MENU';
  }
}

export function mapGameStateToMachineEvent(gameState: GameState): GameMachineEvent {
  switch (gameState) {
    case 'MENU':
      return { type: 'RETURN_MENU' };
    case 'PLAYING':
      return { type: 'START' };
    case 'PAUSED':
      return { type: 'PAUSE' };
    case 'STAGE_SELECT':
      return { type: 'SELECT_STAGE' };
    case 'HANGAR':
      return { type: 'OPEN_HANGAR' };
    case 'ANALYTICS':
      return { type: 'OPEN_ANALYTICS' };
    case 'CUSTOM_PRACTICE':
      return { type: 'OPEN_CUSTOM' };
    case 'VICTORY':
      return { type: 'STAGE_CLEAR' };
    default:
      return { type: 'RETURN_MENU' };
  }
}
