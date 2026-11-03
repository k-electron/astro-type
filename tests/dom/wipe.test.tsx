import { fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CURRICULUM_SECTORS } from '../../src/curriculum/curriculum';
import {
  clearedStages,
  RETURNING_PLAYER,
  stageProgress,
} from '../shared/saves';
import {
  DEBRIEF_TITLE,
  MENU_HEADINGS,
  PAUSE_FLIGHT,
  START_STAGE,
  REPLAY,
} from '../shared/screens';
import {
  isInert,
  type Player,
  renderGame,
  screen,
  toDebrief,
  within,
} from './harness';
import { flightDeckLabel } from '../../src/screens/closeLabel';
import { OPEN_AUDIO_PANEL } from '../../src/screens/audioLabels';
import {
  FACTORY_RESET_TITLE,
  WIPE_STARS_TITLE,
} from '../../src/screens/confirmLabels';

// Wiping the Stars asks first. profile.test.tsx guards Factory Reset
// (confirming); this guards the Wipe button, which clears the Stars and Stage
// records and keeps the Credits, and Cancel on Factory Reset.
//
// Wipe lives only in Analytics (#90; it used to be on the Galaxy Map too, with
// a confirm of its own). The Galaxy Map's copies of the tests below went with
// its button: the behaviour they checked (asks first, Cancel, Confirm, the
// Start Stage reset, the Debrief, the paused Run, Esc and the audio panel) is
// the Analytics button's too, and the Analytics cases of the same tests guard
// it. What only the Galaxy Map had is guarded by "Wipe lives only in
// Analytics" at the bottom of this file.

const stars = (count: number) =>
  screen.getByRole('button', { name: new RegExp(`^${count}\\s*★$`) });
const credits = (text: string) =>
  screen.getByRole('button', { name: new RegExp(`^${text}\\s*Cr$`) });
const confirmButton = (name: string) => screen.queryByRole('button', { name });

/** What the Galaxy Map's first Sector says about its Stars, like "5/12". */
function sectorOneStars(player: Player): string {
  player.openHeader('Galaxy Map');
  return screen.getByRole('button', { name: /Sector 01/ }).textContent ?? '';
}

const [FIRST_STAGE, SECOND_STAGE] = CURRICULUM_SECTORS[0].stages;
const onShow = () => screen.getByRole('main').textContent ?? '';

const WIPES = [
  { where: 'Analytics', menu: 'Analytics', button: 'Wipe Stars' },
] as const;

