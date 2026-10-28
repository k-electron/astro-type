import { cleanup, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RETURNING_PLAYER } from '../shared/saves';
import {
  ACADEMY_HOME_HEADING,
  DEBRIEF_TITLE,
  HUD_NAME,
  MENU_HEADINGS,
  PAUSE_MENU_NAME,
  YOUR_TEXT,
} from '../shared/screens';
import { expectNoRefusedMove, renderGame, screen } from './harness';

// The machine promises that a move a screen offers is never refused. This
// walks the real App as a random player would, clicking whichever buttons are
// on screen and pressing Esc, and the harness fails it on any refused move.
// Nothing here lists what a screen offers or copies the machine's table: a new
// button, or a button that sends the wrong thing, is found by the walk itself.
//
// A failing walk names its seed and step. Replay one seed with
//   WALK_SEED=7 pnpm exec vitest run tests/dom/random-walk.test.tsx

const ALL_SCREENS = [
  'Academy Home',
  'Flight Deck',
  'Pause Menu',
  'Galaxy Map',
  'Hangar',
  'Analytics',
  'Free Flight',
  'Debrief',
] as const;

type ScreenName = (typeof ALL_SCREENS)[number];

const SEEDS = Array.from({ length: 30 }, (_, index) => index + 1);
const STEPS = 60;
/** The chance, on the Flight Deck, that the player types instead of clicking. */
const CHANCE_OF_TYPING = 0.3;
/** The chance, on any screen, that the player presses Esc. */
const CHANCE_OF_PRESSING_ESC = 0.1;
/** The chance, on any screen, that the player leaves the page and comes back. */
const CHANCE_OF_LEAVING_THE_PAGE = 0.03;
/** How much likelier a button not yet pressed on this screen is than one that was. */
const UNPRESSED_BUTTON_WEIGHT = 5;
/**
 * The time allowed for all the seeds together (about 10 seconds on a quiet
 * machine). It is room for a loaded one, not a speed the walk is held to.
 */
const WALK_TIMEOUT = 60_000;

/** Seeded, so a failing walk can be replayed from its seed. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The screens whose own marker is on the page. The Flight Deck's HUD stays
 * behind every menu, so it counts only when nothing else is showing. A player
 * always sees exactly one screen.
 */
function screensShowing(): ScreenName[] {
  const showing: ScreenName[] = [];
  if (screen.queryByRole('dialog', { name: PAUSE_MENU_NAME }))
    showing.push('Pause Menu');
  if (screen.queryByRole('heading', { name: MENU_HEADINGS['Galaxy Map'] }))
    showing.push('Galaxy Map');
  if (screen.queryByRole('heading', { name: MENU_HEADINGS.Hangar }))
    showing.push('Hangar');
  if (screen.queryByRole('heading', { name: MENU_HEADINGS.Analytics }))
    showing.push('Analytics');
  // By its text box: a Free Flight Stage's Debrief has a heading of the same
  // name (the Stage is called Free Flight), so the heading alone would count
  // both screens.
  if (screen.queryByRole('textbox', { name: YOUR_TEXT }))
    showing.push('Free Flight');
  if (screen.queryByText(DEBRIEF_TITLE)) showing.push('Debrief');
  if (screen.queryByRole('heading', { name: ACADEMY_HOME_HEADING }))
    showing.push('Academy Home');
  if (showing.length === 0 && screen.queryByRole('region', { name: HUD_NAME }))
    showing.push('Flight Deck');
  return showing;
}

/**
 * The buttons a player can press right now. The header is always on top.
 * Every screen but Academy Home draws the Flight Deck under the main area and
 * every menu, the Pause Menu and the Debrief as an overlay above it, so while
 * an overlay is up the Flight Deck's own buttons (its Pause button) are covered
 * and cannot be pressed. Disabled buttons cannot be pressed either.
 */
