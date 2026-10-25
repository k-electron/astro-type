/// <reference types="node" />
import { expect, type Locator, type Page, test } from '@playwright/test';
import { debrief, drone, flightDeck, typeText } from './helpers';

// Three screenshot checks on the PixiJS Action Deck: the Flight Deck at Run
// start, the deck frozen mid-explosion, and the Debrief. A screenshot is the
// one check that sees what the player sees pixel by pixel, so it is the one
// that catches an unintended visual change in the canvas.
//
// ONLY IN CI'S FIXED IMAGE. Pixels depend on the OS, its fonts and the GL
// backend, so the baselines live next to this file for one environment only:
// the Playwright Docker image (Linux) that CI runs in. Everywhere else, these
// tests skip, which includes `pnpm verify` on a laptop. They run when
// `PW_SCREENSHOTS` is set, and a baseline is updated, on purpose, by running
// with `PW_SCREENSHOTS=1` and `--update-snapshots` in that same image. A
// failing comparison leaves the expected, actual and diff images under
// `test-results/` (Playwright's own output), which CI uploads.
//
// What every picture depends on, and how it is made the same on every run:
// - The viewport (1280 x 1100) and a device pixel ratio of 1: the deck is
//   drawn to the canvas at the display's resolution.
// - The page clock. It stands still before the page loads and only moves when
//   the test says so, by amounts that add up to the same total each time, so
//   Drones, thrusters, lights and effects are exactly where the clock put
//   them. Real time cannot reach a frame.
// - `Math.random`, replaced by a seeded generator before the page loads, in
//   case anything drawn (sparks, debris, stars) is random.
// - Web fonts, which are blocked: a font that arrives half way through a run
//   would redraw the text. Every run uses the image's own fallback fonts.
// - The starfield behind the page, a full-window canvas that is hidden: it
//   moves on its own and is not what these pictures are about.
// - CSS animations and transitions, which Playwright fast-forwards to their
//   end (`animations: 'disabled'`), because the page's clock does not drive
//   them.
// - A fresh browser context per test, so the Profile is a new player's, with
//   no Stars, no Credits and no Upgrades.

test.skip(
  !process.env.PW_SCREENSHOTS,
  'Screenshots are compared only in CI’s fixed Playwright image: set PW_SCREENSHOTS=1 there',
);

test.use({
  viewport: { width: 1280, height: 1100 },
  deviceScaleFactor: 1,
  locale: 'en-US',
  timezoneId: 'UTC',
});
// Every frame of a stopped clock is drawn for real, in software on CI.
test.setTimeout(180_000);

const COMPARE = {
  animations: 'disabled',
  caret: 'hide',
  scale: 'css',
  // Rendering is identical from run to run in one image, so this is only a
  // little room for anti-aliasing. A visual change that matters (a colour, a
  // shape, a position) moves far more pixels than this.
  maxDiffPixelRatio: 0.001,
  threshold: 0.2,
} as const;

// Six different letters, so each Drone is easy to tell apart. The lead ("a")
// is the one hit in the explosion picture.
const TEXT = 'abcdef';

// How much of the page's time has gone by when a picture is taken at "Run
// start": long enough for the Drones to have come down and settled.
const SETTLE_MS = 3000;

/** A small seeded random generator (mulberry32): the same numbers every run. */
async function seedRandom(page: Page) {
  await page.addInitScript(() => {
    let seed = 0x5eed;
    Math.random = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  });
}

/**
 * Free Flight on a clock that stands still, with the Run exactly `SETTLE_MS`
 * of page time old. The deck takes a varying amount of real time to come up
 * (and frames only come when the clock moves), so the clock is stepped until
 * the deck is drawn, and then topped up to the same total every time.
 */
async function launchOnFixedClock(page: Page, text: string) {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
    route.abort(),
  );
  await seedRandom(page);
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Free Flight', exact: true }).click();
  await page.getByRole('textbox').fill(text);
  await page.getByRole('button', { name: 'Launch Custom Flight' }).click();
  await expect(
    page.getByRole('button', { name: 'Pause', exact: true }),
  ).toBeVisible();
  await expect(flightDeck(page)).toContainText(text);

  let elapsed = 0;
  await expect(async () => {
    await page.clock.runFor(50);
    elapsed += 50;
    await expect(drone(page, text[1])).toBeVisible({ timeout: 250 });
  }).toPass({ timeout: 15_000 });
  if (elapsed > SETTLE_MS) {
    throw new Error(`The deck took ${elapsed} ms of page time to be drawn`);
  }
  await page.clock.runFor(SETTLE_MS - elapsed);
}

/**
 * Hides the canvases that fill the window behind the page (the starfield, and
 * confetti), and with `all`, every canvas. Hidden, not removed: nothing moves.
 */
async function hideBackdropCanvases(page: Page, all = false) {
  await page.evaluate((everything) => {
    for (const canvas of document.querySelectorAll('canvas')) {
      if (everything || getComputedStyle(canvas).position === 'fixed') {
        canvas.style.visibility = 'hidden';
      }
    }
  }, all);
}

/** The Action Deck's canvas: the one place PixiJS draws. */
const deckCanvas = (page: Page): Locator => page.locator('canvas').last();

test('the Flight Deck at Run start', async ({ page }) => {
  await launchOnFixedClock(page, TEXT);
  await hideBackdropCanvases(page);

  await expect(page).toHaveScreenshot('flight-deck-run-start.png', COMPARE);
});

test('the deck frozen mid-explosion', async ({ page }) => {
  await launchOnFixedClock(page, TEXT);

  // Hit the lead Drone, then stop the clock at the heart of the explosion:
  // the flash, debris, sparks and shockwaves are all on screen.
  await page.keyboard.press('a');
  await page.clock.runFor(150);
  await hideBackdropCanvases(page);

  await expect(deckCanvas(page)).toHaveScreenshot(
    'deck-mid-explosion.png',
    COMPARE,
  );
});

test('the Debrief of a cleared Run', async ({ page }) => {
  await launchOnFixedClock(page, TEXT);

  // One key every 400 ms of page time, so the Run's Speed, Rhythm and Stars
  // are the same every time.
  for (const key of TEXT) {
    await typeText(page, key);
    await page.clock.runFor(400);
  }
  await expect(page.getByText(/Mission Debriefing/)).toBeVisible();
  // Let the card settle (its numbers and its fade-in).
  await page.clock.runFor(3000);
  await hideBackdropCanvases(page, true);

  // The card alone: the blurred deck behind it is not what is being checked.
  // The two readouts that come from timing (Speed, and the Credits earned for
  // it) are masked, so a change to how time is measured can't fail a picture
  // of the Debrief's layout. Their values are covered by the journeys.
  const card = debrief(page);
  const tile = (label: RegExp) =>
    card.locator('div', { has: page.getByText(label) }).last();

  await expect(card).toHaveScreenshot('debrief.png', {
    ...COMPARE,
    mask: [tile(/^speed$/i), tile(/^credits$/i)],
  });
});
