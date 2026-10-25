import { expect, test } from '@playwright/test';
import {
  clearFirstStage,
  flightDeck,
  promptProgress,
  startFirstStage,
} from './helpers';

// After a clear, the HUD behind the Debrief still shows the cleared Run's
// score. A fresh Run starts from zero.

test('Replay from the Debrief starts a fresh Run of the same Stage', async ({
  page,
}) => {
  await startFirstStage(page);
  await clearFirstStage(page);
  await expect(flightDeck(page)).not.toContainText(/Score\s*0\s*x1/i);

  await page.getByRole('button', { name: 'Replay' }).click();

  await expect(page.getByText(/Mission Debriefing/)).toBeHidden();
  await expect(flightDeck(page)).toContainText('The Tactile Anchors');
  await expect(flightDeck(page)).toContainText(/Score\s*0\s*x1/i);
  await expect(promptProgress(page)).toHaveText('0%');

  // And it is a live Run: the Stage's first key is "f".
  await page.keyboard.press('f');
  await expect(promptProgress(page)).not.toHaveText('0%');
});

test('Next Stage from the Debrief starts a fresh Run of the next Stage', async ({
  page,
}) => {
  await startFirstStage(page);
  await clearFirstStage(page);
  await expect(flightDeck(page)).not.toContainText(/Score\s*0\s*x1/i);

  // The Debrief calls it "Next Mission".
  await page.getByRole('button', { name: 'Next Mission' }).click();

  await expect(page.getByText(/Mission Debriefing/)).toBeHidden();
  await expect(flightDeck(page)).toContainText('Middle Finger Expansion');
  await expect(flightDeck(page)).toContainText(/Score\s*0\s*x1/i);
  await expect(promptProgress(page)).toHaveText('0%');
  await expect(
    page.getByRole('button', { name: 'Pause', exact: true }),
  ).toBeVisible();
});
