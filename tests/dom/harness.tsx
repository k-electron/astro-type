/**
 * The DOM test harness: the real <App /> against a headless game, driven the
 * way a player drives it. Read docs/agents/dom-tests.md before using it.
 *
 *   const player = renderGame({ text: 'ff jj' });
 *   player.type('ff jj');
 *   expect(screen.getByText(/Mission Debriefing/)).toBeTruthy();
 *
 * Assert on what is on screen, with Testing Library's role and text queries
 * (re-exported here as `screen` and `within`). `player.game` is there to
 * read an outcome the screen does not show; do not reach into it for
 * anything the screen does.
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
  /** A Save storage to start from, to inspect what the game saved. Wins over `profile`. */
  storage?: MemorySaveStorage;
  /** Start a Free Flight Run of this text, through the Free Flight screen. */
  text?: string;
}

export interface Player {
  /** The headless game behind the screen. Prefer asserting on the screen. */
  readonly game: Game;
  /** The Save storage the game was built on. */
  readonly storage: MemorySaveStorage;
  /** Click a header button, as the player would. */
  openHeader(button: HeaderButton): void;
  /** Click a button anywhere on the screen, found by its accessible name. */
  click(name: string | RegExp): void;
  /** Academy Home -> Free Flight -> type the text in -> Launch Custom Flight. */
  launchFreeFlight(text: string): void;
  /**
   * Press one key through the App's own key listener: a keydown, then the
   * keyup. `key` is a `KeyboardEvent.key` value (' ' for the space bar).
   */
  press(key: string): void;
  /**
   * Type each character of `text`, letting the Run clock run half a second
   * before each so the Drone has reached the Strike Line. The last character
   * of a Run's text clears it.
   */
  type(text: string): void;
  /** Run the Run clock `frames` steps (60 to the second), as the frame loop would. */
  step(frames: number): void;
}

/** Frames the Run clock takes before each typed character: the Drone arrives. */
const FRAMES_BEFORE_A_KEY = 30;

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
  const game = createGame({
    storage,
    // A throw inside a React click handler would not reliably reach the test,
    // so a refused move is collected and fails the test when it ends.
    onRefusedMove: (error) => refusals.push(error),
  });

  render(
    <GameProvider game={game}>
      <App />
    </GameProvider>,
  );

  const player: Player = {
    game,
    storage,
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
    press(key) {
      fireEvent.keyDown(window, { key });
      fireEvent.keyUp(window, { key });
    },
    type(text) {
      for (const character of text) {
        player.step(FRAMES_BEFORE_A_KEY);
        player.press(character);
      }
    },
    step(frames) {
      act(() => game.step(frames));
    },
  };

  if (options.text !== undefined) player.launchFreeFlight(options.text);
  return player;
}
