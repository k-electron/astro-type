/// <reference types="node" />
import { expect, type Locator, type Page, test } from '@playwright/test';
import {
  debrief,
  drone,
  flightDeck,
  promptProgress,
  typeText,
} from './helpers';

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
//   the test says so, one whole frame at a time, so Drones, thrusters, lights
//   and effects are exactly where the clock put them. Real time cannot reach a
//   frame. The clock's own time is NOT the same each run (its origin is the
//   few real milliseconds the page took to load), but its frames fall on a
//   fixed grid of 16 ms, so the test steps by whole frames, never by a number
//   of milliseconds: a step that ends between two frames can land the hit one
//   frame earlier or later, which changed the explosion's picture.
// - `Math.random`, replaced by a seeded generator before the page loads and
//   again just before the hit, so the sparks and debris fly the same way
//   every time (and the starfield's draws before the hit can't shift them).
// - Sound, which is switched off by removing `AudioContext`: the sound engine
//   draws random numbers on its own real-time schedule, which would change
//   the sparks from run to run.
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

// One frame of the page's clock. Playwright's clock fires a frame at every
// multiple of this, so every step in these tests is a whole number of them.
const STEP_MS = 16;
// How many frames the Run has had when a picture is taken at "Run start":
// long enough for the Drones to have come down and settled.
const SETTLE_FRAMES = 187;

/**
 * Replaces `Math.random` with a small seeded generator (mulberry32). Runs in
 * the page, so it has to stand on its own.
 */
function useSeededRandom(seed: number) {
  let state = seed;
  Math.random = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Free Flight on a clock that stands still, with the Run exactly
 * `SETTLE_FRAMES` frames old, and the clock on a frame boundary. The deck is
 * set up in real time, which the page's clock can't see, so the test first
 * waits (in real time, auto-waiting) for PixiJS to have sized the canvas, and
 * only then lets the first frame come. That frame draws the deck.
 */
async function launchOnFixedClock(page: Page, text: string) {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
    route.abort(),
  );
  await page.addInitScript(useSeededRandom, 0x5eed);
  await page.addInitScript(() => {
    Object.assign(window, {
      AudioContext: undefined,
      webkitAudioContext: undefined,
    });
  });
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

  // PixiJS sizes the canvas as soon as its Application is up (a canvas starts
  // at the browser's default 300 x 150), and the scene is built in the same
  // breath. Nothing is drawn until the clock moves.
  await page.waitForLoadState('networkidle');
  await expect
    .poll(() =>
      deckCanvas(page).evaluate(
        (canvas) => (canvas as HTMLCanvasElement).width,
      ),
    )
    .toBeGreaterThan(300);

  // Land on a frame boundary: the clock's time isn't a multiple of a frame, and
  // the frame that this step fires is the Run's first.
  const now = await page.evaluate(() => performance.now());
  await page.clock.runFor(STEP_MS - (now % STEP_MS));
  await expect(drone(page, text[1])).toBeVisible();
  await page.clock.runFor((SETTLE_FRAMES - 1) * STEP_MS);
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
  await page.evaluate(useSeededRandom, 0xa11);
  await page.keyboard.press('a');
  // React has seen the hit before time moves on, so it can't land half way.
  await expect(flightDeck(page)).toContainText(/Streak\s*1(?!\d)/i);
  await page.clock.runFor(10 * STEP_MS);
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
  for (const [index, key] of [...TEXT].entries()) {
    await typeText(page, key);
    if (index < TEXT.length - 1) {
      const done = Math.round(((index + 1) / TEXT.length) * 100);
      await expect(promptProgress(page)).toHaveText(`${done}%`);
    }
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
