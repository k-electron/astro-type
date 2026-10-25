import { expect, type Page, test } from '@playwright/test';
import {
  clearFirstStage,
  currentCharacter,
  debrief,
  launchFreeFlight,
  menuHeading,
  openMenu,
  seedStageStars,
  startFirstStage,
  typeText,
} from './helpers';

// Next Stage on the last Stage takes the player to the Galaxy Map (spec story
// 13). Its Debrief shows a button called "Back to Galaxy Map" (the Debrief's
// own "Galaxy Map" button keeps its name) where every other
// Stage's Debrief shows "Next Mission" (decided in #35).

/** The Debrief's navigation buttons, in the order they are laid out. */
async function debriefButtons(page: Page): Promise<string[]> {
  const names = await debrief(page).getByRole('button').allInnerTexts();
  return names
    .map((name) => name.trim())
    .filter((name) =>
      [
        'Replay',
        'Galaxy Map',
        'Main Menu',
        'Next Mission',
        'Back to Galaxy Map',
      ].includes(name),
    );
}

/**
 * The text the prompt shows for the Run on screen, the way the player types
 * it: the characters line next to the cursor, "␣" read as a space.
 */
async function shownText(page: Page): Promise<string> {
  const line = await currentCharacter(page).locator('xpath=..').textContent();
  return (line ?? '').replaceAll('␣', ' ');
}

/**
 * Up to the last Stage of the game: a Profile that has cleared more Stages
 * than the curriculum has (ids that are not Stages are left alone), so every
 * Sector is open; then the Galaxy Map's last Sector and its last Stage.
 */
async function launchLastStage(page: Page) {
  const stars: Record<string, number> = {};
  for (let sector = 1; sector <= 12; sector++) {
    for (let stage = 1; stage <= 8; stage++) {
      stars[`s${sector}-l${stage}`] = 3;
    }
  }
  // The hands and the keyboard are hidden (set in the Profile, not clicked, so
  // no button keeps focus and takes a Space): the lighter deck keeps the
  // Run's many keys quick.
  await seedStageStars(page, stars, {
    handsVisible: false,
    keyboardVisible: false,
  });
  await page.goto('/');
  await openMenu(page, 'Galaxy Map');
  await page
    .getByRole('button', { name: /Sector \d+/ })
    .last()
    .click();
  // The Stages already cleared offer Replay where the others offer Launch.
  await page
    .getByRole('button', { name: /^(Launch|Replay) Mission$/ })
    .last()
    .click();
  await expect(
    page.getByRole('button', { name: 'Pause', exact: true }),
  ).toBeVisible();
  await expect(currentCharacter(page)).toBeVisible();
}

test('the Debrief of the last Stage shows "Back to Galaxy Map" in place of "Next Mission", and it opens the Galaxy Map', async ({
  page,
}) => {
  await launchLastStage(page);
  // Whatever the text is today, it is typed off the prompt.
  await typeText(page, await shownText(page));
  await expect(page.getByText(/Mission Debriefing/)).toBeVisible();

  // Where Next Mission sits, after Replay, Galaxy Map and Main Menu.
  await expect
    .poll(() => debriefButtons(page))
    .toEqual(['Replay', 'Galaxy Map', 'Main Menu', 'Back to Galaxy Map']);
  await expect(page.getByRole('button', { name: 'Next Mission' })).toHaveCount(
    0,
  );

  await debrief(page)
    .getByRole('button', { name: 'Back to Galaxy Map', exact: true })
    .click();
  await expect(menuHeading(page, 'Galaxy Map')).toBeVisible();
});

test('the Debrief of any other Stage keeps its "Next Mission" button', async ({
  page,
}) => {
  await startFirstStage(page);
  await clearFirstStage(page);

  await expect
    .poll(() => debriefButtons(page))
    .toEqual(['Replay', 'Galaxy Map', 'Main Menu', 'Next Mission']);
});

test('the Debrief of a Free Flight Run has no "Next Mission" and no "Back to Galaxy Map"', async ({
  page,
}) => {
  // A Free Flight Stage is not in the curriculum, so it has no next Stage.
  const text = 'f j f j';
  await launchFreeFlight(page, text);
  await typeText(page, text);
  await expect(page.getByText(/Mission Debriefing/)).toBeVisible();

  await expect
    .poll(() => debriefButtons(page))
    .toEqual(['Replay', 'Galaxy Map', 'Main Menu']);
});
