import { expect, type Page, test } from '@playwright/test';
import { drone, flightDeck, hud, labelled, launchFreeFlight } from './helpers';

// Round 2 (#35): EVERY hit popup on the Action Deck ends with the points that
// hit scored, "+<points>", and that number is what the HUD's Score gained. A
// hit scores base x Multiplier x 2 in Overdrive: base Perfect 100, Great 75,
// Good 50; the Multiplier is x1 under Streak 10, x2 at 10, x3 at 20, x4 at 30,
// and the Streak the hit makes counts. Space (the flagship) scores like any
// other key. Today the popups say a fixed +100 / +75 / +50 whatever the
// Multiplier. The Overdrive Perfect popup already says its real points
// (overdrive-strike-popup.spec.ts); this pins all the others, and the hit that
// ignites Overdrive, which is NOT doubled and has no strike popup.
//
// THE SEAM THESE TESTS NEED (it does not exist yet): the popups are text drawn
// in the canvas, and the page offers no way to read them. For EVERY hit popup
// (Perfect, Great, Good; letter keys and Space/flagship; in Overdrive or not,
// including the hit that ignites Overdrive) the deck's accessibility layer must
// carry an element, the same way it names the Overdrive strike popup, whose
// accessible name (`title` or `aria-label`) is the popup's whole drawn text,
// ending in "+<points>" with the points that hit scored: for example
// "DEFUSED! +50", "FLAGSHIP OBLITERATED! +100" (the words may be anything, and
// a leading icon glyph is fine). The element must exist only while its popup is
// drawn and be gone when the popup is: these tests wait for earlier popups to
// clear before the hit they check. These tests pin the number and never the
// words. The one exception is a negative: the hit that ignites Overdrive must
// not be named "OVERDRIVE STRIKE".
//
// What each test pins, to be honest about it. A Great at x1 (+75), a Good at x1
// (+50) and a Space Perfect at x1 (+100) equal today's fixed numbers, so with
// the popups named they would pass on the old code too: they pin that the
// popup is named. The tests that pin the Multiplier are the ones at x2 and up:
// Good x2 (letter and Space), Perfect x3, Space Perfect x2, the igniting hit
// (+300 at x3) and a Space hit in Overdrive at x4 (+800).
//
// A hit's rating is set by how far the Drone is from the Strike Line. Perfects
// run on the real clock: the lead Drone settles at the Strike Line and waits,
// so there is no race. A Great or a Good is a Drone caught on its way to the
// line, and that cannot be done reliably on a real clock, so those few tests
// use `page.clock`, the sanctioned use for exact timing (docs/agents/testing.md):
// the clock stands still before the page loads and moves only when a test says
// so. With no time passing, every Drone is where the Run seeded it, far above
// the Strike Line, so any key is a Good; a hundred milliseconds in, the first
// Drone has moved into the Great band. The HUD's Score is checked on every hit,
// so a hit that was not the rating a test meant fails there, and not on the
// popup.

test.use({ viewport: { width: 1280, height: 1100 } });
test.setTimeout(180_000);

/** Any hit popup: whatever it says, it ends "+<points>". */
const ANY_POPUP = /\+\d+\s*$/;
/** A popup that ends "+<points>": the "+" is right before the number. */
const worth = (points: number) => new RegExp(`\\+${points}\\s*$`);

/** An Overdrive badge on the HUD: "OVERDRIVE x6". */
const BADGE = /^overdrive\s*x(\d+)$/i;

/** The Multiplier a Streak has earned: x1, then x2 at 10, x3 at 20, x4 at 30. */
const multiplierAt = (streak: number) =>
  Math.min(4, 1 + Math.floor(streak / 10));

// Ten different letters, repeated: no letter twice among the Drones on screen,
// and "z" is never the next letter.
const LETTERS = 'abcdefghij'.repeat(8);

/** What the deck's accessibility layer names right now as a hit popup. */
async function popupNames(page: Page): Promise<string[]> {
  const attributes = await labelled(page, ANY_POPUP).evaluateAll((elements) =>
    elements.flatMap((element) => [
      element.getAttribute('aria-label'),
      element.getAttribute('title'),
    ]),
  );
  return attributes.filter(
    (name): name is string => name !== null && ANY_POPUP.test(name),
  );
}

async function hudScore(page: Page): Promise<number> {
  const text = (await hud(page).textContent()) ?? '';
  const match = /score\s*([\d,]+)/i.exec(text);
  if (!match) throw new Error(`No score in the HUD: ${text}`);
  return Number(match[1].replaceAll(',', ''));
}

const overdriveOn = async (page: Page) =>
  (await hud(page).getByText(BADGE).count()) > 0;

