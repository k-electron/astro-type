import { expect, type Page, test } from '@playwright/test';
import {
  debrief,
  flightDeck,
  hud,
  launchFreeFlight,
  menuHeading,
  openMenu,
  pauseMenu,
  promptProgress,
  typeText,
} from './helpers';

// Esc and focus loss. Esc pauses a running Run, resumes it from the Pause Menu
// and goes "back" on any other menu (where a screen has no Close, it does
// nothing). Losing the window's focus, or the tab being hidden, pauses a
// running Run. Enter and Space never resume.
//
// The texts have no spaces: after a click, a focused button could take Space.

const resumeButton = (page: Page) =>
  page.getByRole('button', { name: 'Resume Flight' });

/** Free Flight "abcdef", three characters in: 50%, Streak 3, nothing missed. */
async function halfwayThroughARun(page: Page) {
  await launchFreeFlight(page, 'abcdef');
  await typeText(page, 'abc');
  await expect(promptProgress(page)).toHaveText('50%');
  await expect(flightDeck(page)).toContainText(/Streak\s*3(?!\d)/i);
}

/** The Debrief of a two-character Free Flight. */
async function toDebrief(page: Page) {
  await launchFreeFlight(page, 'ab');
  await typeText(page, 'ab');
  await expect(page.getByText(/Mission Debriefing/)).toBeVisible();
}

// A real tab switch does not reach a headless Chromium page (focus is
// emulated, so no blur or visibilitychange ever fires), so these send the
// events the browser itself fires when the player switches away and back.

/** The window loses focus, as when the player clicks into another window. */
async function windowLosesFocus(page: Page) {
  await page.evaluate(() => {
    window.dispatchEvent(new Event('blur'));
  });
}

/** The window is focused again. */
async function windowRegainsFocus(page: Page) {
  await page.evaluate(() => {
    window.dispatchEvent(new Event('focus'));
  });
}

/** The tab is hidden, as when the player switches to another tab. */
async function tabGetsHidden(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => true,
    });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

/** The player comes back to the tab. */
async function tabGetsShown(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => false,
    });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

/** The Run is paused, with the Run as the player left it behind the menu. */
async function expectPausedWithStreakKept(page: Page) {
  await expect(pauseMenu(page)).toBeVisible();
  await expect(flightDeck(page)).toContainText(/Streak\s*3(?!\d)/i);
  await expect(promptProgress(page)).toHaveText('50%');
}

/** Resuming carries on from the same character, with the Streak going on. */
async function resumeAndCarryOn(page: Page) {
  await resumeButton(page).click();
  await expect(pauseMenu(page)).toBeHidden();
  await expect(promptProgress(page)).toHaveText('50%');
  await page.keyboard.press('d');
  await expect(promptProgress(page)).toHaveText('67%');
  await expect(flightDeck(page)).toContainText(/Streak\s*4(?!\d)/i);
}

