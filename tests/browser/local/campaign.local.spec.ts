import { expect, test } from '@playwright/test';
import {
  CURRICULUM_SECTORS,
  MAX_STARS_PER_STAGE,
} from '../../../src/curriculum/curriculum';
import { clearedStages } from '../../shared/saves';
import {
  ACADEMY_HOME,
  DEBRIEF_TITLE,
  GALAXY_MAP,
  NEW_SECTOR_UNLOCKED,
  NEXT_STAGE,
  REPLAY,
} from '../../shared/screens';
import {
  clearFirstStage,
  debrief,
  seedSave,
  startFirstStage,
} from '../helpers';

// LOCAL ONLY (run by `pnpm verify`, not in CI; docs/agents/testing.md): one full
// Stage played for real. The Stage is 77 keys on a real clock with a real
// deck, which took about 50 s on CI's runner. What the Debrief and the screens
// around it do is checked in the DOM tests (tests/dom/debrief.test.tsx,
// profile.test.tsx, names.test.tsx) and the rules in the unit tests
// (stars.test.ts, sector-unlock.test.ts); this plays the first Stage typed
// through the real page, from a fresh Save to its Debrief, and checks that the
// Stars it earned are still there after a reload.

test.skip(
  Boolean(process.env.CI),
  'Local-only: pnpm verify runs it, CI does not',
);

const NO_BANNER_WINDOW = { width: 1400, height: 900 } as const;

test('the first Stage played for real from a fresh Save: its Debrief, and the Stars kept after a reload', async ({
  page,
}) => {
  // The window the Debrief fits in without its Sector banner (set before the
  // Stage starts: the confetti step below has one second after it opens).
  await page.setViewportSize(NO_BANNER_WINDOW);
  const size = `${NO_BANNER_WINDOW.width}x${NO_BANNER_WINDOW.height}`;
  await startFirstStage(page);
  await expect(
    page.getByRole('button', { name: '0 ★', exact: true }),
  ).toBeVisible();
  await clearFirstStage(page);
  const result = debrief(page);

  await test.step('the Debrief shows the Stage, its Speed and the Stars it earned', async () => {
    await expect
      .soft(
        result.getByRole('heading', { name: 'The Tactile Anchors', level: 2 }),
      )
      .toBeVisible();
    await expect.soft(result).toContainText(/Speed\s*[1-9]\d*\s*WPM/i);
    await expect.soft(result).toContainText(/\+3\s*new/i);
    await expect
      .soft(page.getByRole('button', { name: '3 ★', exact: true }))
      .toBeVisible();
  });

  await test.step(`with no Sector banner the Debrief fits the window at ${size}: the page doesn't scroll, the card is inside the window and its action buttons are on screen`, async () => {
    const dialog = page.getByRole('dialog', { name: DEBRIEF_TITLE });
    // The plain clear of the first Stage from a fresh Save unlocks nothing.
    await expect(dialog.getByText(NEW_SECTOR_UNLOCKED)).toHaveCount(0);

    // The card grew with the Run's text and keyboard (#153), so it scrolls
    // inside itself where the window is short: what it must never do is push
    // the page, spill out of the window or lose its buttons.
    const where = await dialog.evaluate((root) => {
      const box = root.getBoundingClientRect();
      return {
        pageScrolledBy: document.scrollingElement?.scrollTop ?? 0,
        top: box.top,
        bottom: box.bottom,
        windowHeight: window.innerHeight,
      };
    });
    expect.soft(where.pageScrolledBy, 'the page is scrolled').toBe(0);
    expect
      .soft(
        where.top >= 0 && where.bottom <= where.windowHeight + 1,
        `the card (y ${where.top}-${where.bottom}) is inside the window (${where.windowHeight})`,
      )
      .toBe(true);
    for (const name of [REPLAY, GALAXY_MAP, ACADEMY_HOME, NEXT_STAGE]) {
      await expect
        .soft(dialog.getByRole('button', { name, exact: true }))
        .toBeInViewport({ ratio: 1 });
    }
    // The one thing to work on is on view as the Debrief opens, unscrolled:
    // its Rhythm badge sits beside the sentence.
    await expect
      .soft(dialog.getByText(/^Rhythm:/))
      .toBeInViewport({ ratio: 1 });
  });

  await test.step('the confetti of a 3-Star Debrief stops falling when the Debrief closes', async () => {
    // The library draws it on a canvas of its own, fixed over the page, and
    // takes the canvas away when it is done (a few seconds) or is reset. The
    // Debrief has just opened with 3 Stars, so it is still falling.
    const confetti = page.locator('body > canvas');
    await expect(confetti, 'confetti is falling over the Debrief').toHaveCount(
      1,
      { timeout: 1000 },
    );

    await result.getByRole('button', { name: REPLAY, exact: true }).click();
    await expect(page.getByText(DEBRIEF_TITLE)).toBeHidden();

    // Well inside the few seconds it would otherwise take to fall.
    await expect(
      confetti,
      'no confetti is left once the Debrief is gone',
    ).toHaveCount(0, { timeout: 500 });
  });

  await test.step('the Save outlives the page: the Stars are still there after a reload', async () => {
    await page.reload();
    await expect(
      page.getByRole('button', { name: '3 ★', exact: true }),
    ).toBeVisible();
    await page
      .getByRole('navigation')
      .getByRole('button', { name: GALAXY_MAP, exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: /Orion Belt/ }),
    ).toContainText('3/12');
  });
});

