import { describe, expect, it } from 'vitest';
import { CURRICULUM_SECTORS } from '../../src/curriculum/curriculum';
import { RETURNING_PLAYER } from '../shared/saves';
import { closeLabel, flightDeckLabel } from '../../src/screens/closeLabel';
import { fireEvent } from '@testing-library/react';
import {
  ACADEMY_HOME,
  ACADEMY_HOME_HEADING,
  BEGIN_HOME_ROW,
  DEBRIEF_TITLE,
  GALAXY_MAP_SUBHEADING,
  HUD_NAME,
  LAUNCH_STAGE,
  MENU_HEADINGS,
  PAUSE_MENU_NAME,
  REPLAY_STAGE,
  RESTART_STAGE,
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

// Navigation: where each menu's Back button leads, the header on every screen,
// the Pause Menu, Esc, and leaving the page. Every test drives the real App
// the way a player does and reads only the screen.

type MenuButton = Exclude<HeaderButton, 'Home'>;

const MENU_BUTTONS = Object.keys(MENU_HEADINGS) as MenuButton[];

const menuHeading = (button: MenuButton) =>
  screen.queryByRole('heading', { name: MENU_HEADINGS[button] });
const pauseMenu = () => screen.queryByRole('dialog', { name: PAUSE_MENU_NAME });
const academyHome = () =>
  screen.queryByRole('heading', { name: ACADEMY_HOME_HEADING });
const debriefHeading = () => screen.queryByText(DEBRIEF_TITLE);
const progress = () =>
  screen
    .getByRole('progressbar', { name: 'Progress' })
    .getAttribute('aria-valuetext');
const hudText = () =>
  screen.getByRole('region', { name: HUD_NAME }).textContent;
const hudReading = (label: string, value: RegExp) => {
  const found = new RegExp(`${label}(${value.source})`).exec(hudText() ?? '');
  return found?.[1];
};
const streak = () => hudReading('Streak', /\d+/);
const accuracy = () => hudReading('Accuracy', /\d+%/);
const score = () => hudReading('Score', /[\d,]+/);

/** The one button that closes the menu on screen: "Back to <where it leads>". */
const closeMenu = (player: Player) => player.click(/^Back to /);

/** Free Flight "abcdef", three characters in: 50%, Streak 3, nothing missed. */
function halfwayThroughARun(): Player {
  const player = renderGame({ text: 'abcdef' });
  player.type('abc');
  expect(progress()).toBe('50%');
  expect(streak()).toBe('3');
  return player;
}

/** The Run is paused, as the player left it behind the menu. */
function expectPausedHalfway() {
  expect(pauseMenu()).not.toBeNull();
  expect(progress()).toBe('50%');
  expect(streak()).toBe('3');
}

/** The next right key carries on from the same character, Streak going on. */
function expectCarriesOn(player: Player) {
  player.type('d');
  expect(progress()).toBe('67%');
  expect(streak()).toBe('4');
}

describe('the Back button of a menu', () => {
  interface Opener {
    name: string;
    /** Gets the game to the screen the menu is opened from. */
    go: () => Player;
    label: string;
    /** What the player sees once back there. */
    landed: () => unknown;
  }
  const inMenu = (button: MenuButton, label: string): Opener => ({
    name: `the ${button} menu`,
    go: () => {
      const player = renderGame();
      player.openHeader(button);
      return player;
    },
    label,
    landed: () => menuHeading(button),
  });

  const CASES: { menu: MenuButton; from: Opener }[] = [
    {
      menu: 'Hangar',
      from: {
        name: 'Academy Home',
        go: () => renderGame(),
        label: closeLabel('academy-home'),
        landed: academyHome,
      },
    },
    {
      menu: 'Analytics',
      from: {
        name: 'the Flight Deck mid-Run',
        go: halfwayThroughARun,
        label: closeLabel('pause-menu'),
        landed: pauseMenu,
      },
    },
    {
      menu: 'Galaxy Map',
      from: {
        name: 'the Debrief',
        go: toDebrief,
        label: closeLabel('debrief'),
        landed: debriefHeading,
      },
    },
    { menu: 'Analytics', from: inMenu('Hangar', closeLabel('hangar')) },
    {
      menu: 'Free Flight',
      from: inMenu('Galaxy Map', closeLabel('galaxy-map')),
    },
    { menu: 'Galaxy Map', from: inMenu('Analytics', closeLabel('analytics')) },
    { menu: 'Hangar', from: inMenu('Free Flight', closeLabel('free-flight')) },
  ];

  it.each(CASES)(
    '$menu opened from $from.name reads "$from.label" and goes back there',
    ({ menu, from }) => {
      const player = from.go();
      player.openHeader(menu);
      expect(menuHeading(menu)).not.toBeNull();

      expect(screen.getByRole('button', { name: from.label })).toBeTruthy();
      player.click(from.label);

      expect(menuHeading(menu)).toBeNull();
      expect(from.landed()).not.toBeNull();
    },
  );
});

describe('the ← arrow on a Back button', () => {
  /** The shape the arrow draws, read from the button as a player sees it; null when it has none. */
  const arrowOn = (label: string) =>
    screen.getByRole('button', { name: label }).querySelector('svg')
      ?.innerHTML ?? null;

  it('"Back to Pause Menu" has the arrow "Back to Debrief" has, on every menu opened over a Run', () => {
    // The Galaxy Map opened from a Debrief is where a Back button has its arrow.
    const player = toDebrief();
    player.openHeader('Galaxy Map');
    const arrow = arrowOn(closeLabel('debrief'));
    expect(arrow, 'Back to Debrief draws an arrow').toBeTruthy();
    player.click(closeLabel('debrief'));
    player.click('Replay');
    player.typePrompt({ characters: 3 });

    for (const menu of [
      'Galaxy Map',
      'Hangar',
      'Analytics',
      'Free Flight',
    ] as const) {
      player.openHeader(menu);
      expect
        .soft(arrowOn(closeLabel('pause-menu')), `${menu}: Back to Pause Menu`)
        .toBe(arrow);
      player.click(closeLabel('pause-menu'));
      player.click(flightDeckLabel(true));
    }
  });
});

describe('the Galaxy Map', () => {
  it('is headed Galaxy Map over its Sectors, and a Stage is launched, or replayed once cleared', () => {
    // RETURNING_PLAYER has cleared the first two Stages of Sector 01.
    const player = renderGame({ profile: RETURNING_PLAYER });

    player.openHeader('Galaxy Map');

    const map = within(screen.getByRole('dialog'));
    expect(
      map.getByRole('heading', { name: MENU_HEADINGS['Galaxy Map'] }),
    ).toBeTruthy();
    expect(map.getByText(GALAXY_MAP_SUBHEADING)).toBeTruthy();
    expect(
      map.getAllByRole('button', { name: REPLAY_STAGE }).length,
    ).toBeGreaterThan(0);
    expect(
      map.getAllByRole('button', { name: LAUNCH_STAGE }).length,
    ).toBeGreaterThan(0);
  });

  it('Launch Stage on a Stage starts that Stage', () => {
    const [sector] = CURRICULUM_SECTORS;
    const player = renderGame();
    player.openHeader('Galaxy Map');
    player.click(new RegExp(sector.codenick));

    // Each Stage's card has its own Launch Stage button; find the card by
    // the Stage's title, then the button inside it.
    const title = screen.getByRole('heading', { name: sector.stages[1].title });
    let card = title.parentElement;
    while (
      card &&
      within(card).queryAllByRole('button', { name: LAUNCH_STAGE }).length === 0
    ) {
      card = card.parentElement;
    }
    if (!card) throw new Error('the Stage has no Launch Stage button');
    fireEvent.click(within(card).getByRole('button', { name: LAUNCH_STAGE }));

    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
    expect(screen.getByRole('main').textContent).toContain(
      sector.stages[1].title,
    );
  });

  it('its Academy Home button leaves for Academy Home and abandons a Run that was paused', () => {
    const player = halfwayThroughARun();
    player.openHeader('Galaxy Map');

    player.click(ACADEMY_HOME);

    expect(academyHome()).not.toBeNull();
    expect(menuHeading('Galaxy Map')).toBeNull();
    // There is no Run waiting to be resumed.
    player.openHeader('Galaxy Map');
    expect(
      screen.getByRole('button', { name: flightDeckLabel(false) }),
    ).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: flightDeckLabel(true) }),
    ).toBeNull();
  });
});

