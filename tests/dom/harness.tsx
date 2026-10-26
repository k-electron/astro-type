/**
 * The DOM test harness: the real <App /> against a headless game, driven the
 * way a player drives it. Read docs/agents/dom-tests.md before using it.
 *
 *   const player = renderGame({ text: 'ff jj' });
 *   player.type('ff jj');
 *   expect(screen.getByText(/Mission Debriefing/)).toBeTruthy();
 *
 * Assert on what is on screen, with Testing Library's role and text queries
 * (re-exported here as `screen` and `within`). The player is given no handle
 * on the game itself, so a test can only check what a player would see.
 *
 * Things worth knowing:
 * - The HUD's Accuracy and Speed refresh only on the Run clock's telemetry
 *   tick, every 30 steps. `type` steps 30 between keys, so they are current
 *   after it; after a bare `press`, call `step(30)` first.
 * - A Run that was typed with no steps has Run Time 0, so its Speed means
 *   nothing. Reach a Debrief with `type`.
 * - Tailwind is not loaded: no element is hidden by CSS, and there is no layout.
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach } from 'vitest';
import App from '../../src/App';
import {
  createGame,
  createMemoryStorage,
  type Game,
  type MemorySaveStorage,
  type RefusedMoveError,
} from '../../src/game/createGame';
import { GameProvider } from '../../src/store/gameContext';

export { screen, within };

/** The header's screen buttons, by the text the player reads on them. */
export type HeaderButton =
  | 'Home'
  | 'Sectors'
  | 'Hangar'
  | 'Analytics'
  | 'Free Flight';

export interface RenderGameOptions {
  /**
   * The Profile the player already has: the fields to put in the Save before
   * the game loads. Fields left out take their defaults, as in a real Save.
   */
  profile?: Record<string, unknown>;
  /** A Save storage to start from. Wins over `profile`. */
  storage?: MemorySaveStorage;
  /** Start a Free Flight Run of this text, through the Free Flight screen. */
  text?: string;
}

export interface PressOptions {
  /** An auto-repeat keydown, as when a key is held. */
  repeat?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}

export interface Player {
  /** Click a header button, as the player would. */
  openHeader(button: HeaderButton): void;
  /** Click a button anywhere on the screen, found by its accessible name. */
  click(name: string | RegExp): void;
  /** Academy Home -> Free Flight -> type the text in -> Launch Custom Flight. */
  launchFreeFlight(text: string): void;
  /**
   * Press one key through the App's own key listener: a keydown, then the
   * keyup, on `window`. `key` is a `KeyboardEvent.key` value (' ' for Space).
   */
  press(key: string, options?: PressOptions): void;
  /**
   * Type each character of `text`, stepping the Run clock `stepsPerKey`
   * (default 30, half a second: the Drone is at the Strike Line) before each.
   * The last character of a Run's text clears it.
   */
  type(text: string, options?: { stepsPerKey?: number }): void;
  /** Run the Run clock `steps` steps (60 to the second), as the frame loop would. */
  step(steps: number): void;
  /** The window loses focus. */
  blur(): void;
  /** The tab is hidden, as when the player switches to another tab. */
  hideTab(): void;
  /**
   * Reload the page: the app is rebuilt from nothing over the same Save, so
   * what the game saved comes back and everything else is gone.
   */
  reload(): void;
}

/** Steps the Run clock takes before each typed character: the Drone arrives. */
const STEPS_BEFORE_A_KEY = 30;

/** Moves the machine refused during the current test; any is a test failure. */
let refusals: RefusedMoveError[] = [];

afterEach(() => {
  const refused = refusals;
  refusals = [];
  if (refused.length > 0) {
    throw new Error(
      `The machine refused ${refused.length} move(s): ${refused
        .map((error) => error.message)
        .join('; ')}`,
    );
  }
});

/**
 * Mount the real <App /> on a fresh headless game: a stepped clock, silent
 * sound, and a Save in memory. Every call builds a new game.
 */
export function renderGame(options: RenderGameOptions = {}): Player {
  const storage = options.storage ?? createMemoryStorage(options.profile);
  let game: Game;
  let unmount: () => void;

  const mount = () => {
    game = createGame({
      storage,
      // A throw inside a React click handler would not reliably reach the
      // test, so a refused move is collected and fails the test when it ends.
      onRefusedMove: (error) => refusals.push(error),
    });
    unmount = render(
      <GameProvider game={game}>
        <App />
      </GameProvider>,
    ).unmount;
  };
  mount();

  const player: Player = {
    openHeader(button) {
      const header = within(screen.getByRole('navigation'));
      fireEvent.click(header.getByRole('button', { name: button }));
    },
    click(name) {
      fireEvent.click(screen.getByRole('button', { name }));
    },
    launchFreeFlight(text) {
      player.openHeader('Free Flight');
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: text },
      });
      player.click('Launch Custom Flight');
    },
    press(key, pressOptions = {}) {
      fireEvent.keyDown(window, { key, ...pressOptions });
      fireEvent.keyUp(window, { key, ...pressOptions });
    },
    type(text, typeOptions = {}) {
      const steps = typeOptions.stepsPerKey ?? STEPS_BEFORE_A_KEY;
      for (const character of text) {
        player.step(steps);
        player.press(character);
      }
    },
    step(steps) {
      act(() => game.step(steps));
    },
    blur() {
      fireEvent.blur(window);
    },
    hideTab() {
      const visibility = Object.getOwnPropertyDescriptor(
        document,
        'visibilityState',
      );
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'hidden',
      });
      fireEvent(document, new Event('visibilitychange'));
      // Put the page back as found, so the next test sees a visible tab.
      if (visibility)
        Object.defineProperty(document, 'visibilityState', visibility);
      else Reflect.deleteProperty(document, 'visibilityState');
    },
    reload() {
      unmount();
      mount();
    },
  };

  if (options.text !== undefined) player.launchFreeFlight(options.text);
  return player;
}
