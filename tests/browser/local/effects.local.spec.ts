import { type Browser, type Page, test as base } from '@playwright/test';
import {
  FINGER_LANES,
  keyForCharacter,
} from '../../../src/curriculum/curriculum';
import { entriesOf } from '../../../src/game/catalog';
import { trailEquipped } from '../../shared/saves';
import { PAUSE_FLIGHT } from '../../shared/screens';
import { drone, keycap, pauseMenu, seedSave } from '../helpers';
import {
  box,
  expectOnStillClock,
  launchWithLeadDroneSettled,
  resumeButton,
} from '../journey-helpers';

// LOCAL ONLY (run by `pnpm verify`, not in CI; docs/agents/testing.md): hundreds of drawn
// frames per test, too heavy for CI's runner. The old browser tests guarded
// the same effects: a hit explodes its Drone, a Miss shows red, the ship and
// guidance beam are drawn, and a pause freezes an explosion mid-flight.
//
// The effects on the PixiJS Action Deck: lasers, lock-on
// brackets, explosions, the ship, the guidance beam, Drone thrusters and keycap
// glow. They are drawn in a canvas, so these journeys do what a player does:
// look at the deck. They take screenshots of the deck and compare them pixel by
// pixel (a changed pixel is one whose colour moved noticeably). Nothing else is
// read from the app, apart from the accessibility layer's labelled Drones and
// keycaps, which say where to look.
//
// The page's clock stands still before the page loads and only moves when a
// test says so, so every frame is exactly where the test put it: an effect is
// caught mid-flight, and nothing else moves it. There are no stored baseline
// images: each test compares captures taken in the same run.
//
// The numbers below leave a wide margin (the effects have to be there and run
// their course; they are not pinned to the pixel). Exact pictures are the job
// of screenshots.spec.ts.

// Letters on far apart keys, so each Drone falls in a lane of its own: the lead
// ("q", far left) has an empty lane around it once it is destroyed, and the
// Drones behind it fall nowhere near that lane.
const TEXT = 'qpolkm';

/** The colour of the finger that types a character: the colour of its beam. */
function fingerColour(character: string): string {
  const lane = keyForCharacter(character)?.lane;
  const colour = lane === undefined ? undefined : FINGER_LANES[lane]?.color;
  if (!colour) throw new Error(`No finger types "${character}"`);
  return colour;
}

type Rect = { x: number; y: number; width: number; height: number };

/**
 * Pixel comparisons, done in a blank page of their own (so they never touch
 * the game's page, or its stopped clock). Captures go in once and come back as
 * ids; the questions are then about regions of them.
 */
type Pixels = {
  load(png: Buffer): Promise<number>;
  /** How many pixels differ noticeably between two captures. */
  changed(a: number, b: number, region?: Rect): Promise<number>;
  /** How many pixels are strongly red: the colour of a Miss. */
  red(a: number, region?: Rect): Promise<number>;
  /**
   * How many pixels are lit in a finger's colour (`#rrggbb`): the guidance
   * beam, which takes the colour of the finger that types the target.
   */
  beam(a: number, colour: string, region?: Rect): Promise<number>;
  /** How many pixels are bright (something lit, on the dark deck). */
  bright(a: number, region?: Rect): Promise<number>;
  /** How many pixels are amber or orange: the colour of the Solar Flare Trail. */
  amber(a: number, region?: Rect): Promise<number>;
};