/** A Run in progress: types the text one key at a time. */
function followRun(page: Page, text: string) {
  let typed = 0;
  let streak = 0;
  const nextCharacter = () => text[typed];
  const nextKey = () => (nextCharacter() === ' ' ? 'Space' : nextCharacter());

  async function press() {
    await page.keyboard.press(nextKey());
    typed += 1;
    streak += 1;
    await expect(hud(page)).toContainText(
      new RegExp(`Streak\\s*${streak}(?!\\d)`, 'i'),
    );
  }

  return {
    press,
    /** Hits on, quickly, until the Run is at this Streak. */
    async hitUntil(wanted: number) {
      while (streak < wanted) await press();
    },
    /** Waits until the lead Drone has stopped moving: at the Strike Line. */
    async settle() {
      const name = nextCharacter() === ' ' ? 'Space' : nextCharacter();
      const lead = drone(page, name);
      await expect(lead, 'one lead Drone to watch').toHaveCount(1);
      let last = Number.NaN;
      let still = 0;
      await expect(async () => {
        const box = await lead.boundingBox({ timeout: 500 });
        const bottom = box ? box.y + box.height : -1;
        still = bottom === last ? still + 1 : 0;
        last = bottom;
        expect(still).toBeGreaterThanOrEqual(5);
      }).toPass({ timeout: 15_000, intervals: [100] });
    },
    get streak() {
      return streak;
    },
    /** The Streak the next hit will make, and so the Multiplier it scores at. */
    get nextMultiplier() {
      return multiplierAt(streak + 1);
    },
  };
}

/**
 * Types a Perfect hit on a settled Drone and checks the popup it raises. The
 * Score is checked first: if the hit was not the clean Perfect that `points`
 * assumes, the popup is not the question.
 */
async function perfectHit(
  page: Page,
  run: ReturnType<typeof followRun>,
  points: number,
  step: string,
  forbidden?: RegExp,
) {
  await run.settle();
  // Popups of earlier hits may still be fading: they are not this hit's.
  await expect
    .poll(() => popupNames(page), {
      message: `${step}: earlier popups have gone`,
      timeout: 10_000,
    })
    .toEqual([]);

  const before = await hudScore(page);
  await run.press();
  await expect
    .poll(() => hudScore(page), { message: `${step}: the hit's score` })
    .toBe(before + points);

  await expectPopup(step, points, forbidden, async (seen) => {
    await expect
      .poll(
        async () => {
          for (const name of await popupNames(page)) seen.add(name);
          return [...seen];
        },
        {
          message: `${step}: popups named on the deck`,
          timeout: 3000,
          intervals: [25],
        },
      )
      .toContainEqual(expect.stringMatching(worth(points)));
  });
}

/**
 * Runs `watch`, which collects the popup names it sees and fails if none ends
 * "+<points>". Then, if asked, checks no name seen matches `forbidden`. The
 * negative runs even when the positive failed, so one run says both.
 */
async function expectPopup(
  step: string,
  points: number,
  forbidden: RegExp | undefined,
  watch: (seen: Set<string>) => Promise<void>,
) {
  const seen = new Set<string>();
  let failure: unknown;
  try {
    await watch(seen);
  } catch (error) {
    failure = error;
  }
  if (forbidden) {
    expect
      .soft(
        [...seen].filter((name) => forbidden.test(name)),
        `${step}: popups seen, +${points} wanted: ${[...seen].join(' | ') || 'none'}`,
      )
      .toEqual([]);
  }
  if (failure) throw failure;
}

// ---------------------------------------------------------------------------
// Perfects, on the real clock.
// ---------------------------------------------------------------------------

test('a Perfect letter hit at x3 (Streak 20) raises a popup saying +300, not +100', async ({
  page,
}) => {
  await launchFreeFlight(page, LETTERS);
  const run = followRun(page, LETTERS);

  await run.hitUntil(19);
  expect(await overdriveOn(page), 'Overdrive is not on yet').toBe(false);
  expect(run.nextMultiplier).toBe(3);

  // Perfect 100 x3, not doubled.
  await perfectHit(page, run, 300, 'Perfect at Streak 20');
});

test('the hit that ignites Overdrive is not doubled: an ordinary Perfect popup with its real points (+300 at x3), not OVERDRIVE STRIKE', async ({
  page,
}) => {
  await launchFreeFlight(page, LETTERS);
  const run = followRun(page, LETTERS);

  // 28 hits fill the Overdrive meter to 98 of 100 (no upgrades): the 29th
  // hit ignites it, at Streak 29 (x3).
  await run.hitUntil(28);
  expect(
    await overdriveOn(page),
    'Overdrive is not on before the 29th hit',
  ).toBe(false);
  expect(run.nextMultiplier).toBe(3);

  await perfectHit(
    page,
    run,
    300,
    'the igniting hit (Streak 29)',
    /overdrive strike/i,
  );
  await expect(
    hud(page).getByText(BADGE),
    'the 29th hit lit Overdrive',
  ).toBeVisible();
});

