import {
  expect,
  type Locator,
  type Page,
  test as base,
} from '@playwright/test';
import { drone, flightDeck, keycap } from '../helpers';

// LOCAL ONLY (`pnpm test:local`, docs/agents/testing.md): hundreds of drawn
// frames per test, too heavy for CI's runner. Mapping rows #119-#122.
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
  /** How many pixels are the bright cyan of the guidance beam. */
  beam(a: number, region?: Rect): Promise<number>;
  /** How many pixels are bright (something lit, on the dark deck). */
  bright(a: number, region?: Rect): Promise<number>;
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
          const [a, b, region] = rest as [number, number | undefined, Rect?];
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
              if (name === 'beam' && bl > 140 && g > 80 && r < 90) n++;
              if (name === 'bright' && Math.max(r, g, bl) > 160) n++;
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
      beam: (a, region) => call<number>('beam', a, undefined, region),
      bright: (a, region) => call<number>('bright', a, undefined, region),
    });
    await context.close();
  },
});

test.skip(Boolean(process.env.CI), 'Local-only: run with pnpm test:local');
// Tall enough that the Drones, the Strike Line and the keyboard are all on
// screen at once. (The local project sets the same viewport and a timeout of
// 240 s, since every frame stepped under a stopped clock is drawn.)
test.use({ viewport: { width: 1280, height: 1100 } });
// The four tests are independent, so they can run on separate workers.
test.describe.configure({ mode: 'parallel' });

async function box(element: Locator): Promise<Rect> {
  const b = await element.boundingBox({ timeout: 2000 });
  if (!b) throw new Error('Nothing is drawn there');
  return b;
}

/**
 * Free Flight with the PixiJS deck on a clock that stands still, with the lead
 * Drone settled at the Strike Line. From here the test decides when time moves.
 */
async function launchOnStoppedClock(page: Page, text: string) {
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

  // PixiJS draws on animation frames, which only come when the clock moves.
  await expect(async () => {
    await page.clock.runFor(50);
    await expect(drone(page, text[1])).toBeVisible({ timeout: 250 });
  }).toPass({ timeout: 10_000 });
  // Settle the lead Drone at the Strike Line (it needs about half a second of
  // frames), then see that it has stopped: the lane the tests measure is
  // computed from where it waits.
  await page.clock.runFor(600);
  const lead = drone(page, text[0]);
  let last = Number.NaN;
  await expect(async () => {
    await page.clock.runFor(100);
    const b = await box(lead);
    const bottom = b.y + b.height;
    const still = bottom === last;
    last = bottom;
    expect(still, 'the lead Drone has stopped at the Strike Line').toBe(true);
  }).toPass({ timeout: 20_000, intervals: [50] });
}

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
  await launchOnStoppedClock(page, TEXT);
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

test('a wrong key is a Miss: red on the deck and the keycap lights, and nothing flashes in the Drone lane', async ({
  page,
  pixels,
}) => {
  await launchOnStoppedClock(page, TEXT);
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
  await launchOnStoppedClock(page, TEXT);
  const deck = await deckArea(page);
  const lane = await laneOf(page, 'q', deck);

  // Caught at the heart of the explosion.
  await page.keyboard.press('q');
  await page.clock.runFor(150);
  const midExplosion = await look(page, deck, pixels);

  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Mission Paused' }),
  ).toBeVisible();

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
  await page.getByRole('button', { name: 'Resume Flight' }).click();
  await expect(
    page.getByRole('heading', { name: 'Mission Paused' }),
  ).toBeHidden();
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
  await launchOnStoppedClock(page, 'bqp');
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
  expect(await pixels.beam(first, beamRegion)).toBeGreaterThan(100);

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
});
