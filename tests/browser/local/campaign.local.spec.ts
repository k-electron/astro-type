import { expect, test } from '@playwright/test';
import { clearFirstStage, debrief, startFirstStage } from './helpers';

test('clearing a Stage shows the Debrief, and the Stars are kept after a reload', async ({
  page,
}) => {
  await startFirstStage(page);
  await expect(
    page.getByRole('button', { name: '0 ★', exact: true }),
  ).toBeVisible();

  await clearFirstStage(page);

  // Debrief: the Stage, its WPM and the Stars it earned.
  const result = debrief(page);
  await expect(
    result.getByRole('heading', { name: 'The Tactile Anchors', level: 2 }),
  ).toBeVisible();
  await expect(result).toContainText(/Speed\s*[1-9]\d*\s*WPM/i);
  await expect(result).toContainText(/\+3\s*new/i);
  await expect(
    page.getByRole('button', { name: '3 ★', exact: true }),
  ).toBeVisible();

  // The Save outlives the page: the Stars are still there after a reload.
  await page.reload();
  await expect(
    page.getByRole('button', { name: '3 ★', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Sectors', exact: true }).click();
  await expect(page.getByRole('button', { name: /Orion Belt/ })).toContainText(
    '3/12',
  );
});
