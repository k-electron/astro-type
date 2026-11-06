import { expect, type Locator, type Page, test } from '@playwright/test';
import {
  clickWhereDrawn,
  drone,
  flightDeck,
  hud,
  keycap,
  labelled,
  launchFreeFlight,
  promptProgress,
  textPrompt,
} from './helpers';
import { DEBRIEF_TITLE } from '../shared/screens';
import { bottomEdge } from './journey-helpers';

/** How far the middle of an element is from the middle of another, sideways. */
async function sidewaysGap(a: Locator, b: Locator): Promise<number> {
  const [first, second] = await Promise.all([
    a.boundingBox({ timeout: 2000 }),
    b.boundingBox({ timeout: 2000 }),
  ]);
  if (!first || !second) return Number.POSITIVE_INFINITY;
  return Math.abs(first.x + first.width / 2 - (second.x + second.width / 2));
}

/**
 * A keycap's height (CSS px) in the Action Deck at full size, which is what a
 * window tall enough for the whole Flight Deck shows. It is a layout fact of
 * the unscaled deck, not a rule number: it is here as the oracle for "today",
 * so a tall window's deck going smaller turns the test red.
 */
const KEYCAP_HEIGHT = 36;

/** Tall enough for the whole Flight Deck with the deck at full size (about 1,144). */
const TALL_WINDOW = { width: 1440, height: 1200 };
/** An ordinary laptop window. */
const LAPTOP_WINDOW = { width: 1440, height: 900 };
/** Both far below what the deck's smallest size needs, so the page scrolls at each. */
const SHORT_WINDOWS = [
  { width: 1280, height: 500 },
  { width: 1280, height: 400 },
];

/** Every letter has a keycap, so a count this low means the layer found the wrong things. */
const AT_LEAST_KEYCAPS = 10;

/** The key to measure: not the target, which grows while it waits to be typed. */
const MEASURED_KEY = 'z';

/** Every keycap the accessibility layer labels, where each is drawn in the window. */
async function keycapRects(page: Page) {
  return labelled(page, /^.+ key$/i).evaluateAll((elements) =>
    elements.map((element) => {
      const { top, bottom } = element.getBoundingClientRect();
      return { top, bottom };
    }),
  );
}

/** The bottom edge of the lowest keycap, or -1 when none is drawn. */
async function lowestKeycapBottom(page: Page): Promise<number> {
  const rects = await keycapRects(page);
  return rects.length === 0
    ? -1
    : Math.max(...rects.map(({ bottom }) => bottom));
}

/** How tall a keycap is drawn, to a tenth of a pixel, or -1 while it isn't. */
async function keycapHeight(page: Page, character: string): Promise<number> {
  const box = await keycap(page, character).boundingBox({ timeout: 2000 });
  return box ? Math.round(box.height * 10) / 10 : -1;
}

/** A keycap's height once the deck has stopped redrawing: the same three reads in a row. */
async function settledKeycapHeight(
  page: Page,
  character: string,
): Promise<number> {
  let last = Number.NaN;
  let reads = 0;
  await expect.soft
    .poll(
      async () => {
        const height = await keycapHeight(page, character);
        reads = height === last ? reads + 1 : 1;
        last = height;
        return reads;
      },
      { intervals: [100], timeout: 5000 },
    )
    .toBeGreaterThanOrEqual(3);
  return last;
}

/** How far the page is taller than the window (0 or less: it doesn't scroll). */
const pageOverflow = (page: Page): Promise<number> =>
  page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );

// J1: the Action Deck and its accessibility layer, on the real clock, with real
// key presses and mouse clicks. The Drones and keycaps live in a canvas, so
// this reads them the only way a screen reader can: through PixiJS's
// accessibility layer, which labels each Drone "Drone X" and each keycap
// "X key" at its drawn position.
//
// One launch. A check the next step depends on (the key was typed, so the
// progress moved) is hard; the rest are soft, so one run reports every broken
// fact.

// Six different characters, so each Drone and each keycap is easy to tell
// apart. A symbol that needs Shift ("!", "(") is drawn like a capital ("E"):
// its Drone falls on the key it is typed on. No spaces: after a click, a
// focused button could take Space.
const TEXT = '!bcd(E';