describe.each(WIPES)('Wipe on $where', ({ menu, button }) => {
  it('asks first, and Cancel leaves the Stars and the Stage records as they were', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.openHeader(menu);
    expect(confirmButton('Confirm Wipe')).toBeNull();

    player.click(button);
    expect(confirmButton('Confirm Wipe')).not.toBeNull();
    // Nothing is wiped by asking.
    expect(stars(5)).toBeTruthy();
    player.click('Cancel');

    expect(confirmButton('Confirm Wipe')).toBeNull();
    expect(
      screen.getByRole('heading', { name: MENU_HEADINGS[menu] }),
    ).toBeTruthy();
    expect(stars(5)).toBeTruthy();
    expect(credits('1,234')).toBeTruthy();
    player.click(/^Back to /);
    expect(sectorOneStars(player)).toContain('5/12');
  });

  it('Confirm Wipe clears the Stars and Stage records, keeps the Credits and the screen, and holds after a reload', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.openHeader(menu);

    player.click(button);
    player.click('Confirm Wipe');

    expect(confirmButton('Confirm Wipe')).toBeNull();
    expect(
      screen.getByRole('heading', { name: MENU_HEADINGS[menu] }),
    ).toBeTruthy();
    expect(stars(0)).toBeTruthy();
    expect(credits('1,234')).toBeTruthy();

    player.reload();

    expect(stars(0)).toBeTruthy();
    expect(credits('1,234')).toBeTruthy();
    expect(sectorOneStars(player)).toContain('0/12');
  });

  it('with no Run on show, sends Start Stage back to the first Stage', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.startStage(SECOND_STAGE.id);
    player.clickHeader(PAUSE_FLIGHT);
    player.click('Exit to Academy Home');
    player.openHeader(menu);

    player.click(button);
    player.click('Confirm Wipe');
    player.click(/^Back to /);
    player.click(START_STAGE);

    expect(onShow()).toContain(FIRST_STAGE.title);
  });

  it('over a Debrief, leaves the Debrief and the Stage it was for', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.startStage(SECOND_STAGE.id);
    player.typePrompt();
    player.openHeader(menu);

    player.click(button);
    player.click('Confirm Wipe');
    player.click(/^Back to /);
    expect(screen.getByText(DEBRIEF_TITLE)).toBeTruthy();
    player.click(REPLAY);

    expect(onShow()).toContain(SECOND_STAGE.title);
  });

  it('over a paused Run, clears the Stars and leaves the Run to resume where it was', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.click(START_STAGE);
    player.typePrompt({ characters: 3 });
    const progress = () =>
      screen.getByRole('progressbar', { name: 'Progress' }).textContent;
    const reached = progress();
    expect(reached).not.toBe('0%');
    player.openHeader(menu);

    player.click(button);
    player.click('Confirm Wipe');
    expect(stars(0)).toBeTruthy();
    player.click(/^Back to /);
    player.click(flightDeckLabel(true));

    expect(progress()).toBe(reached);
    expect(stars(0)).toBeTruthy();
  });
});

// The Wipe Stars confirm says what it takes: the player's Stars and cleared
// Stages, with the singular for one.
describe('The Wipe Stars confirm message', () => {
  const dialogText = () => screen.getByRole('alertdialog').textContent ?? '';

  it('gives the Stars and the cleared Stages the player has', () => {
    // RETURNING_PLAYER: 5 Stars over two cleared Stages.
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.openHeader('Analytics');

    player.click('Wipe Stars');

    expect(dialogText()).toMatch(/\b5 Stars\b/);
    expect(dialogText()).toMatch(/\b2 cleared Stages\b/);
  });

  it('uses the singular for one Star and one cleared Stage', () => {
    const player = renderGame({ profile: clearedStages({ 's1-l1': 1 }) });
    player.openHeader('Analytics');

    player.click('Wipe Stars');

    expect(dialogText()).toMatch(/\b1 Star\b(?!s)/);
    expect(dialogText()).toMatch(/\b1 cleared Stage\b(?!s)/);
  });

  it('does not count a Stage that was played but not cleared', () => {
    const player = renderGame({
      profile: {
        stagesProgress: {
          's1-l1': stageProgress('s1-l1', 0, { completed: false }),
        },
      },
    });
    player.openHeader('Analytics');

    player.click('Wipe Stars');

    expect(dialogText()).toMatch(/\b0 Stars\b/);
    expect(dialogText()).toMatch(/\b0 cleared Stages\b/);
  });
});

describe('Cancel on Factory Reset', () => {
  it('leaves the Save as it was', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.openHeader('Analytics');

    player.click('Factory Reset');
    expect(
      screen.queryByRole('button', { name: 'Confirm Reset' }),
    ).not.toBeNull();
    player.click('Cancel');

    expect(screen.queryByRole('button', { name: 'Confirm Reset' })).toBeNull();
    expect(stars(5)).toBeTruthy();
    expect(credits('1,234')).toBeTruthy();
    expect(sectorOneStars(player)).toContain('5/12');
  });
});

// Esc on a confirm cancels the confirm and nothing more. The player's Esc goes
// to whatever has focus (the button they just clicked, or whatever the screen
// moved focus to) and bubbles up to the window's keys, so the test sends it
// there, not straight to the window: an element in the way can then swallow it
// (the Esc contract in attach-keyboard.test.tsx).
const CONFIRMS = [
  {
    where: 'Wipe Stars on Analytics',
    menu: 'Analytics',
    ask: 'Wipe Stars',
    confirm: 'Confirm Wipe',
  },
  {
    where: 'Factory Reset on Analytics',
    menu: 'Analytics',
    ask: 'Factory Reset',
    confirm: 'Confirm Reset',
  },
] as const;

