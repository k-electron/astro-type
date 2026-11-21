import {
  type Browser,
  expect,
  type Locator,
  type Page,
  test as base,
} from '@playwright/test';
import {
  FINGER_LANES,
  keyForCharacter,
} from '../../../src/curriculum/curriculum';
import type { TrailId } from '../../../src/game/schemas';
import { cosmeticEquipped, trailEquipped } from '../../shared/saves';
import {
  currentCharacter,
  drone,
  keycap,
  seedSave,
  textPrompt,
} from '../helpers';
import { launchOnStoppedClock } from '../journey-helpers';
import {
  hueOfHex,
  openPixels,
  type Picture,
  type Pixels,
  type Rect,
} from './pixels';

const test = base.extend<{ pixels: Pixels }>({
  pixels: async ({ browser }, use) => {
    const { pixels, close } = await openPixels(browser);
    await use(pixels);
    await close();
  },
});

test.skip(
  Boolean(process.env.CI),
  'Local-only: pnpm verify runs it, CI does not',
);
test.use({ viewport: { width: 1280, height: 1200 } });

const TEXT = 'qpolkm';
const LEAD = 'q';

function fingerColour(character: string): string {
  const lane = keyForCharacter(character)?.lane;
  const colour = lane === undefined ? undefined : FINGER_LANES[lane]?.color;
  if (!colour) throw new Error(`No finger types "${character}"`);
  return colour;
}
const LEAD_FINGER = fingerColour(LEAD);
const OTHER_FINGER = fingerColour('j');

async function box(element: Locator): Promise<Rect> {
  const b = await element.boundingBox({ timeout: 2000 });
  if (!b) throw new Error('Nothing is drawn there');
  return b;
}

type Geometry = {
  lead: Rect;
  second: Rect;
  centre: number;
  keyboardTop: number;
};

type Look = { page: Page; geometry: Geometry };

async function geometryOf(page: Page): Promise<Geometry> {
  const lead = await box(drone(page, LEAD));
  return {
    lead,
    second: await box(drone(page, TEXT[1])),
    centre: lead.x + lead.width / 2,
    keyboardTop: (await box(keycap(page, '1'))).y,
  };
}

async function inRun<T>(
  browser: Browser,
  save: unknown,
  journey: (look: Look) => Promise<T>,
): Promise<T> {
  const context = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
    viewport: { width: 1280, height: 1200 },
  });
  try {
    const page = await context.newPage();
    await page.addInitScript(() => {
      let state = 0x5eed;
      Math.random = () => {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      Object.assign(window, {
        AudioContext: undefined,
        webkitAudioContext: undefined,
      });
    });
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
      route.abort(),
    );
    if (save) await seedSave(page, save);
    await launchOnStoppedClock(page, TEXT);
    await expect(async () => {
      await page.clock.runFor(50);
      await expect(drone(page, TEXT[1])).toBeVisible({ timeout: 250 });
    }).toPass({ timeout: 30_000 });
    await page.clock.runFor(600);
    let last = Number.NaN;
    await expect(async () => {
      await page.clock.runFor(100);
      const b = await box(drone(page, LEAD));
      const still = b.y + b.height === last;
      last = b.y + b.height;
      expect(still, 'the lead Drone has stopped at the Strike Line').toBe(true);
    }).toPass({ timeout: 30_000, intervals: [50] });
    return await journey({ page, geometry: await geometryOf(page) });
  } finally {
    await context.close();
  }
}

const snap = (page: Page, pixels: Pixels): Promise<Picture> =>
  page.screenshot().then((png) => pixels.load(png));

const grow = (r: Rect, x: number, y = x): Rect => ({
  x: r.x - x,
  y: r.y - y,
  width: r.width + 2 * x,
  height: r.height + 2 * y,
});

// ---------------------------------------------------------------- Ships ----