test.describe('Esc', () => {
  test('Esc pauses a running Run, and Esc on the Pause Menu resumes it from the same character', async ({
    page,
  }) => {
    await halfwayThroughARun(page);

    await page.keyboard.press('Escape');
    await expectPausedWithStreakKept(page);

    await page.keyboard.press('Escape');
    await expect(pauseMenu(page)).toBeHidden();
    // Same place as before the pause: not restarted, not skipped ahead.
    await expect(promptProgress(page)).toHaveText('50%');

    // The next key is still "d", and the Run plays on to its Debrief.
    await page.keyboard.press('d');
    await expect(promptProgress(page)).toHaveText('67%');
    await typeText(page, 'ef');
    await expect(page.getByText(/Mission Debriefing/)).toBeVisible();
  });

  test('Esc is not a Miss: pausing and resuming with it keeps the Streak and Accuracy', async ({
    page,
  }) => {
    await halfwayThroughARun(page);
    await expect(flightDeck(page)).toContainText(/Accuracy\s*100%/i);

    await page.keyboard.press('Escape');
    await expect(pauseMenu(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(pauseMenu(page)).toBeHidden();

    await expect(flightDeck(page)).toContainText(/Streak\s*3(?!\d)/i);
    await expect(flightDeck(page)).toContainText(/Accuracy\s*100%/i);
    // The next right key makes the Streak 4, not 1.
    await page.keyboard.press('d');
    await expect(flightDeck(page)).toContainText(/Streak\s*4(?!\d)/i);
    await expect(flightDeck(page)).toContainText(/Accuracy\s*100%/i);
  });

  test('holding Esc down pauses once, and does not flick back and forth', async ({
    page,
  }) => {
    await halfwayThroughARun(page);

    // The second and third presses of a held key are auto-repeat.
    await page.keyboard.down('Escape');
    await page.keyboard.down('Escape');
    await page.keyboard.down('Escape');
    await page.keyboard.up('Escape');

    await expectPausedWithStreakKept(page);
  });

  test('Esc on a menu opened from the Flight Deck goes back to the Pause Menu', async ({
    page,
  }) => {
    await halfwayThroughARun(page);

    for (const menu of ['Galaxy Map', 'Hangar', 'Analytics'] as const) {
      await openMenu(page, menu);
      await page.keyboard.press('Escape');
      await expect(menuHeading(page, menu)).toBeHidden();
      await expectPausedWithStreakKept(page);
      // Back on the Pause Menu, Esc resumes; the next menu pauses it again.
      await page.keyboard.press('Escape');
      await expect(pauseMenu(page)).toBeHidden();
      await expect(promptProgress(page)).toHaveText('50%');
    }

    await page.keyboard.press('d');
    await expect(promptProgress(page)).toHaveText('67%');
  });

  test('Esc on a menu opened from the Pause Menu goes back to the Pause Menu', async ({
    page,
  }) => {
    await halfwayThroughARun(page);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(pauseMenu(page)).toBeVisible();

    await openMenu(page, 'Galaxy Map');
    await page.keyboard.press('Escape');

    await expect(menuHeading(page, 'Galaxy Map')).toBeHidden();
    await expectPausedWithStreakKept(page);

    // Still a pause: Esc on it resumes, from the same character.
    await resumeAndCarryOn(page);
  });

  test('Esc unwinds a chain of menus one step at a time', async ({ page }) => {
    await halfwayThroughARun(page);

    // Flight Deck > Galaxy Map > Hangar
    await openMenu(page, 'Galaxy Map');
    await page.getByRole('button', { name: 'Hangar Upgrades' }).click();
    await expect(menuHeading(page, 'Hangar')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(menuHeading(page, 'Galaxy Map')).toBeVisible();
    await expect(menuHeading(page, 'Hangar')).toBeHidden();

    await page.keyboard.press('Escape');
    await expect(menuHeading(page, 'Galaxy Map')).toBeHidden();
    await expectPausedWithStreakKept(page);

    await page.keyboard.press('Escape');
    await expect(pauseMenu(page)).toBeHidden();
    await expect(promptProgress(page)).toHaveText('50%');
  });

  test('Esc on a menu opened from the Debrief goes back to the Debrief', async ({
    page,
  }) => {
    await toDebrief(page);

    await openMenu(page, 'Hangar');
    await page.keyboard.press('Escape');

    await expect(menuHeading(page, 'Hangar')).toBeHidden();
    await expect(
      debrief(page).getByRole('heading', {
        name: 'Free Flight Drill',
        level: 2,
      }),
    ).toBeVisible();
    await expect(pauseMenu(page)).toBeHidden();
  });

  test('Esc on a menu opened from Academy Home goes back to Academy Home', async ({
    page,
  }) => {
    await page.goto('/');
    const begin = page.getByRole('button', { name: /begin home row mission/i });
    await expect(begin).toBeVisible();

    await openMenu(page, 'Analytics');
    await page.keyboard.press('Escape');

    await expect(menuHeading(page, 'Analytics')).toBeHidden();
    await expect(begin).toBeVisible();
  });

  test('Esc does nothing on Academy Home', async ({ page }) => {
    await page.goto('/');
    const begin = page.getByRole('button', { name: /begin home row mission/i });
    await expect(begin).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(begin).toBeVisible();
    await expect(pauseMenu(page)).toBeHidden();
    // Nothing was broken by it: the Stage still starts.
    await begin.click();
    await expect(
      page.getByRole('button', { name: 'Pause', exact: true }),
    ).toBeVisible();
    await expect(pauseMenu(page)).toBeHidden();
  });

  test('Esc does nothing on the Debrief', async ({ page }) => {
    await toDebrief(page);
    const heading = debrief(page).getByRole('heading', {
      name: 'Free Flight Drill',
      level: 2,
    });
    await expect(heading).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(heading).toBeVisible();
    await expect(pauseMenu(page)).toBeHidden();
    // Replay still starts the Stage afresh.
    await page.getByRole('button', { name: 'Replay' }).click();
    await expect(
      page.getByRole('button', { name: 'Pause', exact: true }),
    ).toBeVisible();
    await expect(promptProgress(page)).toHaveText('0%');
  });
});

test.describe('Losing focus', () => {
  test('the Run is paused, with its Streak, when the window loses focus', async ({
    page,
  }) => {
    await halfwayThroughARun(page);

    await windowLosesFocus(page);
    await windowRegainsFocus(page);

    // On return the player finds the Pause Menu, and the Run as they left it.
    await expectPausedWithStreakKept(page);
    await expect(hud(page)).toContainText(/Accuracy\s*100%/i);
    await resumeAndCarryOn(page);
  });

  test('the Run is paused, with its Streak, when the tab is hidden', async ({
    page,
  }) => {
    await halfwayThroughARun(page);

    await tabGetsHidden(page);
    await tabGetsShown(page);

    await expectPausedWithStreakKept(page);
    await expect(hud(page)).toContainText(/Accuracy\s*100%/i);
    await resumeAndCarryOn(page);
  });

  test('a pause from losing focus is a pause: Esc on it resumes from the same character', async ({
    page,
  }) => {
    await halfwayThroughARun(page);

    await windowLosesFocus(page);
    await expectPausedWithStreakKept(page);

    await page.keyboard.press('Escape');
    await expect(pauseMenu(page)).toBeHidden();
    await expect(promptProgress(page)).toHaveText('50%');
  });

  test('losing focus where there is no running Run changes nothing', async ({
    page,
  }) => {
    // Academy Home
    await page.goto('/');
    const begin = page.getByRole('button', { name: /begin home row mission/i });
    await expect(begin).toBeVisible();
    await windowLosesFocus(page);
    await tabGetsHidden(page);
    await tabGetsShown(page);
    await expect(begin).toBeVisible();
    await expect(pauseMenu(page)).toBeHidden();

    // The Debrief
    await toDebrief(page);
    await windowLosesFocus(page);
    await tabGetsHidden(page);
    await tabGetsShown(page);
    await expect(
      debrief(page).getByRole('heading', {
        name: 'Free Flight Drill',
        level: 2,
      }),
    ).toBeVisible();
    await expect(pauseMenu(page)).toBeHidden();
  });

  test('losing focus on a paused Run leaves it paused, still on the same character', async ({
    page,
  }) => {
    await halfwayThroughARun(page);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(pauseMenu(page)).toBeVisible();

    await windowLosesFocus(page);
    await tabGetsHidden(page);
    await tabGetsShown(page);

    await expectPausedWithStreakKept(page);
    await resumeAndCarryOn(page);
  });
});

test.describe('Enter and Space never resume', () => {
  test('Enter and Space on the Pause Menu leave the Run paused', async ({
    page,
  }) => {
    await halfwayThroughARun(page);
    await page.keyboard.press('Escape');
    await expectPausedWithStreakKept(page);

    await page.keyboard.press('Enter');
    await expectPausedWithStreakKept(page);
    await page.keyboard.press('Space');
    await expectPausedWithStreakKept(page);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    await expectPausedWithStreakKept(page);

    // Neither one counted as a Miss, and the Run carries on when asked.
    await expect(hud(page)).toContainText(/Accuracy\s*100%/i);
    await resumeAndCarryOn(page);
  });

  test('Enter and Space on a Pause Menu opened with the Pause button leave the Run paused', async ({
    page,
  }) => {
    await halfwayThroughARun(page);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expectPausedWithStreakKept(page);

    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');

    await expectPausedWithStreakKept(page);
    await resumeAndCarryOn(page);
  });

  test('Enter and Space on the Pause Menu after losing focus leave the Run paused', async ({
    page,
  }) => {
    await halfwayThroughARun(page);
    await windowLosesFocus(page);
    await expectPausedWithStreakKept(page);

    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');

    await expectPausedWithStreakKept(page);
    await resumeAndCarryOn(page);
  });

  test('typing after a focus-loss pause neither resumes the Run nor counts', async ({
    page,
  }) => {
    await halfwayThroughARun(page);
    await windowLosesFocus(page);
    await expectPausedWithStreakKept(page);

    // The player comes back and carries on typing: the next right key, then a
    // wrong one. The Run is paused, so neither is a hit or a Miss.
    await page.keyboard.press('d');
    await page.keyboard.press('z');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');

    await expectPausedWithStreakKept(page);
    await expect(hud(page)).toContainText(/Accuracy\s*100%/i);

    // On resuming, the next character is still "d", and the Streak goes on
    // from 3: the keys typed during the pause were not counted.
    await resumeAndCarryOn(page);
    await expect(hud(page)).toContainText(/Accuracy\s*100%/i);
  });
});