const test = base.extend<{ pixels: Pixels }>({
  pixels: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.evaluate(() => {
      (window as unknown as { imgs: ImageData[] }).imgs = [];
    });
    const call = <T>(fn: string, ...args: unknown[]) =>
      page.evaluate(
        async ([name, rest]) => {
          const w = window as unknown as {
            imgs: ImageData[];
          };
          const at = (id: number, region?: Rect) => {
            const img = w.imgs[id];
            const r = region ?? {
              x: 0,
              y: 0,
              width: img.width,
              height: img.height,
            };
            const x0 = Math.max(0, Math.round(r.x));
            const y0 = Math.max(0, Math.round(r.y));
            const x1 = Math.min(img.width, Math.round(r.x + r.width));
            const y1 = Math.min(img.height, Math.round(r.y + r.height));
            return { img, x0, y0, x1, y1 };
          };
          const [a, b, region, colour] = rest as [
            number,
            number | undefined,
            Rect?,
            string?,
          ];
          if (name === 'changed') {
            const A = at(a, region);
            const B = w.imgs[b as number];
            let n = 0;
            for (let y = A.y0; y < A.y1; y++) {
              for (let x = A.x0; x < A.x1; x++) {
                const i = (y * A.img.width + x) * 4;
                const d =
                  Math.abs(A.img.data[i] - B.data[i]) +
                  Math.abs(A.img.data[i + 1] - B.data[i + 1]) +
                  Math.abs(A.img.data[i + 2] - B.data[i + 2]);
                if (d > 30) n++;
              }
            }
            return n;
          }
          const A = at(a, region);
          let n = 0;
          for (let y = A.y0; y < A.y1; y++) {
            for (let x = A.x0; x < A.x1; x++) {
              const i = (y * A.img.width + x) * 4;
              const [r, g, bl] = [
                A.img.data[i],
                A.img.data[i + 1],
                A.img.data[i + 2],
              ];
              if (
                name === 'red' &&
                r > 180 &&
                g < 110 &&
                bl < 140 &&
                r - g > 100
              )
                n++;
              if (name === 'beam' && colour) {
                // Lit (the aura blends the colour into the dark deck, so only
                // the bright part counts), and the same mix of red, green and
                // blue as the finger's colour.
                const want = [1, 3, 5].map((k) =>
                  Number.parseInt(colour.slice(k, k + 2), 16),
                );
                const top = Math.max(...want);
                const px = [r, g, bl];
                if (
                  Math.max(r, g, bl) > 140 &&
                  px.every(
                    (v, c) =>
                      Math.abs(v / Math.max(r, g, bl) - want[c] / top) < 0.2,
                  )
                )
                  n++;
              }
              if (name === 'bright' && Math.max(r, g, bl) > 160) n++;
              // Amber (#f59e0b), also as it blends into the dark deck. Cyan
              // (r low), pink (blue high), red (green low) and white (blue
              // high) are all outside it.
              if (
                name === 'amber' &&
                r > 110 &&
                g > 60 &&
                bl < 90 &&
                r > g &&
                g > 1.5 * bl
              )
                n++;
            }
          }
          return n;
        },
        [fn, args] as const,
      ) as Promise<T>;
    await use({
      load: async (png) =>
        page.evaluate(async (b64) => {
          const w = window as unknown as { imgs: ImageData[] };
          const bitmap = await createImageBitmap(
            await (await fetch(`data:image/png;base64,${b64}`)).blob(),
          );
          const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
          const g = canvas.getContext('2d');
          if (!g) throw new Error('No 2D canvas to read pixels with');
          g.drawImage(bitmap, 0, 0);
          w.imgs.push(g.getImageData(0, 0, bitmap.width, bitmap.height));
          return w.imgs.length - 1;
        }, png.toString('base64')),
      changed: (a, b, region) => call<number>('changed', a, b, region),
      red: (a, region) => call<number>('red', a, undefined, region),
      beam: (a, colour, region) =>
        call<number>('beam', a, undefined, region, colour),
      bright: (a, region) => call<number>('bright', a, undefined, region),
      amber: (a, region) => call<number>('amber', a, undefined, region),
    });
    await context.close();
  },
});

test.skip(
  Boolean(process.env.CI),
  'Local-only: pnpm verify runs it, CI does not',
);
// Tall enough that the Drones, the Strike Line and the keyboard are all on
// screen at once, and that the Action Deck is drawn at full size (it scales
// down when the Flight Deck doesn't fit, which is about 1,144 px tall), so the
// pixel counts below don't depend on the deck's scale. (The local project sets
// the same viewport and a timeout of 240 s, since every frame stepped under a
// stopped clock is drawn.)
test.use({ viewport: { width: 1280, height: 1200 } });
// The tests are independent, so they can run on separate workers.
test.describe.configure({ mode: 'parallel' });
// The clock stands still whenever a test waits for the page, so every wait
// takes as long as a busy machine needs (STILL_CLOCK_WAIT).
const expect = expectOnStillClock;

