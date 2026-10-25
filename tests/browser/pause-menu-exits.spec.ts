import { expect, type Page, test } from '@playwright/test';
import {
  closeMenu,
  flightDeck,
  launchFreeFlight,
  menuHeading,
  pauseMenu,
  promptProgress,
  startFirstStage,
  typeText,
} from './helpers';

// The Pause Menu's two exits. "View Galaxy Map" opens the Galaxy Map and keeps
// the Run (it was called "Exit to Galaxy Map" until #35, which wrongly sounded
// like leaving the Run). "Exit to Academy Home" still abandons the Run.

async function toPauseMenu(page: Page) {
  // No spaces in the text: after a click, a focused button could take Space.
  await launchFreeFlight(page, 'abcdef');
  await typeText(page, 'abc');
  await expect(promptProgress(page)).toHaveText('50%');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(pauseMenu(page)).toBeVisible();
}

test('the Pause Menu offers "View Galaxy Map", not "Exit to Galaxy Map"', async ({
  page,
}) => {
  await toPauseMenu(page);

  await expect(
    page.getByRole('button', { name: 'View Galaxy Map', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /exit to galaxy map/i }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Exit to Academy Home', exact: true }),
  ).toBeVisible();
});

test('View Galaxy Map opens the Galaxy Map, and Close returns to the Pause Menu with the Run kept', async ({
  page,
}) => {
  await toPauseMenu(page);

  await page.getByRole('button', { name: 'View Galaxy Map' }).click();
  await expect(menuHeading(page, 'Galaxy Map')).toBeVisible();
  await expect(pauseMenu(page)).toBeHidden();

  await closeMenu(page);
  await expect(menuHeading(page, 'Galaxy Map')).toBeHidden();
  await expect(pauseMenu(page)).toBeVisible();

  // Still the same Run, still paused: it carries on from the same character.
  await page.getByRole('button', { name: 'Resume Flight' }).click();
  await expect(pauseMenu(page)).toBeHidden();
  await expect(promptProgress(page)).toHaveText('50%');
  await page.keyboard.press('d');
  await expect(promptProgress(page)).toHaveText('67%');
});

test('Exit to Academy Home abandons the Run: Start Mission begins the Stage afresh', async ({
  page,
}) => {
  await startFirstStage(page);
  await typeText(page, 'f j f j');
  await expect(promptProgress(page)).not.toHaveText('0%');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(pauseMenu(page)).toBeVisible();

  await page.getByRole('button', { name: 'Exit to Academy Home' }).click();
  await expect(pauseMenu(page)).toBeHidden();
  await expect(
    page.getByRole('button', { name: /begin home row mission/i }),
  ).toBeVisible();

  // With no Run to come back to, Start Mission begins Stage 1 from zero.
  await page.getByRole('button', { name: 'Start Mission' }).click();
  await expect(promptProgress(page)).toHaveText('0%');
  await expect(flightDeck(page)).toContainText(/Score\s*0\s*x1/i);
  await expect(
    page.getByRole('button', { name: 'Pause', exact: true }),
  ).toBeVisible();
});
