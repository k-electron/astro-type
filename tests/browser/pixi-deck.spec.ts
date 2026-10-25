import { expect, type Locator, type Page, test } from '@playwright/test';
import {
  clickWhereDrawn,
  drone,
  flightDeck,
  keycap,
  promptProgress,
} from './helpers';

// The PixiJS Action Deck, the only Action Deck there is. Its Drones and
// keycaps live in a canvas, so these journeys read them the only way a screen
// reader (or a test) can: through PixiJS's accessibility layer, which labels
// each Drone "Drone X" and each keycap "X key" at its drawn position. Nothing
// else is read from the app: just those labelled elements and the visible text
// of the HUD, the text prompt, the Pause Menu and the Debrief.
//
// Everything runs on the real clock with real key presses and mouse clicks,
// except the paused deck, which needs a clock that stands still.

// Six different letters, so each Drone and each keycap is easy to tell apart.
// No spaces: after a click, a focused button could take Space.
const TEXT = 'abcdef';

// Tall enough that the Drones, the Strike Line and the keyboard are all on
// screen at once, so a click lands where the keycap is drawn.
test.use({ viewport: { width: 1280, height: 1100 } });

/** The bottom edge of an element on the page, or -1 while it isn't drawn. */
async function bottomEdge(element: Locator): Promise<number> {
  const box = await element.boundingBox({ timeout: 2000 });
  return box ? box.y + box.height : -1;
}

/** Free Flight, ready for the first key. */
async function launchPixiFlight(page: Page, text: string, url = '/') {
  await page.goto(url);
  await page.getByRole('button', { name: 'Free Flight', exact: true }).click();
  await page.getByRole('textbox').fill(text);
  await page.getByRole('button', { name: 'Launch Custom Flight' }).click();
  await expect(
    page.getByRole('button', { name: 'Pause', exact: true }),
  ).toBeVisible();
  await expect(flightDeck(page)).toContainText(text);
}

test('the Action Deck draws a Drone for each character of the text', async ({
  page,
}) => {
  await launchPixiFlight(page, TEXT);

  for (const character of TEXT) {
    await expect(drone(page, character)).toBeVisible();
  }
  // ...and a keycap for each of them on the keyboard.
  for (const character of TEXT) {
    await expect(keycap(page, character)).toBeVisible();
  }
});

test('a Drone visibly falls: the next one comes down to the Strike Line when the lead is typed', async ({
  page,
}) => {
  await launchPixiFlight(page, TEXT);

  // The lead Drone waits at the Strike Line, and the Drone behind it waits
  // higher up. Once it has settled, typing the lead brings it down a slot.
  await expect(drone(page, 'a')).toBeVisible();
  await expect(drone(page, 'b')).toBeVisible();
  const before = await bottomEdge(drone(page, 'b'));
  expect(before).toBeGreaterThan(0);

  await page.keyboard.press('a');

  await expect
    .poll(() => bottomEdge(drone(page, 'b')))
    .toBeGreaterThan(before + 20);
});

test('the right key destroys the lead Drone and the next one takes its place', async ({
  page,
}) => {
  await launchPixiFlight(page, TEXT);
  const deck = flightDeck(page);

  await expect(drone(page, 'a')).toBeVisible();
  await expect(drone(page, 'b')).toBeVisible();
  await expect(promptProgress(page)).toHaveText('0%');

  await page.keyboard.press('a');

  await expect(drone(page, 'a')).toHaveCount(0);
  // The Drone behind it is still on the deck, and it is the one to type now.
  await expect(drone(page, 'b')).toBeVisible();
  await expect(promptProgress(page)).toHaveText('17%');
  await expect(deck).toContainText(/Streak\s*1(?!\d)/i);

  await page.keyboard.press('b');
  await expect(drone(page, 'b')).toHaveCount(0);
  await expect(drone(page, 'c')).toBeVisible();
  await expect(promptProgress(page)).toHaveText('33%');
  await expect(deck).toContainText(/Streak\s*2(?!\d)/i);
});

test('a wrong key is a Miss: the Streak resets and the Drone stays to be typed', async ({
  page,
}) => {
  await launchPixiFlight(page, TEXT);
  const deck = flightDeck(page);

  for (const key of 'abc') await page.keyboard.press(key);
  await expect(promptProgress(page)).toHaveText('50%');
  await expect(deck).toContainText(/Streak\s*3(?!\d)/i);
  await expect(deck).toContainText(/Accuracy\s*100%/i);
  await expect(drone(page, 'c')).toHaveCount(0);
  await expect(drone(page, 'd')).toBeVisible();

  // "z" is not the next character ("d"), nor anywhere in the text.
  await page.keyboard.press('z');

  await expect(deck).toContainText(/Streak\s*0(?!\d)/i);
  // 3 right keys and 1 wrong one. The HUD refreshes this readout on a tick.
  await expect(deck).toContainText(/Accuracy\s*75%/i);
  // The Miss didn't destroy anything: "d" is still there, and still next.
  await expect(drone(page, 'd')).toBeVisible();
  await expect(promptProgress(page)).toHaveText('50%');

  // The right key carries on from there.
  await page.keyboard.press('d');
  await expect(drone(page, 'd')).toHaveCount(0);
  await expect(promptProgress(page)).toHaveText('67%');
  await expect(deck).toContainText(/Streak\s*1(?!\d)/i);
});

