import { expect, type Locator, type Page, test } from '@playwright/test';
import {
  currentCharacter,
  flightDeck,
  hud,
  launchFreeFlight,
  pauseMenu,
  promptProgress,
  seedSave,
  textPrompt,
  typeText,
} from './helpers';
import { OPEN_AUDIO_PANEL, laserSfxLabel } from '../../src/screens/audioLabels';
import { flightDeckLabel } from '../../src/screens/closeLabel';
import {
  ACADEMY_HOME,
  MENU_HEADINGS,
  PAUSE_FLIGHT,
  PAUSE_MENU_NAME,
  START_STAGE,
} from '../shared/screens';
import { pauseButton, resumeButton } from './journey-helpers';
import { WIPE_STARS_TITLE } from '../../src/screens/confirmLabels';
import {
  MOST_STARS_AND_CREDITS,
  MUTED_PLAYER,
  RETURNING_PLAYER,
} from '../shared/saves';

// J2: native keyboard and focus, in a real browser. These are the things a DOM
// test cannot see: the default scroll action of the Space key, how a missed
// space is drawn, and native Enter and Space activation on a focused button.
//
// Part A is a short window and a text with spaces; part B a text with none, so
// that a focused button could not take a Space the game wanted. Each part is
// one launch. A check the next step depends on (the Run is paused, the key was
// typed) is hard; the rest are soft.

/** One space in the text prompt: they are drawn as "␣". */
const promptSpace = (page: Page, which: number): Locator =>
  textPrompt(page).getByText('␣', { exact: true }).nth(which);

/** How the prompt draws a character, once any transition has run. */
async function look(character: Locator) {
  await expect(character).toBeVisible();
  return character.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((a) => a.finished));
    const style = getComputedStyle(element);
    return {
      color: style.color,
      textDecorationLine: style.textDecorationLine,
      textDecorationColor: style.textDecorationColor,
    };
  });
}

/** The Run is paused, as the player left it: 50% through, Streak 3. */
async function expectPausedHalfway(page: Page) {
  await expect(pauseMenu(page)).toBeVisible();
  await expect.soft(promptProgress(page)).toHaveText('50%');
  await expect.soft(flightDeck(page)).toContainText(/Streak\s*3(?!\d)/i);
}

/**
 * Where keyboard focus is: in the header, in the Pause Menu, or somewhere else
 * (the Flight Deck behind them). The page body, where focus rests between
 * stops, counts as neither.
 */
async function whereFocusIs(
  page: Page,
): Promise<'header' | 'pause-menu' | 'elsewhere' | 'body'> {
  const inside = (landmark: Locator) =>
    landmark.evaluate((element) => element.contains(document.activeElement));
  if (await page.evaluate(() => document.activeElement === document.body))
    return 'body';
  if (await inside(page.getByRole('banner'))) return 'header';
  if (await inside(page.getByRole('dialog', { name: PAUSE_MENU_NAME })))
    return 'pause-menu';
  return 'elsewhere';
}

/**
 * Where keyboard focus is while Analytics' Wipe Stars confirm is open: in the
 * confirm, in the header, or somewhere else (an Analytics control behind the
 * confirm). The page body, where focus rests between stops, counts as neither.
 */
async function whereFocusIsOnConfirm(
  page: Page,
): Promise<'header' | 'confirm' | 'elsewhere' | 'body'> {
  const inside = (landmark: Locator) =>
    landmark.evaluate((element) => element.contains(document.activeElement));
  if (await page.evaluate(() => document.activeElement === document.body))
    return 'body';
  if (await inside(page.getByRole('banner'))) return 'header';
  if (await inside(page.getByRole('alertdialog', { name: WIPE_STARS_TITLE })))
    return 'confirm';
  return 'elsewhere';
}

/** Enter and Space on the Pause Menu leave the Run paused, and are no Miss. */
async function enterAndSpaceLeaveItPaused(page: Page) {
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await expectPausedHalfway(page);
  await expect.soft(hud(page)).toContainText(/Accuracy\s*100%/i);
}

/**
 * Words of up to ten letters, in a text long enough to need several lines on a
 * phone: every word fits on a line, so a word split across two lines is a wrap
 * in the wrong place.
 */
