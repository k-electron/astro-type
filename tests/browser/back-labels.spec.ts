import { expect, type Locator, type Page, test } from '@playwright/test';
import {
  BACK_TO,
  debriefHeading,
  headerButton,
  launchFreeFlight,
  MENUS,
  type MenuName,
  menuHeading,
  openMenu,
  pauseMenu,
  promptProgress,
  typeText,
} from './helpers';

// The back button of every menu reads "Back to <the screen it returns to>"
// (decided in #35). The destination names are the ones the app shows today
// ("Sectors" for the Galaxy Map, "Academy" for Academy Home, ...); #37 settles
// them against GLOSSARY.md. Each case opens a menu from somewhere, checks the
// button's name, presses it and checks the player is where the name said.
//
// The Cancel button of a confirm dialog is not a back button and is not here.

interface Origin {
  /** Where the menu is opened from. */
  name: string;
  /** Gets the game there. */
  go: (page: Page) => Promise<void>;
  /** The label of the button that returns here. */
  label: string;
  /** What shows once the player is back. */
  landed: (page: Page) => Locator;
}

const academyHome = (page: Page) =>
  page.getByRole('button', { name: /begin home row mission/i });

async function toFlightDeckMidRun(page: Page) {
  await launchFreeFlight(page, 'abcdef');
  await typeText(page, 'abc');
  await expect(promptProgress(page)).toHaveText('50%');
}

async function toPauseMenu(page: Page) {
  await toFlightDeckMidRun(page);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(pauseMenu(page)).toBeVisible();
}

async function toDebrief(page: Page) {
  await launchFreeFlight(page, 'ab');
  await typeText(page, 'ab');
  await expect(debriefHeading(page)).toBeVisible();
}

/** Another menu, opened from Academy Home. */
const fromMenu = (menu: MenuName, label: string): Origin => ({
  name: `the ${menu}`,
  go: async (page) => {
    await page.goto('/');
    await openMenu(page, menu);
  },
  label,
  landed: (page) => menuHeading(page, menu),
});

const ORIGINS: Origin[] = [
  {
    name: 'Academy Home',
    go: async (page) => {
      await page.goto('/');
      await expect(academyHome(page)).toBeVisible();
    },
    label: BACK_TO.academy,
    landed: academyHome,
  },
  {
    name: 'the Flight Deck mid-Run',
    go: toFlightDeckMidRun,
    // The Run is paused on the way out, so back lands on the Pause Menu.
    label: BACK_TO.pauseMenu,
    landed: pauseMenu,
  },
  {
    name: 'the Pause Menu',
    go: toPauseMenu,
    label: BACK_TO.pauseMenu,
    landed: pauseMenu,
  },
  {
    name: 'the Debrief',
    go: toDebrief,
    label: BACK_TO.debriefing,
    landed: (page) => page.getByRole('button', { name: 'Replay', exact: true }),
  },
  fromMenu('Galaxy Map', BACK_TO.galaxyMap),
  fromMenu('Hangar', BACK_TO.hangar),
  fromMenu('Analytics', BACK_TO.analytics),
  fromMenu('Free Flight', BACK_TO.freeFlight),
];

/** One case per opener, for the menus in `menus`. */
function backLabelCases(menus: MenuName[]) {
  for (const menu of menus) {
    for (const origin of ORIGINS) {
      // Pressing a header button for the screen already open opens nothing.
      if (origin.name === `the ${menu}`) continue;

      test(`${menu} opened from ${origin.name}: "${origin.label}" goes back there`, async ({
        page,
      }) => {
        await origin.go(page);
        await headerButton(page, MENUS[menu].header).click();
        await expect(menuHeading(page, menu)).toBeVisible();

        const back = page.getByRole('button', {
          name: origin.label,
          exact: true,
        });
        await expect(back).toBeVisible();
        await back.click();

        await expect(menuHeading(page, menu)).toBeHidden();
        await expect(origin.landed(page)).toBeVisible();
      });
    }
  }
}

test.describe('Hangar and Analytics', () => {
  backLabelCases(['Hangar', 'Analytics']);
});

// The Galaxy Map and Free Flight read "Close", "Debriefing" and "Cancel" today.
// The rule says every back button, so these are expected to follow it too.
test.describe('Galaxy Map and Free Flight', () => {
  backLabelCases(['Galaxy Map', 'Free Flight']);
});
