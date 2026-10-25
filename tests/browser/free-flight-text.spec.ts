import { expect, test } from '@playwright/test';
import { debrief, launchFreeFlight, typeText } from './helpers';

// Free Flight text is checked at Launch (ticket #26): look-alike characters
// become plain keys, and anything that still can't be typed blocks Launch.

test('Free Flight: pasted curly quotes, a long dash and line breaks play through to the Debrief on plain keys', async ({
  page,
}) => {
  // Curly single and double quotes, a long dash, a line break and a tab, as
  // text pasted from a web page or a word processor would carry them.
  const pasted = 'Don’t stop — “go”\nnow\tfast';
  const typed = 'Don\'t stop - "go" now fast';

  await launchFreeFlight(page, pasted);

  // The prompt shows the plain keys the player will actually press.
  await expect(page.getByRole('main')).toContainText(
    typed.replaceAll(' ', '␣'),
  );

  await typeText(page, typed);

  const result = debrief(page);
  await expect(
    result.getByRole('heading', { name: 'Free Flight Drill', level: 2 }),
  ).toBeVisible();
  await expect(result).toContainText(/Accuracy\s*100%/i);
});

test('Free Flight: text with a character that has no key disables Launch and names it', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Free Flight', exact: true }).click();

  await page.getByRole('textbox').fill('ready \u{1F680} launch');

  await expect(
    page.getByRole('button', { name: 'Launch Custom Flight' }),
  ).toBeDisabled();
  // The message lists the character; the textbox's own value doesn't count.
  await expect(page.getByText('\u{1F680}').first()).toBeVisible();
});
