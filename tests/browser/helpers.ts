import { expect, type Locator, type Page } from '@playwright/test';

// Shared by the browser journeys. Everything here finds things the way a
// player sees them: by role and visible text.

/** The first Stage's text as the player reads it, "␣" standing for a space. */
export const FIRST_STAGE_TEXT =
  'f j f j ff jj fff jjj fj jf f j f j ff jj fj jf f f j j f j fj jf ff jj fj jf';

/** The Flight Deck's HUD and text prompt (the Action Deck is not read). */
export const flightDeck = (page: Page): Locator => page.getByRole('main');

/**
 * The accessible names a screen reader user hears on the Flight Deck. They
 * are the only place the tests spell them out.
 */
export const LABELS = {
  hud: 'HUD',
  textPrompt: 'Text prompt',
  promptProgress: 'Progress',
} as const;

/** The HUD: a labelled region holding the score, speed, accuracy and Streak. */
export const hud = (page: Page): Locator =>
  page.getByRole('region', { name: LABELS.hud, exact: true });

/** The text prompt the player types along. */
export const textPrompt = (page: Page): Locator =>
  page.getByLabel(LABELS.textPrompt, { exact: true });

/** The text prompt's progress readout, which reads like "50%". */
export const promptProgress = (page: Page): Locator =>
  page.getByLabel(LABELS.promptProgress, { exact: true });

/** The character the player has to type next, marked `aria-current`. */
export const currentCharacter = (page: Page): Locator =>
  textPrompt(page).locator('[aria-current]:not([aria-current="false"])');

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
export async function launchFreeFlight(
  page: Page,
  text: string,
  shown: string = text,
) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Free Flight', exact: true }).click();
  await page.getByRole('textbox').fill(text);
  await page.getByRole('button', { name: 'Launch Custom Flight' }).click();
  await expect(
    page.getByRole('button', { name: 'Pause', exact: true }),
  ).toBeVisible();
  // The prompt shows the player's text, so the Run is ready for its first key.
  await expect(page.getByRole('main')).toContainText(
    shown.replaceAll(/\s/g, '␣'),
  );
}

/** Academy Home -> the first Stage, ready for its first key. */
export async function startFirstStage(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /begin home row mission/i }).click();
  await expect(
    page.getByRole('button', { name: 'Pause', exact: true }),
  ).toBeVisible();
  // The prompt shows the text the journeys type; a Stage whose text changed
  // fails here instead of hanging later.
  await expect(flightDeck(page)).toContainText(
    FIRST_STAGE_TEXT.replaceAll(' ', '␣'),
  );
}

// ---------------------------------------------------------------------------
// Menus: the header's four screen buttons, and how a menu is closed.
// ---------------------------------------------------------------------------

/** The header's screen buttons, and the heading of the screen each one opens. */
export const MENUS = {
  'Galaxy Map': { header: 'Sectors', heading: 'Flight Sectors & Missions' },
  Hangar: { header: 'Hangar', heading: 'Starship Hangar Upgrades' },
  Analytics: { header: 'Analytics', heading: 'Typing Analytics & Heatmap' },
  'Free Flight': { header: 'Free Flight', heading: 'Custom Typing Practice' },
} as const;

export type MenuName = keyof typeof MENUS;

/** A header button, found by its visible text. */
export const headerButton = (page: Page, name: string): Locator =>
  page.getByRole('navigation').getByRole('button', { name, exact: true });

/** A menu's heading: present while that screen is showing. */
export const menuHeading = (page: Page, menu: MenuName): Locator =>
  page.getByRole('heading', { name: MENUS[menu].heading });

/** The Pause Menu's heading: present while the Run is paused behind it. */
export const pauseMenu = (page: Page): Locator =>
  page.getByRole('heading', { name: 'Mission Paused' });

/**
 * The button that closes a menu. The spec calls it Close. Today each menu
 * words it after what opened it (Galaxy Map: "Close", Hangar from the Flight
 * Deck: "Pause Menu", Hangar from the Galaxy Map: "Back to Sectors", ...), and
 * ticket #19 makes it one thing. Every name it has had is accepted here, so
 * this is the one place to pin it down.
 */
export const closeButton = (page: Page): Locator =>
  page.getByRole('button', {
    name: /^(Close|Back to Sectors|Back to Academy|Back to Debriefing|Debriefing|Pause Menu|Cancel)$/,
  });

/** Open a menu from the header. */
export async function openMenu(page: Page, menu: MenuName) {
  await headerButton(page, MENUS[menu].header).click();
  await expect(menuHeading(page, menu)).toBeVisible();
}

/** Close the menu that is showing. */
export async function closeMenu(page: Page) {
  await closeButton(page).click();
}

/** Types the first Stage to its last character; the Debrief follows. */
export async function clearFirstStage(page: Page) {
  await typeText(page, FIRST_STAGE_TEXT);
  await expect(page.getByText(/Mission Debriefing/)).toBeVisible();
}