test('each Ship draws its own shape at the Strike Line, and keeps the finger colour of the next character on the ship and its beam', async ({
  browser,
  pixels,
}) => {
  // The ship waits under the lead's key; the beam runs up from there to it.
  const shipRegion = (g: Geometry): Rect => ({
    x: g.centre - 60,
    y: g.keyboardTop + 221,
    width: 120,
    height: 40,
  });
  const beamRegion = (g: Geometry): Rect => ({
    x: g.centre - 7,
    y: g.keyboardTop - 410,
    width: 14,
    height: 300,
  });
  const waiting = (id?: string) =>
    inRun(
      browser,
      id ? cosmeticEquipped('ship', id) : undefined,
      async ({ page, geometry }) => ({
        pic: await snap(page, pixels),
        geometry,
      }),
    );

  const standard = await waiting();
  const region = shipRegion(standard.geometry);
  const defaultLit = await pixels.lit(standard.pic, LEAD_FINGER, region);
  const defaultShape = await pixels.litExtent(
    standard.pic,
    LEAD_FINGER,
    region,
  );
  if (!defaultShape) throw new Error('The default ship is not drawn');
  const defaultMiddle = defaultShape.x + defaultShape.width / 2;
  let noise = 0;
  await test.step('the default Ship is the baseline: the same Run twice draws the same ship, and it is lit in the finger colour', async () => {
    const again = await waiting();
    noise = await pixels.changed(standard.pic, again.pic, region);
    expect.soft(noise).toBeLessThan(50);
    expect(
      defaultLit,
      'the default ship is lit in the finger colour',
    ).toBeGreaterThan(40);
    // The same count for another finger's colour is the control: the colour
    // test below counts the finger's colour, not just anything lit.
    expect(await pixels.lit(standard.pic, OTHER_FINGER, region)).toBeLessThan(
      10,
    );
    expect(
      await pixels.lit(
        standard.pic,
        LEAD_FINGER,
        beamRegion(standard.geometry),
      ),
    ).toBeGreaterThan(100);
  });

  for (const id of ['DART', 'MANTA', 'CORVETTE']) {
    await test.step(`${id}: a new shape, still in the finger colour, with the same beam`, async () => {
      const item = await waiting(id);
      const g = item.geometry;
      // The ship's pixels are not the default's (nor noise).
      expect
        .soft(
          await pixels.changed(standard.pic, item.pic, region),
          `${id}'s ship looks like the default's`,
        )
        .toBeGreaterThan(Math.max(noise * 3, 150));
      // It is still lit in the finger colour, and in no other finger's.
      expect
        .soft(
          await pixels.lit(item.pic, LEAD_FINGER, region),
          `${id}'s ship lost the finger colour`,
        )
        .toBeGreaterThan(Math.max(40, defaultLit * 0.4));
      expect
        .soft(await pixels.lit(item.pic, OTHER_FINGER, region))
        .toBeLessThan(10);
      // The beam is where it was and the finger's colour, and the Ship didn't
      // move the Drone.
      expect
        .soft(
          await pixels.lit(item.pic, LEAD_FINGER, beamRegion(g)),
          `${id}'s guidance beam lost the finger colour`,
        )
        .toBeGreaterThan(100);
      // The ship waits under the same key: the middle of what is lit is where
      // the default's is.
      const shape = await pixels.litExtent(item.pic, LEAD_FINGER, region);
      expect
        .soft(
          Math.abs(
            (shape ? shape.x + shape.width / 2 : Number.POSITIVE_INFINITY) -
              defaultMiddle,
          ),
          `${id}'s ship is off its key`,
        )
        .toBeLessThanOrEqual(4);
    });
  }
});

// ---------------------------------------------------------------- Hulls ----

