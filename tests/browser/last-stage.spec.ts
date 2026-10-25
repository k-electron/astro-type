import { expect, type Page, test } from '@playwright/test';
import {
  clearFirstStage,
  debrief,
  flightDeck,
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

/** The last Stage's text as the player reads it, "␣" standing for a space. */
const LAST_STAGE_TEXT =
  'The cosmos is within us. We are made of star-stuff. We are a way for the cosmos to know itself. 100 billion galaxies, each with 100 billion stars: our journey has only just begun!';

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

/** A Profile with Sector 7 open (60 Stars), then up to the last Stage. */
async function launchLastStage(page: Page) {
  const stars: Record<string, number> = {};
  for (let sector = 1; sector <= 5; sector++) {
    for (let stage = 1; stage <= 4; stage++) {
      stars[`s${sector}-l${stage}`] = 3;
    }
  }
  // The hands and the keyboard are hidden (set in the Profile, not clicked, so
  // no button keeps focus and takes a Space): the Run is long, and the lighter
  // deck keeps it quick.
  await seedStageStars(page, stars, {
    handsVisible: false,
    keyboardVisible: false,
  });
  await page.goto('/');
  await openMenu(page, 'Galaxy Map');
  await page.getByRole('button', { name: /Sector 07/ }).click();
  // Sector 7 has four Stages; the last one is the last Stage of the game.
  await page.getByRole('button', { name: 'Launch Mission' }).last().click();
  await expect(flightDeck(page)).toContainText('Cosmic Grandmaster Trial');
  await expect(flightDeck(page)).toContainText(
    LAST_STAGE_TEXT.replaceAll(' ', '␣'),
  );
}

test('the Debrief of the last Stage shows "Back to Galaxy Map" in place of "Next Mission", and it opens the Galaxy Map', async ({
  page,
}) => {
  // The last Stage's text is 175 characters of prose, typed key by key.
  test.setTimeout(120_000);
  await launchLastStage(page);
  await typeText(page, LAST_STAGE_TEXT);
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
