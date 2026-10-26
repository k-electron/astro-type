import { expect, type Locator, type Page, test } from '@playwright/test';
import {
  currentCharacter,
  flightDeck,
  hud,
  launchFreeFlight,
  pauseMenu,
  promptProgress,
  textPrompt,
  typeText,
} from './helpers';
import { pauseButton, resumeButton } from './journey-helpers';

// J2: native keyboard and focus, in a real browser. These are the things a DOM
// test cannot see: the default scroll action of the Space key, how a missed
// space is drawn, and native Enter and Space activation on a focused button.
//
// Part A is a short window and a text with spaces; part B a text with none, so
// that a focused button could not take a Space the game wanted. Each part is
// one launch. A check the next step depends on (the Run is paused, the key was
// typed) is hard; the rest are soft.

/** One space in the text prompt: they are drawn as "␣". */
const promptSpace = (page: Page, which: number): Locator =>
  textPrompt(page).getByText('␣', { exact: true }).nth(which);

/** How the prompt draws a character, once any transition has run. */
async function look(character: Locator) {
  await expect(character).toBeVisible();
  return character.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((a) => a.finished));
    const style = getComputedStyle(element);
    return {
      color: style.color,
      textDecorationLine: style.textDecorationLine,
      textDecorationColor: style.textDecorationColor,
    };
  });
}

/** The Run is paused, as the player left it: 50% through, Streak 3. */
async function expectPausedHalfway(page: Page) {
  await expect(pauseMenu(page)).toBeVisible();
  await expect.soft(promptProgress(page)).toHaveText('50%');
  await expect.soft(flightDeck(page)).toContainText(/Streak\s*3(?!\d)/i);
}

/** Enter and Space on the Pause Menu leave the Run paused, and are no Miss. */
async function enterAndSpaceLeaveItPaused(page: Page) {
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await expectPausedHalfway(page);
  await expect.soft(hud(page)).toContainText(/Accuracy\s*100%/i);
}

test('native keys and focus: Space, Esc, Enter and the window losing focus', async ({
  page,
}) => {
  await test.step('part A: a missed space is struck through at once, and looks like one that was passed', async () => {
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

    await page.keyboard.press('a');
    await expect(promptProgress(page)).toHaveText('14%');
    // The space to type next is the first; the second is untouched.
    const untouched = await look(promptSpace(page, 1));

    // A wrong key on the space marks it at once, and the cursor stays on it.
    await page.keyboard.press('z');
    await expect.soft(currentCharacter(page)).toHaveText('␣');
    const struckCurrent = await look(promptSpace(page, 0));
    expect.soft(struckCurrent.textDecorationLine).toBe('line-through');
    await expect(promptProgress(page)).toHaveText('14%');

    // The space key moves the cursor on. The space it passed still reads as
    // missed: the same look as when it was struck while current.
    await page.keyboard.press('Space');
    await expect(promptProgress(page)).toHaveText('29%');
    const missed = await look(promptSpace(page, 0));
    expect.soft(missed.textDecorationLine).toBe('line-through');
    expect
      .soft(missed.color, 'a missed space is drawn in its own colour')
      .not.toBe(untouched.color);
    expect.soft(missed).toEqual(struckCurrent);
  });

  await test.step('part A: Space does not scroll the page while typing', async () => {
    await typeText(page, 'b c');
    // Typed on to the next key, so the Spaces have all been handled.
    await expect(promptProgress(page)).toHaveText('71%');
    await expect.soft.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });

  // Part B: a fresh Run, halfway through "abcdef".
  await page.setViewportSize({ width: 1280, height: 900 });
  await launchFreeFlight(page, 'abcdef');
  await typeText(page, 'abc');
  await expect(promptProgress(page)).toHaveText('50%');
  await expect(flightDeck(page)).toContainText(/Streak\s*3(?!\d)/i);

  await test.step('part B: Esc pauses, and Esc on the Pause Menu resumes from the same character', async () => {
    await page.keyboard.press('Escape');
    await expectPausedHalfway(page);

    await page.keyboard.press('Escape');
    await expect(pauseMenu(page)).toBeHidden();
    await expect.soft(promptProgress(page)).toHaveText('50%');
  });

  await test.step('part B: holding Esc down pauses once, and does not flick back and forth', async () => {
    // The second to fourth presses of a held key are auto-repeat. Counted as
    // presses they would pause, resume, pause and resume, ending unpaused.
    for (let press = 0; press < 4; press++) await page.keyboard.down('Escape');
    await page.keyboard.up('Escape');

    await expectPausedHalfway(page);
  });

  await test.step('part B: Enter and Space on a Pause Menu opened with Esc leave the Run paused', async () => {
    await enterAndSpaceLeaveItPaused(page);
    await page.keyboard.press('Escape');
    await expect(pauseMenu(page)).toBeHidden();
  });

  await test.step('part B: Enter and Space on a Pause Menu opened with the Pause button leave the Run paused', async () => {
    await pauseButton(page).click();
    await expectPausedHalfway(page);

    await enterAndSpaceLeaveItPaused(page);
    await resumeButton(page).click();
    await expect(pauseMenu(page)).toBeHidden();
  });

  await test.step('part B: Enter and Space on the Pause Menu after the window loses focus leave the Run paused', async () => {
    // A real tab switch does not reach a headless Chromium page, so this
    // sends the event the browser fires when the player clicks away.
    await page.evaluate(() => {
      window.dispatchEvent(new Event('blur'));
    });
    await expectPausedHalfway(page);

    await enterAndSpaceLeaveItPaused(page);
  });

  await test.step('part B: Resume carries on from the same character', async () => {
    await resumeButton(page).click();
    await expect(pauseMenu(page)).toBeHidden();
    await expect.soft(promptProgress(page)).toHaveText('50%');

    await page.keyboard.press('d');
    await expect(promptProgress(page)).toHaveText('67%');
    await expect.soft(flightDeck(page)).toContainText(/Streak\s*4(?!\d)/i);
  });
});