const WRAPPING_TEXT =
  'steady wanderer carries lanterns beyond mountains while thoughtful travellers whisper about distant harbours and quiet gardens';

/** One word of 40 letters: wider than a phone's prompt, and no way to wrap it between words. */
const LONG_TOKEN = 'abcdefghijklmnopqrstuvwxyzabcdefghijklmn';

/** How far apart (px) two characters can sit and still be on one line. */
const SAME_LINE = 8;

/** The narrowest window the game supports up to a wide one, either side of Tailwind's `lg` (1024px). */
const WIDEST = 1280;
const HEADER_WIDTHS = [WIDEST, 1100, 1024, 1023, 1000, 900, 800, 768];

/** The five buttons of the header's navigation, by the names they keep at every width. */
const NAV_BUTTONS = [ACADEMY_HOME, ...Object.keys(MENU_HEADINGS)];

/**
 * At each window width, every header button is named, fully inside the window
 * and not covered by anything else. `flightName` is the Flight Deck button's
 * name for the state the game is in, which also proves the state.
 */
async function expectHeaderFits(page: Page, flightName: string, state: string) {
  const header = page.getByRole('banner');
  let widest: string[] | undefined;
  for (const width of HEADER_WIDTHS) {
    await page.setViewportSize({ width, height: 800 });
    // The header's fonts are web fonts; measure with the real ones, not the
    // fallback glyphs they replace.
    await page.evaluate(() => document.fonts.ready);
    const where = `${width}px, ${state}`;
    const nav = page.getByRole('navigation');
    for (const name of NAV_BUTTONS) {
      await expect
        .soft(
          nav.getByRole('button', { name, exact: true }),
          `${where}: nav button "${name}" is there`,
        )
        .toBeVisible();
    }
    await expect
      .soft(
        header.getByRole('button', { name: flightName, exact: true }),
        `${where}: Flight Deck button "${flightName}" is there`,
      )
      .toBeVisible();

    // Each drawn button: where it sits, and what is on top at its centre.
    const buttons = await header.getByRole('button').evaluateAll((elements) =>
      elements
        .filter((element) => element.getClientRects().length > 0)
        .map((element) => {
          const box = element.getBoundingClientRect();
          const hit = document.elementFromPoint(
            box.left + box.width / 2,
            box.top + box.height / 2,
          );
          return {
            name: (
              element.getAttribute('aria-label') ??
              element.textContent ??
              ''
            ).trim(),
            left: box.left,
            right: box.right,
            covered: !(hit && element.contains(hit)),
            hit: hit
              ? `${hit.tagName} "${hit.textContent?.trim()}"`
              : 'nothing',
          };
        }),
    );
    expect
      .soft(buttons.length, `${where}: the header has buttons`)
      .toBeGreaterThan(0);
    // A button that is hidden to make room is not measured above, so the
    // buttons of every width must be those of the widest window.
    const names = buttons.map(({ name }) => name).sort();
    widest ??= names;
    expect
      .soft(names, `${where}: the same header buttons as at ${WIDEST}px`)
      .toEqual(widest);
    for (const { name, left, right, covered, hit } of buttons) {
      expect
        .soft(left, `${where}: "${name}" starts inside the window`)
        .toBeGreaterThanOrEqual(0);
      expect
        .soft(right, `${where}: "${name}" ends inside the window (${width})`)
        .toBeLessThanOrEqual(width);
      expect
        .soft(covered, `${where}: "${name}" is covered by ${hit}`)
        .toBe(false);
    }
  }
}

/** No Run, a running Run and a paused Run, each at every header width. */
async function expectHeaderFitsInEveryState(page: Page, who: string) {
  await page.setViewportSize({ width: WIDEST, height: 800 });
  await page.goto('/');
  await expectHeaderFits(page, START_STAGE, `${who}, no Run`);

  await page.setViewportSize({ width: WIDEST, height: 800 });
  await launchFreeFlight(page, 'abcdef');
  await expectHeaderFits(page, PAUSE_FLIGHT, `${who}, a running Run`);

  await page.keyboard.press('Escape');
  await expect(pauseMenu(page)).toBeVisible();
  await expectHeaderFits(page, flightDeckLabel(true), `${who}, a paused Run`);
}

