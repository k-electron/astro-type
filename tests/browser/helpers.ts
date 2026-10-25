import { expect, type Locator, type Page } from '@playwright/test';

// Shared by the browser journeys. Everything here finds things the way a
// player sees them: by role and visible text.

/** The first Stage's text as the player reads it, "␣" standing for a space. */
export const FIRST_STAGE_TEXT =
  'f j f j ff jj fff jjj fj jf f j f j ff jj fj jf f f j j f j fj jf ff jj fj jf';

/** The Flight Deck's HUD and text prompt (the Action Deck is not read). */
export const flightDeck = (page: Page): Locator => page.getByRole('main');

/**
 * The text prompt's progress readout. The HUD's Accuracy readout is also a
 * percentage and comes first on the page, so the prompt's is the last one.
 */
export const promptProgress = (page: Page): Locator =>
  page.getByText(/^\d{1,3}%$/).last();

/** The card the Debrief shows over the Flight Deck. */
export const debrief = (page: Page): Locator =>
  page
    .locator('div')
    .filter({ has: page.getByRole('button', { name: 'Replay' }) })
    .filter({ has: page.getByRole('heading', { level: 2 }) })
    .last();

/** Types text with real key presses, one key at a time. */
export async function typeText(page: Page, text: string): Promise<void> {
  for (const character of text) {
    await page.keyboard.press(character === ' ' ? 'Space' : character);
  }
}

/** Academy Home -> Free Flight -> Launch with the given text. */
export async function launchFreeFlight(page: Page, text: string) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Free Flight', exact: true }).click();
  await page.getByRole('textbox').fill(text);
  await page.getByRole('button', { name: 'Launch Custom Flight' }).click();
  await expect(
    page.getByRole('button', { name: 'Pause', exact: true }),
  ).toBeVisible();
  await expect(promptProgress(page)).toHaveText('0%');
}

/** Academy Home -> the first Stage, ready for its first key. */
export async function startFirstStage(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /begin home row mission/i }).click();
  await expect(
    page.getByRole('button', { name: 'Pause', exact: true }),
  ).toBeVisible();
  await expect(promptProgress(page)).toHaveText('0%');
  // The prompt shows the text the journeys type; a Stage whose text changed
  // fails here instead of hanging later.
  await expect(flightDeck(page)).toContainText(
    FIRST_STAGE_TEXT.replaceAll(' ', '␣'),
  );
}

/** Types the first Stage to its last character; the Debrief follows. */
export async function clearFirstStage(page: Page) {
  await typeText(page, FIRST_STAGE_TEXT);
  await expect(page.getByText(/Mission Debriefing/)).toBeVisible();
}
