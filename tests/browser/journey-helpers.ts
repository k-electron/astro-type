import {
  type Browser,
  expect,
  type Locator,
  type Page,
  test,
} from '@playwright/test';
import { BANNED_NAME } from '../shared/names';
import { flightDeckLabel } from '../../src/screens/closeLabel';
import { NO_SPEED, PAUSE_FLIGHT, PAUSE_MENU_NAME } from '../shared/screens';
import { drone, hud, launchFreeFlight, pauseMenu } from './helpers';

// Helpers shared by the journeys, CI's and the local-only ones. Like
// helpers.ts, they find things the way a player sees them: by role and visible
// text, and, inside the Action Deck's canvas, through the PixiJS accessibility
// layer.

/**
 * Runs `journey` on a page of a browser context of its own, so the Save the
 * step seeds, and the window size it sets, reach no other step. The context is
 * closed afterwards, even when the step fails. It needs the running test's
 * project for the `baseURL`, so call it inside a test.
 */
export async function inFreshContext(
  browser: Browser,
  journey: (page: Page) => Promise<void>,
  viewport?: { width: number; height: number },
): Promise<void> {
  const context = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
    ...(viewport ? { viewport } : {}),
  });
  try {
    await journey(await context.newPage());
  } finally {
    await context.close();
  }
}

/**
 * The bottom edge of an element on the page, or -1 while it is there but not
 * drawn. It waits for the element to be there.
 */
export async function bottomEdge(element: Locator): Promise<number> {
  const drawn = await element.boundingBox();
  return drawn ? drawn.y + drawn.height : -1;
}

/** The Score the HUD shows right now. */
export async function hudScore(page: Page): Promise<number> {
  const text = (await hud(page).textContent()) ?? '';
  const match = /score\s*([\d,]+)/i.exec(text);
  if (!match) throw new Error(`No score in the HUD: ${text}`);
  return Number(match[1].replaceAll(',', ''));
}

/** The Speed the HUD shows right now, or null while it shows the dash (the Run has no WPM yet). */
export async function hudSpeed(page: Page): Promise<number | null> {
  const text = (await hud(page).textContent()) ?? '';
  if (new RegExp(`Speed\\s*${NO_SPEED}`).test(text)) return null;
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
  page.getByRole('button', { name: PAUSE_FLIGHT, exact: true });

/**
 * The Pause Menu's Resume Flight. The header reads Resume Flight too while a
 * Run is paused, so this looks inside the Pause Menu.
 */
export const resumeButton = (page: Page): Locator =>
  page
    .getByRole('dialog', { name: PAUSE_MENU_NAME })
    .getByRole('button', { name: flightDeckLabel(true), exact: true });

/**
 * On a stopped clock, waits until the Action Deck is up and has drawn its
 * Drones (the deck starts in the background, and a hit judged before it is up
 * gets no popup), without letting the Drones fall: the Run is paused while the
 * clock gives the deck its first frames, and carries on afterwards. Pass the
 * first character of the text.
 */
export async function waitForDeck(page: Page, first: string) {
  await pauseButton(page).click();
  await expect(pauseMenu(page)).toBeVisible();
  await deckUp(page);
  await expect(drone(page, first)).toBeVisible();
  await resumeButton(page).click();
  await expect(pauseMenu(page)).toBeHidden();
}

/**
 * On a stopped clock, waits for the Action Deck to start, then gives it the
 * frames that draw it. The deck starts in the background, in real time, so the
 * clock moves only once it is up: every Run then reaches the same moment.
 * PixiJS draws on animation frames, which only come when the clock moves.
 */
export async function deckUp(page: Page) {
  await expect(page.locator('[data-deck-a11y]')).toBeAttached();
  await page.clock.runFor(50);
}

/**
 * Free Flight, ready for the first key, with the page clock stopped before the
 * page loads. Nothing moves until a journey runs the clock: the Drones stay
 * where the Run seeded them, far above the Strike Line (a hit scores the same
 * wherever its Drone is, so that changes nothing a journey reads).
 *
 * Web fonts are blocked: the Action Deck waits for its fonts before it starts,
 * with a fallback on the page's clock that never fires while the clock stands
 * still, so a journey that waits for the deck (`deckUp`, `waitForDeck`) would
 * otherwise wait on the font server. The deck sizes what it draws from its
 * layout, not its text, so no check of the deck depends on the font. A journey
 * that measures the page's text, and never waits for the deck, passes
 * `{ webFonts: true }` to keep the fonts a player sees.
 */
export async function launchOnStoppedClock(
  page: Page,
  text: string,
  { webFonts = false }: { webFonts?: boolean } = {},
) {
  if (!webFonts) await blockWebFonts(page);
  // `pauseAt` alone installs the clock already stopped. An `install` first
  // would let the clock run, in real time, until `pauseAt`: a few
  // milliseconds, more on a busy machine, that the page would start with.
  await page.clock.pauseAt(1000);
  await launchFreeFlight(page, text);
}

type Rect = { x: number; y: number; width: number; height: number };

/**
 * Where an element is drawn on the page: it waits for the element to be
 * there, and throws when it is there but not drawn.
 */
export async function box(element: Locator): Promise<Rect> {
  const drawn = await element.boundingBox();
  if (!drawn) throw new Error('Nothing is drawn there');
  return drawn;
}

/**
 * Blocks web fonts, so the page draws its text in the browser's own fonts.
 * Call it before the page loads.
 */
export async function blockWebFonts(page: Page): Promise<void> {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
    route.abort(),
  );
}

/**
 * Free Flight on a stopped clock, with the Action Deck up and the lead Drone
 * settled at the Strike Line, for the journeys that compare pictures of two
 * Runs. The clock moves only by fixed amounts, and every wait is for the page
 * on a still clock, so each Run reaches the same moment however busy the
 * machine is. (A retry that moved the clock would leave a busy Run later than
 * a quiet one, and the two would draw different pictures.) Web fonts are
 * blocked (`launchOnStoppedClock`), so nothing the deck waits for runs on the
 * stopped clock.
 */
export async function launchWithLeadDroneSettled(page: Page, text: string) {
  await launchOnStoppedClock(page, text);
  await deckUp(page);
  await expect(drone(page, text[1])).toBeVisible();
  // Settle the lead Drone at the Strike Line (it needs about half a second of
  // frames), then see that it has stopped.
  const lead = drone(page, text[0]);
  const bottom = async () => {
    const drawn = await box(lead);
    return drawn.y + drawn.height;
  };
  await page.clock.runFor(700);
  const settled = await bottom();
  await page.clock.runFor(100);
  expect(await bottom(), 'the lead Drone has stopped at the Strike Line').toBe(
    settled,
  );
}

/**
 * Every line of text a player can read or hear on the screen as it is right
 * now: the visible text, the accessible names a screen reader announces (an
 * accessibility snapshot), the tooltips, the labels, and the page title. The
 * Action Deck's accessibility layer carries the canvas's drawn text (Drones,
 * keycaps, hit popups) in its labels and titles. The page's description (what
 * a search result or a link preview reads) is in the head, so it is read here.
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
  const descriptions = await page
    .locator('meta[name="description"], meta[property="og:description"]')
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('content') ?? ''),
    );
  const lines = [
    ...visible.split('\n'),
    ...announced.split('\n'),
    ...attributes,
    await page.title(),
    ...descriptions,
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
      `${where}: text that uses a name the Glossary drops (see BANNED_NAME)`,
    )
    .toEqual([]);
  return lines;
}
