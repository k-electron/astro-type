import { type Page, test } from '@playwright/test';
import { debrief, drone, pauseMenu, promptProgress } from '../helpers';
import { DEBRIEF_TITLE } from '../../shared/screens';
import {
  bottomEdge,
  expectOnStillClock,
  hudSpeed,
  launchOnStoppedClock,
  pauseButton,
  resumeButton,
  STILL_CLOCK_WAIT,
  waitForDeck,
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
// Speed in the HUD and on the Debrief (WPM is measured against Typing Time,
// the part of Run Time from the first keystroke) and the Rhythm (Rhythm is
// measured between keystrokes in Run Time).
//
// What is guarded here: a capped catch-up after a stall, and a pause not
// dragging down the final Speed or the Rhythm.

test.skip(
  Boolean(process.env.CI),
  'Local-only: pnpm verify runs it, CI does not',
);
// The tests are independent, so they can run on separate workers.
test.describe.configure({ mode: 'parallel' });
// The clock stands still whenever a test waits for the page, so a wait
// changes nothing on screen, and a busy machine can take many seconds to draw
// the frames a `runFor` stepped over: every wait takes STILL_CLOCK_WAIT (#164).
const expect = expectOnStillClock;

const MINUTE = 60_000;

/**
 * The Speed once the HUD has shown a Speed of at least `min` (React draws a
 * moment after the page's timers run, and the page's time is stopped while
 * this waits), checked to be at most `max`.
 */
async function speedBetween(page: Page, min: number, max: number) {
  await expect.poll(() => hudSpeed(page)).toBeGreaterThanOrEqual(min);
  const speed = await hudSpeed(page);
  if (speed === null) throw new Error('The HUD shows no Speed');
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
  await expect(pauseMenu(page)).toBeVisible();
}

async function resume(page: Page) {
  await resumeButton(page).click();
  await expect(pauseMenu(page)).toBeHidden();
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

  // One key every 900 ms: 3 before the pause, 3 after it. The Run lasts 5.4
  // seconds of Run Time, and its Typing Time 4.5 s, from the first key to the
  // last: 6 keys, 5 / 5 / (4.5 / 60) = 13.3 WPM, shown as 13, at an even rhythm.
  for (const key of 'abc') await pressAfter(page, 900, key);
  await pause(page);
  await page.clock.fastForward(5 * MINUTE);
  await page.clock.runFor(500);
  await resume(page);
  for (const key of 'def') await pressAfter(page, 900, key);

  const result = debrief(page);
  await expect(result).toContainText(DEBRIEF_TITLE);
  // Counting the pause it would be 5 / 5 / (304.5 / 60) = 0 WPM and a 30% rhythm.
  await expect(result).toContainText(/Speed\s*13\s*WPM/i);
  await expect(result).toContainText(/Rhythm:\s*\d+% \(Steady\)/i);
});

test('catch-up after a long stall is capped: the Drones do not jump across the deck and the Speed barely moves', async ({
  page,
}) => {
  await launchOnStoppedClock(page, 'abcdefghijklmnop');

  await test.step('a five-minute stall leaves the lead Drone a little way down, and it is still falling', async () => {
    // The Run is paused while the clock gives the deck its first frames, so
    // the lead Drone is drawn where the Run seeded it.
    await waitForDeck(page, 'a');
    const lead = drone(page, 'a');
    const start = await bottomEdge(lead, STILL_CLOCK_WAIT);

    // One frame of flight, so the Run is under way. The page then stalls for
    // five minutes in one go (a frozen tab, a laptop asleep). A Drone that fell
    // for all of it would be waiting on the Strike Line now. Capped, the Run
    // catches up by 100 ms (6 steps) and the Drone is a few steps from the line
    // (measured: 52 of 93 px fallen, the rest still to go).
    await page.clock.runFor(20);
    await page.clock.fastForward(5 * MINUTE);
    await page.clock.runFor(17);
    const afterStall = await bottomEdge(lead, STILL_CLOCK_WAIT);

    await page.clock.runFor(1000);
    const waiting = await bottomEdge(lead, STILL_CLOCK_WAIT);

    expect(afterStall, 'it has come down from where it began').toBeGreaterThan(
      start,
    );
    expect(
      waiting - afterStall,
      'and it still had a way to fall',
    ).toBeGreaterThan((waiting - start) * 0.2);
  });

  await test.step('a second stall is caught up only by a fraction of a second, so the Speed is what the typing gives', async () => {
    // 8 keys, the first typed a second or so before the rest, then 5 s more:
    // Typing Time is about 6 s, so 7 / 5 / (6 / 60) = 14 WPM. The range is wide
    // for the live refresh landing a half second either way.
    await page.keyboard.press('a');
    await page.clock.runFor(1000);
    for (const key of 'bcdefgh') await page.keyboard.press(key);
    await expect(promptProgress(page)).toHaveText('50%');
    await page.clock.runFor(5000);
    const before = await speedBetween(page, 13, 15);

    // The Run has only 100 ms of the stall to catch up on, so the Speed is what
    // about 7 seconds of Typing Time gives (12 WPM), not what 5 minutes would give (under 1).
    await page.clock.fastForward(5 * MINUTE);
    await page.clock.runFor(1000);
    await speedStillNear(page, before, 4);
  });
});
