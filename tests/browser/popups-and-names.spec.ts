import { expect, type Page, test } from '@playwright/test';
import { hud, labelled } from './helpers';
import {
  expectNoBannedNames,
  expectStreak,
  hudScore,
  launchOnStoppedClock,
  typeKeys,
  waitForDeck,
} from './journey-helpers';

// J4: the hit popups the Action Deck names, and a sweep of the glossary names
// over what only a browser sees: the Action Deck's labels and the page title.
// (The names on each React screen are checked in tests/dom/names.test.tsx.)
// Both need the deck in a state that is slow to reach on a
// real clock (Streak 10, then Overdrive), so the page's clock stands still: no
// time passes while keys are typed, every Drone is where the Run seeded it, far
// above the Strike Line, and any key is a Good. The clock moves only when the
// journey asks for frames, because the deck's popups are drawn on them.

// Ten different letters, repeated: no letter twice among the Drones on screen,
// and "z" is never the next letter.
const TEXT = 'abcdefghij'.repeat(4);

test.use({ viewport: { width: 1280, height: 1100 } });
test.setTimeout(120_000);

/** An Overdrive badge on the HUD: "OVERDRIVE x8". */
const BADGE = /^overdrive\s*x(\d+)$/i;

/**
 * Gives the deck frames until it names a popup ending "+<points>" (a popup is
 * named only while it is drawn, and it is drawn on frames).
 */
async function popupNamed(page: Page, points: number) {
  const popup = labelled(page, new RegExp(`\\+${points}\\s*$`)).first();
  await expect(async () => {
    await page.clock.runFor(50);
    await expect(popup).toBeVisible({ timeout: 250 });
  }).toPass({ timeout: 20_000 });
}

test('hit popups name the points a hit scored, and the deck labels use the glossary names', async ({
  page,
}) => {
  await launchOnStoppedClock(page, TEXT);
  await waitForDeck(page, TEXT[0]);
  const badge = hud(page).getByText(BADGE);
  let typed = 0;

  await test.step('the hit that makes Streak 10 is a Good at x2: the HUD scores +100 and the deck names a +100 popup', async () => {
    // Nine quick hits with no time passing are nine Goods.
    await typeKeys(page, TEXT.slice(0, 9));
    typed = 9;
    await expect.poll(() => hudScore(page)).toBe(450);

    await page.keyboard.press(TEXT[typed]);
    typed += 1;
    await expectStreak(page, typed);
    await expect.poll(() => hudScore(page)).toBe(550);

    await popupNamed(page, 100);
  });

  await test.step('hits go on until Overdrive is lit', async () => {
    // The 29th hit lights it, whatever the hits are rated.
    while ((await badge.count()) === 0) {
      expect(typed, 'Overdrive is lit within 40 hits').toBeLessThan(40);
      await page.keyboard.press(TEXT[typed]);
      typed += 1;
      await expectStreak(page, typed);
    }
    await expect(badge).toBeVisible();
  });

  await test.step('in Overdrive the popup names what the hit scored: base x Multiplier x 2', async () => {
    const before = await hudScore(page);
    await page.keyboard.press(TEXT[typed]);
    typed += 1;
    await expectStreak(page, typed);
    await expect.poll(() => hudScore(page)).toBeGreaterThan(before);
    const gained = (await hudScore(page)) - before;

    // Streak 30 is x4, doubled by Overdrive: Good 50, Great 75 or Perfect 100.
    expect(
      [400, 600, 800],
      'a Good, Great or Perfect at x4, doubled',
    ).toContain(gained);
    await popupNamed(page, gained);
  });

  await test.step('the Flight Deck in Overdrive, popups included, uses the glossary names', async () => {
    const lines = await expectNoBannedNames(page, 'the Flight Deck');
    // The sweep reads the deck's labels: a popup is among them.
    expect.soft(lines.some((line) => /\+\d+$/.test(line))).toBe(true);
    await expect.soft(hud(page).getByText(/^Streak$/i)).toBeVisible();
  });
});