describe('the header buttons', () => {
  const cases = MENU_BUTTONS.flatMap((button) => [
    { button, from: 'the Pause Menu' },
    { button, from: 'the Debrief' },
  ]);

  it.each(cases)(
    '$button works from $from, and Close goes back there with the Run as it was',
    ({ button, from }) => {
      const player =
        from === 'the Debrief' ? toDebrief() : halfwayThroughARun();
      if (from === 'the Pause Menu') player.click('Pause');
      expect(from === 'the Debrief' ? debriefHeading() : pauseMenu()).not.toBe(
        null,
      );

      player.openHeader(button);
      expect(menuHeading(button)).not.toBeNull();
      closeMenu(player);

      expect(menuHeading(button)).toBeNull();
      if (from === 'the Debrief') {
        expect(debriefHeading()).not.toBeNull();
      } else {
        expectPausedHalfway();
        player.click(flightDeckLabel(true));
        expect(progress()).toBe('50%');
      }
    },
  );

  it.each(MENU_BUTTONS)(
    '%s, pressed again on its own screen, changes nothing: one Close returns to Academy Home',
    (button) => {
      const player = renderGame();
      player.openHeader(button);

      player.openHeader(button);
      player.openHeader(button);
      expect(menuHeading(button)).not.toBeNull();
      expect(screen.getAllByRole('button', { name: /^Back to / })).toHaveLength(
        1,
      );
      closeMenu(player);

      expect(menuHeading(button)).toBeNull();
      expect(academyHome()).not.toBeNull();
    },
  );

  it('pressed again mid-Run, one Close lands on the Pause Menu with the Run kept', () => {
    const player = halfwayThroughARun();
    player.openHeader('Hangar');

    player.openHeader('Hangar');
    player.openHeader('Hangar');
    closeMenu(player);

    expect(menuHeading('Hangar')).toBeNull();
    expectPausedHalfway();
    player.click(flightDeckLabel(true));
    expect(progress()).toBe('50%');
  });

  it('pressed again over another menu, one Close returns to that menu', () => {
    const player = renderGame();
    player.openHeader('Galaxy Map');
    player.openHeader('Hangar');

    player.openHeader('Hangar');
    closeMenu(player);

    expect(menuHeading('Hangar')).toBeNull();
    expect(menuHeading('Galaxy Map')).not.toBeNull();
  });
});