test('each Hull draws a different Drone body in the same box, with the same key and the finger-colour border', async ({
  browser,
  pixels,
}) => {
  const look = (id?: string) =>
    inRun(
      browser,
      id ? cosmeticEquipped('hull', id) : undefined,
      async ({ page, geometry }) => ({
        pic: await snap(page, pixels),
        geometry,
        // What a screen reader is told about the Drone.
        label: await drone(page, LEAD).getAttribute('aria-label'),
      }),
    );
  type Seen = Awaited<ReturnType<typeof look>>;

  // Left and right of the beam, which lands on the Drone in the same colour.
  const sides = (g: Geometry): Rect[] => [
    {
      x: g.lead.x - 30,
      y: g.lead.y - 12,
      width: 30 + g.lead.width / 2 - 8,
      height: g.lead.height + 24,
    },
    {
      x: g.centre + 8,
      y: g.lead.y - 12,
      width: 30 + g.lead.width / 2 - 8,
      height: g.lead.height + 24,
    },
  ];
  const border = async (seen: Seen) => {
    const [left, right] = sides(seen.geometry);
    const l = await pixels.litExtent(seen.pic, LEAD_FINGER, left);
    const r = await pixels.litExtent(seen.pic, LEAD_FINGER, right);
    if (!l || !r) throw new Error('No finger-colour border is drawn');
    return {
      left: l.x,
      right: r.x + r.width,
      top: Math.min(l.y, r.y),
      bottom: Math.max(l.y + l.height, r.y + r.height),
      lit:
        (await pixels.lit(seen.pic, LEAD_FINGER, left)) +
        (await pixels.lit(seen.pic, LEAD_FINGER, right)),
      other:
        (await pixels.lit(seen.pic, OTHER_FINGER, left)) +
        (await pixels.lit(seen.pic, OTHER_FINGER, right)),
      // The letter on the Drone: its near-white pixels.
      key: await pixels.white(seen.pic, seen.geometry.lead),
    };
  };

  const standard = await look();
  const region = grow(standard.geometry.lead, 30, 20);
  const edge = await border(standard);
  let noise = 0;
  await test.step('the default Hull is the baseline: a finger-colour border and a letter, the same Run twice drawing the same Drone', async () => {
    noise = await pixels.changed((await look()).pic, standard.pic, region);
    expect.soft(noise).toBeLessThan(50);
    expect(
      edge.lit,
      'the default Drone has a finger-colour border',
    ).toBeGreaterThan(150);
    expect(edge.other).toBeLessThan(10);
    expect(edge.key, 'the default Drone shows its letter').toBeGreaterThan(40);
  });

  for (const id of ['HEX', 'PLATED', 'CRYSTAL']) {
    await test.step(`${id}: a different body, in the same place, size and colours`, async () => {
      const item = await look(id);
      const g = item.geometry;
      expect
        .soft(
          await pixels.changed(standard.pic, item.pic, region),
          `${id}'s Drone looks like Standard`,
        )
        .toBeGreaterThan(Math.max(noise * 3, 150));

      // The Drone is where and as big as with Standard, and says the same.
      for (const key of ['lead', 'second'] as const) {
        const was = standard.geometry[key];
        const now = g[key];
        expect
          .soft(now.x, `${id}: the ${key} Drone's box moved`)
          .toBeCloseTo(was.x, 0);
        expect.soft(now.y).toBeCloseTo(was.y, 0);
        expect
          .soft(now.width, `${id}: the ${key} Drone's box changed size`)
          .toBeCloseTo(was.width, 0);
        expect.soft(now.height).toBeCloseTo(was.height, 0);
      }
      expect.soft(item.label).toBe(standard.label);

      // The drawn border covers the same ground, in the finger's colour.
      const drawn = await border(item);
      for (const side of ['left', 'right', 'top', 'bottom'] as const) {
        expect
          .soft(
            Math.abs(drawn[side] - edge[side]),
            `${id}: the drawn Drone's ${side} edge is not Standard's`,
          )
          .toBeLessThanOrEqual(6);
      }
      expect
        .soft(drawn.lit, `${id} lost the finger colour`)
        .toBeGreaterThan(edge.lit * 0.5);
      expect.soft(drawn.other).toBeLessThan(10);
      // The key is as readable: its letter is as white as with Standard.
      expect
        .soft(drawn.key, `${id} hides the key's letter`)
        .toBeGreaterThanOrEqual(edge.key * 0.8);
    });
  }
});

