import { expect, test } from '@playwright/test';
import { drone, hud, pauseMenu } from './helpers';
import {
  bottomEdge,
  hudSpeed,
  launchOnStoppedClock,
  pauseButton,
  resumeButton,
  typeKeys,
} from './journey-helpers';

// J3: the frozen pause, on a clock that stands still. The page's clock is
// stopped before it loads and only moves when this journey says so, so a Drone
// is caught mid-fall and nothing else moves it. Keys typed while it stands
// still cost no drawing, which keeps the journey cheap on a runner with a
// software GL.
//
// The numbers are in frames (the page's clock runs 60 a second): a Drone
// caught two frames into its fall, then minutes of frames behind the Pause
// Menu, and then a fall that carries on.

test.use({ viewport: { width: 1280, height: 1100 } });
// Every frame stepped over is drawn for real, in software GL on a CI runner.
test.setTimeout(120_000);

test('the paused deck is frozen: Drones and the Speed stand still, and carry on after Resume', async ({
  page,
}) => {
  await launchOnStoppedClock(page, 'abcdefgh');

  // PixiJS draws on animation frames, which only come when the clock moves.
  // Give it frames until the deck is up, then let the lead Drone settle.
  await expect(async () => {
    await page.clock.runFor(50);
    await expect(drone(page, 'b')).toBeVisible({ timeout: 250 });
  }).toPass({ timeout: 10_000 });
  await page.clock.runFor(600);

  await test.step('the HUD shows a Speed once the Run has gone on a little', async () => {
    // Four hits with no time passing, then a second of Run Time: the HUD
    // refreshes its Speed on a tick.
    await typeKeys(page, 'abcd');
    await page.clock.runFor(1000);

    await expect.poll(() => hudSpeed(page)).toBeGreaterThan(0);
  });

  const settled = await bottomEdge(drone(page, 'f'));
  let midFall = settled;
  await test.step('typing the lead sends the Drone behind it down: two frames in, it is on its way', async () => {
    await page.keyboard.press('e');
    await page.clock.runFor(32);

    midFall = await bottomEdge(drone(page, 'f'));
    expect.soft(midFall).toBeGreaterThan(settled);
  });

  let speedAtPause = 0;
  await test.step('behind the Pause Menu, minutes go by and the Drone and the Speed have not moved', async () => {
    await pauseButton(page).click();
    await expect(pauseMenu(page)).toBeVisible();
    speedAtPause = await hudSpeed(page);

    // Half a second of frames after the jump: more than the 30 steps between
    // two telemetry ticks, so a Speed that kept counting would have been
    // refreshed by now.
    await page.clock.fastForward(5 * 60_000);
    await page.clock.runFor(500);

    expect.soft(await bottomEdge(drone(page, 'f'))).toBe(midFall);
    expect.soft(await hudSpeed(page)).toBe(speedAtPause);
  });

  await test.step('after Resume the Drone carries on falling from where it stopped', async () => {
    await resumeButton(page).click();
    await expect(pauseMenu(page)).toBeHidden();
    await page.clock.runFor(300);

    expect.soft(await bottomEdge(drone(page, 'f'))).toBeGreaterThan(midFall);
    await expect.soft(hud(page)).toContainText(/Streak\s*5(?!\d)/i);
  });
});