/** The Action Deck's canvas: the one place PixiJS draws. */
async function deckArea(page: Page): Promise<Rect> {
  const b = await box(page.locator('canvas').last());
  return {
    x: Math.round(b.x),
    y: Math.round(b.y),
    width: Math.round(b.width),
    height: Math.round(b.height),
  };
}

/** A picture of the deck, as the player sees it right now. */
async function look(page: Page, deck: Rect, pixels: Pixels): Promise<number> {
  return pixels.load(await page.screenshot({ clip: deck }));
}

/** A region of the page, in the coordinates of a picture of the deck. */
const inDeck = (deck: Rect, region: Rect, pad = 0): Rect => ({
  x: region.x - deck.x - pad,
  y: region.y - deck.y - pad,
  width: region.width + 2 * pad,
  height: region.height + 2 * pad,
});

/**
 * The empty lane a Drone leaves behind: a window around where the lead Drone
 * waits at the Strike Line, from just above the keyboard upwards. No other
 * Drone falls through it, and nothing the keyboard does reaches it.
 */
async function laneOf(
  page: Page,
  character: string,
  deck: Rect,
): Promise<Rect> {
  const lead = await box(drone(page, character));
  const keyboardTop = (await box(keycap(page, '1'))).y;
  const bottom = keyboardTop - 12;
  return inDeck(deck, {
    x: lead.x + lead.width / 2 - 140,
    y: bottom - 215,
    width: 280,
    height: 215,
  });
}

test('a hit explodes the Drone in its own lane, and the explosion plays out and ends', async ({
  page,
  pixels,
}) => {
  await launchWithLeadDroneSettled(page, TEXT);
  const deck = await deckArea(page);
  const lane = await laneOf(page, 'q', deck);

  await page.keyboard.press('q');

  // Lasers and lock-on brackets first, then the explosion at its biggest...
  await page.clock.runFor(100);
  const early = await look(page, deck, pixels);
  await page.clock.runFor(100);
  const peak = await look(page, deck, pixels);
  // ...and long after, nothing of it is left.
  await page.clock.runFor(1300);
  const over = await look(page, deck, pixels);
  await page.clock.runFor(1500);
  const settled = await look(page, deck, pixels);
  await page.clock.runFor(1000);
  const later = await look(page, deck, pixels);

  // The lane is the same empty lane at the end as it was a second earlier.
  expect(await pixels.changed(settled, later, lane)).toBeLessThan(150);
  expect(await pixels.changed(over, settled, lane)).toBeLessThan(150);
  // While it played, the lane was full of it: lasers and brackets at 0.1 s,
  // the flash, debris, sparks and shockwaves at 0.2 s.
  expect(await pixels.changed(early, settled, lane)).toBeGreaterThan(800);
  expect(await pixels.changed(peak, settled, lane)).toBeGreaterThan(3000);
});

/**
 * The two strips at the sides of the deck, from just above the keyboard
 * upwards, well away from the middle where the Drones wait, the lasers run and
 * the popups and banners are drawn. Only the debris and sparks of a big enough
 * explosion reach them.
 */
async function sideStrips(page: Page, deck: Rect): Promise<Rect[]> {
  const keyboardTop = (await box(keycap(page, '1'))).y;
  const centre = deck.x + deck.width / 2;
  const height = 280;
  return [centre - 480, centre + 240].map((x) =>
    inDeck(deck, { x, y: keyboardTop - 12 - height, width: 240, height }),
  );
}

/**
 * How far an explosion reaches: the most pixels changed in the side strips,
 * from the quiet deck before the hit, over the frames from 100 to 400 ms after
 * it. Gives the clock the frames, so it leaves the deck 400 ms on.
 */
async function explosionReach(
  page: Page,
  pixels: Pixels,
  deck: Rect,
  strips: Rect[],
  before: number,
): Promise<number> {
  let most = 0;
  for (let frame = 0; frame < 4; frame++) {
    await page.clock.runFor(100);
    const now = await look(page, deck, pixels);
    let changed = 0;
    for (const strip of strips) {
      changed += await pixels.changed(before, now, strip);
    }
    most = Math.max(most, changed);
  }
  return most;
}

