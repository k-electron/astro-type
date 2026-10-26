import { expect as baseExpect, type Page, test } from '@playwright/test';
import { drone, flightDeck, hud, labelled, launchFreeFlight } from '../helpers';
import { hudScore } from '../journey-helpers';

// LOCAL ONLY (`pnpm test:local`, docs/agents/testing.md): about thirty hits
// settled at Perfects on a real clock, which CI's runner cannot afford. CI
// keeps the wiring (popups-and-names.spec.ts, J4); the numbers themselves are
// unit-tested (judgement-events.test.ts, hitPopups.test.ts).
//
// EVERY hit popup on the Action Deck ends with the points that hit scored,
// "+<points>", and that number is what the HUD's Score gained. A hit scores
// base x Multiplier x 2 in Overdrive: base Perfect 100, Great 75, Good 50; the
// Multiplier is x1 under Streak 10, x2 at 10, x3 at 20, x4 at 30, and the
// Streak the hit makes counts. Space (the flagship) scores like any other key.
// The hit that ignites Overdrive is NOT doubled and has no strike popup. In
// Overdrive a Perfect raises "OVERDRIVE STRIKE! +<points>".
//
// The popups are text drawn in the canvas; the deck's accessibility layer names
// each one, with its whole text as the accessible name (`title` or
// `aria-label`), only while the popup is drawn. These tests pin the number and
// never the words, except two things: the igniting hit must not be named
// "OVERDRIVE STRIKE", and an Overdrive Perfect must be.
//
// A hit's rating is set by how far the Drone is from the Strike Line. Perfects
// run on the real clock: the lead Drone settles at the Strike Line and waits,
// so there is no race. A Great or a Good is a Drone caught on its way to the
// line, and that cannot be done reliably on a real clock, so those few tests
// use `page.clock`, the sanctioned use for exact timing: the clock stands
// still before the page loads and moves only when a test says so. With no time
// passing, every Drone is where the Run seeded it, far above the Strike Line,
// so any key is a Good; a hundred milliseconds in, the first Drone has moved
// into the Great band. The HUD's Score is checked on every hit, so a hit that
// was not the rating a test meant fails there, and not on the popup.
//
// Mapping rows: #59-#62, #105 (the climb); #63-#66 (the stopped-clock tests).

test.skip(Boolean(process.env.CI), 'Local-only: run with pnpm test:local');

// Software-GL frames can take seconds on a loaded machine, and the deck only
// moves on frames. So no wait here is a short wall-clock budget: each waits for
// the condition it is about, with a generous limit that only a real failure
// reaches (the test's own timeout is the backstop).
const expect = baseExpect.configure({ timeout: 30_000 });

test.use({ viewport: { width: 1280, height: 1100 } });

/** Any hit popup: whatever it says, it ends "+<points>". */
const ANY_POPUP = /\+\d+\s*$/;
/** A popup that ends "+<points>": the "+" is right before the number. */
const worth = (points: number) => new RegExp(`\\+${points}\\s*$`);
/** The Overdrive Perfect popup: "OVERDRIVE STRIKE! +<points>", maybe a bolt first. */
const strikeWorth = (points: number) =>
  new RegExp(`^\\W*overdrive strike!\\s*\\+${points}$`, 'i');

/** An Overdrive badge on the HUD: "OVERDRIVE x6". */
const BADGE = /^overdrive\s*x(\d+)$/i;

/** The Multiplier a Streak has earned: x1, then x2 at 10, x3 at 20, x4 at 30. */
const multiplierAt = (streak: number) =>
  Math.min(4, 1 + Math.floor(streak / 10));

/**
 * The climb's text: ten different letters, repeated (no letter twice among the
 * Drones on screen, and "z" is never the next letter), with a Space as the 10th
 * and the 30th character. The Space is the flagship: it scores like any other
 * key. The 10th hit makes Streak 10 (x2); the 30th is in Overdrive at x4.
 */
const CLIMB = (() => {
  const spaces = new Set([9, 29]);
  let letters = 0;
  return Array.from({ length: 110 }, (_, index) =>
    spaces.has(index) ? ' ' : 'abcdefghij'[letters++ % 10],
  ).join('');
})();

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

/**
 * Starts a log of every hit popup name the accessibility layer gets from now
 * on (starting again empties it). A popup is named only while it is drawn, and
 * on a loaded machine a look taken after the key press can come after the
 * popup is gone; the log catches it when it appears. It reads the same names
 * `popupNames` does, from the page's elements only.
 */