describe('menus opened in the middle of a Run', () => {
  it('each Close back where it belongs, and the Run keeps its Score and its character', () => {
    const player = halfwayThroughARun();
    const scoreMidRun = score();
    expect(Number((scoreMidRun ?? '').replaceAll(',', ''))).toBeGreaterThan(0);

    const resume = () => {
      player.click(flightDeckLabel(true));
      expect(pauseMenu()).toBeNull();
      expect(progress()).toBe('50%');
      expect(score()).toBe(scoreMidRun);
    };

    // Each menu straight from the Flight Deck: Close lands on the Pause Menu.
    for (const button of ['Galaxy Map', 'Hangar', 'Analytics'] as const) {
      player.openHeader(button);
      closeMenu(player);
      expect(pauseMenu()).not.toBeNull();
      expect(menuHeading(button)).toBeNull();
      resume();
    }

    // A chain: Flight Deck > Galaxy Map > Hangar unwinds one step at a time.
    player.openHeader('Galaxy Map');
    player.click('Hangar Upgrades');
    expect(menuHeading('Hangar')).not.toBeNull();
    closeMenu(player);
    expect(menuHeading('Galaxy Map')).not.toBeNull();
    expect(menuHeading('Hangar')).toBeNull();
    closeMenu(player);
    expect(pauseMenu()).not.toBeNull();
    expect(menuHeading('Galaxy Map')).toBeNull();
    resume();

    // The Run carries on from the character it was on, to the Debrief.
    player.type('d');
    expect(progress()).toBe('67%');
    player.type('ef');
    expect(debriefHeading()).not.toBeNull();
  });
});