test('clicking a keycap counts as typing that key', async ({ page }) => {
  await launchPixiFlight(page, TEXT);
  const deck = flightDeck(page);

  await expect(drone(page, 'a')).toBeVisible();
  await clickWhereDrawn(page, keycap(page, 'a'));

  await expect(promptProgress(page)).toHaveText('17%');
  await expect(deck).toContainText(/Streak\s*1(?!\d)/i);
  await expect(drone(page, 'a')).toHaveCount(0);
  // The accessibility layer is still there after the mouse has moved over it.
  await expect(drone(page, 'b')).toBeVisible();

  // Clicks and key presses mix: the next key can be typed either way.
  await clickWhereDrawn(page, keycap(page, 'b'));
  await expect(promptProgress(page)).toHaveText('33%');
  await page.keyboard.press('c');
  await expect(promptProgress(page)).toHaveText('50%');
  await expect(deck).toContainText(/Streak\s*3(?!\d)/i);
});

test('clicking the wrong keycap is a Miss, like pressing the wrong key', async ({
  page,
}) => {
  await launchPixiFlight(page, TEXT);
  const deck = flightDeck(page);

  await page.keyboard.press('a');
  await expect(promptProgress(page)).toHaveText('17%');
  await expect(deck).toContainText(/Streak\s*1(?!\d)/i);
  await expect(drone(page, 'b')).toBeVisible();

  // "b" is next. The "z" keycap is not it, nor anywhere in the text.
  await clickWhereDrawn(page, keycap(page, 'z'));

  await expect(deck).toContainText(/Streak\s*0(?!\d)/i);
  // 1 right key and 1 wrong one.
  await expect(deck).toContainText(/Accuracy\s*50%/i);
  await expect(promptProgress(page)).toHaveText('17%');
  await expect(drone(page, 'b')).toBeVisible();
});

test('the paused deck is frozen: Drones stay where they were, and fall on after Resume', async ({
  page,
}) => {
  // Thousands of fake-clock frames are rendered for real, which takes ~20 s on
  // software GL: give it room so load can't make it flaky.
  test.setTimeout(180_000);
  // The page's clock is stopped before it loads and only moves when this test
  // says so, so a Drone is caught mid-fall and nothing else moves it.
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
  await launchPixiFlight(page, TEXT);

  // PixiJS draws on animation frames, which only come when the clock moves.
  // Give it frames until the deck is up, then let the lead Drone settle.
  await expect(async () => {
    await page.clock.runFor(50);
    await expect(drone(page, 'b')).toBeVisible({ timeout: 250 });
  }).toPass({ timeout: 10_000 });
  await page.clock.runFor(3000);

  // Typing the lead sends the Drone behind it down a slot. Two frames in, it
  // is on its way: lower than it was, and not there yet.
  const settled = await bottomEdge(drone(page, 'b'));
  await page.keyboard.press('a');
  await page.clock.runFor(32);
  const midFall = await bottomEdge(drone(page, 'b'));
  expect(midFall).toBeGreaterThan(settled);

  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Mission Paused' }),
  ).toBeVisible();

  // Minutes of frames go by behind the Pause Menu: the Drone has not moved.
  await page.clock.runFor(3000);
  await page.clock.fastForward(5 * 60_000);
  await page.clock.runFor(2000);
  expect(await bottomEdge(drone(page, 'b'))).toBe(midFall);

  // Back in the Run, it carries on falling from where it stopped.
  await page.getByRole('button', { name: 'Resume Flight' }).click();
  await expect(
    page.getByRole('heading', { name: 'Mission Paused' }),
  ).toBeHidden();
  await page.clock.runFor(1000);
  expect(await bottomEdge(drone(page, 'b'))).toBeGreaterThan(midFall);
});

test('an old ?deck=pixi link plays the same deck: no flag is needed', async ({
  page,
}) => {
  await launchPixiFlight(page, TEXT, '/?deck=pixi');

  await expect(drone(page, 'a')).toBeVisible();
  await expect(keycap(page, 'a')).toBeVisible();
  await page.keyboard.press('a');
  await expect(promptProgress(page)).toHaveText('17%');
  await expect(drone(page, 'a')).toHaveCount(0);
});