/** A mouse click on a button in the dialog: the button takes focus, then is pressed. */
function clickLikeAMouse(name: string | RegExp) {
  const dialog = screen.getByRole('dialog');
  const button = within(dialog).getByRole('button', { name });
  button.focus();
  fireEvent.click(button);
}

/** Esc as the keyboard sends it: to the focused element, bubbling up to the window. */
function pressEscWhereFocusIs() {
  const target = document.activeElement ?? document.body;
  fireEvent.keyDown(target, { key: 'Escape' });
  fireEvent.keyUp(target, { key: 'Escape' });
}

describe.each(CONFIRMS)(
  'Esc on the $where confirm',
  ({ menu, ask, confirm }) => {
    it('cancels the confirm and nothing more: the screen stays and nothing is wiped', () => {
      const player = renderGame({ profile: RETURNING_PLAYER });
      player.openHeader(menu);
      clickLikeAMouse(ask);
      expect(confirmButton(confirm)).not.toBeNull();

      pressEscWhereFocusIs();

      expect(
        screen.queryByRole('heading', { name: MENU_HEADINGS[menu] }),
      ).not.toBeNull();
      expect(confirmButton(confirm)).toBeNull();
      expect(stars(5)).toBeTruthy();
      expect(credits('1,234')).toBeTruthy();
    });

    it('cancels the confirm wherever focus is: after a click on the backdrop dropped it', () => {
      const player = renderGame({ profile: RETURNING_PLAYER });
      player.openHeader(menu);
      clickLikeAMouse(ask);
      (document.activeElement as HTMLElement).blur();
      expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(
        false,
      );

      pressEscWhereFocusIs();

      expect(
        screen.queryByRole('heading', { name: MENU_HEADINGS[menu] }),
      ).not.toBeNull();
      expect(confirmButton(confirm)).toBeNull();
      expect(stars(5)).toBeTruthy();

      pressEscWhereFocusIs();

      expect(
        screen.queryByRole('heading', { name: MENU_HEADINGS[menu] }),
      ).toBeNull();
    });

    it('is only for the confirm: Esc again goes back from the screen as it always did', () => {
      const player = renderGame({ profile: RETURNING_PLAYER });
      player.openHeader(menu);
      clickLikeAMouse(ask);
      pressEscWhereFocusIs();

      pressEscWhereFocusIs();

      expect(
        screen.queryByRole('heading', { name: MENU_HEADINGS[menu] }),
      ).toBeNull();
      expect(stars(5)).toBeTruthy();
    });
  },
);

// A confirm is a modal for the keyboard and the mouse (#101): an alertdialog
// named by its title, over an Analytics that is inert. The header stays
// reachable on purpose (the model of #84), so it is not inert. @testing-library
// does not treat `inert` as hidden, so the Analytics controls are still found
// by role; the test asks whether each one is inert.
const NAMED_CONFIRMS = [
  { ask: 'Wipe Stars', title: WIPE_STARS_TITLE },
  { ask: 'Factory Reset', title: FACTORY_RESET_TITLE },
] as const;

/** The Analytics controls a confirm sits over. Import Backup is a file chooser, found by its label. */
const analyticsControls = () => [
  screen.getByRole('button', { name: 'Export Backup' }),
  screen.getByRole('button', { name: 'Wipe Stars' }),
  screen.getByRole('button', { name: 'Factory Reset' }),
  screen.getByText('Import Backup'),
];

