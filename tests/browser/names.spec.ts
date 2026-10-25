import { expect, type Page, test } from '@playwright/test';
import {
  clearFirstStage,
  FIRST_STAGE_TEXT,
  headerButton,
  hud,
  launchFreeFlight,
  openMenu,
  pauseMenu,
  sectorUnlockedBanner,
  seedStageStars,
  startFirstStage,
  typeText,
} from './helpers';

// One name for each thing: the game says Streak and Overdrive, never combo,
// hyperspace or warp (GLOSSARY.md: Streak, Multiplier and Overdrive each list
// those as words to avoid). These journeys walk every screen a player can
// reach and read what the player can read on it.

/**
 * The banned words. `\b` keeps this to whole words, so a word that merely
 * contains one ("swarp", "Comboy") is not flagged; the endings cover "combos",
 * "warped", "warping" and "hyper-space".
 */
const BANNED_NAME = /\b(?:combos?|hyper[\s-]?space|warp(?:s|ed|ing)?)\b/i;

/**
 * Every line of text a player can read on the screen as it is right now:
 * the visible text, the accessible names a screen reader announces
 * (an accessibility snapshot, which includes aria-labels), the tooltips and
 * the page title.
 */
async function textOnScreen(page: Page): Promise<string[]> {
  const body = page.locator('body');
  // innerText on purpose: it reads what is rendered, as the player sees it.
  // biome-ignore lint/performance/useDomNodeTextContent: rendered text is the point
  const visible = await body.innerText();
  const announced = await body.ariaSnapshot();
  const tooltips = await page
    .locator('[title]')
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('title') ?? ''),
    );
  const pageTitle = await page.title();

  const lines = [
    ...visible.split('\n'),
    ...announced.split('\n'),
    ...tooltips,
    pageTitle,
  ].map((line) => line.trim());
  return [...new Set(lines.filter((line) => line !== ''))];
}

/** Fails with the offending lines when the screen uses a banned word. */
async function expectNoBannedNames(page: Page) {
  const offenders = (await textOnScreen(page)).filter((line) =>
    BANNED_NAME.test(line),
  );
  expect(offenders, 'text that uses combo, hyperspace or warp').toEqual([]);
}

/** Types enough of the first Stage that its Overdrive meter fills up. */
async function startOverdrive(page: Page) {
  await startFirstStage(page);
  await typeText(page, FIRST_STAGE_TEXT.slice(0, 32));
  await expect(hud(page)).toContainText(/Overdrive/i);
}

test('Academy Home uses the glossary names', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: /begin home row mission/i }),
  ).toBeVisible();

  await expectNoBannedNames(page);
});

test('the Flight Deck uses the glossary names, and the HUD shows the Streak', async ({
  page,
}) => {
  await startFirstStage(page);
  await typeText(page, FIRST_STAGE_TEXT.slice(0, 6));

  await expect(hud(page).getByText(/^Streak$/i)).toBeVisible();
  await expect(hud(page)).toContainText(/Streak\s*6/i);
  await expectNoBannedNames(page);
});

test('the Flight Deck after a Miss uses the glossary names', async ({
  page,
}) => {
  await startFirstStage(page);
  await typeText(page, FIRST_STAGE_TEXT.slice(0, 6));
  await page.keyboard.press('z');

  await expect(hud(page)).toContainText(/Streak\s*0/i);
  await expectNoBannedNames(page);
});

test('the HUD shows an Overdrive label while Overdrive is active, and nothing says combo, hyperspace or warp', async ({
  page,
}) => {
  await startOverdrive(page);

  await expect(
    hud(page)
      .getByText(/Overdrive/i)
      .first(),
  ).toBeVisible();
  await expect(hud(page).getByText(/^Streak$/i)).toBeVisible();
  await expectNoBannedNames(page);
});

test('the Pause Menu uses the glossary names, with Overdrive active behind it', async ({
  page,
}) => {
  await startOverdrive(page);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(pauseMenu(page)).toBeVisible();

  await expectNoBannedNames(page);
});

test('the Galaxy Map uses the glossary names', async ({ page }) => {
  await page.goto('/');
  await openMenu(page, 'Galaxy Map');

  await expectNoBannedNames(page);
});

test('the Hangar uses the glossary names', async ({ page }) => {
  await page.goto('/');
  await openMenu(page, 'Hangar');

  await expectNoBannedNames(page);
});

test('Analytics uses the glossary names', async ({ page }) => {
  await page.goto('/');
  await openMenu(page, 'Analytics');

  await expectNoBannedNames(page);
});

test('Analytics uses the glossary names once a Run has been played', async ({
  page,
}) => {
  await startFirstStage(page);
  await clearFirstStage(page);
  await openMenu(page, 'Analytics');

  await expectNoBannedNames(page);
});

test('Free Flight uses the glossary names', async ({ page }) => {
  await page.goto('/');
  await openMenu(page, 'Free Flight');

  await expectNoBannedNames(page);
});

test('the audio settings use the glossary names', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Open Audio Flight Deck Settings' })
    .click();

  await expectNoBannedNames(page);
});

test('the Debrief of a 3-star Stage, with its Sector unlock, uses the glossary names', async ({
  page,
}) => {
  // 3 Stars already: clearing Stage 1 for 3 more takes the fleet to 6, which
  // opens Sector 02, so the Debrief's unlock notice is on screen to be read.
  await seedStageStars(page, { 's1-l2': 3 });
  await startFirstStage(page);
  await clearFirstStage(page);
  await expect(page.getByRole('button', { name: 'Replay' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: '6 ★', exact: true }),
  ).toBeVisible();
  await expect(sectorUnlockedBanner(page)).toBeVisible();

  await expectNoBannedNames(page);
});

test('the Debrief of a Free Flight, cleared with Misses, uses the glossary names', async ({
  page,
}) => {
  await launchFreeFlight(page, 'abcdef');
  await page.keyboard.press('x');
  await page.keyboard.press('y');
  await typeText(page, 'abcdef');
  await expect(page.getByText(/Mission Debriefing/)).toBeVisible();

  await expectNoBannedNames(page);
});

test('the Hangar opened from the Flight Deck uses the glossary names', async ({
  page,
}) => {
  await startOverdrive(page);
  await headerButton(page, 'Hangar').click();
  await expect(
    page.getByRole('heading', { name: 'Starship Hangar Upgrades' }),
  ).toBeVisible();

  await expectNoBannedNames(page);
});
