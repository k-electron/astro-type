import { expect, type Page, test } from '@playwright/test';
import { flightDeck, hud, launchFreeFlight } from './helpers';

// Round 2, Stream C (#35 item 9): the Overdrive numbers agree. While Overdrive
// is active the HUD badge and the Action Deck's header badge both read
// "OVERDRIVE x{n}", where n is what each hit is multiplied by: the Multiplier
// times Overdrive's doubling. Outside Overdrive the HUD reads "x{Multiplier}"
// and the deck header shows no Overdrive badge.
//
// The page's clock is stopped, so no Drone moves: every hit gets the same
// Judgement, and the score a hit adds, divided by the first hit's score (x1,
// no Overdrive), is the factor that hit was multiplied by. The Streak in the
// HUD is the barrier after each key (it updates with the score).

/** An Overdrive badge, anywhere on the Flight Deck ("Overdrive Meter" is not one). */
const OVERDRIVE_BADGE = /^overdrive\s*x\d+$/i;

// Ten different letters, repeated: enough for every Streak this file reaches
// (the Run is never finished) and never the wrong key used for the Miss.
const TEXT = 'abcdefghij'.repeat(8);
const WRONG_KEY = 'z';

async function launchOnStoppedClock(page: Page) {
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
  await launchFreeFlight(page, TEXT);
}

/** A Run in progress: types the text a key at a time and follows the Streak. */
function followRun(page: Page) {
  let typed = 0;
  let streak = 0;

  async function score(): Promise<number> {
    const text = (await hud(page).textContent()) ?? '';
    const found = /Score\s*([\d,]+)/i.exec(text);
    if (!found) throw new Error(`No Score in the HUD: ${text}`);
    return Number(found[1].replaceAll(',', ''));
  }

  return {
    get streak() {
      return streak;
    },
    score,
    /** Types the next right key; resolves to the score that hit added. */
    async hit(): Promise<number> {
      const before = await score();
      await page.keyboard.press(TEXT[typed++]);
      streak += 1;
      await expect(hud(page)).toContainText(
        new RegExp(`Streak\\s*${streak}(?!\\d)`, 'i'),
      );
      return (await score()) - before;
    },
    /** Types a wrong key. The Run has no shields, so the Streak is lost. */
    async miss() {
      await page.keyboard.press(WRONG_KEY);
      streak = 0;
      await expect(hud(page)).toContainText(/Streak\s*0(?!\d)/i);
    },
  };
}

/** The HUD's Multiplier badge while Overdrive is off: "x1" to "x4". */
const hudMultiplier = (page: Page) => hud(page).getByText(/^x\d$/);

const overdriveBadgesOnDeck = (page: Page) =>
  flightDeck(page).getByText(OVERDRIVE_BADGE);

async function expectNoOverdrive(page: Page, multiplier: number) {
  await expect(hudMultiplier(page)).toHaveText(`x${multiplier}`);
  await expect(overdriveBadgesOnDeck(page)).toHaveCount(0);
}

/**
 * Both badges are showing and read "OVERDRIVE x{factor}". The HUD's badge is
 * one of the two matches on the Flight Deck, so the other is the deck header's.
 */
async function expectBadges(page: Page, factor: number, when: string) {
  const expected = `OVERDRIVE X${factor}`;
  const shout = (texts: string[]) => texts.map((t) => t.trim().toUpperCase());
  await expect(overdriveBadgesOnDeck(page)).toHaveCount(2);
  expect
    .soft(
      shout(await hud(page).getByText(OVERDRIVE_BADGE).allTextContents()),
      `HUD badge ${when}`,
    )
    .toEqual([expected]);
  expect
    .soft(
      shout(await overdriveBadgesOnDeck(page).allTextContents()),
      `HUD and deck header badges ${when}`,
    )
    .toEqual([expected, expected]);
}

test('outside Overdrive the HUD shows x{Multiplier} and the deck header has no Overdrive badge', async ({
  page,
}) => {
  await launchOnStoppedClock(page);
  const run = followRun(page);

  await expectNoOverdrive(page, 1);
  for (let streak = 1; streak <= 9; streak++) await run.hit();
  await expectNoOverdrive(page, 1);

  await run.hit(); // Streak 10: Multiplier x2
  await expectNoOverdrive(page, 2);

  for (let streak = 11; streak <= 20; streak++) await run.hit();
  await expectNoOverdrive(page, 3); // Streak 20: Multiplier x3
});

test('in Overdrive both badges read Multiplier x 2, the number each hit is multiplied by, at every Multiplier step', async ({
  page,
}) => {
  await launchOnStoppedClock(page);
  const run = followRun(page);

  // The base: a hit at Multiplier x1 with Overdrive off.
  const base = await run.hit();
  expect(base).toBeGreaterThan(0);

  // Overdrive starts on the 29th hit, at Multiplier x3. That hit is scored
  // without the doubling; the badges already read the doubled Multiplier.
  while (run.streak < 28) await run.hit();
  await expectNoOverdrive(page, 3);
  await run.hit();
  await expectBadges(page, 6, 'at Streak 29');

  // The next hit is Multiplier x4 and doubled.
  const atThirty = await run.hit();
  expect.soft(atThirty / base, 'factor of the hit at Streak 30').toBe(8);
  await expectBadges(page, 8, 'at Streak 30');

  // A Miss ends Overdrive and the Streak, so the Multiplier starts again at
  // x1 with the meter still three quarters full: Overdrive comes back at a
  // Streak of about 8, and carries through every Multiplier step from x1.
  await run.miss();
  await expectNoOverdrive(page, 1);

  let comeBackAt = 0;
  for (let tries = 0; tries < 20 && comeBackAt === 0; tries++) {
    await run.hit();
    // The HUD changes in the same render as the Streak just waited for.
    if ((await hud(page).getByText(OVERDRIVE_BADGE).count()) > 0) {
      comeBackAt = run.streak;
    }
  }
  expect(comeBackAt, 'Overdrive came back after the Miss').toBeGreaterThan(0);
  // The Streak is still short of x2, so Overdrive is seen at Multiplier x1.
  expect(comeBackAt).toBeLessThan(10);
  // That hit turned Overdrive on, so it is scored without the doubling.
  await expectBadges(page, 2, `at Streak ${comeBackAt}`);

  // Every hit from here on: the badges agree with each other and with how
  // many times the hit's base points it scored.
  const factorsSeen = new Set<number>();
  while (run.streak < 31) {
    const added = await run.hit();
    const factor = added / base;
    factorsSeen.add(factor);
    await expectBadges(page, factor, `at Streak ${run.streak}`);
  }
  // x1, x2, x3 and x4 all came up, doubled: 2, 4, 6 and 8.
  expect([...factorsSeen].sort((a, b) => a - b)).toEqual([2, 4, 6, 8]);
});