describe.each(NAMED_CONFIRMS)(
  'The $ask confirm as a modal',
  ({ ask, title }) => {
    it('is an alertdialog named by its title', () => {
      const player = renderGame({ profile: RETURNING_PLAYER });
      player.openHeader('Analytics');

      player.click(ask);

      expect(screen.getByRole('alertdialog', { name: title })).toBeTruthy();
    });

    it('holds Analytics inert while it is open, keeps the header live, and lets Analytics go once it closes', () => {
      const player = renderGame({ profile: RETURNING_PLAYER });
      player.openHeader('Analytics');
      const controls = analyticsControls();
      const galaxyMap = within(screen.getByRole('banner')).getByRole('button', {
        name: 'Galaxy Map',
      });
      for (const control of controls) expect(isInert(control)).toBe(false);

      player.click(ask);

      const confirm = screen.getByRole('alertdialog', { name: title });
      expect(isInert(confirm)).toBe(false);
      expect(isInert(galaxyMap)).toBe(false);
      for (const control of controls) expect(isInert(control)).toBe(true);

      player.click('Cancel');

      expect(screen.queryByRole('alertdialog')).toBeNull();
      for (const control of analyticsControls()) {
        expect(isInert(control)).toBe(false);
      }
    });
  },
);

// The header stays usable over an overlay, so its audio panel can be open
// above a confirm. One Esc closes one layer, the top one: the audio panel,
// then the confirm, then the screen.
describe.each(CONFIRMS)(
  'Esc over the $where confirm and the audio panel',
  ({ menu, ask, confirm }) => {
    it('closes the audio panel, then the confirm, then the screen, one layer each', () => {
      const player = renderGame({ profile: RETURNING_PLAYER });
      player.openHeader(menu);
      clickLikeAMouse(ask);
      // The audio panel opens last, from the header, with a mouse click.
      const opener = within(screen.getByRole('banner')).getByRole('button', {
        name: OPEN_AUDIO_PANEL,
      });
      opener.focus();
      fireEvent.click(opener);
      const panelOpen = () => screen.queryAllByRole('slider').length > 0;
      const screenOpen = () =>
        screen.queryByRole('heading', { name: MENU_HEADINGS[menu] }) !== null;
      expect(panelOpen()).toBe(true);
      expect(confirmButton(confirm)).not.toBeNull();

      player.pressWhereFocusIs('Escape');
      expect(panelOpen()).toBe(false);
      expect(confirmButton(confirm)).not.toBeNull();
      expect(screenOpen()).toBe(true);

      player.pressWhereFocusIs('Escape');
      expect(confirmButton(confirm)).toBeNull();
      expect(screenOpen()).toBe(true);

      player.pressWhereFocusIs('Escape');
      expect(screenOpen()).toBe(false);
      expect(stars(5)).toBeTruthy();
      expect(credits('1,234')).toBeTruthy();
    });
  },
);

// The ticket calls it Wipe Achievements; Analytics' button is still named Wipe
// Stars. Any button with "wipe" in its name counts, so this holds for either.
describe('Wipe lives only in Analytics', () => {
  const wipeButtons = () => screen.queryAllByRole('button', { name: /wipe/i });

  it('the Galaxy Map of a player with Stars has no Wipe button, and so no Wipe confirm to open', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.openHeader('Galaxy Map');

    expect(wipeButtons()).toEqual([]);
    expect(confirmButton('Confirm Wipe')).toBeNull();
  });

  it('the Galaxy Map opened over a Debrief has none either', () => {
    const player = toDebrief();
    player.openHeader('Galaxy Map');

    expect(wipeButtons()).toEqual([]);
  });

  // Academy Home used to offer "Wipe Achievements & Replay" to a player with
  // Stars, a shortcut to the Galaxy Map's wipe.
  it('Academy Home of a player with Stars has none', () => {
    renderGame({ profile: RETURNING_PLAYER });

    expect(wipeButtons()).toEqual([]);
  });

  it('Analytics has it, beside Factory Reset and Backup', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.openHeader('Analytics');

    expect(wipeButtons()).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Factory Reset' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export Backup' })).toBeTruthy();
    // Import Backup is a file chooser, not a button.
    expect(screen.getByText('Import Backup')).toBeTruthy();
  });
});
