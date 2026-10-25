import { expect, type Page, test } from '@playwright/test';
import {
  clickWhereDrawn,
  debrief,
  flightDeck,
  hud,
  keycap,
  launchFreeFlight,
  promptProgress,
  typeText,
} from './helpers';

// Ticket #22: only keys that type a character count, a held key's auto-repeat
// is ignored, and a keycap click judges like a key press.
//
// The HUD's Accuracy readout refreshes on a half-second tick, but Streak,
// the shield tag and the prompt's progress update on every keystroke. So each
// test ends on a barrier: a real character key typed after the key under test,
// whose effect (the next Streak, the next progress) can only show once the
// earlier keystrokes have been handled. The Debrief's Accuracy is computed at
// the end of the Run and needs no tick.

/** Keys that don't type a character. Escape is left out: it is #21's key. */
const NON_CHARACTER_KEYS = [
  'Backspace',
  'Enter',
  'ArrowLeft',
  'ArrowDown',
  'F2',
] as const;

/**
 * A player who has bought `shields` levels of Deflector Shields. Written the
 * way the game saves it (Save: localStorage `astrotype_profile_v1`), before
 * the page loads, because buying them takes Credits and a trip to the Hangar.
 */
async function withShields(page: Page, shields: number) {
  await page.addInitScript((level) => {
    localStorage.setItem(
      'astrotype_profile_v1',
      JSON.stringify({ version: 1, upgrades: { deflectorShields: level } }),
    );
  }, shields);
}

/**
 * Waits for the HUD's shield tag to read "x<count>". The tag is the "x2" next
 * to the shield icon, after the Multiplier's "x1"; it is gone with no shields
 * left, so two "x<n>" tags must be showing.
 */
async function expectShields(page: Page, count: number) {
  const tags = hud(page).getByText(/^x\d$/);
  await expect(tags).toHaveCount(2);
  await expect(tags.last()).toHaveText(`x${count}`);
}

for (const key of NON_CHARACTER_KEYS) {
  test(`${key} leaves the Streak and Accuracy alone`, async ({ page }) => {
    await launchFreeFlight(page, 'abcdefgh');
    const deck = flightDeck(page);

    await typeText(page, 'abc');
    await expect(deck).toContainText(/Streak\s*3(?!\d)/i);

    await page.keyboard.press(key);

    // The next right key carries the Streak on from 3. A Miss would have
    // reset it, and this key would then show 1.
    await page.keyboard.press('d');
    await expect(promptProgress(page)).toHaveText('50%');
    await expect(deck).toContainText(/Streak\s*4(?!\d)/i);

    // Finish the Run: its result says how many keys were Misses.
    await typeText(page, 'efgh');
    await expect(page.getByText(/Mission Debriefing/)).toBeVisible();
    await expect(debrief(page)).toContainText(/Accuracy\s*100%/i);
  });

  test(`${key} doesn't use up a shield`, async ({ page }) => {
    await withShields(page, 2);
    await launchFreeFlight(page, 'abcdef');
    await expectShields(page, 2);

    await typeText(page, 'abc');
    await page.keyboard.press(key);
    await page.keyboard.press('d');
    await expect(promptProgress(page)).toHaveText('67%');

    await expectShields(page, 2);
  });
}

test('a character key that is wrong still uses up a shield', async ({
  page,
}) => {
  // Guards the other side of the rule: ignoring other keys must not make the
  // shields stop working.
  await withShields(page, 2);
  await launchFreeFlight(page, 'abcdef');
  await expectShields(page, 2);

  await typeText(page, 'abc');
  await page.keyboard.press('z');
  await page.keyboard.press('d');
  await expect(promptProgress(page)).toHaveText('67%');

  await expectShields(page, 1);
  // The shield absorbed the Miss: the Streak went on.
  await expect(flightDeck(page)).toContainText(/Streak\s*4(?!\d)/i);
});

