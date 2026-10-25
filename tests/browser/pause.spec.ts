import { expect, test } from '@playwright/test';
import { launchFreeFlight, promptProgress, typeText } from './helpers';

test('pausing and resuming carries on from the same character', async ({
  page,
}) => {
  // No spaces in the text: after a click, a focused button could take Space.
  await launchFreeFlight(page, 'abcdef');

  await typeText(page, 'abc');
  await expect(promptProgress(page)).toHaveText('50%');

  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Mission Paused' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Resume Flight' }).click();
  await expect(
    page.getByRole('heading', { name: 'Mission Paused' }),
  ).toBeHidden();

  // Same place as before the pause: not restarted, not skipped ahead.
  await expect(promptProgress(page)).toHaveText('50%');

  // The next key is still "d". Playing on finishes the Run.
  await page.keyboard.press('d');
  await expect(promptProgress(page)).toHaveText('67%');
  await typeText(page, 'ef');
  await expect(page.getByText(/Mission Debriefing/)).toBeVisible();
});
