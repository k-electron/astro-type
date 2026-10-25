import { expect, type Page, test } from '@playwright/test';
import { debrief, hud, launchFreeFlight, promptProgress } from './helpers';

// Exact timing: `page.clock` takes the page's time over, so the test decides
// how much time passes. The clock is stopped before the page loads and only
// moves when a test says so. Nothing here sleeps.
//
// The HUD has no timer to read. What the player sees of Run Time is the
// Speed in the HUD and on the Debrief (WPM is measured against Run Time) and
// the Rhythm (cadence is measured between keystrokes in Run Time).

const MINUTE = 60_000;

/** Free Flight with the page clock stopped, ready for the first key. */
async function launchOnStoppedClock(page: Page, text: string) {
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
  await launchFreeFlight(page, text);
}

/** The Speed the HUD shows right now. */
async function hudSpeed(page: Page): Promise<number> {
  const text = (await hud(page).textContent()) ?? '';
  const match = /Speed\s*(\d+)\s*WPM/i.exec(text);
  if (!match) throw new Error(`No Speed in the HUD: ${text}`);
  return Number(match[1]);
}

async function pause(page: Page) {
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Mission Paused' }),
  ).toBeVisible();
}

async function resume(page: Page) {
  await page.getByRole('button', { name: 'Resume Flight' }).click();
  await expect(
    page.getByRole('heading', { name: 'Mission Paused' }),
  ).toBeHidden();
}

/** Type one key after `ms` of Run time has gone by. */
async function pressAfter(page: Page, ms: number, key: string) {
  await page.clock.runFor(ms);
  await page.keyboard.press(key);
}

test('Run Time and the Speed in the HUD stand still during a pause', async ({
  page,
}) => {
  await launchOnStoppedClock(page, 'abcdefghijklmnop');

  // 8 keys in 6 seconds of Run: 8 / 5 / (6 / 60) = 16 WPM.
  await page.clock.runFor(1000);
  for (const key of 'abcdefgh') await page.keyboard.press(key);
  await expect(promptProgress(page)).toHaveText('50%');
  await page.clock.runFor(5000);
  const before = await hudSpeed(page);
  expect(before).toBeGreaterThanOrEqual(15);
  expect(before).toBeLessThanOrEqual(17);

  await pause(page);

  // Five minutes go by behind the Pause Menu, in one jump and then some frames.
  await page.clock.fastForward(5 * MINUTE);
  await page.clock.runFor(2000);
  expect(await hudSpeed(page)).toBe(before);

  // Back in the Run, it carries on from where it was: a second more of Run
  // Time moves the Speed by a couple of WPM (16 to 14), not down to nothing.
  await resume(page);
  expect(await hudSpeed(page)).toBe(before);
  await page.clock.runFor(1000);
  const after = await hudSpeed(page);
  expect(after).toBeGreaterThanOrEqual(before - 3);
  expect(after).toBeLessThanOrEqual(before);
});

test('a pause in the middle of a Run does not drag the final Speed or the Rhythm down', async ({
  page,
}) => {
  await launchOnStoppedClock(page, 'abcdef');

  // One key a second: 3 before the pause, 3 after it. The Run lasts 6 seconds
  // of Run Time: 6 keys / 5 / (6 / 60) = 12 WPM, at an even rhythm.
  for (const key of 'abc') await pressAfter(page, 1000, key);
  await pause(page);
  await page.clock.fastForward(5 * MINUTE);
  await page.clock.runFor(2000);
  await resume(page);
  for (const key of 'def') await pressAfter(page, 1000, key);

  const result = debrief(page);
  await expect(result).toContainText(/Mission Debriefing/i);
  // Counting the pause it would be 6 / 5 / (306 / 60) = 0 WPM and a 30% rhythm.
  await expect(result).toContainText(/Speed\s*12\s*WPM/i);
  await expect(result).toContainText(/Rhythm:\s*\d+% \(Steady\)/i);
});

test('catch-up after a long stall is capped, so the Drones do not jump across the deck', async ({
  page,
}) => {
  await launchOnStoppedClock(page, 'abcdef');

  // One frame of flight, so the Run is under way and the lead Drone has come
  // down a step from its starting height. The page then stalls for five
  // minutes in one go (a frozen tab, a laptop asleep). A Drone that fell for
  // all of it would be waiting on the Strike Line now and the first key would
  // be a Perfect (100 points). Capped, the Run catches up by a fraction of a
  // second: the Drone has come down a little, not all the way, and a key now
  // is a Great (75 points).
  await page.clock.runFor(20);
  await page.clock.fastForward(5 * MINUTE);
  await page.keyboard.press('a');

  await expect(hud(page)).toContainText(/Score\s*75(?!\d)/i);
});

test('catch-up after a long stall is capped, so Run Time and the Speed barely move', async ({
  page,
}) => {
  await launchOnStoppedClock(page, 'abcdefghijklmnop');

  await page.clock.runFor(1000);
  for (const key of 'abcdefgh') await page.keyboard.press(key);
  await page.clock.runFor(5000);
  const before = await hudSpeed(page);
  expect(before).toBeGreaterThanOrEqual(15);
  expect(before).toBeLessThanOrEqual(17);

  // Five minutes stall in one go, with no pause. The Run has only 100 ms of
  // it to catch up on, so the Speed is what 7 seconds of typing gives (14
  // WPM), not what 5 minutes gives (0).
  await page.clock.fastForward(5 * MINUTE);
  await page.clock.runFor(1000);
  const after = await hudSpeed(page);
  expect(after).toBeGreaterThanOrEqual(before - 3);
  expect(after).toBeLessThanOrEqual(before);
});