test('the hit that finishes a clean word sets off a bigger explosion than a letter hit', async ({
  page,
  pixels,
}) => {
  // "b" and "n" are letter hits (their word is not finished). The space after
  // them finishes the clean word "bn". Their Drones all fall near the middle of
  // the deck, so the same side strips see how far each explosion reaches. "mv"
  // keeps the Run going.
  await launchWithLeadDroneSettled(page, 'bn mv');
  const deck = await deckArea(page);
  const strips = await sideStrips(page, deck);

  const quietBeforeLetter = await look(page, deck, pixels);
  await page.keyboard.press('b');
  const letter = await explosionReach(
    page,
    pixels,
    deck,
    strips,
    quietBeforeLetter,
  );

  // The letter's explosion is long over, and the next Drone has settled. A
  // second letter, then the space.
  await page.clock.runFor(3500);
  await page.keyboard.press('n');
  await page.clock.runFor(3500);
  const quietBeforeClean = await look(page, deck, pixels);
  await page.keyboard.press('Space');
  const clean = await explosionReach(
    page,
    pixels,
    deck,
    strips,
    quietBeforeClean,
  );

  // The letter's debris stays near its Drone; the clean word's flies out to
  // the sides.
  expect(
    clean,
    'the clean word explodes bigger than the letter',
  ).toBeGreaterThan(Math.max(1000, letter * 3));
});

test('a milestone is announced by a banner across the upper deck at Streak 10, and not at Streak 9', async ({
  page,
  pixels,
}) => {
  // Sixteen different letters: no "x" or "z" (a Miss's keys), and no space, so
  // no clean-word banner but the milestone's.
  const text = 'abcdefghijklmnop';
  await launchWithLeadDroneSettled(page, text);
  const deck = await deckArea(page);
  // The banners sit in the upper part of the deck, clear of the keyboard and
  // the text prompt: the top third.
  const band: Rect = { x: 0, y: 0, width: deck.width, height: deck.height / 3 };

  /**
   * What a hit leaves in the band that is gone five seconds later: the deck
   * 850 ms after the hit, once the Drones have slid into their places and the
   * explosion is down to a few sparks, against the deck long after. A banner
   * is the only thing there that is not. (850 ms assumes the banner lasts
   * about a second, a starting value the owner may tune: if the banner changes
   * length, move the sample with it.)
   */
  async function leftInBandBy(key: string): Promise<number> {
    await page.keyboard.press(key);
    await page.clock.runFor(850);
    const shown = await look(page, deck, pixels);
    await page.clock.runFor(5000);
    const gone = await look(page, deck, pixels);
    return pixels.changed(shown, gone, band);
  }

  for (const key of text.slice(0, 8)) await page.keyboard.press(key);
  await page.clock.runFor(2500);
  const ninth = await leftInBandBy(text[8]);
  const tenth = await leftInBandBy(text[9]);

  // Streak 10 draws a large banner in the band; Streak 9 draws nothing there.
  expect(tenth, 'Streak 10 has a banner').toBeGreaterThan(1500);
  expect(ninth, 'Streak 9 has none').toBeLessThan(tenth / 2.5);
});

test('a symbol that needs Shift is a target like any other: the ship and the guidance beam wait under its base key, and a hit explodes its Drone in that lane', async ({
  page,
  pixels,
}) => {
  // "!" is typed on the "1" key. "p" and "m" are far from it, so the lane
  // around "!" is empty once its Drone is gone.
  await launchWithLeadDroneSettled(page, '!pm');
  const deck = await deckArea(page);
  const base = await box(keycap(page, '1'));
  const centre = base.x + base.width / 2;
  const keyboardTop = base.y;
  const lane = await laneOf(page, '!', deck);

  // The target is lit: the beam runs up from under the "1" key to the Drone...
  const waiting = await look(page, deck, pixels);
  const beamRegion = inDeck(deck, {
    x: centre - 7,
    y: keyboardTop - 410,
    width: 14,
    height: 300,
  });
  const finger = fingerColour('!');
  expect(await pixels.beam(waiting, finger, beamRegion)).toBeGreaterThan(100);
  // ...and only there: the same strip, a key's width to the side, has none.
  const beside = inDeck(deck, {
    x: centre + base.width - 7,
    y: keyboardTop - 410,
    width: 14,
    height: 300,
  });
  expect(await pixels.beam(waiting, finger, beside)).toBeLessThan(20);
  // ...and the ship waits under that key.
  const shipRegion = inDeck(deck, {
    x: centre - 60,
    y: keyboardTop + 221,
    width: 120,
    height: 40,
  });
  expect(await pixels.bright(waiting, shipRegion)).toBeGreaterThan(50);

  // The hit fires the lasers, then the explosion, in the Drone's own lane.
  await page.keyboard.press('!');
  await page.clock.runFor(100);
  const early = await look(page, deck, pixels);
  await page.clock.runFor(100);
  const peak = await look(page, deck, pixels);
  await page.clock.runFor(3800);
  const settled = await look(page, deck, pixels);

  expect(await pixels.changed(early, settled, lane)).toBeGreaterThan(800);
  expect(await pixels.changed(peak, settled, lane)).toBeGreaterThan(3000);
});

