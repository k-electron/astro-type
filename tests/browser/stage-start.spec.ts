import { expect, test } from '@playwright/test';
import { promptProgress } from './helpers';

test('a Stage can start', { tag: '@smoke' }, async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await page.goto('/');

  // Academy Home: start the first Stage.
  await page.getByRole('button', { name: /begin home row mission/i }).click();

  // Flight Deck: a Run is underway once it can be paused.
  await expect(
    page.getByRole('button', { name: 'Pause', exact: true }),
  ).toBeVisible();

  // The text prompt's progress readout, found by its label.
  await expect(promptProgress(page)).toHaveText('0%');

  // The first Stage opens on "f"; the lead Drone waits at the Strike Line.
  await page.keyboard.press('f');

  await expect(promptProgress(page)).not.toHaveText('0%');
  expect(pageErrors).toEqual([]);
});
