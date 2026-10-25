import { expect, test } from '@playwright/test';
import { debrief, launchFreeFlight, typeText } from './helpers';

test('Free Flight: a short text of your own plays through to the Debrief', async ({
  page,
}) => {
  const text = 'the quick fox';
  await launchFreeFlight(page, text);

  // The player's own text is what the prompt shows.
  await expect(page.getByRole('main')).toContainText('the␣quick␣fox');

  await typeText(page, text);

  const result = debrief(page);
  await expect(
    result.getByRole('heading', { name: 'Free Flight Drill', level: 2 }),
  ).toBeVisible();
  await expect(result).toContainText(/Speed\s*[1-9]\d*\s*WPM/i);
  await expect(result).toContainText(/Accuracy\s*100%/i);
});