// The Space key is the flagship: it scores like any other key. Only one Space
// in every seven characters, so one Drone is called "Drone Space" and the
// test can watch it settle.
test('a Perfect Space (flagship) hit at x2 raises a popup saying +200, not +100', async ({
  page,
}) => {
  const text = `abcdefghi jkl${'abcdefghij'.repeat(3)}`;
  await launchFreeFlight(page, text);
  const run = followRun(page, text);

  await run.hitUntil(9);
  expect(run.nextMultiplier).toBe(2);
  expect(await overdriveOn(page)).toBe(false);

  // The 10th hit is the Space; Perfect 100 x2.
  await perfectHit(page, run, 200, 'Perfect Space at Streak 10');
});

test('a Perfect Space (flagship) hit in Overdrive at x4 raises a popup saying +800', async ({
  page,
}) => {
  // 29 letters (the 29th ignites Overdrive), then the Space as the 30th hit.
  const text = `${'abcdefghij'.repeat(3).slice(0, 29)} abcdef${'abcdefghij'.repeat(3)}`;
  await launchFreeFlight(page, text);
  const run = followRun(page, text);

  await run.hitUntil(29);
  await expect(
    hud(page).getByText(BADGE),
    'the 29th hit lit Overdrive',
  ).toBeVisible();
  expect(run.nextMultiplier).toBe(4);

  // Perfect 100 x4 x2 for Overdrive.
  await perfectHit(page, run, 800, 'Perfect Space at Streak 30 in Overdrive');
});

// ---------------------------------------------------------------------------
// Greats and Goods, on a clock that stands still.
// ---------------------------------------------------------------------------

/**
 * Free Flight on a clock that stands still before the page loads. Nothing
 * moves until a test runs the clock: the Run starts with its Drones where it
 * seeded them, the first at 62% of the way down, the Strike Line at 84%.
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
  await expect(flightDeck(page)).toContainText(text.replaceAll(' ', '␣'));
}

/** Presses a key and waits for the HUD to show the Streak it makes. */
async function pressAtStreak(page: Page, key: string, streak: number) {
  await page.keyboard.press(key);
  await expect(hud(page)).toContainText(
    new RegExp(`Streak\\s*${streak}(?!\\d)`, 'i'),
  );
}

/**
 * Checks the popup of the hit just typed on the stopped clock. Popups are
 * drawn on animation frames, which only come when the clock moves, so it
 * moves in small steps until the popup is named or the time is up.
 */
async function expectPopupOnStoppedClock(
  page: Page,
  points: number,
  step: string,
) {
  await expectPopup(step, points, undefined, async (seen) => {
    await expect
      .poll(
        async () => {
          await page.clock.runFor(50);
          for (const name of await popupNames(page)) seen.add(name);
          return [...seen];
        },
        {
          message: `${step}: popups named on the deck`,
          timeout: 8000,
          intervals: [10],
        },
      )
      .toContainEqual(expect.stringMatching(worth(points)));
  });
}

test('a Good letter hit at x1 raises a popup saying +50', async ({ page }) => {
  await launchOnStoppedClock(page, 'abcdef');

  // No time has passed: the lead Drone is far above the Strike Line.
  await page.keyboard.press('a');
  await expect.poll(() => hudScore(page), { message: 'a Good: 50' }).toBe(50);

  await expectPopupOnStoppedClock(page, 50, 'Good at x1');
});

test('a Great letter hit at x1 raises a popup saying +75', async ({ page }) => {
  await launchOnStoppedClock(page, 'abcdef');

  // About six steps in, the lead Drone has come down from 62% to 71%: 13 from
  // the Strike Line, inside the Great band (more than 8, at most 16). The
  // band is four to nine steps wide, so a hundred milliseconds is its middle.
  await page.clock.runFor(100);
  await page.keyboard.press('a');
  await expect.poll(() => hudScore(page), { message: 'a Great: 75' }).toBe(75);

  await expectPopupOnStoppedClock(page, 75, 'Great at x1');
});

// Nine quick hits with no time passing are nine Goods (450). The 10th makes
// Streak 10: a Good at x2.
for (const [name, key, text] of [
  ['letter', 'j', 'abcdefghijklmn'],
  ['Space (flagship)', 'Space', 'abcdefghi jklmn'],
] as const) {
  test(`a Good ${name} hit at x2 (Streak 10) raises a popup saying +100, not +50`, async ({
    page,
  }) => {
    await launchOnStoppedClock(page, text);

    for (let streak = 1; streak <= 9; streak++) {
      await pressAtStreak(page, text[streak - 1], streak);
    }
    await expect
      .poll(() => hudScore(page), { message: 'nine Goods: 9 x 50' })
      .toBe(450);

    await page.keyboard.press(key);
    await expect
      .poll(() => hudScore(page), { message: 'a Good at x2: +100' })
      .toBe(550);

    await expectPopupOnStoppedClock(page, 100, `Good ${name} at Streak 10`);
  });
}
