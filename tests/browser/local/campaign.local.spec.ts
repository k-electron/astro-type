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

  await test.step(`with no Sector banner the Debrief fits at ${size}: nothing in it scrolls and nothing is cut off`, async () => {
    const dialog = page.getByRole('dialog', { name: DEBRIEF_TITLE });
    // The plain clear of the first Stage from a fresh Save unlocks nothing.
    await expect(dialog.getByText(NEW_SECTOR_UNLOCKED)).toHaveCount(0);

    // The technique card's heading is a JSX literal in the source, with no
    // export to import (a gap to close if the source ever exports it).
    const technique = 'Touch-Typing Technique Assessment';
    const offenders = await dialog.evaluate(
      (root, { heading, replayName }) => {
        const found: string[] = [];
        const rect = (element: Element) => element.getBoundingClientRect();
        const name = (element: Element) =>
          `<${element.tagName.toLowerCase()}> "${(element.textContent ?? '').trim().slice(0, 24)}…"`;
        const scrolls = (element: Element) =>
          ['auto', 'scroll'].includes(getComputedStyle(element).overflowY);

        // 1. Nothing scrolls: not the page, the dialog, anything in it, or the
        // boxes around it.
        const pageScrolledBy = document.scrollingElement?.scrollTop ?? 0;
        if (pageScrolledBy > 0)
          found.push(`the page is scrolled by ${pageScrolledBy}`);
        const boxes = [root, ...root.querySelectorAll('*')];
        for (
          let parent = root.parentElement;
          parent;
          parent = parent.parentElement
        ) {
          boxes.push(parent);
        }
        for (const element of boxes) {
          if (
            scrolls(element) &&
            element.scrollHeight - element.clientHeight > 1
          ) {
            found.push(
              `${name(element)} scrolls: scrollHeight ${element.scrollHeight} > clientHeight ${element.clientHeight}`,
            );
          }
        }

        // 2. The technique card (the nearest box with a border above and below
        // its heading) ends above the line that tops the action buttons (the
        // nearest box over Replay with a top border).
        const text = [...root.querySelectorAll('*')].find(
          (element) =>
            element.children.length === 0 &&
            (element.textContent ?? '').includes(heading),
        );
        const hasBorders = (element: Element) => {
          const style = getComputedStyle(element);
          return (
            Number.parseFloat(style.borderTopWidth) > 0 &&
            Number.parseFloat(style.borderBottomWidth) > 0
          );
        };
        let card = text?.parentElement ?? null;
        while (card && !hasBorders(card)) card = card.parentElement;
        const replay = [...root.querySelectorAll('button')].find(
          (button) => button.textContent?.trim() === replayName,
        );
        let footer = replay?.parentElement ?? null;
        while (
          footer &&
          !(Number.parseFloat(getComputedStyle(footer).borderTopWidth) > 0)
        ) {
          footer = footer.parentElement;
        }
        if (!card || !footer) {
          found.push(
            `could not find the technique card (${Boolean(card)}) or the action buttons' top line (${Boolean(footer)})`,
          );
          return found;
        }
        const cardBox = rect(card);
        const footerTop = rect(footer).top;
        if (cardBox.bottom > footerTop + 1) {
          found.push(
            `technique card bottom ${cardBox.bottom} is below the action buttons' top line ${footerTop}`,
          );
        }

        // 3. No box around the card cuts it off, scrolling or not.
        for (
          let parent = card.parentElement;
          parent && parent !== root.parentElement;
          parent = parent.parentElement
        ) {
          if (getComputedStyle(parent).overflowY === 'visible') continue;
          const box = rect(parent);
          if (cardBox.top < box.top - 1 || cardBox.bottom > box.bottom + 1) {
            found.push(
              `technique card y ${cardBox.top}-${cardBox.bottom} is cut off by ${name(parent)} at y ${box.top}-${box.bottom}`,
            );
          }
        }
        return found;
      },
      { heading: technique, replayName: REPLAY },
    );
    expect.soft(offenders, `the Debrief at ${size} with no banner`).toEqual([]);
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
  { width: 1280, height: 720 },
  { width: 768, height: 720 },
] as const;

test('the Debrief that opens a Sector keeps its action buttons on screen, unscrolled, in every window size', async ({
  page,
}) => {
  // A tall Debrief: Stage 1 cleared for 3 Stars takes a Save that is one clear
  // short of Sector 02's gate over it, so the "New Sector Unlocked!" banner is
  // up too. Every size is checked on it, with no separate pass without it. It is a Stage played for
  // real (77 keys), like the journey above, because the Stars it earns decide
  // whether the banner shows.
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
