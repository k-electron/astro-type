import { expect, type Page, test } from '@playwright/test';
import { debrief, promptProgress } from '../helpers';
import {
  hudScore,
  hudSpeed,
  launchOnStoppedClock,
  pauseButton,
  resumeButton,
} from '../journey-helpers';

// LOCAL ONLY (run by `pnpm verify`, not in CI; docs/agents/testing.md): exact Run Time
// numbers through the real frame loop, thousands of frames in all, which CI's
// runner cannot afford. CI keeps the freeze behind the Pause Menu
// (deck-timing.spec.ts, J3); the numbers are also unit-tested (run-clock.test.ts,
// frameLoop.test.ts).
//
// Exact timing: `page.clock` takes the page's time over, so the test decides
// how much time passes. The clock is stopped before the page loads and only
// moves when a test says so. Nothing here sleeps.
//
// The HUD has no timer to read. What the player sees of Run Time is the
// Speed in the HUD and on the Debrief (WPM is measured against Run Time) and
// the Rhythm (cadence is measured between keystrokes in Run Time).
//
// What is guarded here: a capped catch-up after a stall, and a pause not
// dragging down the final Speed or the Rhythm.

test.skip(
  Boolean(process.env.CI),
  'Local-only: pnpm verify runs it, CI does not',
);
// The tests are independent, so they can run on separate workers.
test.describe.configure({ mode: 'parallel' });

const MINUTE = 60_000;

/**
 * The Speed once the HUD has shown a Speed of at least `min` (React draws a
 * moment after the page's timers run, and the page's time is stopped while
 * this waits), checked to be at most `max`.
 */
async function speedBetween(page: Page, min: number, max: number) {
  await expect.poll(() => hudSpeed(page)).toBeGreaterThanOrEqual(min);
  const speed = await hudSpeed(page);
  expect(speed).toBeLessThanOrEqual(max);
  return speed;
}

/**
 * The Speed after the Run has gone on a little: once the HUD has dropped
 * below `before`, as more Run Time without more keys must, it is still within
 * `drop` of it.
 */
async function speedStillNear(page: Page, before: number, drop: number) {
  await expect.poll(() => hudSpeed(page)).toBeLessThan(before);
  expect(await hudSpeed(page)).toBeGreaterThanOrEqual(before - drop);
}

async function pause(page: Page) {
  await pauseButton(page).click();
  await expect(
    page.getByRole('heading', { name: 'Mission Paused' }),
  ).toBeVisible();
}

async function resume(page: Page) {
  await resumeButton(page).click();
  await expect(
    page.getByRole('heading', { name: 'Mission Paused' }),
  ).toBeHidden();
}

/** Type one key after `ms` of Run time has gone by. */
async function pressAfter(page: Page, ms: number, key: string) {
  await page.clock.runFor(ms);
  await page.keyboard.press(key);
}

test('a pause in the middle of a Run does not drag the final Speed or the Rhythm down', async ({
  page,
}) => {
  await launchOnStoppedClock(page, 'abcdef');

  // One key a second: 3 before the pause, 3 after it. The Run lasts 6 seconds
  // of Run Time: 6 keys / 5 / (6 / 60) = 12 WPM, at an even rhythm.
  for (const key of 'abc') await pressAfter(page, 1000, key);
  await pause(page);
  await page.clock.fastForward(5 * MINUTE);
  await page.clock.runFor(500);
  await resume(page);
  for (const key of 'def') await pressAfter(page, 1000, key);

  const result = debrief(page);
  await expect(result).toContainText(/Mission Debriefing/i);
  // Counting the pause it would be 6 / 5 / (306 / 60) = 0 WPM and a 30% rhythm.
  await expect(result).toContainText(/Speed\s*12\s*WPM/i);
  await expect(result).toContainText(/Rhythm:\s*\d+% \(Steady\)/i);
});

test('catch-up after a long stall is capped: the Drones do not jump across the deck and the Speed barely moves', async ({
  page,
}) => {
  await launchOnStoppedClock(page, 'abcdefghijklmnop');

  await test.step('a five-minute stall leaves the lead Drone a little way down, so the first key is a Great', async () => {
    // One frame of flight, so the Run is under way and the lead Drone has come
    // down a step from its starting height. The page then stalls for five
    // minutes in one go (a frozen tab, a laptop asleep). A Drone that fell for
    // all of it would be waiting on the Strike Line now and the first key would
    // be a Perfect (100 points). Capped, the Run catches up by a fraction of a
    // second: the Drone has come down a little, not all the way, and a key now
    // is a Great (75 points). The Free Flight launch passes the speed the
    // Profile has, and a fresh Save has NORMAL (1.5 a step: 7 steps leave the
    // Drone 11.5 from the Strike Line, past the Perfect window of 8).
    await page.clock.runFor(20);
    await page.clock.fastForward(5 * MINUTE);
    await page.keyboard.press('a');

    await expect.poll(() => hudScore(page)).toBe(75);
  });

  await test.step('a second stall is caught up only by a fraction of a second, so the Speed is what the typing gives', async () => {
    // 8 keys in about 6 seconds of Run: 8 / 5 / (6 / 60) = 16 WPM.
    await page.clock.runFor(1000);
    for (const key of 'bcdefgh') await page.keyboard.press(key);
    await expect(promptProgress(page)).toHaveText('50%');
    await page.clock.runFor(5000);
    const before = await speedBetween(page, 15, 17);

    // The Run has only 100 ms of the stall to catch up on, so the Speed is what
    // about 7 seconds of typing gives (13 WPM), not what 5 minutes gives (0).
    await page.clock.fastForward(5 * MINUTE);
    await page.clock.runFor(1000);
    await speedStillNear(page, before, 4);
  });
});