describe('the Pause Menu', () => {
  it('pausing and resuming carries on from the same character, with the Streak', () => {
    const player = halfwayThroughARun();

    player.click('Pause');
    expectPausedHalfway();
    player.click(flightDeckLabel(true));

    expect(pauseMenu()).toBeNull();
    expect(progress()).toBe('50%');
    expect(streak()).toBe('3');
    expectCarriesOn(player);
    player.type('ef');
    expect(debriefHeading()).not.toBeNull();
  });

  it('offers "View Galaxy Map", not "Exit to Galaxy Map", and "Exit to Academy Home"', () => {
    const player = halfwayThroughARun();

    player.click('Pause');

    expect(
      screen.getByRole('button', { name: 'View Galaxy Map' }),
    ).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: /exit to galaxy map/i }),
    ).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Exit to Academy Home' }),
    ).toBeTruthy();
  });

  it('View Galaxy Map opens the Galaxy Map, and Close returns to the Pause Menu with the Run kept', () => {
    const player = halfwayThroughARun();
    player.click('Pause');

    player.click('View Galaxy Map');
    expect(menuHeading('Galaxy Map')).not.toBeNull();
    expect(pauseMenu()).toBeNull();
    closeMenu(player);

    expect(menuHeading('Galaxy Map')).toBeNull();
    expectPausedHalfway();
    player.click(flightDeckLabel(true));
    expectCarriesOn(player);
  });

  it('Restart Stage begins the same Stage afresh', () => {
    const player = halfwayThroughARun();
    player.click('Pause');

    player.click(RESTART_STAGE);

    expect(pauseMenu()).toBeNull();
    expect(progress()).toBe('0%');
    expect(streak()).toBe('0');
    player.type('a');
    expect(progress()).toBe('17%');
  });

  it('Exit to Academy Home abandons the Run: Start Stage begins the Stage afresh', () => {
    const player = renderGame();
    player.click(BEGIN_HOME_ROW);
    player.type('f j f j');
    expect(progress()).not.toBe('0%');
    player.click('Pause');

    player.click('Exit to Academy Home');
    expect(pauseMenu()).toBeNull();
    expect(academyHome()).not.toBeNull();
    // There is no Run waiting to be resumed.
    player.openHeader('Galaxy Map');
    expect(
      screen.getByRole('button', { name: flightDeckLabel(false) }),
    ).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: flightDeckLabel(true) }),
    ).toBeNull();
    closeMenu(player);
    player.click(START_STAGE);

    expect(progress()).toBe('0%');
    expect(score()).toBe('0');
    expect(streak()).toBe('0');
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
  });
});

describe('Esc', () => {
  it('pauses a running Run, and Esc on the Pause Menu resumes it from the same character', () => {
    const player = halfwayThroughARun();

    player.press('Escape');
    expectPausedHalfway();
    player.press('Escape');

    expect(pauseMenu()).toBeNull();
    expect(progress()).toBe('50%');
    expectCarriesOn(player);
    player.type('ef');
    expect(debriefHeading()).not.toBeNull();
  });

  it('is not a Miss: pausing and resuming with it keeps the Streak and Accuracy', () => {
    const player = halfwayThroughARun();
    player.step(30);
    expect(accuracy()).toBe('100%');

    player.press('Escape');
    player.press('Escape');
    expectCarriesOn(player);

    expect(accuracy()).toBe('100%');
  });

  it('held down, pauses once and does not flick back to the Run', () => {
    const player = halfwayThroughARun();

    player.press('Escape');
    player.press('Escape', { repeat: true });

    expectPausedHalfway();
  });

  it('on a menu opened from the Flight Deck goes back to the Pause Menu', () => {
    const player = halfwayThroughARun();

    for (const button of ['Galaxy Map', 'Hangar', 'Analytics'] as const) {
      player.openHeader(button);
      player.press('Escape');
      expect(menuHeading(button)).toBeNull();
      expectPausedHalfway();
      // Back on the Pause Menu, Esc resumes; the next menu pauses it again.
      player.press('Escape');
      expect(pauseMenu()).toBeNull();
      expect(progress()).toBe('50%');
    }
    expectCarriesOn(player);
  });

  it('on a menu opened from the Pause Menu goes back to the Pause Menu', () => {
    const player = halfwayThroughARun();
    player.click('Pause');
    player.openHeader('Galaxy Map');

    player.press('Escape');

    expect(menuHeading('Galaxy Map')).toBeNull();
    expectPausedHalfway();
    player.click(flightDeckLabel(true));
    expectCarriesOn(player);
  });

  it('unwinds a chain of menus one step at a time', () => {
    const player = halfwayThroughARun();
    player.openHeader('Galaxy Map');
    player.click('Hangar Upgrades');
    expect(menuHeading('Hangar')).not.toBeNull();

    player.press('Escape');
    expect(menuHeading('Galaxy Map')).not.toBeNull();
    expect(menuHeading('Hangar')).toBeNull();

    player.press('Escape');
    expect(menuHeading('Galaxy Map')).toBeNull();
    expectPausedHalfway();

    player.press('Escape');
    expect(pauseMenu()).toBeNull();
    expect(progress()).toBe('50%');
  });

  it('on a menu opened from the Debrief goes back to the Debrief', () => {
    const player = toDebrief();
    player.openHeader('Hangar');

    player.press('Escape');

    expect(menuHeading('Hangar')).toBeNull();
    expect(debriefHeading()).not.toBeNull();
    expect(pauseMenu()).toBeNull();
  });

  it('on a menu opened from Academy Home goes back to Academy Home', () => {
    const player = renderGame();
    player.openHeader('Analytics');

    player.press('Escape');

    expect(menuHeading('Analytics')).toBeNull();
    expect(academyHome()).not.toBeNull();
  });

  it('does nothing on Academy Home, and the Stage still starts', () => {
    const player = renderGame();

    player.press('Escape');

    expect(academyHome()).not.toBeNull();
    expect(pauseMenu()).toBeNull();
    player.click(BEGIN_HOME_ROW);
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
    expect(pauseMenu()).toBeNull();
  });

  it('does nothing on the Debrief, and Replay still starts the Stage afresh', () => {
    const player = toDebrief();

    player.press('Escape');

    expect(debriefHeading()).not.toBeNull();
    expect(pauseMenu()).toBeNull();
    player.click('Replay');
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
    expect(progress()).toBe('0%');
  });
});

