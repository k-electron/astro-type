import { expect, type Page, test } from '@playwright/test';
import {
  closeMenu,
  debrief,
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

// The header's Galaxy Map, Hangar, Analytics and Free Flight buttons work on
// every screen, the Debrief and the Pause Menu included. Each one opens its
// screen, and Close goes back to the screen it was opened from.

const MENU_NAMES = Object.keys(MENUS) as MenuName[];

async function toPauseMenu(page: Page) {
  await launchFreeFlight(page, 'abcdef');
  await typeText(page, 'abc');
  await expect(promptProgress(page)).toHaveText('50%');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(pauseMenu(page)).toBeVisible();
}

async function toDebrief(page: Page) {
  await launchFreeFlight(page, 'ab');
  await typeText(page, 'ab');
  await expect(page.getByText(/Mission Debriefing/)).toBeVisible();
}

for (const menu of MENU_NAMES) {
  test(`the header's ${menu} button works from the Pause Menu`, async ({
    page,
  }) => {
    await toPauseMenu(page);

    await openMenu(page, menu);

    await closeMenu(page);
    await expect(menuHeading(page, menu)).toBeHidden();
    await expect(pauseMenu(page)).toBeVisible();
    // The Run is as it was left.
    await page.getByRole('button', { name: 'Resume Flight' }).click();
    await expect(promptProgress(page)).toHaveText('50%');
  });

  test(`the header's ${menu} button works from the Debrief`, async ({
    page,
  }) => {
    await toDebrief(page);

    await openMenu(page, menu);

    await closeMenu(page);
    await expect(menuHeading(page, menu)).toBeHidden();
    // Back on the Debrief, showing the Run that was just cleared.
    await expect(
      debrief(page).getByRole('heading', {
        name: 'Free Flight Drill',
        level: 2,
      }),
    ).toBeVisible();
  });
}

// Pressing the header button for the screen that is already open changes
// nothing: no second copy of the screen stacks up, so one Close returns.

for (const menu of MENU_NAMES) {
  test(`the header's ${menu} button pressed again on the ${menu} changes nothing, and one Close returns to Academy Home`, async ({
    page,
  }) => {
    await page.goto('/');
    await openMenu(page, menu);

    await headerButton(page, MENUS[menu].header).click();
    await headerButton(page, MENUS[menu].header).click();
    await expect(menuHeading(page, menu)).toBeVisible();

    await closeMenu(page);
    await expect(menuHeading(page, menu)).toBeHidden();
    await expect(
      page.getByRole('button', { name: /begin home row mission/i }),
    ).toBeVisible();
  });
}

test('pressing a header button again mid-Run, one Close lands on the Pause Menu with the Run kept', async ({
  page,
}) => {
  await launchFreeFlight(page, 'abcdef');
  await typeText(page, 'abc');
  await expect(promptProgress(page)).toHaveText('50%');

  await openMenu(page, 'Hangar');
  await headerButton(page, MENUS.Hangar.header).click();
  await headerButton(page, MENUS.Hangar.header).click();

  await closeMenu(page);
  await expect(menuHeading(page, 'Hangar')).toBeHidden();
  await expect(pauseMenu(page)).toBeVisible();

  await page.getByRole('button', { name: 'Resume Flight' }).click();
  await expect(promptProgress(page)).toHaveText('50%');
});

test('pressing a header button again on a menu opened over another menu, one Close returns to that menu', async ({
  page,
}) => {
  await page.goto('/');
  await openMenu(page, 'Galaxy Map');
  await openMenu(page, 'Hangar');
  await headerButton(page, MENUS.Hangar.header).click();

  await closeMenu(page);
  await expect(menuHeading(page, 'Hangar')).toBeHidden();
  await expect(menuHeading(page, 'Galaxy Map')).toBeVisible();
});
