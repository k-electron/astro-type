import { expect, type Locator, type Page } from '@playwright/test';
import { drone, hud } from './helpers';

// Helpers shared by the CI journeys (deck, keyboard-focus, deck-timing,
// popups-and-names, persistence). Like helpers.ts, they find things the way a
// player sees them: by role and visible text, and, inside the Action Deck's
// canvas, through the PixiJS accessibility layer.

/** The bottom edge of an element on the page, or -1 while it isn't drawn. */
export async function bottomEdge(element: Locator): Promise<number> {
  const box = await element.boundingBox({ timeout: 2000 });
  return box ? box.y + box.height : -1;
}

/** The Score the HUD shows right now. */
export async function hudScore(page: Page): Promise<number> {
  const text = (await hud(page).textContent()) ?? '';
  const match = /score\s*([\d,]+)/i.exec(text);
  if (!match) throw new Error(`No score in the HUD: ${text}`);
  return Number(match[1].replaceAll(',', ''));
}

/** The Speed the HUD shows right now. */
export async function hudSpeed(page: Page): Promise<number> {
  const text = (await hud(page).textContent()) ?? '';
  const match = /Speed\s*(\d+)\s*WPM/i.exec(text);
  if (!match) throw new Error(`No Speed in the HUD: ${text}`);
  return Number(match[1]);
}

/**
 * Types keys one at a time and waits for the HUD to show the Streak each one
 * makes. The text has to be right all the way: it counts on every key being a
 * hit, starting from a Streak of 0.
 */
export async function typeKeys(page: Page, keys: string): Promise<void> {
  let streak = 0;
  for (const key of keys) {
    await page.keyboard.press(key === ' ' ? 'Space' : key);
    streak += 1;
    await expectStreak(page, streak);
  }
}

/** Waits for the HUD to show this Streak. */
export const expectStreak = (page: Page, streak: number) =>
  expect(hud(page)).toContainText(
    new RegExp(`Streak\\s*${streak}(?!\\d)`, 'i'),
  );

/** The Pause button on the Flight Deck. */
export const pauseButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Pause', exact: true });

/** The Pause Menu's Resume button. */
export const resumeButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Resume Flight' });

/**
 * Waits until the Action Deck is up and has drawn its Drones (the deck starts
 * in the background, and a hit judged before it is up gets no popup), without
 * letting the Drones fall: the Run is paused while the clock gives the deck its
 * frames, and carries on afterwards. Pass the first character of the text.
 */
export async function waitForDeck(page: Page, first: string) {
  await pauseButton(page).click();
  await expect(
    page.getByRole('heading', { name: 'Mission Paused' }),
  ).toBeVisible();
  await expect(async () => {
    await page.clock.runFor(50);
    await expect(drone(page, first)).toBeVisible({ timeout: 250 });
  }).toPass({ timeout: 20_000 });
  await resumeButton(page).click();
  await expect(
    page.getByRole('heading', { name: 'Mission Paused' }),
  ).toBeHidden();
}

/**
 * Free Flight, ready for the first key, with the page clock stopped before the
 * page loads. Nothing moves until a journey runs the clock: the Drones stay
 * where the Run seeded them, far above the Strike Line, so any key is a Good.
 */
export async function launchOnStoppedClock(page: Page, text: string) {
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Free Flight', exact: true }).click();
  await page.getByRole('textbox').fill(text);
  await page.getByRole('button', { name: 'Launch Custom Flight' }).click();
  await expect(pauseButton(page)).toBeVisible();
  await expect(page.getByRole('main')).toContainText(text.replaceAll(' ', '␣'));
}