describe('leaving the page mid-Run', () => {
  const WAYS = [
    [
      'the window loses focus',
      (player: Player) => player.blur(),
      (player: Player) => player.focus(),
    ],
    [
      'the tab is hidden',
      (player: Player) => player.hideTab(),
      (player: Player) => player.showTab(),
    ],
  ] as const;

  it.each(WAYS)('pauses the Run, with its Streak, when %s', (_way, leave) => {
    const player = halfwayThroughARun();
    player.step(30);

    leave(player);

    expectPausedHalfway();
    expect(accuracy()).toBe('100%');
    player.click(flightDeckLabel(true));
    expectCarriesOn(player);
  });

  it.each(WAYS)(
    'stays paused when the player comes back after %s',
    (_way, leave, comeBack) => {
      const player = halfwayThroughARun();
      leave(player);
      expectPausedHalfway();

      comeBack(player);
      player.step(30);

      expectPausedHalfway();
      expect(accuracy()).toBe('100%');
      player.click(flightDeckLabel(true));
      expectCarriesOn(player);
    },
  );

  it('is a real pause: Esc on it resumes from the same character', () => {
    const player = halfwayThroughARun();

    player.blur();
    expectPausedHalfway();
    player.press('Escape');

    expect(pauseMenu()).toBeNull();
    expect(progress()).toBe('50%');
    expectCarriesOn(player);
  });

  it('changes nothing on Academy Home', () => {
    const player = renderGame();

    player.blur();
    player.hideTab();

    expect(academyHome()).not.toBeNull();
    expect(pauseMenu()).toBeNull();
  });

  it('changes nothing on the Debrief', () => {
    const player = toDebrief();

    player.blur();
    player.hideTab();

    expect(debriefHeading()).not.toBeNull();
    expect(pauseMenu()).toBeNull();
  });

  it('leaves an already paused Run paused, on the same character', () => {
    const player = halfwayThroughARun();
    player.click('Pause');

    player.blur();
    player.hideTab();

    expectPausedHalfway();
    player.click(flightDeckLabel(true));
    expectCarriesOn(player);
  });

  it('keys typed after the focus-loss pause neither resume the Run nor count', () => {
    const player = halfwayThroughARun();
    player.blur();
    expectPausedHalfway();

    // The player comes back and carries on typing: the next right key, then a
    // wrong one. The Run is paused, so neither is a hit or a Miss.
    player.press('d');
    player.press('z');
    player.press('Enter');
    player.press(' ');

    expectPausedHalfway();
    player.click(flightDeckLabel(true));
    expect(progress()).toBe('50%');
    expectCarriesOn(player);
    expect(accuracy()).toBe('100%');
  });
});
