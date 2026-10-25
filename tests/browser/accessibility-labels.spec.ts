import { expect, test } from '@playwright/test';
import {
  currentCharacter,
  hud,
  launchFreeFlight,
  promptProgress,
  textPrompt,
  typeText,
} from './helpers';

// A screen reader user follows the Run through labels: the text prompt, its
// progress, the character to type next, and the HUD.

// Six different letters, so each position in the prompt is easy to tell apart.
const TEXT = 'abcdef';

test('the HUD is a labelled region holding the score, speed and accuracy', async ({
  page,
}) => {
  await launchFreeFlight(page, TEXT);

  const region = hud(page);
  await expect(region).toBeVisible();
  await expect(region).toContainText(/Score/i);
  await expect(region).toContainText(/Speed/i);
  await expect(region).toContainText(/Accuracy\s*100%/i);
  await expect(region).toContainText(/Streak/i);
  // The text prompt is not part of the HUD.
  await expect(region).not.toContainText(TEXT);
});

test('the text prompt and its progress can be found by label', async ({
  page,
}) => {
  await launchFreeFlight(page, TEXT);

  await expect(textPrompt(page)).toBeVisible();
  await expect(textPrompt(page)).toContainText(TEXT);
  await expect(promptProgress(page)).toHaveText('0%');

  await typeText(page, 'abc');
  await expect(promptProgress(page)).toHaveText('50%');
});

test('the current character is marked and moves on as the player types', async ({
  page,
}) => {
  await launchFreeFlight(page, TEXT);

  // Exactly one character is current, and it is the first one.
  await expect(currentCharacter(page)).toHaveCount(1);
  await expect(currentCharacter(page)).toHaveText('a');

  await page.keyboard.press('a');
  await expect(currentCharacter(page)).toHaveCount(1);
  await expect(currentCharacter(page)).toHaveText('b');

  await typeText(page, 'bc');
  await expect(currentCharacter(page)).toHaveCount(1);
  await expect(currentCharacter(page)).toHaveText('d');

  // A wrong key is a Miss and the character stays to be typed.
  await page.keyboard.press('z');
  await expect(promptProgress(page)).toHaveText('50%');
  await expect(currentCharacter(page)).toHaveText('d');

  await page.keyboard.press('d');
  await expect(currentCharacter(page)).toHaveText('e');
});
