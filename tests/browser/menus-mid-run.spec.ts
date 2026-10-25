import { expect, test } from '@playwright/test';
import {
  closeMenu,
  hud,
  launchFreeFlight,
  menuHeading,
  openMenu,
  pauseMenu,
  promptProgress,
  typeText,
} from './helpers';

// Journey 4: open the Galaxy Map, Hangar and Analytics in the middle of a Run.
// Each Close goes back where it should (the Pause Menu, when it returns to the
// Run), and the Run is intact.

/** The score the HUD shows (the HUD stays in the page behind a menu). */
async function score(page: Parameters<typeof hud>[0]): Promise<string> {
  const text = (await hud(page).textContent()) ?? '';
  const found = /Score\s*(\d+)/i.exec(text);
  expect(found, `no Score in the HUD: ${text}`).not.toBeNull();
  return found?.[1] ?? '';
}

test('menus opened mid-Run each Close back where they should, and the Run is intact', async ({
  page,
}) => {
  // No spaces in the text: after a click, a focused button could take Space.
  await launchFreeFlight(page, 'abcdef');
  await typeText(page, 'abc');
  await expect(promptProgress(page)).toHaveText('50%');
  const scoreMidRun = await score(page);
  expect(Number(scoreMidRun)).toBeGreaterThan(0);

  const resume = async () => {
    await page.getByRole('button', { name: 'Resume Flight' }).click();
    await expect(pauseMenu(page)).toBeHidden();
    // Same place, same score: the Run was kept, not restarted.
    await expect(promptProgress(page)).toHaveText('50%');
    expect(await score(page)).toBe(scoreMidRun);
  };

  // Each menu, straight from the Flight Deck: Close lands on the Pause Menu.
  for (const menu of ['Galaxy Map', 'Hangar', 'Analytics'] as const) {
    await openMenu(page, menu);
    await closeMenu(page);
    await expect(pauseMenu(page)).toBeVisible();
    await expect(menuHeading(page, menu)).toBeHidden();
    await resume();
  }

  // A chain: Flight Deck > Galaxy Map > Hangar. Close unwinds it one step at a
  // time: Hangar to the Galaxy Map, the Galaxy Map to the Pause Menu.
  await openMenu(page, 'Galaxy Map');
  await page.getByRole('button', { name: 'Hangar Upgrades' }).click();
  await expect(menuHeading(page, 'Hangar')).toBeVisible();

  await closeMenu(page);
  await expect(menuHeading(page, 'Galaxy Map')).toBeVisible();
  await expect(menuHeading(page, 'Hangar')).toBeHidden();

  await closeMenu(page);
  await expect(pauseMenu(page)).toBeVisible();
  await expect(menuHeading(page, 'Galaxy Map')).toBeHidden();
  await resume();

  // The Run carries on from the character it was on, to the Debrief.
  await page.keyboard.press('d');
  await expect(promptProgress(page)).toHaveText('67%');
  await typeText(page, 'ef');
  await expect(page.getByText(/Mission Debriefing/)).toBeVisible();
});
