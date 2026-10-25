import { expect, type Locator, type Page, test } from '@playwright/test';
import {
  currentCharacter,
  flightDeck,
  launchFreeFlight,
  promptProgress,
  textPrompt,
  typeText,
} from './helpers';

// Six different letters, so every character in the prompt is easy to tell apart.
const TEXT = 'abcdef';

test('a wrong key is a Miss: Streak resets and the character stays to be typed', async ({
  page,
}) => {
  await launchFreeFlight(page, TEXT);
  const deck = flightDeck(page);

  await typeText(page, 'abc');
  await expect(promptProgress(page)).toHaveText('50%');
  await expect(deck).toContainText(/Streak\s*3(?!\d)/i);
  await expect(deck).toContainText(/Accuracy\s*100%/i);

  // "z" is not the next character ("d"), nor anywhere in the text.
  await page.keyboard.press('z');

  await expect(deck).toContainText(/Streak\s*0(?!\d)/i);
  // 3 right keys and 1 wrong one. The HUD refreshes this readout on a tick.
  await expect(deck).toContainText(/Accuracy\s*75%/i);
  // The Miss didn't consume the character: the prompt is still on "d".
  await expect(promptProgress(page)).toHaveText('50%');

  // The right key carries on from there.
  await page.keyboard.press('d');
  await expect(promptProgress(page)).toHaveText('67%');
  await expect(deck).toContainText(/Streak\s*1(?!\d)/i);
});

// Spec story 30: a wrong character key marks the character in the text prompt
// at once. The mark is the one the prompt has always drawn on a character that
// was typed wrong (a strike-through), which until now showed only after the
// right key moved the cursor on. The cursor stays where it is until then.
//
// Only the strike-through is pinned, not its colour: the cursor's highlight may
// share the character with it.

/** One character of the text prompt. Use texts with no repeats. */
const promptCharacter = (page: Page, character: string): Locator =>
  textPrompt(page).getByText(character, { exact: true });

const expectStruck = (character: Locator) =>
  expect(character).toHaveCSS('text-decoration-line', 'line-through');

const expectNotStruck = (character: Locator) =>
  expect(character).not.toHaveCSS('text-decoration-line', 'line-through');

/** Only the characters listed are marked in the prompt; the rest are not. */
async function expectOnlyMarked(page: Page, marked: string) {
  for (const character of TEXT) {
    const element = promptCharacter(page, character);
    if (marked.includes(character)) await expectStruck(element);
    else await expectNotStruck(element);
  }
}

test('a wrong key marks the character at once, and the cursor stays on it', async ({
  page,
}) => {
  await launchFreeFlight(page, TEXT);
  await typeText(page, 'abc');
  await expect(promptProgress(page)).toHaveText('50%');
  await expectOnlyMarked(page, '');

  await page.keyboard.press('z');

  // The cursor is still on "d", and "d" is already marked.
  await expect(currentCharacter(page)).toHaveText('d');
  await expectStruck(currentCharacter(page));
  await expect(promptProgress(page)).toHaveText('50%');
  await expectOnlyMarked(page, 'd');

  // The right key moves the cursor on; the mark stays behind on "d".
  await page.keyboard.press('d');
  await expect(promptProgress(page)).toHaveText('67%');
  await expect(currentCharacter(page)).toHaveText('e');
  await expectNotStruck(currentCharacter(page));
  await expectOnlyMarked(page, 'd');
});

test('several wrong keys on one character leave one mark', async ({ page }) => {
  await launchFreeFlight(page, TEXT);
  await typeText(page, 'abc');

  for (const key of ['z', 'x', 'q']) await page.keyboard.press(key);

  // The wrong keys aren't added to the prompt: it still reads the same text.
  await expect(textPrompt(page)).toContainText(TEXT);
  await expect(currentCharacter(page)).toHaveText('d');
  await expectOnlyMarked(page, 'd');
  await expect(promptProgress(page)).toHaveText('50%');

  await page.keyboard.press('d');
  await expect(promptProgress(page)).toHaveText('67%');
  await expectOnlyMarked(page, 'd');
});

test('a wrong key on the first character is marked too', async ({ page }) => {
  await launchFreeFlight(page, TEXT);

  await page.keyboard.press('z');

  await expect(currentCharacter(page)).toHaveText('a');
  await expectStruck(currentCharacter(page));
  await expectOnlyMarked(page, 'a');
});

