import { fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { flightDeckLabel } from '../../src/screens/closeLabel';
import { RETURNING_PLAYER } from '../shared/saves';
import {
  DEBRIEF_TITLE,
  HUD_NAME,
  MENU_HEADINGS,
  PAUSE_MENU_NAME,
  START_STAGE,
} from '../shared/screens';
import {
  type HeaderButton,
  type Player,
  renderGame,
  screen,
  toDebrief,
  within,
} from './harness';

// The overlay screens (the Pause Menu, Galaxy Map, Hangar, Analytics, Free
// Flight and the Debrief) are dialogs over the Flight Deck: the player can
// reach the overlay and the header, never the Flight Deck, while one shows.

type MenuButton = Exclude<HeaderButton, 'Academy Home'>;
const MENU_BUTTONS = Object.keys(MENU_HEADINGS) as MenuButton[];

const dialog = () => screen.getByRole('dialog');
const noDialog = () => screen.queryByRole('dialog');

/** True when the element, or anything around it, is inert. */
function isInert(element: Element): boolean {
  for (let node: Element | null = element; node; node = node.parentElement) {
    if (node.hasAttribute('inert')) return true;
    if ((node as Element & { inert?: boolean }).inert === true) return true;
  }
  return false;
}

/**
 * Whether the Flight Deck is inert: its HUD, found by name (`hidden` so a
 * query can't skip it for being behind a dialog), has an inert element around
 * it. `null` when no Flight Deck is mounted at all.
 */
function flightDeckInert(): boolean | null {
  const hud = screen.queryByRole('region', { name: HUD_NAME, hidden: true });
  return hud ? isInert(hud) : null;
}

/** An overlay is up: one dialog, over a Flight Deck that can't be reached. */
function expectOverlay() {
  expect(dialog()).toBeTruthy();
  expect(isInert(dialog())).toBe(false);
  expect(flightDeckInert()).not.toBe(false);
}

/** No overlay: no dialog, and the Flight Deck takes clicks and keys. */
function expectFlightDeckLive() {
  expect(noDialog()).toBeNull();
  expect(flightDeckInert()).toBe(false);
}

const header = () => screen.getByRole('banner');

/** Free Flight "abcdef", three characters in. */
function halfwayThroughARun(): Player {
  const player = renderGame({ text: 'abcdef' });
  player.type('abc');
  return player;
}

describe('every overlay screen is a dialog over the Flight Deck', () => {
  it.each(MENU_BUTTONS)(
    '%s opens as a dialog with its heading and one Close button',
    (button) => {
      const player = renderGame();
      player.openHeader(button);

      expectOverlay();
      expect(
        within(dialog()).getByRole('heading', { name: MENU_HEADINGS[button] }),
      ).toBeTruthy();
      expect(
        within(dialog()).getAllByRole('button', { name: /^Back to / }),
      ).toHaveLength(1);
    },
  );

  // The overlay's play button is the header's: "Resume Flight" while a Run is
  // waiting, "Start Stage" when none is (Academy Home, or a finished Run's
  // Debrief). The no-Run name is spelled in tests/shared/screens.ts rather than
  // taken from `flightDeckLabel`, which would follow the source wherever it went.
  const WAITING = {
    'Academy Home': () => renderGame(),
    'a Run': halfwayThroughARun,
    'the Debrief': toDebrief,
  } as const;
  const FLIGHT_DECK_BUTTONS = (['Galaxy Map', 'Hangar', 'Analytics'] as const)
    .flatMap((button) => [
      { button, from: 'Academy Home', label: START_STAGE },
      { button, from: 'a Run', label: flightDeckLabel(true) },
    ])
    // The Galaxy Map over a Debrief offers no play button today; whether it
    // should is open on the ticket, so it is not asserted either way.
    .concat(
      (['Hangar', 'Analytics'] as const).map((button) => ({
        button,
        from: 'the Debrief',
        label: START_STAGE,
      })),
    ) as {
    button: MenuButton;
    from: keyof typeof WAITING;
    label: string;
  }[];

  it.each(FLIGHT_DECK_BUTTONS)(
    '$button opened from $from keeps its "$label" button inside the dialog',
    ({ button, from, label }) => {
      const player = WAITING[from]();
      player.openHeader(button);

      expect(
        within(dialog()).getByRole('button', { name: label }),
      ).toBeTruthy();
    },
  );

  it('the Galaxy Map of a player with Stars, opened from Academy Home, keeps its "Start Stage" button inside the dialog', () => {
    renderGame({ profile: RETURNING_PLAYER }).openHeader('Galaxy Map');

    expect(
      within(dialog()).getByRole('button', { name: START_STAGE }),
    ).toBeTruthy();
  });

  it('the Pause Menu is a dialog named for it, and Resume Flight takes it away', () => {
    const player = halfwayThroughARun();
    expectFlightDeckLive();

    player.click('Pause');

    expectOverlay();
    expect(screen.getByRole('dialog', { name: PAUSE_MENU_NAME })).toBeTruthy();
    player.click(flightDeckLabel(true));
    expectFlightDeckLive();
  });

  it('the Debrief is a dialog with the result in it, and Replay takes it away', () => {
    const player = toDebrief();

    expectOverlay();
    expect(within(dialog()).getByText(DEBRIEF_TITLE)).toBeTruthy();
    player.click('Replay');
    expectFlightDeckLive();
  });

  it('a running Run has no dialog over it', () => {
    halfwayThroughARun();

    expectFlightDeckLive();
  });
});

describe('the Flight Deck is inert exactly while an overlay shows', () => {
  it.each(MENU_BUTTONS)(
    '%s over a running Run: inert, then live again on Close and Resume Flight',
    (button) => {
      const player = halfwayThroughARun();
      expectFlightDeckLive();

      player.openHeader(button);
      expectOverlay();
      expect(flightDeckInert()).toBe(true);

      // Close lands on the Pause Menu, which is an overlay itself.
      player.click(/^Back to /);
      expect(
        screen.getByRole('dialog', { name: PAUSE_MENU_NAME }),
      ).toBeTruthy();
      expect(flightDeckInert()).toBe(true);

      player.click(flightDeckLabel(true));
      expectFlightDeckLive();
    },
  );

  it('a menu over a paused Run: inert, and still inert on the Pause Menu after Close', () => {
    const player = halfwayThroughARun();
    player.click('Pause');
    expect(flightDeckInert()).toBe(true);

    player.openHeader('Hangar');
    expect(flightDeckInert()).toBe(true);
    player.click(/^Back to /);

    expect(screen.getByRole('dialog', { name: PAUSE_MENU_NAME })).toBeTruthy();
    expect(flightDeckInert()).toBe(true);
  });

  it('a chain of menus stays inert at every step and is live at the end', () => {
    const player = halfwayThroughARun();

    player.openHeader('Galaxy Map');
    player.click('Hangar Upgrades');
    expect(flightDeckInert()).toBe(true);
    player.click(/^Back to /);
    expect(flightDeckInert()).toBe(true);
    player.click(/^Back to /);
    player.click(flightDeckLabel(true));

    expectFlightDeckLive();
  });

  it.each(MENU_BUTTONS)(
    '%s over the Debrief: inert, and still inert on the Debrief after Close',
    (button) => {
      const player = toDebrief();
      expect(flightDeckInert()).toBe(true);

      player.openHeader(button);
      expectOverlay();
      expect(flightDeckInert()).toBe(true);
      player.click(/^Back to /);

      expect(within(dialog()).getByText(DEBRIEF_TITLE)).toBeTruthy();
      expect(flightDeckInert()).toBe(true);
    },
  );

  it.each(MENU_BUTTONS)(
    '%s opened from Academy Home has no live Flight Deck behind it, and Close leaves no dialog',
    (button) => {
      const player = renderGame();

      player.openHeader(button);
      expectOverlay();
      expect(flightDeckInert()).not.toBe(false);
      player.click(/^Back to /);

      expect(noDialog()).toBeNull();
    },
  );

  it('the header stays usable under an overlay', () => {
    const player = halfwayThroughARun();
    player.openHeader('Hangar');

    expect(isInert(header())).toBe(false);
    player.openHeader('Analytics');
    expect(
      screen.getByRole('heading', { name: MENU_HEADINGS.Analytics }),
    ).toBeTruthy();
    expect(
      screen.queryByRole('heading', { name: MENU_HEADINGS.Hangar }),
    ).toBeNull();
  });
});

describe('the Flight Deck button on an overlay', () => {
  it.each(['Galaxy Map', 'Hangar', 'Analytics'] as const)(
    '%s opened from Academy Home offers Start Stage, which starts the Stage with the Flight Deck live',
    (button) => {
      const player = renderGame();
      player.openHeader(button);

      // The dialog's own button, not the header's (which has the same name).
      fireEvent.click(
        within(dialog()).getByRole('button', { name: START_STAGE }),
      );

      expectFlightDeckLive();
      expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
    },
  );

  it.each(['Hangar', 'Analytics'] as const)(
    '%s opened over the Debrief offers Start Stage, which starts a fresh Run with the Flight Deck live',
    (button) => {
      const player = toDebrief();
      player.openHeader(button);

      fireEvent.click(
        within(dialog()).getByRole('button', { name: START_STAGE }),
      );

      expectFlightDeckLive();
      expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
    },
  );

  it.each(['Galaxy Map', 'Hangar', 'Analytics'] as const)(
    '%s opened over a Run offers Resume Flight, which carries the Run on',
    (button) => {
      const player = halfwayThroughARun();
      player.openHeader(button);

      player.click(flightDeckLabel(true));

      expectFlightDeckLive();
      expect(
        screen.getByRole('progressbar', { name: 'Progress' }).textContent,
      ).toBe('50%');
    },
  );
});

describe('Free Flight over a paused Run', () => {
  // The other menus keep a "Resume Flight" button inside their dialog (above);
  // Free Flight has one too. The header has a Resume Flight of its own while a
  // Run is paused, so these look inside the dialog on purpose.
  const OVER = [
    { over: 'a running Run', pause: false },
    { over: 'the Pause Menu', pause: true },
  ] as const;

  it.each(OVER)(
    'opened over $over offers Resume Flight in its dialog, which carries the Run on',
    ({ pause }) => {
      const player = halfwayThroughARun();
      if (pause) player.click('Pause');
      player.openHeader('Free Flight');

      fireEvent.click(
        within(dialog()).getByRole('button', { name: flightDeckLabel(true) }),
      );

      expectFlightDeckLive();
      expect(
        screen.getByRole('progressbar', { name: 'Progress' }).textContent,
      ).toBe('50%');
      player.type('d');
      expect(
        screen.getByRole('progressbar', { name: 'Progress' }).textContent,
      ).toBe('67%');
    },
  );

  it('opened with no Run waiting does not offer Resume Flight', () => {
    const player = renderGame();

    player.openHeader('Free Flight');

    expect(
      within(dialog()).queryByRole('button', { name: flightDeckLabel(true) }),
    ).toBeNull();
  });
});
