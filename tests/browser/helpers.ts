import { expect, type Locator, type Page } from '@playwright/test';
import { DEBRIEF_TITLE, HUD_NAME, PAUSE_MENU_NAME } from '../shared/screens';

// Shared by the browser journeys. Everything here finds things the way a
// player sees them: by role and visible text, and, inside the Action Deck's
// canvas, through the PixiJS accessibility layer.

/** The first Stage's text as the player reads it, "␣" standing for a space. */
export const FIRST_STAGE_TEXT =
  'f j f j ff jj fff jjj fj jf f j f j ff jj fj jf f f j j f j fj jf ff jj fj jf';

/** The Flight Deck's HUD and text prompt (the Action Deck is not read). */
export const flightDeck = (page: Page): Locator => page.getByRole('main');

/**
 * The accessible names a screen reader user hears on the Flight Deck. The
 * HUD's comes from `tests/shared/screens.ts`; the others are spelled out only
 * here.
 */
export const LABELS = {
  hud: HUD_NAME,
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

/**
 * An element PixiJS's accessibility layer made for something it drew. PixiJS
 * puts the name in `aria-label` (an accessible hint) or in `title` (an
 * accessible title), so both are accepted. The name is matched whole and
 * ignoring case, since the layer may spell a character either way.
 */
export const labelled = (page: Page, name: RegExp): Locator =>
  page.getByLabel(name).or(page.getByTitle(name));

/** The Drone carrying this character. Use texts with no repeats. */
export const drone = (page: Page, character: string): Locator =>
  labelled(page, new RegExp(`^Drone ${character}$`, 'i'));

/** The keycap for this character on the Action Deck's keyboard. */
export const keycap = (page: Page, character: string): Locator =>
  labelled(page, new RegExp(`^${character} key$`, 'i'));

/** A real mouse click in the middle of an element, wherever it is drawn. */
export async function clickWhereDrawn(page: Page, element: Locator) {
  await element.scrollIntoViewIfNeeded();
  const box = await element.boundingBox();
  if (!box) throw new Error('Nothing is drawn there to click');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

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

/** The Pause Menu's heading: present while the Run is paused behind it. */
export const pauseMenu = (page: Page): Locator =>
  page.getByRole('heading', { name: PAUSE_MENU_NAME });

/**
 * Starts the game with a Save the player already has (see
 * `tests/shared/saves.ts` for ready-made ones; fields left out take their
 * defaults). It is put in localStorage once, before the page loads, so a
 * reload sees whatever the game left behind. Call it before `page.goto`.
 */
export async function seedSave(page: Page, save: unknown): Promise<void> {
  await page.addInitScript(
    ({ key, value }) => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', 'yes');
      localStorage.setItem(key, value);
    },
    { key: 'astrotype_profile_v1', value: JSON.stringify(save) },
  );
}

/** Types the first Stage to its last character; the Debrief follows. */
export async function clearFirstStage(page: Page) {
  await typeText(page, FIRST_STAGE_TEXT);
  await expect(page.getByText(DEBRIEF_TITLE)).toBeVisible();
}