test('a Miss that a shield absorbs is marked all the same', async ({
  page,
}) => {
  // The shield only spares the Streak. The player still typed the wrong key.
  // The Profile is written the way the game saves it, before the page loads.
  await page.addInitScript(() => {
    localStorage.setItem(
      'astrotype_profile_v1',
      JSON.stringify({ version: 1, upgrades: { deflectorShields: 2 } }),
    );
  });
  await launchFreeFlight(page, TEXT);
  await typeText(page, 'abc');
  await expect(flightDeck(page)).toContainText(/Streak\s*3(?!\d)/i);

  await page.keyboard.press('z');

  await expect(currentCharacter(page)).toHaveText('d');
  await expectStruck(currentCharacter(page));
  await page.keyboard.press('d');
  await expect(promptProgress(page)).toHaveText('67%');
  // The shield absorbed the Miss, so the Streak carried on.
  await expect(flightDeck(page)).toContainText(/Streak\s*4(?!\d)/i);
  await expectOnlyMarked(page, 'd');
});

// Keys that don't type a character mark nothing. Each test presses one where
// "d" is to be typed, then types "d" as a barrier: the mark stays on the
// character once it is made, so a wrongly marked "d" would show by then.
// Escape is left out: it pauses the Run.
const IGNORED_KEYS = [
  'Backspace',
  'Enter',
  'ArrowLeft',
  'ArrowDown',
  'F2',
  'Control+z',
  'Meta+z',
] as const;

for (const key of IGNORED_KEYS) {
  test(`${key} marks nothing in the text prompt`, async ({ page }) => {
    await launchFreeFlight(page, TEXT);
    await typeText(page, 'abc');
    await expect(promptProgress(page)).toHaveText('50%');

    await page.keyboard.press(key);
    await page.keyboard.press('d');

    await expect(promptProgress(page)).toHaveText('67%');
    await expectOnlyMarked(page, '');
  });
}

test('holding a right key marks nothing; holding a wrong key marks once', async ({
  page,
}) => {
  await launchFreeFlight(page, TEXT);

  // A held right key: its auto-repeat adds no Miss to the next character.
  for (let i = 0; i < 6; i++) await page.keyboard.down('a');
  await page.keyboard.up('a');
  await page.keyboard.press('b');
  await expect(promptProgress(page)).toHaveText('33%');
  await expectOnlyMarked(page, '');

  // A held wrong key marks the one character it was pressed on.
  for (let i = 0; i < 6; i++) await page.keyboard.down('z');
  await page.keyboard.up('z');
  await expect(currentCharacter(page)).toHaveText('c');
  await expectStruck(currentCharacter(page));
  await expectOnlyMarked(page, 'c');
});

// A space is a character too: when it is the one to type, a wrong key marks it
// at once, the same way a space that was missed reads once the space key has
// moved the cursor on (the colour and the strike-through).

/** How the prompt draws its (one) space, once any transition has run. */
async function spaceLook(page: Page) {
  const space = promptCharacter(page, '␣');
  await expect(space).toBeVisible();
  return space.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((a) => a.finished));
    const style = getComputedStyle(element);
    return {
      color: style.color,
      textDecorationLine: style.textDecorationLine,
      textDecorationColor: style.textDecorationColor,
    };
  });
}

test('a wrong key on a space marks it at once, like a missed space after the space key', async ({
  page,
}) => {
  const text = 'ab cd';

  // How a missed space reads: the wrong key, then the space key moves on.
  await launchFreeFlight(page, text);
  await typeText(page, 'ab');
  const untouched = await spaceLook(page);
  await page.keyboard.press('z');
  await page.keyboard.press('Space');
  await expect(promptProgress(page)).toHaveText('60%');
  const missed = await spaceLook(page);
  expect(missed.textDecorationLine).toBe('line-through');
  expect(missed.color, 'a missed space is drawn in its own colour').not.toBe(
    untouched.color,
  );

  // The same space, right after the wrong key and before the space key.
  await launchFreeFlight(page, text);
  await typeText(page, 'ab');
  await page.keyboard.press('z');
  await expectStruck(promptCharacter(page, '␣'));
  await expect(promptProgress(page)).toHaveText('40%');
  expect(await spaceLook(page)).toEqual(missed);
});