/** Saves that make the header's busiest contents, and both at once. */
const HEADER_PROFILES = {
  'a muted player': MUTED_PLAYER,
  'a player with the most Stars and six-digit Credits': MOST_STARS_AND_CREDITS,
  'a muted player with the most Stars and six-digit Credits': {
    ...MOST_STARS_AND_CREDITS,
    globalMuted: true,
  },
};

test('native keys and focus: Space, Esc, Enter and the window losing focus', async ({
  page,
  browser,
}) => {
  // The most real-clock keys of any journey, and the header measured in four
  // profiles: a busy machine can double its time.
  test.setTimeout(180_000);
  await test.step('the header fits from 768px up, with no Run, a running Run and a paused Run', async () => {
    await expectHeaderFitsInEveryState(page, 'a new player');
  });

  await test.step('the header still fits when Audio is muted and the Stars and Credits are large', async () => {
    for (const [who, save] of Object.entries(HEADER_PROFILES)) {
      // A context of its own, so the Save does not reach the steps below.
      const context = await browser.newContext({
        baseURL: test.info().project.use.baseURL,
      });
      try {
        const seeded = await context.newPage();
        await seedSave(seeded, save);
        await expectHeaderFitsInEveryState(seeded, who);
      } finally {
        await context.close();
      }
    }
  });

  await test.step('the text prompt wraps between words, and inside a word only when it cannot fit a line', async () => {
    // Launch at a desktop width (the header's buttons are hidden on a phone),
    // then narrow to a phone's width, so the text takes several lines.
    await page.setViewportSize({ width: 1280, height: 800 });
    await launchFreeFlight(page, WRAPPING_TEXT);
    await page.setViewportSize({ width: 375, height: 800 });

    // Where each drawn character of the prompt sits (the layout is the fact).
    // The prompt's other single-character text is not drawn at this width.
    const characters = await textPrompt(page).evaluate((prompt) =>
      [...prompt.querySelectorAll('span')]
        .filter(
          (element) =>
            element.children.length === 0 &&
            element.textContent?.length === 1 &&
            element.getBoundingClientRect().width > 0,
        )
        .map((element) => ({
          character: element.textContent ?? '',
          top: element.getBoundingClientRect().top,
        })),
    );
    // The two checks below are soft: they do not stop the rest of the journey.
    expect
      .soft(
        characters.map(({ character }) => character).join(''),
        'the prompt shows the whole text, a space drawn as ␣',
      )
      .toBe(WRAPPING_TEXT.replaceAll(' ', '␣'));

    const lines = new Set(
      characters.map(({ top }) => Math.round(top / SAME_LINE)),
    );
    expect
      .soft(lines.size, 'the text takes several lines')
      .toBeGreaterThanOrEqual(3);

    let start = 0;
    for (const word of WRAPPING_TEXT.split(' ')) {
      const tops = characters
        .slice(start, start + word.length)
        .map(({ top }) => top);
      start += word.length + 1;
      expect
        .soft(
          Math.max(...tops) - Math.min(...tops),
          `"${word}" is split across two lines`,
        )
        .toBeLessThanOrEqual(SAME_LINE);
    }

    // A word that cannot fit a line at all (a pasted URL) is the one place the
    // prompt may break inside a word: it must not run off the side, and the
    // player's place in it must stay on screen as they type through it.
    await page.setViewportSize({ width: 1280, height: 800 });
    await launchFreeFlight(page, `go ${LONG_TOKEN} end`);
    await page.setViewportSize({ width: 375, height: 800 });
    await typeText(page, `go ${LONG_TOKEN.slice(0, 35)}`);
    await expect(promptProgress(page)).not.toHaveText('0%');

    const scroller = textPrompt(page)
      .locator('[aria-current]')
      .locator('xpath=ancestor::div[1]');
    const sideways = await scroller.evaluate(
      (element) => element.scrollWidth - element.clientWidth,
    );
    expect
      .soft(
        sideways,
        'a word wider than the prompt does not scroll it sideways',
      )
      .toBeLessThanOrEqual(0);
    await expect
      .poll(
        () =>
          scroller.evaluate((box) => {
            const current = box
              .querySelector('[aria-current]')
              ?.getBoundingClientRect();
            const area = box.getBoundingClientRect();
            return (
              current !== undefined &&
              current.left >= area.left &&
              current.right <= area.right &&
              current.top >= area.top &&
              current.bottom <= area.bottom
            );
          }),
        { message: 'the current character is inside the prompt' },
      )
      .toBe(true);
  });

  await test.step('part A: a missed space is marked at once, without a strike, and looks like one that was passed', async () => {
    // A short window, so the Flight Deck is taller than the page and Space
    // would scroll it if the game let the key through.
    await page.setViewportSize({ width: 1280, height: 500 });
    await launchFreeFlight(page, 'a b c d');
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollHeight > window.innerHeight,
        ),
      )
      .toBe(true);

    await page.keyboard.press('a');
    await expect(promptProgress(page)).toHaveText('14%');
    // The space to type next is the first; the second is untouched.
    const untouched = await look(promptSpace(page, 1));

    // A wrong key on the space marks it at once, and the cursor stays on it.
    await page.keyboard.press('z');
    await expect.soft(currentCharacter(page)).toHaveText('␣');
    const markedCurrent = await look(promptSpace(page, 0));
    expect.soft(markedCurrent.textDecorationLine).toBe('none');
    await expect(promptProgress(page)).toHaveText('14%');

    // The space key moves the cursor on. The space it passed still reads as
    // missed: the same look as when it was marked while current.
    await page.keyboard.press('Space');
    await expect(promptProgress(page)).toHaveText('29%');
    const missed = await look(promptSpace(page, 0));
    expect.soft(missed.textDecorationLine).toBe('none');
    expect
      .soft(missed.color, 'a missed space is drawn in its own colour')
      .not.toBe(untouched.color);
    expect.soft(missed).toEqual(markedCurrent);
  });

  await test.step('part A: Space does not scroll the page while typing', async () => {
    await typeText(page, 'b c');
    // Typed on to the next key, so the Spaces have all been handled.
    await expect(promptProgress(page)).toHaveText('71%');
    await expect.soft.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });

  // Part B: a fresh Run, halfway through "abcdef".
  await page.setViewportSize({ width: 1280, height: 900 });
  await launchFreeFlight(page, 'abcdef');
  await typeText(page, 'abc');
  await expect(promptProgress(page)).toHaveText('50%');
  await expect(flightDeck(page)).toContainText(/Streak\s*3(?!\d)/i);

  await test.step('part B: a stray Tab and Enter mid-Run leave the Run running, and Esc then Tab reaches the Pause Menu', async () => {
    // Focus starts wherever launching left it (the page body, not the header).
    // Today a Tab moves it to the header's logo and the Enter after it clicks
    // the logo, which abandons the Run.
    const headerPause = page
      .getByRole('banner')
      .getByRole('button', { name: PAUSE_FLIGHT, exact: true });
    await expect(headerPause).toBeVisible();
    await expect(hud(page)).toBeVisible();
    const startedAt = await whereFocusIs(page);

    await page.keyboard.press('Tab');
    expect
      .soft(await whereFocusIs(page), 'Tab mid-Run leaves focus where it was')
      .toBe(startedAt);
    await page.keyboard.press('Enter');

    // The Run is still running, 50% through, with its Streak.
    await expect(pauseMenu(page)).toBeHidden();
    await expect(hud(page)).toBeVisible();
    await expect(textPrompt(page)).toBeVisible();
    await expect(promptProgress(page)).toHaveText('50%');
    await expect(headerPause).toBeVisible();
    await expect.soft(flightDeck(page)).toContainText(/Streak\s*3(?!\d)/i);
    expect
      .soft(await whereFocusIs(page), 'focus is not on a header button')
      .not.toBe('header');
    expect
      .soft(await whereFocusIs(page), 'Enter mid-Run leaves focus where it was')
      .toBe(startedAt);

    await page.keyboard.press('Shift+Tab');
    expect
      .soft(
        await whereFocusIs(page),
        'Shift+Tab mid-Run leaves focus where it was',
      )
      .toBe(startedAt);
    await expect(headerPause).toBeVisible();
    await expect(promptProgress(page)).toHaveText('50%');

    // Esc pauses, and from the Pause Menu Tab moves focus as normal.
    await page.keyboard.press('Escape');
    await expectPausedHalfway(page);
    await page.keyboard.press('Tab');
    const afterTab = await whereFocusIs(page);
    expect
      .soft(
        ['pause-menu', 'header'],
        'Tab on the Pause Menu moves focus into the Pause Menu or the header',
      )
      .toContain(afterTab);

    // Back to a running Run for the steps after this one.
    await resumeButton(page).click();
    await expect(pauseMenu(page)).toBeHidden();
    await expect(promptProgress(page)).toHaveText('50%');
    await expect(flightDeck(page)).toContainText(/Streak\s*3(?!\d)/i);
    expect
      .soft(await whereFocusIs(page), 'resuming leaves focus off the header')
      .not.toBe('header');
  });

  await test.step('part B: Esc pauses, and Esc on the Pause Menu resumes from the same character', async () => {
    await page.keyboard.press('Escape');
    await expectPausedHalfway(page);

    await page.keyboard.press('Escape');
    await expect(pauseMenu(page)).toBeHidden();
    await expect.soft(promptProgress(page)).toHaveText('50%');
  });

  await test.step('part B: holding Esc down pauses once, and does not flick back and forth', async () => {
    // The second to fourth presses of a held key are auto-repeat. Counted as
    // presses they would pause, resume, pause and resume, ending unpaused.
    for (let press = 0; press < 4; press++) await page.keyboard.down('Escape');
    await page.keyboard.up('Escape');

    await expectPausedHalfway(page);
  });

  await test.step('part B: Enter and Space on a Pause Menu opened with Esc leave the Run paused', async () => {
    await enterAndSpaceLeaveItPaused(page);
    await page.keyboard.press('Escape');
    await expect(pauseMenu(page)).toBeHidden();
  });

  await test.step('part B: Enter and Space on a Pause Menu opened with the header Pause Flight button leave the Run paused', async () => {
    await pauseButton(page).click();
    await expectPausedHalfway(page);

    await enterAndSpaceLeaveItPaused(page);
    await resumeButton(page).click();
    await expect(pauseMenu(page)).toBeHidden();
  });

  await test.step('part B: Enter and Space on the Pause Menu after the window loses focus leave the Run paused', async () => {
    // A real tab switch does not reach a headless Chromium page, so this
    // sends the event the browser fires when the player clicks away.
    await page.evaluate(() => {
      window.dispatchEvent(new Event('blur'));
    });
    await expectPausedHalfway(page);

    await enterAndSpaceLeaveItPaused(page);
  });

  await test.step('part B: Tab on the Pause Menu cycles through the Pause Menu and the header, never the Flight Deck', async () => {
    // Focus goes into the header, then comes back into the Pause Menu: it
    // never lands on the Flight Deck. Capped, so a trap fails fast.
    let reachedHeader = false;
    let backInPauseMenu = false;
    for (let press = 0; press < 30 && !backInPauseMenu; press++) {
      await page.keyboard.press('Tab');
      const where = await whereFocusIs(page);
      expect.soft(where, `Tab press ${press + 1}`).not.toBe('elsewhere');
      if (where === 'header') reachedHeader = true;
      if (where === 'pause-menu' && reachedHeader) backInPauseMenu = true;
    }

    expect.soft(reachedHeader, 'Tab reaches the header').toBe(true);
    expect
      .soft(backInPauseMenu, 'and comes back into the Pause Menu')
      .toBe(true);
  });

  await test.step('part B: the audio panel opens above the Hangar, and each Esc closes only the top layer', async () => {
    await page
      .getByRole('navigation')
      .getByRole('button', { name: 'Hangar', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: MENU_HEADINGS.Hangar }),
    ).toBeVisible();
    await page.getByRole('button', { name: OPEN_AUDIO_PANEL }).click();
    // Playwright refuses to click what another element covers, so this click
    // lands only if the panel is on top of the Hangar.
    await page
      .getByRole('button', { name: laserSfxLabel(true) })
      .click({ timeout: 5_000 });
    await expect(
      page.getByRole('button', { name: laserSfxLabel(false) }),
    ).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('slider')).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: MENU_HEADINGS.Hangar }),
    ).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('heading', { name: MENU_HEADINGS.Hangar }),
    ).toBeHidden();
    await expectPausedHalfway(page);
  });

  await test.step('part B: Resume carries on from the same character', async () => {
    await resumeButton(page).click();
    await expect(pauseMenu(page)).toBeHidden();
    await expect.soft(promptProgress(page)).toHaveText('50%');

    await page.keyboard.press('d');
    await expect(promptProgress(page)).toHaveText('67%');
    await expect.soft(flightDeck(page)).toContainText(/Streak\s*4(?!\d)/i);
  });

  await test.step('part B: a mistyped letter is struck through at once, and stays struck once passed', async () => {
    // The cursor is on "e". A letter is drawn by another branch than a space.
    const letter = (which: string) =>
      textPrompt(page).getByText(which, { exact: true });

    const struck = 'line-through';

    await page.keyboard.press('z');
    await expect.soft(currentCharacter(page)).toHaveText('e');
    await expect.soft(letter('e')).toHaveCSS('text-decoration-line', struck);

    await page.keyboard.press('e');
    await expect(promptProgress(page)).toHaveText('83%');
    await expect.soft(letter('e')).toHaveCSS('text-decoration-line', struck);
    await expect.soft(letter('f')).toHaveCSS('text-decoration-line', 'none');
  });

  await test.step('Analytics: a confirm takes focus on Cancel, Tab keeps to the confirm and the header, and Esc cancels', async () => {
    // A context of its own, with a Save that has Stars to lose, and a window
    // wide enough for the header to show its Stars count. Last, so a failure
    // here hides none of the steps above.
    const context = await browser.newContext({
      baseURL: test.info().project.use.baseURL,
      viewport: { width: WIDEST, height: 800 },
    });
    try {
      const seeded = await context.newPage();
      await seedSave(seeded, RETURNING_PLAYER);
      await seeded.goto('/');
      const stars = seeded.getByRole('button', { name: '5 ★', exact: true });
      await expect(stars).toBeVisible();
      await seeded
        .getByRole('navigation')
        .getByRole('button', { name: 'Analytics', exact: true })
        .click();
      await expect(
        seeded.getByRole('heading', { name: MENU_HEADINGS.Analytics }),
      ).toBeVisible();

      const wipeStars = seeded.getByRole('button', {
        name: 'Wipe Stars',
        exact: true,
      });
      const confirm = seeded.getByRole('alertdialog', {
        name: WIPE_STARS_TITLE,
      });
      const cancel = confirm.getByRole('button', { name: 'Cancel' });

      // Opening: focus is on Cancel, so Enter cancels and wipes nothing.
      await wipeStars.click();
      await expect(confirm).toBeVisible();
      await expect.soft(cancel, 'focus starts on Cancel').toBeFocused();
      await seeded.keyboard.press('Enter');
      await expect(confirm).toBeHidden();
      await expect.soft(stars, 'Enter on Cancel wipes nothing').toBeVisible();
      await expect
        .soft(wipeStars, 'focus goes back to the Wipe Stars button')
        .toBeFocused();

      // Tab: only the confirm's buttons and the header, never Analytics.
      await wipeStars.click();
      await expect(confirm).toBeVisible();
      let reachedHeader = false;
      let reachedConfirm = false;
      let backInConfirm = false;
      for (let press = 0; press < 30 && !backInConfirm; press++) {
        await seeded.keyboard.press('Tab');
        const where = await whereFocusIsOnConfirm(seeded);
        expect.soft(where, `Tab press ${press + 1}`).not.toBe('elsewhere');
        if (where === 'confirm') {
          reachedConfirm = true;
          if (reachedHeader) backInConfirm = true;
        }
        if (where === 'header') reachedHeader = true;
      }
      expect.soft(reachedConfirm, 'Tab reaches the confirm').toBe(true);
      expect.soft(reachedHeader, 'Tab reaches the header').toBe(true);
      expect.soft(backInConfirm, 'and comes back to the confirm').toBe(true);

      // Esc cancels the confirm, and Analytics stays open.
      await seeded.keyboard.press('Escape');
      await expect.soft(confirm).toBeHidden();
      await expect
        .soft(seeded.getByRole('heading', { name: MENU_HEADINGS.Analytics }))
        .toBeVisible();
      await expect.soft(stars, 'Esc wipes nothing').toBeVisible();
    } finally {
      await context.close();
    }
  });
});
