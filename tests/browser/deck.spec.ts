import { expect, test } from '@playwright/test';
import {
  clickWhereDrawn,
  drone,
  flightDeck,
  keycap,
  launchFreeFlight,
  promptProgress,
} from './helpers';
import { bottomEdge } from './journey-helpers';

// J1: the Action Deck and its accessibility layer, on the real clock, with real
// key presses and mouse clicks. The Drones and keycaps live in a canvas, so
// this reads them the only way a screen reader can: through PixiJS's
// accessibility layer, which labels each Drone "Drone X" and each keycap
// "X key" at its drawn position.
//
// One launch. A check the next step depends on (the key was typed, so the
// progress moved) is hard; the rest are soft, so one run reports every broken
// fact.

// Six different letters, so each Drone and each keycap is easy to tell apart.
// No spaces: after a click, a focused button could take Space.
const TEXT = 'abcdef';

// Tall enough that the Drones, the Strike Line and the keyboard are all on
// screen at once, so a click lands where the keycap is drawn.
test.use({ viewport: { width: 1280, height: 1100 } });

test('the Action Deck draws, moves and answers keys and clicks', async ({
  page,
}) => {
  await launchFreeFlight(page, TEXT);
  const deck = flightDeck(page);

  await test.step('a Drone and a keycap are drawn for each character of the text', async () => {
    for (const character of TEXT) {
      await expect.soft(drone(page, character)).toBeVisible();
      await expect.soft(keycap(page, character)).toBeVisible();
    }
  });

  await test.step('the right key destroys the lead Drone, and the Drone behind it comes down and takes its place', async () => {
    await expect(drone(page, 'b')).toBeVisible();
    const before = await bottomEdge(drone(page, 'b'));
    expect.soft(before).toBeGreaterThan(0);

    await page.keyboard.press('a');
    await expect(promptProgress(page)).toHaveText('17%');

    await expect.soft(drone(page, 'a')).toHaveCount(0);
    await expect.soft(drone(page, 'b')).toBeVisible();
    await expect.soft(deck).toContainText(/Streak\s*1(?!\d)/i);
    // A Drone visibly falls: the next one comes down to the Strike Line.
    await expect.soft
      .poll(() => bottomEdge(drone(page, 'b')), {
        message: 'Drone b comes down at least 20 px',
      })
      .toBeGreaterThan(before + 20);
  });

  await test.step('a wrong key is a Miss: the Streak resets and the Drone stays to be typed', async () => {
    // "z" is not the next character ("b"), nor anywhere in the text.
    await page.keyboard.press('z');

    await expect.soft(deck).toContainText(/Streak\s*0(?!\d)/i);
    await expect.soft(drone(page, 'b')).toBeVisible();
    await expect.soft(promptProgress(page)).toHaveText('17%');
  });

  await test.step('clicking the "b" keycap counts as typing that key', async () => {
    await clickWhereDrawn(page, keycap(page, 'b'));

    await expect(promptProgress(page)).toHaveText('33%');
    await expect.soft(drone(page, 'b')).toHaveCount(0);
    await expect.soft(drone(page, 'c')).toBeVisible();
    await expect.soft(deck).toContainText(/Streak\s*1(?!\d)/i);
  });

  await test.step('clicking the wrong keycap is a Miss, like pressing the wrong key', async () => {
    await clickWhereDrawn(page, keycap(page, 'z'));

    await expect.soft(deck).toContainText(/Streak\s*0(?!\d)/i);
    await expect.soft(promptProgress(page)).toHaveText('33%');
    await expect.soft(drone(page, 'c')).toBeVisible();
  });

  await test.step('keys and clicks mix: the next key can be typed either way', async () => {
    await page.keyboard.press('c');
    await expect.soft(promptProgress(page)).toHaveText('50%');
    await expect.soft(drone(page, 'c')).toHaveCount(0);
    await expect.soft(drone(page, 'd')).toBeVisible();
  });
});
