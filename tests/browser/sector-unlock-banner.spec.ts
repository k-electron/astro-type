import { expect, type Page, test } from '@playwright/test';
import {
  clearFirstStage,
  debriefHeading,
  launchFreeFlight,
  sectorUnlockedBanner,
  seedStageStars,
  startFirstStage,
  typeText,
} from './helpers';

// The Debrief's "New Sector Unlocked! Find it on the Galaxy Map." notice shows
// only when the Run just cleared actually opened a Sector (decided in #35).
// Sectors open on the fleet's total Stars: Sector 02 needs 6.
//
// A "no banner" check passes trivially if it looks before the card has been
// drawn, so each one first waits for the card's own buttons.

/** The Debrief card is drawn once its buttons are there. */
async function expectDebriefShown(page: Page) {
  await expect(debriefHeading(page)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Replay', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Main Menu', exact: true }),
  ).toBeVisible();
}

test('the banner shows when the Run just cleared opened a Sector', async ({
  page,
}) => {
  // 3 Stars so far: clearing Stage 1 for 3 Stars takes the fleet to 6.
  await seedStageStars(page, { 's1-l2': 3 });
  await startFirstStage(page);
  await clearFirstStage(page);

  await expectDebriefShown(page);
  await expect(sectorUnlockedBanner(page)).toBeVisible();
  await expect(sectorUnlockedBanner(page)).toContainText(
    'New Sector Unlocked! Find it on the Galaxy Map.',
  );
});

test('the banner shows when a Free Flight clear is what opened a Sector', async ({
  page,
}) => {
  // 5 Stars so far: any Star from a Free Flight reaches 6.
  await seedStageStars(page, { 's1-l1': 3, 's1-l2': 2 });
  await launchFreeFlight(page, 'ab');
  await typeText(page, 'ab');

  await expectDebriefShown(page);
  await expect(sectorUnlockedBanner(page)).toBeVisible();
});

test('no banner after Stage 1 is cleared while Sector 02 is still locked', async ({
  page,
}) => {
  // A fresh Profile: 3 Stars is short of the 6 that open Sector 02.
  await startFirstStage(page);
  await clearFirstStage(page);

  await expectDebriefShown(page);
  await expect(sectorUnlockedBanner(page)).toHaveCount(0);
});

test('no banner when the Sector the Stars would open was already open', async ({
  page,
}) => {
  // 6 Stars already open Sector 02. Replaying Stage 1 for 3 Stars adds
  // nothing new, and a Sector that was open before the Run is not unlocked by it.
  await seedStageStars(page, { 's1-l1': 3, 's1-l2': 3 });
  await startFirstStage(page);
  await clearFirstStage(page);

  await expectDebriefShown(page);
  await expect(sectorUnlockedBanner(page)).toHaveCount(0);
});

test('no banner after a Free Flight clear that opens nothing', async ({
  page,
}) => {
  await launchFreeFlight(page, 'ab');
  await typeText(page, 'ab');

  await expectDebriefShown(page);
  await expect(sectorUnlockedBanner(page)).toHaveCount(0);
});