// --------------------------------------------------------------- Bursts ----

test('each Burst scatters its own particles, in the hit colour the Multiplier gives', async ({
  browser,
  pixels,
}) => {
  const blastRegion = (g: Geometry): Rect => ({
    x: g.centre - 180,
    y: g.lead.y + g.lead.height / 2 - 180,
    width: 360,
    height: 300,
  });
  // Gold lasers, so the lasers' colour is not the hit colour's (the default
  // Trail's cyan and an explosion's blue are close): a Burst that took the
  // Trail's colour instead of the hit's would show here.
  const GOLD_HUE = 45;
  const burstSave = (id?: string) => ({
    cosmetics: {
      ...trailEquipped('GOLD').cosmetics,
      ...(id ? cosmeticEquipped('burst', id).cosmetics : {}),
    },
  });
  const explode = (id?: string) =>
    inRun(browser, burstSave(id), async ({ page, geometry }) => {
      const before = await snap(page, pixels);
      await page.keyboard.press(LEAD);
      // The lasers, then the explosion at its fullest.
      await page.clock.runFor(200);
      return { before, peak: await snap(page, pixels), geometry };
    });

  const sparks = await explode();
  const region = blastRegion(sparks.geometry);
  // The hit colour is the game's (the Multiplier tier's), which no test file
  // exports. It is read off Sparks, today's look: the hue most of the
  // explosion's saturated pixels have, leaving out the pink of the Drone's own
  // finger colour (the debris).
  let hitHue = 0;
  let sparksInHue = 0;
  let noise = 0;
  await test.step('Sparks, the default, is the baseline: a hit colour, and the same hit twice draws the same explosion', async () => {
    hitHue = await pixels.dominantDrawnHue(
      sparks.peak,
      sparks.before,
      [hueOfHex(LEAD_FINGER)],
      region,
    );
    // Not the Trail's: the explosion has its own colour, whatever the lasers are.
    expect(
      Math.min(Math.abs(hitHue - GOLD_HUE), 360 - Math.abs(hitHue - GOLD_HUE)),
      `the explosion is drawn in the Trail's gold (hue ${hitHue})`,
    ).toBeGreaterThan(60);
    const again = await explode();
    noise = await pixels.changed(sparks.peak, again.peak, region);
    expect.soft(noise).toBeLessThan(100);
    const { drawn, inHue } = await pixels.drawnHue(
      sparks.peak,
      sparks.before,
      hitHue,
      25,
      region,
    );
    sparksInHue = await pixels.hue(sparks.peak, hitHue, 25, region);
    expect(drawn, 'the default explosion is drawn').toBeGreaterThan(1000);
    expect(
      inHue / drawn,
      'most of it is in one colour, the hit colour',
    ).toBeGreaterThan(0.4);
    // The control: the opposite hue is not what an explosion is made of.
    expect(
      await pixels.hue(sparks.peak, (hitHue + 180) % 360, 25, region),
    ).toBeLessThan(sparksInHue * 0.2);
  });

  for (const id of ['STARFLOWER', 'PIXEL_SHARDS', 'SHOCKWAVE']) {
    await test.step(`${id}: other particles, the same hit colour`, async () => {
      const item = await explode(id);
      expect
        .soft(
          await pixels.changed(sparks.peak, item.peak, region),
          `${id}'s explosion looks like Sparks'`,
        )
        .toBeGreaterThan(Math.max(noise * 3, 1500));
      // What this Burst drew that Sparks did not is mostly the hit colour...
      const own = await pixels.drawnHue(
        item.peak,
        sparks.peak,
        hitHue,
        25,
        region,
      );
      expect
        .soft(own.drawn, `${id} drew nothing of its own`)
        .toBeGreaterThan(300);
      expect
        .soft(own.inHue / own.drawn, `${id} took another colour than the hit's`)
        .toBeGreaterThan(0.5);
      // ...and the explosion as a whole has about as much of it as Sparks'.
      expect
        .soft(await pixels.hue(item.peak, hitHue, 25, region))
        .toBeGreaterThan(sparksInHue * 0.5);
    });
  }
});