async function startPopupLog(page: Page) {
  await page.evaluate((source) => {
    const popup = new RegExp(source);
    const w = window as unknown as {
      hitPopupLog?: string[];
      hitPopupObserver?: MutationObserver;
    };
    w.hitPopupObserver?.disconnect();
    const log: string[] = [];
    w.hitPopupLog = log;
    const note = (element: Element) => {
      for (const attribute of ['aria-label', 'title']) {
        const name = element.getAttribute(attribute);
        if (name && popup.test(name)) log.push(name);
      }
    };
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'attributes') {
          note(record.target as Element);
          continue;
        }
        for (const node of record.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          note(node as Element);
          for (const inner of (node as Element).querySelectorAll(
            '[aria-label],[title]',
          ))
            note(inner);
        }
      }
    });
    observer.observe(document, {
      attributes: true,
      attributeFilter: ['aria-label', 'title'],
      childList: true,
      subtree: true,
    });
    w.hitPopupObserver = observer;
  }, ANY_POPUP.source);
}

/** Every hit popup name logged since `startPopupLog`. */
const loggedPopups = (page: Page): Promise<string[]> =>
  page.evaluate(() => [
    ...((window as unknown as { hitPopupLog?: string[] }).hitPopupLog ?? []),
  ]);

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
    /** Types a wrong key: the Run has no shields, so the Streak is lost. */
    async miss() {
      await page.keyboard.press('z');
      streak = 0;
      await expect(hud(page)).toContainText(/Streak\s*0(?!\d)/i);
    },
    /** Waits until the lead Drone has stopped moving: at the Strike Line. */
    async settle() {
      const name = nextCharacter() === ' ' ? 'Space' : nextCharacter();
      const lead = drone(page, name);
      await expect(lead, 'one lead Drone to watch').toHaveCount(1);
      let last = Number.NaN;
      let still = 0;
      let stillSince = Date.now();
      await expect(async () => {
        const box = await lead.boundingBox({ timeout: 10_000 });
        const bottom = box ? box.y + box.height : -1;
        if (bottom === last) {
          still += 1;
        } else {
          still = 0;
          stillSince = Date.now();
        }
        last = bottom;
        // Still for five looks over at least a second: a loaded machine that
        // draws a frame only now and then must not look settled mid-fall.
        expect(still).toBeGreaterThanOrEqual(5);
        expect(Date.now() - stillSince).toBeGreaterThanOrEqual(1000);
      }).toPass({ timeout: 60_000, intervals: [100] });
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
 * assumes, the popup is not the question. With `strike`, the popup has to be
 * the Overdrive one; with `forbidden`, no popup seen may match it.
 */
async function perfectHit(
  page: Page,
  run: ReturnType<typeof followRun>,
  points: number,
  step: string,
  options: { forbidden?: RegExp; strike?: boolean } = {},
) {
  await run.settle();
  // Popups of earlier hits may still be fading: they are not this hit's.
  await expect
    .poll(() => popupNames(page), {
      message: `${step}: earlier popups have gone`,
      timeout: 60_000,
    })
    .toEqual([]);

  const before = await hudScore(page);
  await startPopupLog(page);
  await run.press();
  await expect
    .poll(() => hudScore(page), { message: `${step}: the hit's score` })
    .toBe(before + points);

  const wanted = options.strike ? strikeWorth(points) : worth(points);
  await expectPopup(step, points, options.forbidden, async (seen) => {
    await expect
      .poll(
        async () => {
          for (const name of await loggedPopups(page)) seen.add(name);
          return [...seen];
        },
        {
          message: `${step}: popups named on the deck`,
          timeout: 30_000,
          intervals: [50],
        },
      )
      .toContainEqual(expect.stringMatching(wanted));
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
// Perfects, on the real clock: one Run, a probe at each Multiplier.
// ---------------------------------------------------------------------------

test('a Perfect hit raises a popup with the points it scored, at every Multiplier, in and out of Overdrive, for a letter and for Space', async ({
  page,
}) => {
  test.setTimeout(360_000);
  await launchFreeFlight(page, CLIMB);
  const run = followRun(page, CLIMB);

  await test.step('Space, the flagship, at x2 (Streak 10): +200, not +100 [#61]', async () => {
    await run.hitUntil(9);
    expect(run.nextMultiplier).toBe(2);
    expect(await overdriveOn(page), 'Overdrive is not on yet').toBe(false);
    // The 10th hit is the Space; Perfect 100 x2.
    await perfectHit(page, run, 200, 'Perfect Space at Streak 10');
  });

  await test.step('a letter at x3 (Streak 20): +300, not +100 [#59]', async () => {
    await run.hitUntil(19);
    expect(await overdriveOn(page), 'Overdrive is not on yet').toBe(false);
    expect(run.nextMultiplier).toBe(3);
    // Perfect 100 x3, not doubled.
    await perfectHit(page, run, 300, 'Perfect at Streak 20');
  });

  await test.step('the hit that ignites Overdrive is not doubled: +300 at x3, and not OVERDRIVE STRIKE [#60]', async () => {
    // 28 hits fill the Overdrive meter to 98 of 100 (no upgrades): the 29th
    // hit ignites it, at Streak 29 (x3).
    await run.hitUntil(28);
    expect(
      await overdriveOn(page),
      'Overdrive is not on before the 29th hit',
    ).toBe(false);
    expect(run.nextMultiplier).toBe(3);
    await perfectHit(page, run, 300, 'the igniting hit (Streak 29)', {
      forbidden: /overdrive strike/i,
    });
    await expect(
      hud(page).getByText(BADGE),
      'the 29th hit lit Overdrive',
    ).toBeVisible();
  });

  await test.step('Space in Overdrive at x4 (Streak 30): a popup saying +800 [#62]', async () => {
    expect(run.nextMultiplier).toBe(4);
    // Perfect 100 x4 x2 for Overdrive. The flagship has its own popup text; the
    // OVERDRIVE STRIKE one is for the letter keys.
    await perfectHit(page, run, 800, 'Perfect Space at Streak 30 in Overdrive');
  });

  await test.step('a Miss ends Streak and Overdrive; Overdrive comes back at x1 on the meter that is left', async () => {
    // A Miss ends the Streak and Overdrive, but the meter is still most of the
    // way full, so Overdrive comes back while the Multiplier is x1 and carries
    // through every step.
    await run.miss();
    expect(await overdriveOn(page), 'a Miss ends Overdrive').toBe(false);
    for (let tries = 0; !(await overdriveOn(page)); tries++) {
      expect(tries, 'Overdrive came back within 20 hits').toBeLessThan(20);
      await run.press();
    }
    expect(run.streak, 'Overdrive came back before Streak 10').toBeLessThan(10);
  });

  await test.step('an OVERDRIVE STRIKE (a letter) names its real points at x1, x2, x3 and x4 [#105]', async () => {
    // One Perfect hit under each Multiplier, as soon as the Streak reaches it:
    // the first hit back in Overdrive (x1), then the hits making Streak 10, 20
    // and 30. Each is worth 100 x Multiplier x 2.
    const probed = new Set<number>();
    while (run.streak < 31) {
      const multiplier = run.nextMultiplier;
      if (probed.has(multiplier)) {
        await run.press();
      } else {
        probed.add(multiplier);
        await perfectHit(
          page,
          run,
          200 * multiplier,
          `Overdrive Perfect at x${multiplier}`,
          { strike: true },
        );
      }
    }
    expect([...probed].sort()).toEqual([1, 2, 3, 4]);
  });
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
  await startPopupLog(page);
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
 * moves in small steps until the popup is named or it is clear it never will be.
 */
async function expectPopupOnStoppedClock(
  page: Page,
  points: number,
  step: string,
) {
  await expectPopup(step, points, undefined, async (seen) => {
    // Steps, not a short wall-clock budget: a loaded machine draws few frames
    // a second, which only makes this slower. It stops when the popup is named,
    // or after 60 steps (three seconds of Run time, far longer than a popup
    // lives) that also took at least 15 s of real time, so a machine that
    // races through its steps without drawing a frame is not mistaken for a
    // missing popup.
    const started = Date.now();
    for (let steps = 0; ; steps++) {
      await page.clock.runFor(50);
      for (const name of await loggedPopups(page)) seen.add(name);
      if ([...seen].some((name) => worth(points).test(name))) break;
      if (steps >= 60 && Date.now() - started >= 15_000) break;
    }
    expect([...seen], `${step}: popups named on the deck`).toContainEqual(
      expect.stringMatching(worth(points)),
    );
  });
}

test('a Good letter hit at x1 raises a popup saying +50 [#63]', async ({
  page,
}) => {
  await launchOnStoppedClock(page, 'abcdef');

  // No time has passed: the lead Drone is far above the Strike Line.
  await page.keyboard.press('a');
  await expect.poll(() => hudScore(page), { message: 'a Good: 50' }).toBe(50);

  await expectPopupOnStoppedClock(page, 50, 'Good at x1');
});

test('a Great letter hit at x1 raises a popup saying +75 [#64]', async ({
  page,
}) => {
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
// Streak 10: a Good at x2. (A Great needs its own launch above: after a Good
// the next Drone's height differs, so the band can't be aimed at.)
for (const [name, key, text, row] of [
  ['letter', 'j', 'abcdefghijklmn', '#65'],
  ['Space (flagship)', 'Space', 'abcdefghi jklmn', '#66'],
] as const) {
  test(`a Good ${name} hit at x2 (Streak 10) raises a popup saying +100, not +50 [${row}]`, async ({
    page,
  }) => {
    await launchOnStoppedClock(page, text);

    for (let streak = 1; streak <= 9; streak++) {
      await pressAtStreak(page, text[streak - 1], streak);
    }
    await expect
      .poll(() => hudScore(page), { message: 'nine Goods: 9 x 50' })
      .toBe(450);

    await startPopupLog(page);
    await page.keyboard.press(key);
    await expect
      .poll(() => hudScore(page), { message: 'a Good at x2: +100' })
      .toBe(550);

    await expectPopupOnStoppedClock(page, 100, `Good ${name} at Streak 10`);
  });
}
