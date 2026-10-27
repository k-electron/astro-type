import { expect, type Page, test } from '@playwright/test';
import {
  clearFirstStage,
  closeMenu,
  currentCharacter,
  debrief,
  debriefHeading,
  flightDeck,
  launchFreeFlight,
  menuHeading,
  openMenu,
  promptProgress,
  sectorUnlockedBanner,
  seedSave,
  startFirstStage,
  typeText,
} from '../helpers';
import { expectNoBannedNames, pauseButton } from '../journey-helpers';
import { clearedStages } from '../../shared/saves';

// LOCAL ONLY (run by `pnpm verify`, not in CI; docs/agents/testing.md): long end-to-end Runs
// with real typing on real Stages. Each clear of the first Stage is 77 keys, on
// a real clock with a real deck, which took about 50 s on CI's runner. The DOM
// tests (tests/dom/debrief.test.tsx, profile.test.tsx, names.test.tsx) cover the
// screens, and sector-unlock.test.ts covers the rule; this plays them through
// the real page.
//
// The old browser tests guarded: the first Stage played from a fresh Save, a
// Debrief that opens a Sector, the last Stage, and Free Flight from pasted
// text to the Debrief.

test.skip(
  Boolean(process.env.CI),
  'Local-only: pnpm verify runs it, CI does not',
);
// The tests are independent, so they can run on separate workers.
test.describe.configure({ mode: 'parallel' });

/** The Debrief's navigation buttons, in the order they are laid out. */
async function debriefButtons(page: Page): Promise<string[]> {
  const names = await debrief(page).getByRole('button').allInnerTexts();
  return names
    .map((name) => name.trim())
    .filter((name) =>
      [
        'Replay',
        'Galaxy Map',
        'Main Menu',
        'Next Mission',
        'Back to Galaxy Map',
      ].includes(name),
    );
}

/**
 * The text the prompt shows for the Run on screen, the way the player types
 * it: the characters line next to the cursor, "␣" read as a space.
 */
async function shownText(page: Page): Promise<string> {
  const line = await currentCharacter(page).locator('xpath=..').textContent();
  return (line ?? '').replaceAll('␣', ' ');
}

/**
 * Up to the last Stage of the game: a Profile that has cleared more Stages
 * than the curriculum has (ids that are not Stages are left alone), so every
 * Sector is open; then the Galaxy Map's last Sector and its last Stage.
 */
async function launchLastStage(page: Page) {
  const stars: Record<string, number> = {};
  for (let sector = 1; sector <= 12; sector++) {
    for (let stage = 1; stage <= 8; stage++) {
      stars[`s${sector}-l${stage}`] = 3;
    }
  }
  // The hands and the keyboard are hidden (set in the Profile, not clicked, so
  // no button keeps focus and takes a Space): the lighter deck keeps the
  // Run's many keys quick.
  await seedSave(page, {
    ...clearedStages(stars),
    handsVisible: false,
    keyboardVisible: false,
  });
  await page.goto('/');
  await openMenu(page, 'Galaxy Map');
  await page
    .getByRole('button', { name: /Sector \d+/ })
    .last()
    .click();
  // The Stages already cleared offer Replay where the others offer Launch.
  await page
    .getByRole('button', { name: /^(Launch|Replay) Mission$/ })
    .last()
    .click();
  await expect(pauseButton(page)).toBeVisible();
  await expect(currentCharacter(page)).toBeVisible();
}