test('holding a character key scores one hit and no Misses', async ({
  page,
}) => {
  await launchFreeFlight(page, 'abcdef');
  const deck = flightDeck(page);

  // Holding "a" sends one keydown, then a stream of auto-repeat keydowns
  // (Playwright marks a key pressed while it is already down as a repeat).
  for (let i = 0; i < 6; i++) await page.keyboard.down('a');
  await page.keyboard.up('a');

  // The next key. A hold that had piled up Misses would have reset the Streak.
  await page.keyboard.press('b');
  await expect(promptProgress(page)).toHaveText('33%');
  await expect(deck).toContainText(/Streak\s*2(?!\d)/i);

  // Every key typed was right, so the Run ends at 100% Accuracy.
  await typeText(page, 'cdef');
  await expect(page.getByText(/Mission Debriefing/)).toBeVisible();
  await expect(debrief(page)).toContainText(/Accuracy\s*100%/i);
});

test('holding a key on a repeated letter does not score free hits', async ({
  page,
}) => {
  // Five "a"s in a row: a hold that counted would type most of them.
  await launchFreeFlight(page, 'aaaaab');

  for (let i = 0; i < 6; i++) await page.keyboard.down('a');
  await page.keyboard.up('a');

  // Only the first keydown typed a character.
  await page.keyboard.press('a');
  await expect(promptProgress(page)).toHaveText('33%');
  await expect(flightDeck(page)).toContainText(/Streak\s*2(?!\d)/i);
});

test('holding a wrong key is one Miss', async ({ page }) => {
  await launchFreeFlight(page, 'abcdef');
  const deck = flightDeck(page);

  await typeText(page, 'abc');
  await expect(deck).toContainText(/Streak\s*3(?!\d)/i);

  for (let i = 0; i < 5; i++) await page.keyboard.down('z');
  await page.keyboard.up('z');
  await expect(deck).toContainText(/Streak\s*0(?!\d)/i);

  await page.keyboard.press('d');
  await expect(promptProgress(page)).toHaveText('67%');

  // 4 right keys and 1 Miss is 80%. Five Misses would be 4 of 9, 44%.
  // The HUD refreshes this readout on a tick.
  await expect(deck).toContainText(/Accuracy\s*80%/i);
});

test('holding a wrong key uses up one shield, not all of them', async ({
  page,
}) => {
  await withShields(page, 2);
  await launchFreeFlight(page, 'abcdef');
  await expectShields(page, 2);

  await typeText(page, 'abc');
  for (let i = 0; i < 5; i++) await page.keyboard.down('z');
  await page.keyboard.up('z');

  await page.keyboard.press('d');
  await expect(promptProgress(page)).toHaveText('67%');
  await expectShields(page, 1);
  await expect(flightDeck(page)).toContainText(/Streak\s*4(?!\d)/i);
});

test('clicking a keycap advances the text prompt like typing', async ({
  page,
}) => {
  await launchFreeFlight(page, 'abcdef');

  await clickWhereDrawn(page, keycap(page, 'a'));
  await expect(promptProgress(page)).toHaveText('17%');
  await clickWhereDrawn(page, keycap(page, 'b'));
  await expect(promptProgress(page)).toHaveText('33%');
  await expect(flightDeck(page)).toContainText(/Streak\s*2(?!\d)/i);

  // Clicks and key presses mix: both go through the same judgement.
  await page.keyboard.press('c');
  await expect(promptProgress(page)).toHaveText('50%');
  await expect(flightDeck(page)).toContainText(/Streak\s*3(?!\d)/i);
});

test('clicking a wrong keycap is a Miss, like typing a wrong key', async ({
  page,
}) => {
  await launchFreeFlight(page, 'abcdef');
  const deck = flightDeck(page);

  await typeText(page, 'abc');
  await expect(deck).toContainText(/Streak\s*3(?!\d)/i);

  await clickWhereDrawn(page, keycap(page, 'z'));
  await expect(deck).toContainText(/Streak\s*0(?!\d)/i);
  // The Miss didn't consume the character.
  await expect(promptProgress(page)).toHaveText('50%');
});

test('Space does not scroll the page while typing', async ({ page }) => {
  // A short window, so the Flight Deck is taller than the page and Space
  // would scroll it if the game let the key through.
  await page.setViewportSize({ width: 1280, height: 500 });
  await launchFreeFlight(page, 'a b c d');

  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollHeight > window.innerHeight,
      ),
    )
    .toBe(true);

  await typeText(page, 'a b ');
  // Typed on to the next key, so the Spaces have all been handled.
  await expect(promptProgress(page)).toHaveText('57%');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});