test('a wrong key is a Miss: red on the deck and the keycap lights, and nothing flashes in the Drone lane', async ({
  page,
  pixels,
}) => {
  await launchWithLeadDroneSettled(page, TEXT);
  const deck = await deckArea(page);
  const lane = await laneOf(page, 'q', deck);
  // "z" is not the next character ("q"), nor anywhere in the text.
  const zKey = inDeck(deck, await box(keycap(page, 'z')), 4);

  // How much the deck moves on its own over the next few frames (thrusters,
  // lights): a Miss has to do better than that.
  const idleBefore = await look(page, deck, pixels);
  await page.clock.runFor(100);
  const before = await look(page, deck, pixels);
  const idle = await pixels.changed(idleBefore, before);
  const idleLane = await pixels.changed(idleBefore, before, lane);
  const redBefore = await pixels.red(before);

  await page.keyboard.press('z');

  let deckChange = 0;
  let laneChange = 0;
  let keyChange = 0;
  let redPeak = 0;
  for (let frame = 0; frame < 4; frame++) {
    await page.clock.runFor(50);
    const now = await look(page, deck, pixels);
    deckChange = Math.max(deckChange, await pixels.changed(before, now));
    laneChange = Math.max(laneChange, await pixels.changed(before, now, lane));
    keyChange = Math.max(keyChange, await pixels.changed(before, now, zKey));
    redPeak = Math.max(redPeak, await pixels.red(now));
  }

  // Something is drawn (a laser, a flash, a popup), and it is red.
  expect(deckChange).toBeGreaterThan(idle + 2500);
  expect(redPeak - redBefore).toBeGreaterThan(600);
  // The key the player pressed lights up...
  expect(keyChange).toBeGreaterThan(250);
  // ...and the Drone's lane is left alone: no hit effects for a Miss.
  expect(laneChange).toBeLessThan(idleLane + 500);

  // The Miss doesn't linger.
  await page.clock.runFor(1500);
  const after = await look(page, deck, pixels);
  expect(await pixels.red(after)).toBeLessThan(redBefore + 300);
  // And the Drone is still there to be typed.
  await expect(drone(page, 'q')).toBeVisible();
});

