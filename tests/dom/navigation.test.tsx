import { describe, expect, it } from 'vitest';
import { type HeaderButton, type Player, renderGame, screen } from './harness';

// Navigation: where each menu's Back button leads, the header on every screen,
// the Pause Menu, Esc, and leaving the page. Every test drives the real App
// the way a player does and reads only the screen.

type MenuButton = Exclude<HeaderButton, 'Home'>;

/** Each header button that opens a screen, and the heading of that screen. */
const MENUS: Record<MenuButton, string> = {
  Sectors: 'Flight Sectors & Missions',
  Hangar: 'Starship Hangar Upgrades',
  Analytics: 'Typing Analytics & Heatmap',
  'Free Flight': 'Custom Typing Practice',
};
const MENU_BUTTONS = Object.keys(MENUS) as MenuButton[];

const menuHeading = (button: MenuButton) =>
  screen.queryByRole('heading', { name: MENUS[button] });
const pauseMenu = () =>
  screen.queryByRole('dialog', { name: 'Mission Paused' });
const academyHome = () =>
  screen.queryByRole('heading', { name: /Cosmic Touch Typing/ });
const debriefHeading = () =>
  screen.queryByRole('heading', { name: 'Free Flight Drill', level: 2 });
const progress = () =>
  screen
    .getByRole('progressbar', { name: 'Progress' })
    .getAttribute('aria-valuetext');
const hudText = () => screen.getByRole('region', { name: 'HUD' }).textContent;
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

/** The Debrief of a two-character Free Flight. */
function toDebrief(): Player {
  const player = renderGame({ text: 'ab' });
  player.type('ab');
  expect(debriefHeading()).not.toBeNull();
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
        label: 'Back to Academy',
        landed: academyHome,
      },
    },
    {
      menu: 'Analytics',
      from: {
        name: 'the Flight Deck mid-Run',
        go: halfwayThroughARun,
        label: 'Back to Pause Menu',
        landed: pauseMenu,
      },
    },
    {
      menu: 'Sectors',
      from: {
        name: 'the Debrief',
        go: toDebrief,
        label: 'Back to Debriefing',
        landed: debriefHeading,
      },
    },
    { menu: 'Analytics', from: inMenu('Hangar', 'Back to Hangar') },
    { menu: 'Free Flight', from: inMenu('Sectors', 'Back to Sectors') },
    { menu: 'Sectors', from: inMenu('Analytics', 'Back to Analytics') },
    { menu: 'Hangar', from: inMenu('Free Flight', 'Back to Free Flight') },
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
        player.click('Resume Flight');
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
    player.click('Resume Flight');
    expect(progress()).toBe('50%');
  });

  it('pressed again over another menu, one Close returns to that menu', () => {
    const player = renderGame();
    player.openHeader('Sectors');
    player.openHeader('Hangar');

    player.openHeader('Hangar');
    closeMenu(player);

    expect(menuHeading('Hangar')).toBeNull();
    expect(menuHeading('Sectors')).not.toBeNull();
  });
});

describe('menus opened in the middle of a Run', () => {
  it('each Close back where it belongs, and the Run keeps its Score and its character', () => {
    const player = halfwayThroughARun();
    const scoreMidRun = score();
    expect(Number((scoreMidRun ?? '').replaceAll(',', ''))).toBeGreaterThan(0);

    const resume = () => {
      player.click('Resume Flight');
      expect(pauseMenu()).toBeNull();
      expect(progress()).toBe('50%');
      expect(score()).toBe(scoreMidRun);
    };

    // Each menu straight from the Flight Deck: Close lands on the Pause Menu.
    for (const button of ['Sectors', 'Hangar', 'Analytics'] as const) {
      player.openHeader(button);
      closeMenu(player);
      expect(pauseMenu()).not.toBeNull();
      expect(menuHeading(button)).toBeNull();
      resume();
    }

    // A chain: Flight Deck > Galaxy Map > Hangar unwinds one step at a time.
    player.openHeader('Sectors');
    player.click('Hangar Upgrades');
    expect(menuHeading('Hangar')).not.toBeNull();
    closeMenu(player);
    expect(menuHeading('Sectors')).not.toBeNull();
    expect(menuHeading('Hangar')).toBeNull();
    closeMenu(player);
    expect(pauseMenu()).not.toBeNull();
    expect(menuHeading('Sectors')).toBeNull();
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
    player.click('Resume Flight');

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
    expect(menuHeading('Sectors')).not.toBeNull();
    expect(pauseMenu()).toBeNull();
    closeMenu(player);

    expect(menuHeading('Sectors')).toBeNull();
    expectPausedHalfway();
    player.click('Resume Flight');
    expectCarriesOn(player);
  });

  it('Exit to Academy Home abandons the Run: Start Mission begins the Stage afresh', () => {
    const player = renderGame();
    player.click('Begin Home Row Mission');
    player.type('f j f j');
    expect(progress()).not.toBe('0%');
    player.click('Pause');

    player.click('Exit to Academy Home');
    expect(pauseMenu()).toBeNull();
    expect(academyHome()).not.toBeNull();
    // There is no Run waiting to be resumed.
    player.openHeader('Sectors');
    expect(
      screen.getByRole('button', { name: 'Enter Flight Deck' }),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Resume Flight' })).toBeNull();
    closeMenu(player);
    player.click('Start Mission');

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

    for (const button of ['Sectors', 'Hangar', 'Analytics'] as const) {
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
    player.openHeader('Sectors');

    player.press('Escape');

    expect(menuHeading('Sectors')).toBeNull();
    expectPausedHalfway();
    player.click('Resume Flight');
    expectCarriesOn(player);
  });

  it('unwinds a chain of menus one step at a time', () => {
    const player = halfwayThroughARun();
    player.openHeader('Sectors');
    player.click('Hangar Upgrades');
    expect(menuHeading('Hangar')).not.toBeNull();

    player.press('Escape');
    expect(menuHeading('Sectors')).not.toBeNull();
    expect(menuHeading('Hangar')).toBeNull();

    player.press('Escape');
    expect(menuHeading('Sectors')).toBeNull();
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
    player.click('Begin Home Row Mission');
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
    ['the window loses focus', (player: Player) => player.blur()],
    ['the tab is hidden', (player: Player) => player.hideTab()],
  ] as const;

  it.each(WAYS)('pauses the Run, with its Streak, when %s', (_way, leave) => {
    const player = halfwayThroughARun();
    player.step(30);

    leave(player);

    expectPausedHalfway();
    expect(accuracy()).toBe('100%');
    player.click('Resume Flight');
    expectCarriesOn(player);
  });

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
    player.click('Resume Flight');
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
    player.click('Resume Flight');
    expect(progress()).toBe('50%');
    expectCarriesOn(player);
    expect(accuracy()).toBe('100%');
  });
});
