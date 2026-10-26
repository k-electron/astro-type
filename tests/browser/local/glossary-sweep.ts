import { expect, type Page } from '@playwright/test';

// The glossary-name sweep the local journeys share: the game says Streak and
// Overdrive, never combo, hyperspace or warp (GLOSSARY.md: Streak, Multiplier
// and Overdrive each list those as words to avoid).

/**
 * The banned words. `\b` keeps this to whole words, so a word that merely
 * contains one ("swarp", "Comboy") is not flagged; the endings cover "combos",
 * "warped", "warping" and "hyper-space".
 */
export const BANNED_NAME =
  /\b(?:combos?|hyper[\s-]?space|warp(?:s|ed|ing)?)\b/i;

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