test('the paused deck is frozen mid-explosion, and the explosion carries on from that point after Resume', async ({
  page,
  pixels,
}) => {
  await launchWithLeadDroneSettled(page, TEXT);
  const deck = await deckArea(page);
  const lane = await laneOf(page, 'q', deck);

  // Caught at the heart of the explosion.
  await page.keyboard.press('q');
  await page.clock.runFor(150);
  const midExplosion = await look(page, deck, pixels);

  await page.getByRole('button', { name: PAUSE_FLIGHT, exact: true }).click();
  await expect(pauseMenu(page)).toBeVisible();

  // The Pause Menu fades in on the real clock. Once it has settled, the
  // explosion's lane behind it is what is being compared.
  let frozen = await look(page, deck, pixels);
  for (let tries = 0; tries < 20; tries++) {
    const again = await look(page, deck, pixels);
    if ((await pixels.changed(frozen, again, lane)) === 0) {
      frozen = again;
      break;
    }
    frozen = again;
  }

  // Minutes of frames go by behind the Pause Menu: nothing has moved.
  await page.clock.runFor(1000);
  await page.clock.fastForward(5 * 60_000);
  await page.clock.runFor(500);
  const stillFrozen = await look(page, deck, pixels);
  expect(await pixels.changed(frozen, stillFrozen, lane)).toBeLessThan(10);

  // Back in the Run, it picks up from the very frame it stopped on...
  await resumeButton(page).click();
  await expect(pauseMenu(page)).toBeHidden();
  await page.clock.runFor(16);
  const resumed = await look(page, deck, pixels);
  // ...and plays on to the end.
  await page.clock.runFor(1800);
  const over = await look(page, deck, pixels);
  await page.clock.runFor(1000);
  const later = await look(page, deck, pixels);

  // It really was mid-explosion when it was paused: the lane was full of it,
  // and it is empty at the end.
  const midway = await pixels.changed(midExplosion, over, lane);
  expect(midway).toBeGreaterThan(3000);
  expect(await pixels.changed(over, later, lane)).toBeLessThan(150);
  // One frame after Resume looks like the moment of the pause (not like the
  // start of a new explosion, nor like an explosion that used up the minutes).
  expect(await pixels.changed(midExplosion, resumed, lane)).toBeLessThan(
    midway / 2,
  );
});

test('the ship, the guidance beam and the Drone lights are drawn, and the deck keeps moving while it runs', async ({
  page,
  pixels,
}) => {
  // "b" is the lead: the ship waits under its keycap, and the guidance beam
  // runs up from there to the Drone.
  await launchWithLeadDroneSettled(page, 'bqp');
  const deck = await deckArea(page);
  const lead = await box(keycap(page, 'b'));
  const centre = lead.x + lead.width / 2;
  // The top of the keyboard, which the strip below and the lane above are
  // measured from.
  const keyboardTop = (await box(keycap(page, '1'))).y;

  const first = await look(page, deck, pixels);
  await page.clock.runFor(500);
  const second = await look(page, deck, pixels);

  // The beam: a thin bright line above the lead Drone, in the lead's lane.
  const beamRegion = inDeck(deck, {
    x: centre - 7,
    y: keyboardTop - 410,
    width: 14,
    height: 300,
  });
  expect(
    await pixels.beam(first, fingerColour('b'), beamRegion),
  ).toBeGreaterThan(100);

  // The ship: lit up in the strip below the keyboard, under that keycap.
  const shipRegion = inDeck(deck, {
    x: centre - 60,
    y: keyboardTop + 221,
    width: 120,
    height: 40,
  });
  expect(await pixels.bright(first, shipRegion)).toBeGreaterThan(50);

  // Thrusters and lights flicker while the Run goes on.
  expect(await pixels.changed(first, second)).toBeGreaterThan(300);

  // Last, so the override can't touch the pictures above.
  await test.step('the deck canvas follows the screen density mid-Run, and the deck keeps working', async () => {
    const canvas = page.locator('canvas').last();
    // The canvas's backing size is the one thing read off the canvas element.
    const backing = () => canvas.evaluate((c: HTMLCanvasElement) => c.width);
    const cssWidth = (await box(canvas)).width;
    const viewport = page.viewportSize();
    if (!viewport) throw new Error('The page has no viewport to keep');
    const cdp = await page.context().newCDPSession(page);
    const setDensity = (deviceScaleFactor: number, widen = 0) =>
      cdp.send('Emulation.setDeviceMetricsOverride', {
        width: viewport.width + widen,
        height: viewport.height,
        mobile: false,
        deviceScaleFactor,
      });
    // PixiJS draws on animation frames, which only come when the clock moves.
    const backingTracks = (css: number, ratio: number) =>
      expect(async () => {
        await page.clock.runFor(50);
        expect(Math.abs((await backing()) - css * ratio)).toBeLessThanOrEqual(
          1,
        );
      }).toPass({ timeout: 10_000, intervals: [50] });

    try {
      // At 1x the backing size is the CSS size (the override itself is sound).
      await setDensity(1);
      expect(await page.evaluate(() => window.devicePixelRatio)).toBe(1);
      await backingTracks(cssWidth, 1);

      // The window moves to a denser screen: no reload, the Run goes on.
      await setDensity(2);
      expect(await page.evaluate(() => window.devicePixelRatio)).toBe(2);
      // Headless Chromium reports a density change to the page (the resolution
      // media query) only together with a resize, where a real window dragged
      // to another screen reports it alone. So nudge the width by 1 px at the
      // same density, and measure the CSS width after the nudge.
      await setDensity(2, 1);
      const nudgedCssWidth = (await box(canvas)).width;
      expect.soft(Math.abs(nudgedCssWidth - cssWidth)).toBeLessThanOrEqual(1);
      await backingTracks(nudgedCssWidth, 2);

      // The deck still plays: a hit takes the lead Drone out, the next waits.
      await page.keyboard.press('b');
      await page.clock.runFor(2000);
      await expect(drone(page, 'b')).toBeHidden();
      await expect(drone(page, 'q')).toBeVisible();
    } finally {
      await cdp.send('Emulation.clearDeviceMetricsOverride');
    }
  });
});