// The keycap each character is typed on (the US layout, held here as the oracle
// for where a Drone should fall): a symbol on its number key, a capital on its
// letter's key.
const KEY_OF: Record<string, string> = { '!': '1', '(': '9', E: 'e' };
const keyOf = (character: string): string => KEY_OF[character] ?? character;
const SHIFTED = ['!', '(', 'E'];

// Tall enough that the Drones, the Strike Line and the keyboard are all on
// screen at once, so a click lands where the keycap is drawn.
test.use({ viewport: { width: 1280, height: 1100 } });

test('the Action Deck draws, moves and answers keys and clicks', async ({
  page,
}) => {
  await launchFreeFlight(page, TEXT);
  const deck = flightDeck(page);

  await test.step('a Drone and a keycap are drawn for each character of the text', async () => {
    for (const character of TEXT) {
      await expect.soft(drone(page, character)).toBeVisible();
      await expect.soft(keycap(page, keyOf(character))).toBeVisible();
    }
  });

  await test.step('a symbol that needs Shift, like a capital, has its Drone over the key it is typed on', async () => {
    // How far a plain letter's Drone sits from its own key is the yardstick:
    // a symbol's Drone has to be no further off than that, give or take half a
    // keycap, and a wrong key would be a whole keycap or more away.
    const plain = ['b', 'c', 'd'];
    const gaps = await Promise.all(
      plain.map((letter) =>
        sidewaysGap(drone(page, letter), keycap(page, letter)),
      ),
    );
    const keycapBox = await keycap(page, 'b').boundingBox();
    const allowed = Math.max(...gaps) + (keycapBox?.width ?? 0) / 2;
    expect.soft(keycapBox, 'the b keycap is drawn').not.toBeNull();

    for (const character of SHIFTED) {
      const gap = await sidewaysGap(
        drone(page, character),
        keycap(page, keyOf(character)),
      );
      expect
        .soft(gap, `Drone ${character} falls over the ${keyOf(character)} key`)
        .toBeLessThanOrEqual(allowed);
    }
  });

  await test.step('the right key destroys the lead Drone, and the Drone behind it comes down and takes its place', async () => {
    await expect(drone(page, 'b')).toBeVisible();
    const before = await bottomEdge(drone(page, 'b'));
    expect.soft(before).toBeGreaterThan(0);

    // The lead Drone is "!". The key arrives as "!" (a player holds Shift to type it).
    await page.keyboard.press('!');
    await expect(promptProgress(page)).toHaveText('17%');

    await expect.soft(drone(page, '!')).toHaveCount(0);
    await expect.soft(drone(page, 'b')).toBeVisible();
    await expect.soft(deck).toContainText(/Streak\s*1(?!\d)/i);
    // A Drone visibly falls: the next one comes down to the Strike Line.
    await expect.soft
      .poll(() => bottomEdge(drone(page, 'b')), {
        message: 'Drone b comes down at least 20 px',
      })
      .toBeGreaterThan(before + 20);
  });

  await test.step('a wrong key is a Miss: the Streak resets and the Drone stays to be typed', async () => {
    // "z" is not the next character ("b"), nor anywhere in the text.
    await page.keyboard.press('z');

    await expect.soft(deck).toContainText(/Streak\s*0(?!\d)/i);
    await expect.soft(drone(page, 'b')).toBeVisible();
    await expect.soft(promptProgress(page)).toHaveText('17%');
  });

  // The window sizes below are set mid-Run: the deck redraws on a resize, so
  // each step waits for the redraw to land before it reads anything. They run
  // short, then tall, then 1440x900, so each step starts from a deck that a
  // stale read could only make fail, never pass.
  await test.step('on a window too short for the deck, the page scrolls as before and the deck stops shrinking', async () => {
    const heights: number[] = [];
    for (const shortWindow of SHORT_WINDOWS) {
      const size = `${shortWindow.width}x${shortWindow.height}`;
      await page.setViewportSize(shortWindow);
      await expect.soft
        .poll(() => pageOverflow(page), {
          message: `${size}: the page scrolls`,
        })
        .toBeGreaterThan(0);
      // The redraw has landed once the keycap is smaller than on a tall window;
      // without this a deck that never redraws would read the same at both sizes.
      await expect.soft
        .poll(() => keycapHeight(page, MEASURED_KEY), {
          message: `${size}: the deck is drawn smaller than on a tall window`,
        })
        .toBeLessThan(KEYCAP_HEIGHT);
      heights.push(await settledKeycapHeight(page, MEASURED_KEY));
    }
    expect
      .soft(
        heights[1],
        `a shorter window (${SHORT_WINDOWS[1].height} px) draws the keycap no smaller than ${SHORT_WINDOWS[0].height} px does`,
      )
      .toBe(heights[0]);
  });

  await test.step('on a tall window the deck is drawn at full size: a keycap is as tall as it always was', async () => {
    await page.setViewportSize(TALL_WINDOW);
    await expect.soft
      .poll(async () => Math.round(await keycapHeight(page, MEASURED_KEY)), {
        message: `the ${MEASURED_KEY} keycap is ${KEYCAP_HEIGHT} px tall at ${TALL_WINDOW.width}x${TALL_WINDOW.height}`,
      })
      .toBe(KEYCAP_HEIGHT);
  });

  await test.step('at 1440x900 the whole Flight Deck fits: the page does not scroll, and the HUD, the text prompt and the bottom keycap row are on screen', async () => {
    await page.setViewportSize(LAPTOP_WINDOW);
    const size = `${LAPTOP_WINDOW.width}x${LAPTOP_WINDOW.height}`;

    await expect.soft
      .poll(() => pageOverflow(page), {
        message: `${size}: the page does not scroll`,
      })
      .toBeLessThanOrEqual(0);
    // The lowest keycap is the bottom row (and whatever hangs below it): its
    // bottom edge, in the window, must not be below the window's bottom edge.
    await expect.soft
      .poll(() => lowestKeycapBottom(page), {
        message: `${size}: the bottom keycap row is above the bottom of the window`,
      })
      .toBeLessThanOrEqual(LAPTOP_WINDOW.height);
    expect
      .soft(
        (await keycapRects(page)).length,
        `${size}: the accessibility layer labels the keys`,
      )
      .toBeGreaterThanOrEqual(AT_LEAST_KEYCAPS);
    // Fully in view also counts any scrolling box that would clip it.
    await expect
      .soft(
        keycap(page, MEASURED_KEY),
        `${size}: a bottom-row keycap is in view`,
      )
      .toBeInViewport({ ratio: 1 });
    await expect
      .soft(hud(page), `${size}: the HUD is in view`)
      .toBeInViewport({ ratio: 1 });
    await expect
      .soft(textPrompt(page), `${size}: the text prompt is in view`)
      .toBeInViewport({ ratio: 1 });
  });

  await test.step('at 1440x900, clicking the "b" keycap counts as typing that key', async () => {
    await clickWhereDrawn(page, keycap(page, 'b'));

    await expect(promptProgress(page)).toHaveText('33%');
    await expect.soft(drone(page, 'b')).toHaveCount(0);
    await expect.soft(drone(page, 'c')).toBeVisible();
    await expect.soft(deck).toContainText(/Streak\s*1(?!\d)/i);
  });

  await test.step('at 1440x900, clicking the wrong keycap is a Miss, like pressing the wrong key', async () => {
    await clickWhereDrawn(page, keycap(page, 'z'));

    await expect.soft(deck).toContainText(/Streak\s*0(?!\d)/i);
    await expect.soft(promptProgress(page)).toHaveText('33%');
    await expect.soft(drone(page, 'c')).toBeVisible();
  });

  await test.step('keys and clicks mix: the next key can be typed either way', async () => {
    await page.keyboard.press('c');
    await expect.soft(promptProgress(page)).toHaveText('50%');
    await expect.soft(drone(page, 'c')).toHaveCount(0);
    await expect.soft(drone(page, 'd')).toBeVisible();
  });

  await test.step('a symbol that needs Shift and a capital are hit by the character itself, and the last hit clears the Run', async () => {
    await page.keyboard.press('d');
    await expect(promptProgress(page)).toHaveText('67%');

    await expect.soft(drone(page, '(')).toBeVisible();
    await page.keyboard.press('(');
    await expect(promptProgress(page)).toHaveText('83%');
    await expect.soft(drone(page, '(')).toHaveCount(0);
    await expect.soft(drone(page, 'E')).toBeVisible();

    await page.keyboard.press('E');
    await expect(page.getByText(DEBRIEF_TITLE)).toBeVisible();
  });
});