test('the first Stage played from a fresh Save: its Debrief, the next Stage fresh, and the Stars kept after a reload', async ({
  page,
}) => {
  await startFirstStage(page);
  await expect(
    page.getByRole('button', { name: '0 ★', exact: true }),
  ).toBeVisible();
  await clearFirstStage(page);
  const result = debrief(page);

  await test.step('the Debrief shows the Stage, its Speed and the Stars it earned', async () => {
    await expect
      .soft(
        result.getByRole('heading', { name: 'The Tactile Anchors', level: 2 }),
      )
      .toBeVisible();
    await expect.soft(result).toContainText(/Speed\s*[1-9]\d*\s*WPM/i);
    await expect.soft(result).toContainText(/\+3\s*new/i);
    await expect
      .soft(page.getByRole('button', { name: '3 ★', exact: true }))
      .toBeVisible();
  });

  await test.step('the Debrief of any other Stage keeps its "Next Mission" button', async () => {
    await expect
      .poll(() => debriefButtons(page))
      .toEqual(['Replay', 'Galaxy Map', 'Main Menu', 'Next Mission']);
  });

  await test.step('Analytics, once a Run has been played, uses the glossary names, and closes back onto the Debrief', async () => {
    await openMenu(page, 'Analytics');
    await expectNoBannedNames(page, 'Analytics after a Run');
    await closeMenu(page);
    await expect(debriefHeading(page)).toBeVisible();
  });

  await test.step('Next Mission starts a fresh Run of the next Stage', async () => {
    await expect(flightDeck(page)).not.toContainText(/Score\s*0\s*x1/i);
    // The Debrief calls it "Next Mission".
    await page.getByRole('button', { name: 'Next Mission' }).click();

    await expect(debriefHeading(page)).toBeHidden();
    await expect(flightDeck(page)).toContainText('Middle Finger Expansion');
    await expect(flightDeck(page)).toContainText(/Score\s*0\s*x1/i);
    await expect(promptProgress(page)).toHaveText('0%');
    await expect(pauseButton(page)).toBeVisible();
  });

  await test.step('the Save outlives the page: the Stars are still there after a reload', async () => {
    await page.reload();
    await expect(
      page.getByRole('button', { name: '3 ★', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Sectors', exact: true }).click();
    await expect(
      page.getByRole('button', { name: /Orion Belt/ }),
    ).toContainText('3/12');
  });
});

test('a Debrief that opens a Sector shows its banner and uses the glossary names, and Replay starts a fresh Run of the same Stage', async ({
  page,
}) => {
  // 3 Stars already: clearing Stage 1 for 3 more takes the fleet to 6, which
  // opens Sector 02, so the Debrief's unlock notice is on screen to be read.
  await seedSave(page, clearedStages({ 's1-l2': 3 }));
  await startFirstStage(page);
  await clearFirstStage(page);
  await expect(page.getByRole('button', { name: 'Replay' })).toBeVisible();

  await test.step('the notice and the 6 Stars are shown, and the Debrief uses the glossary names', async () => {
    await expect
      .soft(page.getByRole('button', { name: '6 ★', exact: true }))
      .toBeVisible();
    await expect.soft(sectorUnlockedBanner(page)).toBeVisible();
    await expect
      .soft(sectorUnlockedBanner(page))
      .toContainText('New Sector Unlocked! Find it on the Galaxy Map.');
    await expectNoBannedNames(page, 'the Debrief with its Sector unlock');
  });

  await test.step('Replay starts a fresh Run of the same Stage', async () => {
    await expect(flightDeck(page)).not.toContainText(/Score\s*0\s*x1/i);
    await page.getByRole('button', { name: 'Replay' }).click();

    await expect(debriefHeading(page)).toBeHidden();
    await expect(flightDeck(page)).toContainText('The Tactile Anchors');
    await expect(flightDeck(page)).toContainText(/Score\s*0\s*x1/i);
    await expect(promptProgress(page)).toHaveText('0%');

    // And it is a live Run: the Stage's first key is "f".
    await page.keyboard.press('f');
    await expect(promptProgress(page)).not.toHaveText('0%');
  });
});

test('the Debrief of the last Stage shows "Back to Galaxy Map" in place of "Next Mission", and it opens the Galaxy Map', async ({
  page,
}) => {
  await launchLastStage(page);
  // Whatever the text is today, it is typed off the prompt.
  await typeText(page, await shownText(page));
  await expect(debriefHeading(page)).toBeVisible();

  // Where Next Mission sits, after Replay, Galaxy Map and Main Menu.
  await expect
    .poll(() => debriefButtons(page))
    .toEqual(['Replay', 'Galaxy Map', 'Main Menu', 'Back to Galaxy Map']);
  await expect(page.getByRole('button', { name: 'Next Mission' })).toHaveCount(
    0,
  );

  await debrief(page)
    .getByRole('button', { name: 'Back to Galaxy Map', exact: true })
    .click();
  await expect(menuHeading(page, 'Galaxy Map')).toBeVisible();
});

test('Free Flight plays through to the Debrief: pasted text on plain keys, then with Misses, and no screen says combo, hyperspace or warp', async ({
  page,
}) => {
  await test.step('pasted curly quotes, a long dash and line breaks play through on plain keys', async () => {
    // Curly single and double quotes, a long dash, a line break and a tab, as
    // text pasted from a web page or a word processor would carry them.
    const pasted = 'Don’t stop — “go”\nnow\tfast';
    const typed = 'Don\'t stop - "go" now fast';
    await launchFreeFlight(page, pasted, typed);

    // The prompt shows the plain keys the player will actually press.
    await expect(flightDeck(page)).toContainText(typed.replaceAll(' ', '␣'));
    await typeText(page, typed);

    const result = debrief(page);
    await expect(
      result.getByRole('heading', { name: 'Free Flight Drill', level: 2 }),
    ).toBeVisible();
    await expect.soft(result).toContainText(/Accuracy\s*100%/i);
    // A Free Flight Stage is not in the curriculum, so it has no next Stage.
    await expect
      .poll(() => debriefButtons(page))
      .toEqual(['Replay', 'Galaxy Map', 'Main Menu']);
  });

  await test.step('a Free Flight cleared with Misses uses the glossary names', async () => {
    await launchFreeFlight(page, 'abcdef');
    await page.keyboard.press('x');
    await page.keyboard.press('y');
    await typeText(page, 'abcdef');
    await expect(debriefHeading(page)).toBeVisible();

    await expectNoBannedNames(page, 'the Debrief of a Free Flight with Misses');
  });
});