const SOLAR_FLARE = 'AMBER';
const solarFlareName =
  entriesOf('trail').find((entry) => entry.id === SOLAR_FLARE)?.name ??
  SOLAR_FLARE;

/**
 * One Run on its own page, from the given Save: the lead Drone "b" (the left
 * index finger, cyan) settles, and the player hits it with another Drone
 * behind. Says how the aiming beam looked while it waited, and how much amber
 * the hit added to the lead's column (the lane above the keyboard, the
 * keyboard and the ship's strip) in the first frames after it.
 */
async function hitOnLeftIndex(
  browser: Browser,
  save: unknown,
  pixels: Pixels,
): Promise<{ beamWaiting: number; amberWaiting: number; amberRise: number }> {
  const context = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
    viewport: { width: 1280, height: 1200 },
  });
  try {
    const page = await context.newPage();
    if (save) await seedSave(page, save);
    await launchWithLeadDroneSettled(page, 'bqp');
    const deck = await deckArea(page);
    const lead = await box(keycap(page, 'b'));
    const centre = lead.x + lead.width / 2;
    const keyboardTop = (await box(keycap(page, '1'))).y;
    const column = inDeck(deck, {
      x: centre - 140,
      y: keyboardTop - 420,
      width: 280,
      height: 690,
    });
    const beamRegion = inDeck(deck, {
      x: centre - 7,
      y: keyboardTop - 410,
      width: 14,
      height: 300,
    });

    const waiting = await look(page, deck, pixels);
    const beamWaiting = await pixels.beam(
      waiting,
      fingerColour('b'),
      beamRegion,
    );
    const amberWaiting = await pixels.amber(waiting, column);

    await page.keyboard.press('b');
    let peak = 0;
    // Only the first 100 ms: the lasers are on screen, and the explosion (whose
    // sparks are random) has not built up yet.
    for (let frame = 0; frame < 2; frame++) {
      await page.clock.runFor(50);
      const now = await look(page, deck, pixels);
      peak = Math.max(peak, await pixels.amber(now, column));
    }
    return { beamWaiting, amberWaiting, amberRise: peak - amberWaiting };
  } finally {
    await context.close();
  }
}

test(`a Trail colours the lasers a hit fires (${solarFlareName}), and the aiming beam keeps the finger colour`, async ({
  browser,
  pixels,
}) => {
  // The same Run twice, on the default Trail and with Solar Flare equipped.
  // Whatever else is amber or orange on the deck (the explosion, the sparks)
  // is the same in both, so only what the Trail changes shows in the
  // difference. The lasers' own colour is the finger's cyan in the first.
  const plain = await hitOnLeftIndex(browser, undefined, pixels);
  const flare = await hitOnLeftIndex(
    browser,
    trailEquipped(SOLAR_FLARE),
    pixels,
  );

  // The beam waiting on the lead Drone is the finger's cyan with either Trail,
  // and nothing in its column is amber yet.
  expect(plain.beamWaiting).toBeGreaterThan(100);
  expect(flare.beamWaiting).toBeGreaterThan(100);
  expect(flare.amberWaiting).toBeLessThan(plain.amberWaiting + 60);
  // The hit's lasers are amber with Solar Flare equipped, with a Drone still
  // to come (so it is not the Trail showing after the last key).
  expect(flare.amberRise - plain.amberRise).toBeGreaterThan(150);
});
