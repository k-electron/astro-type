import { expect, type Page, test } from '@playwright/test';
import { hud, labelled } from './helpers';
import {
  expectNoBannedNames,
  expectStreak,
  hudScore,
  launchOnStoppedClock,
  waitForDeck,
} from './journey-helpers';

// J4: the hit popups and banners the Action Deck names, and a sweep of the
// glossary names over what only a browser sees: the Action Deck's labels and
// the page title. (The names on each React screen are checked in
// tests/dom/names.test.tsx.) Both need the deck in a state that is slow to
// reach on a real clock (Streak 10, then Overdrive), so the page's clock stands
// still: no time passes while keys are typed and every Drone is where the Run
// seeded them, far above the Strike Line. A hit scores the same wherever its
// Drone is (#137), so that costs nothing. The clock moves only when the journey
// asks for frames, because the deck's popups are drawn on them.

// Five-character words with no character twice among the Drones on screen,
// each followed by a space. Nothing here presses a wrong key, so every word is
// clean. The 30th hit is the space after the fifth word: it finishes a word at
// Streak 30. (No "x" or "z": they are the keys a Miss presses.)
const TEXT = 'abcde fghij klmno pqrst uvwy1 abcde';

test.use({ viewport: { width: 1280, height: 1100 } });
test.setTimeout(120_000);

/** An Overdrive badge on the HUD: "OVERDRIVE x8". */
const BADGE = /^overdrive\s*x(\d+)$/i;

/**
 * Gives the deck frames until it names something matching `name` (a popup or a
 * banner is named only while it is drawn, and it is drawn on frames). The deck
 * spells the gap between a label's parts with two spaces: match it with `\s+`.
 */
async function shownOnDeck(page: Page, name: RegExp) {
  const shown = labelled(page, name).first();
  await expect(async () => {
    await page.clock.runFor(50);
    await expect(shown).toBeVisible({ timeout: 250 });
  }).toPass({ timeout: 20_000 });
}

test('hit popups name what a hit scored, a clean word and a milestone are announced, and the deck labels use the glossary names', async ({
  page,
}) => {
  await launchOnStoppedClock(page, TEXT);
  await waitForDeck(page, TEXT[0]);
  const badge = hud(page).getByText(BADGE);
  let typed = 0;

  /** Press the next key of the text, and wait for the Streak to say it counted. */
  const hitNext = async () => {
    const key = TEXT[typed];
    await page.keyboard.press(key === ' ' ? 'Space' : key);
    typed += 1;
    await expectStreak(page, typed);
  };

  await test.step('a word typed without a Miss is a clean word: the HUD scores 100 a hit and 50 a character, and the deck names CLEAN +250', async () => {
    // "abcde" and its space: six hits at x1, and a bonus of 5 x 50.
    for (let key = 0; key < 6; key++) await hitNext();
    await expect.poll(() => hudScore(page)).toBe(6 * 100 + 5 * 50);

    await shownOnDeck(page, /^CLEAN\s+\+250$/);
    // The first clean words of a Run are announced by a banner with the word.
    await shownOnDeck(page, /CLEAN\s+abcde/);
    // The popup and the banner are on show: neither says a grade (BANNED_NAME).
    await expectNoBannedNames(page, 'the deck with a clean word on show');
  });

  await test.step('the hit that makes Streak 10 is at x2: the HUD scores +200, the deck names a popup for it and a banner for the milestone', async () => {
    for (let key = 0; key < 4; key++) await hitNext();
    expect(typed).toBe(10);
    // Six hits and their bonus, then three at x1 and the tenth at x2.
    await expect.poll(() => hudScore(page)).toBe(850 + 3 * 100 + 200);

    await shownOnDeck(page, /\+200\s*$/);
    await shownOnDeck(page, /x2 MULTIPLIER — STREAK 10/);
  });

  await test.step('hits go on until Overdrive is lit', async () => {
    // The 29th hit lights it.
    while ((await badge.count()) === 0) {
      expect(typed, 'Overdrive is lit within 40 hits').toBeLessThan(40);
      await hitNext();
    }
    await expect(badge).toBeVisible();
    expect(typed).toBe(29);
  });

  await test.step('in Overdrive a word finished at Streak 30 pays 100 x 4 x 2 and 50 a character x 4 x 2, and the deck names the bonus and the milestone', async () => {
    const before = await hudScore(page);
    await hitNext(); // the space after "uvwy1"
    expect(typed).toBe(30);
    await expect
      .poll(() => hudScore(page))
      .toBe(before + 100 * 4 * 2 + 50 * 5 * 4 * 2);

    await shownOnDeck(page, /^CLEAN\s+\+2000$/);
    await shownOnDeck(page, /x4 MULTIPLIER — STREAK 30/);
  });

  await test.step('in Overdrive a letter hit names what it scored: 100 x Multiplier x 2', async () => {
    const before = await hudScore(page);
    await hitNext();
    await expect.poll(() => hudScore(page)).toBeGreaterThan(before);
    const gained = (await hudScore(page)) - before;

    expect(gained, 'a letter at x4, doubled').toBe(800);
    await shownOnDeck(page, /x4\s+\+800\s*$/);
  });

  await test.step('the Flight Deck in Overdrive, popups included, uses the glossary names', async () => {
    const lines = await expectNoBannedNames(page, 'the Flight Deck');
    // The sweep reads the deck's labels: a popup is among them.
    expect.soft(lines.some((line) => /\+\d+$/.test(line))).toBe(true);
    await expect.soft(hud(page).getByText(/^Streak$/i)).toBeVisible();
  });
});