// ------------------------------------------------------------ Backdrops ----

test('each Backdrop adds a faint layer to the space behind the page, and leaves the text prompt, the Drones and the keyboard as readable', async ({
  browser,
  pixels,
}) => {
  // The page's own background is all that shows here: the gutters beside the
  // panels, and the strip below the Flight Deck.
  const outside: Rect[] = [
    { x: 0, y: 1075, width: 1280, height: 125 },
    { x: 0, y: 140, width: 22, height: 930 },
    { x: 1258, y: 140, width: 22, height: 930 },
  ];
  const look = (id?: string) =>
    inRun(
      browser,
      id ? cosmeticEquipped('backdrop', id) : undefined,
      async ({ page, geometry }) => ({
        pic: await snap(page, pixels),
        geometry,
        prompt: await box(textPrompt(page)),
        // The row of text itself: the letters are a sliver of the whole prompt.
        textRow: await box(currentCharacter(page)).then((c) => ({
          x: c.x - 8,
          y: c.y - 4,
          width: 160,
          height: c.height + 8,
        })),
      }),
    );
  type Seen = Awaited<ReturnType<typeof look>>;
  const keyboard: Rect = { x: 200, y: 785, width: 880, height: 230 };
  const stats = async (seen: Seen) => ({
    outside: await Promise.all(
      outside.map((o) => pixels.luminance(seen.pic, o)),
    ),
    prompt: await pixels.luminance(seen.pic, seen.prompt),
    text: await pixels.luminance(seen.pic, seen.textRow),
    keyboard: await pixels.luminance(seen.pic, keyboard),
    drones: await pixels.luminance(seen.pic, grow(seen.geometry.lead, 20)),
  });
  const changedOutside = async (a: Seen, b: Seen) =>
    (
      await Promise.all(outside.map((o) => pixels.changed(a.pic, b.pic, o)))
    ).reduce((sum, n) => sum + n, 0);
  const spread = (l: { p10: number; p95: number }) => l.p95 - l.p10;
  // The contrast between the letters (the 99th percentile of the text row)
  // and the panel behind them (its median), as the WCAG ratio of their
  // luminances.
  const linear = (v: number) => (v / 255) ** 2.2;
  const ratio = (l: { p50: number; p99: number }) =>
    (linear(l.p99) + 0.05) / (linear(l.p50) + 0.05);

  const starfield = await look();
  const was = await stats(starfield);
  let noise = 0;
  await test.step('Starfield, the default, is the baseline: the same Run twice draws the same space', async () => {
    noise = await changedOutside(starfield, await look());
    expect.soft(noise).toBeLessThan(50);
    expect(
      ratio(was.text),
      'the text prompt has contrast to measure',
    ).toBeGreaterThan(4.5);
  });

  for (const id of ['NEBULA', 'AURORA', 'DEEP_VOID']) {
    await test.step(`${id}: a different space behind the page, faint, and behind everything`, async () => {
      const item = await look(id);
      const now = await stats(item);
      expect
        .soft(
          await changedOutside(starfield, item),
          `${id}'s space looks like Starfield's`,
        )
        .toBeGreaterThan(Math.max(noise * 3, 100));

      // Faint: the background stays dark, however much it adds.
      for (const [i, strip] of now.outside.entries()) {
        expect
          .soft(strip.mean, `${id} is not faint (strip ${i})`)
          .toBeLessThan(was.outside[i].mean + 25);
        expect
          .soft(strip.p95, `${id} is not faint (strip ${i})`)
          .toBeLessThan(80);
      }
      // Behind everything: what is read on top of it is as readable as before.
      expect
        .soft(ratio(now.text), `${id} washes out the text prompt`)
        .toBeGreaterThanOrEqual(ratio(was.text) * 0.8);
      expect.soft(ratio(now.text)).toBeGreaterThanOrEqual(4.5);
      expect.soft(now.prompt.mean).toBeLessThan(was.prompt.mean + 10);
      expect
        .soft(spread(now.keyboard), `${id} washes out the keyboard`)
        .toBeGreaterThanOrEqual(spread(was.keyboard) * 0.8);
      expect
        .soft(spread(now.drones), `${id} washes out the Drones`)
        .toBeGreaterThanOrEqual(spread(was.drones) * 0.8);
    });
  }
});