/** The windows a desktop player has, the tallest first (768px is the narrowest we support). */
const DEBRIEF_WINDOWS = [
  { width: 1400, height: 900 },
  { width: 1440, height: 800 },
  { width: 1280, height: 800 },
  { width: 1280, height: 720 },
  { width: 900, height: 700 },
  { width: 768, height: 720 },
] as const;

test('the Debrief that opens a Sector shows its unlock banner and keeps its action buttons on screen, unscrolled, in every window size', async ({
  page,
}) => {
  // A tall Debrief: Stage 1 cleared for 3 Stars takes a Save that is one clear
  // short of Sector 02's gate over it, so the "New Sector Unlocked!" banner is
  // up too. Every size is checked on it, with no separate pass without it. It is a Stage played for
  // real (77 keys), like the journey above, because the Stars it earns decide
  // whether the banner shows. At each size the banner must be seen as the
  // Debrief opens (inside the visible part of the box that scrolls, with
  // nothing scrolled) and so must every action button.
  const gate = CURRICULUM_SECTORS[1].requiredStarsToUnlock;
  const starsBefore = gate - MAX_STARS_PER_STAGE;
  if (starsBefore < 0 || starsBefore > MAX_STARS_PER_STAGE) {
    throw new Error(
      `Sector 02's gate (${gate}) is no longer one clear (${MAX_STARS_PER_STAGE} Stars) past a single Stage's Stars`,
    );
  }
  await seedSave(
    page,
    clearedStages({ [CURRICULUM_SECTORS[0].stages[1].id]: starsBefore }),
  );
  await page.setViewportSize(DEBRIEF_WINDOWS[0]);
  await startFirstStage(page);
  await clearFirstStage(page);
  const result = debrief(page);
  // The banner is the point of this Debrief; without it the sizes below prove less.
  await expect(result.getByText(NEW_SECTOR_UNLOCKED)).toBeVisible();

  const actions = [REPLAY, GALAXY_MAP, ACADEMY_HOME, NEXT_STAGE];

  for (const size of DEBRIEF_WINDOWS) {
    await test.step(`the unlock banner is fully visible, unscrolled, at ${size.width}x${size.height}`, async () => {
      await page.setViewportSize(size);
      const banner = result.getByText(NEW_SECTOR_UNLOCKED);
      const where = await banner.evaluate(async (element) => {
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        );
        const box = element.getBoundingClientRect();
        // The box the banner scrolls in: its nearest ancestor that scrolls
        // (found by its overflow, so it is the same box at every size).
        let scroller: HTMLElement | null = null;
        let scrolled = window.scrollY;
        for (
          let parent = element.parentElement;
          parent;
          parent = parent.parentElement
        ) {
          scrolled += parent.scrollTop;
          const overflowY = getComputedStyle(parent).overflowY;
          if (!scroller && (overflowY === 'auto' || overflowY === 'scroll')) {
            scroller = parent;
          }
        }
        const hit = document.elementFromPoint(
          box.left + box.width / 2,
          box.top + box.height / 2,
        );
        const visible = scroller && {
          top: scroller.getBoundingClientRect().top + scroller.clientTop,
          bottom:
            scroller.getBoundingClientRect().top +
            scroller.clientTop +
            scroller.clientHeight,
        };
        return {
          scrolled,
          top: Math.round(box.top),
          bottom: Math.round(box.bottom),
          visibleTop: visible && Math.round(visible.top),
          visibleBottom: visible && Math.round(visible.bottom),
          height: window.innerHeight,
          reachable: hit !== null && element.contains(hit),
        };
      });
      const label = `banner at ${size.width}x${size.height}: y ${where.top}-${where.bottom}, scrolling body shows ${where.visibleTop}-${where.visibleBottom}, window ${where.height}`;
      // No scrolling body means this check is not measuring what it says.
      expect
        .soft(where.visibleTop, `${label}: found no scrolling body`)
        .not.toBeNull();
      expect
        .soft(
          where.visibleTop !== null &&
            where.visibleBottom !== null &&
            where.top >= where.visibleTop &&
            where.bottom <= where.visibleBottom,
          `${label} lies inside the visible part of the scrolling body`,
        )
        .toBe(true);
      expect
        .soft(
          where.top >= 0 && where.bottom <= where.height,
          `${label} lies inside the window`,
        )
        .toBe(true);
      expect.soft(where.scrolled, `${label}, without scrolling`).toBe(0);
      expect
        .soft(where.reachable, `${label} is not covered by anything`)
        .toBe(true);
    });

    await test.step(`the plain sentence is fully visible as the Debrief opens, with more below it to scroll to, at ${size.width}x${size.height}`, async () => {
      await page.setViewportSize(size);
      // The card holding the sentence and the Rhythm badge beside it.
      const sentence = result.getByText(/^Rhythm:/).locator('..');
      const where = await sentence.evaluate(async (element) => {
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        );
        const box = element.getBoundingClientRect();
        let scroller: HTMLElement | null = null;
        for (
          let parent = element.parentElement;
          parent && !scroller;
          parent = parent.parentElement
        ) {
          const overflowY = getComputedStyle(parent).overflowY;
          if (overflowY === 'auto' || overflowY === 'scroll') scroller = parent;
        }
        const body = scroller?.getBoundingClientRect();
        return {
          top: Math.round(box.top),
          bottom: Math.round(box.bottom),
          visibleTop: body ? Math.round(body.top) : null,
          visibleBottom: body ? Math.round(body.bottom) : null,
          scrolled: scroller?.scrollTop ?? -1,
          moreBelow: scroller
            ? scroller.scrollHeight - scroller.clientHeight > 1
            : null,
        };
      });
      const label = `sentence at ${size.width}x${size.height}: y ${where.top}-${where.bottom}, scrolling body shows ${where.visibleTop}-${where.visibleBottom}`;
      expect
        .soft(where.scrolled, `${label}: the body starts unscrolled`)
        .toBe(0);
      expect
        .soft(
          where.visibleTop !== null &&
            where.visibleBottom !== null &&
            where.top >= where.visibleTop &&
            where.bottom <= where.visibleBottom,
          `${label} lies inside the visible part of the scrolling body`,
        )
        .toBe(true);
      // The Debrief of a Stage is taller than any of these windows.
      expect.soft(where.moreBelow, `${label}: there is more below`).toBe(true);
    });

    await test.step(`every action button is on screen and reachable at ${size.width}x${size.height}`, async () => {
      await page.setViewportSize(size);
      for (const name of actions) {
        const button = result.getByRole('button', { name, exact: true });
        // Measured where it is, with no scrolling: the box, and what a click at
        // its centre would hit. Two frames let the new size settle.
        const where = await button.evaluate(async (element) => {
          await new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          );
          const box = element.getBoundingClientRect();
          const hit = document.elementFromPoint(
            box.left + box.width / 2,
            box.top + box.height / 2,
          );
          // Anything that scrolled to bring the button into view moved the page
          // or one of the boxes around the button.
          let scrolled = window.scrollY;
          for (
            let parent = element.parentElement;
            parent;
            parent = parent.parentElement
          ) {
            scrolled += parent.scrollTop;
          }
          return {
            scrolled,
            top: Math.round(box.top),
            bottom: Math.round(box.bottom),
            left: Math.round(box.left),
            right: Math.round(box.right),
            width: window.innerWidth,
            height: window.innerHeight,
            reachable: hit !== null && element.contains(hit),
          };
        });
        const label = `${name} at ${size.width}x${size.height}: y ${where.top}-${where.bottom} of ${where.height}, x ${where.left}-${where.right} of ${where.width}`;
        expect
          .soft(
            where.top >= 0 &&
              where.left >= 0 &&
              where.bottom <= where.height &&
              where.right <= where.width,
            `${label} lies inside the window`,
          )
          .toBe(true);
        expect.soft(where.scrolled, `${label}, without scrolling`).toBe(0);
        expect
          .soft(where.reachable, `${label} is not covered by anything`)
          .toBe(true);
      }
    });
  }
});
