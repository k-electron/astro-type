import { expect, type Locator, type Page } from '@playwright/test';
import { BANNED_NAME } from '../shared/names';
import { drone, hud, launchFreeFlight } from './helpers';

// Helpers shared by the journeys, CI's and the local-only ones. Like
// helpers.ts, they find things the way a player sees them: by role and visible
// text, and, inside the Action Deck's canvas, through the PixiJS accessibility
// layer.

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

export const expectStreak = (page: Page, streak: number) =>
  expect(hud(page)).toContainText(
    new RegExp(`Streak\\s*${streak}(?!\\d)`, 'i'),
  );

export const pauseButton = (page: Page): Locator =>
  page.getByRole('button', { name: 'Pause', exact: true });

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
export async function launchOnStoppedClock(
  page: Page,
  text: string,
  shown: string = text,
) {
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
  await launchFreeFlight(page, text, shown);
}

/**
 * Every line of text a player can read or hear on the screen as it is right
 * now: the visible text, the accessible names a screen reader announces (an
 * accessibility snapshot), the tooltips, the labels, and the page title. The
 * Action Deck's accessibility layer carries the canvas's drawn text (Drones,
 * keycaps, hit popups) in its labels and titles.
 */
export async function textOnScreen(page: Page): Promise<string[]> {
  const body = page.locator('body');
  // innerText on purpose: it reads what is rendered, as the player sees it.
  // biome-ignore lint/performance/useDomNodeTextContent: rendered text is the point
  const visible = await body.innerText();
  const announced = await body.ariaSnapshot();
  const attributes = await page
    .locator('[title], [aria-label]')
    .evaluateAll((elements) =>
      elements.flatMap((element) => [
        element.getAttribute('title') ?? '',
        element.getAttribute('aria-label') ?? '',
      ]),
    );
  const lines = [
    ...visible.split('\n'),
    ...announced.split('\n'),
    ...attributes,
    await page.title(),
  ].map((line) => line.trim());
  return [...new Set(lines.filter((line) => line !== ''))];
}

/**
 * Soft: names the offending lines when the screen uses a banned word, and goes
 * on, so one run reports every screen. Returns the lines it read.
 */
export async function expectNoBannedNames(
  page: Page,
  where: string,
): Promise<string[]> {
  const lines = await textOnScreen(page);
  expect
    .soft(
      lines.filter((line) => BANNED_NAME.test(line)),
      `${where}: text that uses combo, hyperspace or warp`,
    )
    .toEqual([]);
  return lines;
}