// --------------------------------------------------------------- Trails ----

test('a new Trail colours the lasers a hit fires, and the aiming beam keeps the finger colour', async ({
  browser,
  pixels,
}) => {
  const column = (g: Geometry): Rect => ({
    x: g.centre - 140,
    y: g.keyboardTop - 420,
    width: 280,
    height: 690,
  });
  const beamRegion = (g: Geometry): Rect => ({
    x: g.centre - 7,
    y: g.keyboardTop - 410,
    width: 14,
    height: 300,
  });
  // The lead is on the left pinky (pink), so the lasers' own colours (the
  // default Trail's cyan, and a Trail's) are all well away from the beam's.
  const fire = (id?: TrailId) =>
    inRun(
      browser,
      id ? trailEquipped(id) : undefined,
      async ({ page, geometry }) => {
        const before = await snap(page, pixels);
        await page.keyboard.press(LEAD);
        // Only the first 100 ms: the lasers are on screen, and the explosion
        // has not built up yet.
        await page.clock.runFor(100);
        return { before, lasers: await snap(page, pixels), geometry };
      },
    );

  const plain = await fire();
  const region = column(plain.geometry);
  const TEAL = 175;
  const GOLD = 45;
  const CYAN = 190;
  await test.step('the default Trail: lasers of no new colour, and the beam waiting in the finger colour', async () => {
    expect(
      await pixels.lit(plain.before, LEAD_FINGER, beamRegion(plain.geometry)),
    ).toBeGreaterThan(100);
    expect(
      (await pixels.drawnHue(plain.lasers, plain.before, TEAL, 12, region))
        .inHue,
    ).toBeLessThan(100);
    expect(
      (await pixels.drawnHue(plain.lasers, plain.before, GOLD, 12, region))
        .inHue,
    ).toBeLessThan(100);
  });

  for (const [id, hue] of [
    ['TEAL', TEAL],
    ['GOLD', GOLD],
  ] as const) {
    await test.step(`${id} colours the lasers, and the beam still waits in the finger colour`, async () => {
      const item = await fire(id);
      expect
        .soft(
          await pixels.lit(item.before, LEAD_FINGER, beamRegion(item.geometry)),
          `${id}: the aiming beam lost the finger colour`,
        )
        .toBeGreaterThan(100);
      expect
        .soft(
          (await pixels.drawnHue(item.lasers, item.before, hue, 12, region))
            .inHue,
          `${id}: the lasers are not ${id}'s colour`,
        )
        .toBeGreaterThan(800);
    });
  }

  await test.step('SPECTRUM draws its lasers in a colour of its own, and the beam stays the finger colour', async () => {
    const item = await fire('SPECTRUM');
    expect
      .soft(await pixels.changed(plain.lasers, item.lasers, region))
      .toBeGreaterThan(1500);
    expect
      .soft(
        await pixels.lit(item.before, LEAD_FINGER, beamRegion(item.geometry)),
        'SPECTRUM: the aiming beam lost the finger colour',
      )
      .toBeGreaterThan(100);
    // Not the default's cyan: where the default's lasers are nearly all
    // cyan, a rainbow's mostly are not.
    const cyan = (seen: Awaited<ReturnType<typeof fire>>) =>
      pixels.drawnHue(seen.lasers, seen.before, CYAN, 25, region);
    const was = await cyan(plain);
    const now = await cyan(item);
    expect.soft(was.inHue / was.drawn).toBeGreaterThan(0.6);
    expect
      .soft(
        now.inHue / now.drawn,
        'SPECTRUM draws its lasers in the default cyan',
      )
      .toBeLessThan(0.3);
  });
});
