import { expect, test } from '@playwright/test';
import {
  flightDeck,
  launchFreeFlight,
  promptProgress,
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

// Journey 2 of the spec says a wrong key "marks the character in the text
// prompt". Today's game doesn't: the prompt looks the same before and after a
// Miss, and the only signs of it are the HUD's Streak and Accuracy. Whether
// that is a bug or a rule change is the project owner's call (ticket #17), so
// this is parked with `fixme` until it is decided; then drop `fixme` and pin
// the exact mark down. (It was `test.fail`, but its "settled" poll could read
// a transition as settled under load and "pass", which CI would report red.)
test.fixme('a wrong key marks the character in the text prompt', async ({
  page,
}) => {
  await launchFreeFlight(page, TEXT);
  await typeText(page, 'abc');
  await expect(promptProgress(page)).toHaveText('50%');

  // The character still to be typed ("d"), however the prompt draws it.
  const current = page.getByText('d', { exact: true });
  const appearance = () =>
    current.evaluate((element) => {
      const style = getComputedStyle(element);
      return [
        style.color,
        style.backgroundColor,
        style.boxShadow,
        style.outlineColor,
        style.textDecorationLine,
        style.opacity,
      ].join('|');
    });

  // Let the colour transition from the last hit settle first.
  let previous = '';
  await expect
    .poll(async () => {
      const now = await appearance();
      const settled = now === previous;
      previous = now;
      return settled;
    })
    .toBe(true);
  const before = await appearance();

  await page.keyboard.press('z');

  await expect.poll(appearance, { timeout: 2000 }).not.toBe(before);
});