function pressableButtons(): HTMLButtonElement[] {
  const header = screen.getByRole('banner');
  const main = screen.getByRole('main');
  const all = screen.getAllByRole('button') as HTMLButtonElement[];
  const inHeader = all.filter((button) => header.contains(button));
  const inMain = all.filter((button) => main.contains(button));
  const overlay = all.filter(
    (button) => !header.contains(button) && !main.contains(button),
  );
  const top = overlay.length > 0 ? overlay : inMain;
  return [...inHeader, ...top].filter((button) => !button.disabled);
}

const nameOf = (button: HTMLElement) =>
  button.getAttribute('aria-label') ?? button.textContent?.trim() ?? '';

/**
 * Walk the app for `STEPS` actions from `seed`, failing at the first refused
 * move or unrecognisable screen. Returns the screens the walk reached.
 */
function walk(seed: number): Set<ScreenName> {
  const random = mulberry32(seed);
  // A button this walk has not pressed on this screen yet is likelier to be
  // picked (UNPRESSED_BUTTON_WEIGHT). Without that a walk spends most of its steps on the
  // header's audio settings and the Hangar's shop, and rarely gets round to
  // the button that closes a menu or restarts a Run.
  const pressed = new Set<string>();
  const pickUnpressed = (
    buttons: HTMLButtonElement[],
    onScreen: ScreenName,
  ): HTMLButtonElement => {
    const keyOf = (button: HTMLElement) =>
      `${onScreen}: ${nameOf(button).replace(/[\d,]+/g, '#')}`;
    const weights = buttons.map((button) =>
      pressed.has(keyOf(button)) ? 1 : UNPRESSED_BUTTON_WEIGHT,
    );
    let roll = random() * weights.reduce((total, weight) => total + weight, 0);
    let index = 0;
    while (index < buttons.length - 1 && roll >= weights[index]) {
      roll -= weights[index];
      index++;
    }
    pressed.add(keyOf(buttons[index]));
    return buttons[index];
  };
  // Half the walks start as a returning player, so more of the app is open.
  const player = renderGame(
    seed % 2 === 0 ? { profile: RETURNING_PLAYER } : {},
  );
  const reached = new Set<ScreenName>();

  const lookAround = (action: string, step: number) => {
    const where = `seed ${seed}, step ${step}: ${action}`;
    expectNoRefusedMove(where);
    const showing = screensShowing();
    expect(showing, `${where}: expected exactly one screen`).toHaveLength(1);
    reached.add(showing[0]);
  };

  lookAround('start', 0);
  for (let step = 1; step <= STEPS; step++) {
    const current = screensShowing()[0];
    const roll = random();
    let action: string;
    if (current === 'Flight Deck' && roll < CHANCE_OF_TYPING) {
      // Without typing a Run to its end, a walk of clicks never reaches a Debrief.
      const characters =
        random() < 0.4 ? undefined : 1 + Math.floor(random() * 8);
      action = `on the ${current}, typed ${characters ?? 'the rest of the'} characters`;
      player.typePrompt({ characters });
    } else if (roll < CHANCE_OF_TYPING + CHANCE_OF_PRESSING_ESC) {
      action = `on ${current}, pressed Esc`;
      player.press('Escape');
    } else if (
      roll <
      CHANCE_OF_TYPING + CHANCE_OF_PRESSING_ESC + CHANCE_OF_LEAVING_THE_PAGE
    ) {
      action = `on ${current}, left the page`;
      player.blur();
      player.focus();
    } else {
      const button = pickUnpressed(pressableButtons(), current);
      action = `on ${current}, clicked "${nameOf(button)}"`;
      fireEvent.click(button);
    }
    lookAround(action, step);
  }
  return reached;
}

describe('a random walk through the app', () => {
  const seeds = process.env.WALK_SEED ? [Number(process.env.WALK_SEED)] : SEEDS;

  it(
    'is never refused a move by clicking what is on screen and pressing Esc, and reaches every screen',
    () => {
      const reached = new Set<ScreenName>();
      for (const seed of seeds) {
        for (const name of walk(seed)) reached.add(name);
        // Unmount this walk's app so the next one starts on a clean page.
        cleanup();
      }
      if (!process.env.WALK_SEED) {
        expect([...reached].sort()).toEqual([...ALL_SCREENS].sort());
      }
    },
    WALK_TIMEOUT,
  );
});
