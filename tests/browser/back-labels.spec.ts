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

const ORIGINS = {
  academy: {
    name: 'Academy Home',
    go: async (page) => {
      await page.goto('/');
      await expect(academyHome(page)).toBeVisible();
    },
    label: BACK_TO.academy,
    landed: academyHome,
  },
  flightDeck: {
    name: 'the Flight Deck mid-Run',
    go: toFlightDeckMidRun,
    // The Run is paused on the way out, so back lands on the Pause Menu.
    label: BACK_TO.pauseMenu,
    landed: pauseMenu,
  },
  debrief: {
    name: 'the Debrief',
    go: toDebrief,
    label: BACK_TO.debriefing,
    landed: (page) => page.getByRole('button', { name: 'Replay', exact: true }),
  },
  galaxyMap: fromMenu('Galaxy Map', BACK_TO.galaxyMap),
  hangar: fromMenu('Hangar', BACK_TO.hangar),
  analytics: fromMenu('Analytics', BACK_TO.analytics),
  freeFlight: fromMenu('Free Flight', BACK_TO.freeFlight),
} satisfies Record<string, Origin>;

// One case per distinct label (seven), each opening a different menu from a
// different screen, so every menu is opened at least once.
const CASES: { menu: MenuName; origin: Origin }[] = [
  { menu: 'Hangar', origin: ORIGINS.academy },
  { menu: 'Analytics', origin: ORIGINS.flightDeck },
  { menu: 'Galaxy Map', origin: ORIGINS.debrief },
  { menu: 'Analytics', origin: ORIGINS.hangar },
  { menu: 'Free Flight', origin: ORIGINS.galaxyMap },
  { menu: 'Galaxy Map', origin: ORIGINS.analytics },
  { menu: 'Hangar', origin: ORIGINS.freeFlight },
];

for (const { menu, origin } of CASES) {
  test(`${menu} opened from ${origin.name}: "${origin.label}" goes back there`, async ({
    page,
  }) => {
    await origin.go(page);
    await headerButton(page, MENUS[menu].header).click();
    await expect(menuHeading(page, menu)).toBeVisible();

    const back = page.getByRole('button', { name: origin.label, exact: true });
    await expect(back).toBeVisible();
    await back.click();

    await expect(menuHeading(page, menu)).toBeHidden();
    await expect(origin.landed(page)).toBeVisible();
  });
}
