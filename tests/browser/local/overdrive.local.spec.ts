import { expect, type Locator, type Page, test } from '@playwright/test';
import {
  closeButton,
  flightDeck,
  headerButton,
  hud,
  launchFreeFlight,
  pauseMenu,
} from '../helpers';
import { multiplierAt } from '../../shared/multiplier';
import { expectNoBannedNames, pauseButton } from '../journey-helpers';

// LOCAL ONLY (run by `pnpm verify`, not in CI; docs/agents/testing.md): a Streak of 30 and
// more, twice over, on the real clock, which CI's runner cannot afford. The DOM
// tests (tests/dom/flight-deck.test.tsx) cover the labels; this is the same
// climb through the real page and the real Action Deck.
//
// The Overdrive labels agree. While Overdrive is on, the HUD badge and the
// Action Deck's header badge both read "OVERDRIVE x{n}", where n is the
// Multiplier doubled by Overdrive. Outside Overdrive the HUD reads
// "x{Multiplier}" and the deck header has no Overdrive badge. And in real
// Overdrive, nothing the player can read says combo, hyperspace or warp.
//
// Only the labels are the subject (what each hit scores is the popups
// journey's business), so nothing here reads the score. The Run is played on
// the real clock with real key presses, a key at a time; each check waits for
// what the player would see.
//
// The old browser tests guarded two things: the Overdrive badges across the
// climb, and the glossary-name sweep over the Flight Deck, the Hangar and the
// Pause Menu in real Overdrive.

test.skip(
  Boolean(process.env.CI),
  'Local-only: pnpm verify runs it, CI does not',
);

/** An Overdrive badge, anywhere on the Flight Deck ("Overdrive Meter" is not one). */
const OVERDRIVE_BADGE = /^overdrive\s*x\d+$/i;

// Ten different letters, repeated: plenty for every Streak this file reaches
// (the Run is never finished), and "z" is never the next letter.
const TEXT = 'abcdefghij'.repeat(8);
const WRONG_KEY = 'z';

/** The HUD's Multiplier badge while Overdrive is off: "x1" to "x4". */
const hudMultiplier = (page: Page) => hud(page).getByText(/^x\d$/);

const hudBadge = (page: Page) => hud(page).getByText(OVERDRIVE_BADGE);

/** Both Overdrive badges on the Flight Deck: the HUD's and the deck header's. */
const overdriveBadges = (page: Page): Locator =>
  flightDeck(page).getByText(OVERDRIVE_BADGE);

/** A Run in progress: types the text a key at a time and follows the Streak. */
function followRun(page: Page) {
  let typed = 0;
  let streak = 0;

  return {
    get streak() {
      return streak;
    },
    /** Types the next right key and waits for the HUD to show the new Streak. */
    async hit() {
      await page.keyboard.press(TEXT[typed++]);
      streak += 1;
      await expect(hud(page)).toContainText(
        new RegExp(`Streak\\s*${streak}(?!\\d)`, 'i'),
      );
    },
    /** Types a wrong key. The Run has no shields, so the Streak is lost. */
    async miss() {
      await page.keyboard.press(WRONG_KEY);
      streak = 0;
      await expect(hud(page)).toContainText(/Streak\s*0(?!\d)/i);
    },
    /** Hits on until the HUD shows an Overdrive badge, or `limit` hits. */
    async hitUntilOverdrive(limit: number) {
      for (let tries = 0; tries < limit; tries++) {
        await this.hit();
        // The badge changes in the same render as the Streak just waited for.
        if ((await hudBadge(page).count()) > 0) return;
      }
      throw new Error(`No Overdrive after ${limit} hits (Streak ${streak})`);
    },
  };
}

async function expectPlain(page: Page, multiplier: number) {
  await expect(hudMultiplier(page)).toHaveText(`x${multiplier}`);
  await expect(overdriveBadges(page)).toHaveCount(0);
}

/** Both badges read "OVERDRIVE x{n}" for the Multiplier at this Streak. */
async function expectOverdrive(page: Page, streak: number) {
  const label = new RegExp(`^overdrive\\s*x${multiplierAt(streak) * 2}$`, 'i');
  await expect(overdriveBadges(page), `badges at Streak ${streak}`).toHaveText([
    label,
    label,
  ]);
  await expect(hudBadge(page), `HUD badge at Streak ${streak}`).toHaveText(
    label,
  );
  await expect(hudMultiplier(page)).toHaveCount(0);
}

test('the Streak climbs through every Multiplier into Overdrive, the badges agree at every step and through a Miss, and no screen says combo, hyperspace or warp', async ({
  page,
}) => {
  test.setTimeout(360_000);
  await launchFreeFlight(page, TEXT);
  const run = followRun(page);

  await test.step('outside Overdrive the HUD shows x{Multiplier} and the deck header has no Overdrive badge', async () => {
    await expectPlain(page, 1);
    while (run.streak < 9) await run.hit();
    await expectPlain(page, 1);

    await run.hit(); // Streak 10: Multiplier x2
    await expectPlain(page, 2);

    while (run.streak < 20) await run.hit();
    await expectPlain(page, 3); // Streak 20: Multiplier x3
  });

  await test.step('in Overdrive both badges read the Multiplier doubled, up to x4', async () => {
    // Fill the meter with a long Streak, then follow Overdrive up to x4.
    await run.hitUntilOverdrive(60);
    await expectOverdrive(page, run.streak);
    while (run.streak < 30) {
      await run.hit();
      await expectOverdrive(page, run.streak); // x3 doubled, then x4 doubled at 30
    }
  });

  await test.step('the Flight Deck in Overdrive shows an Overdrive label and uses the glossary names', async () => {
    await expect
      .soft(
        hud(page)
          .getByText(/Overdrive/i)
          .first(),
      )
      .toBeVisible();
    await expect.soft(hud(page).getByText(/^Streak$/i)).toBeVisible();
    await expectNoBannedNames(page, 'the Flight Deck in Overdrive');
  });

  await test.step('the Hangar opened from the Flight Deck uses the glossary names, and closes onto the Pause Menu, with Overdrive behind it', async () => {
    await headerButton(page, 'Hangar').click();
    await expect(
      page.getByRole('heading', { name: 'Starship Hangar Upgrades' }),
    ).toBeVisible();
    await expectNoBannedNames(page, 'the Hangar opened mid-Run');

    await closeButton(page).click();
    await expect(pauseMenu(page)).toBeVisible();
    await expectNoBannedNames(page, 'the Pause Menu, with Overdrive behind it');
  });

  await test.step('resumed, a Miss ends Overdrive and the Streak, and Overdrive comes back and carries through every step', async () => {
    await page.getByRole('button', { name: 'Resume Flight' }).click();
    await expect(pauseMenu(page)).toBeHidden();
    await expect(pauseButton(page)).toBeVisible();

    // A Miss ends Overdrive and the Streak, so the Multiplier is x1 again. The
    // meter is still most of the way full, so Overdrive comes back while the
    // Streak is still short of x2, and then carries through every step.
    await run.miss();
    await expectPlain(page, 1);

    await run.hitUntilOverdrive(20);
    expect(run.streak, 'Overdrive came back before Streak 10').toBeLessThan(10);
    await expectOverdrive(page, run.streak);

    while (run.streak < 31) {
      await run.hit();
      await expectOverdrive(page, run.streak); // x1, x2 at 10, x3 at 20, x4 at 30
    }
  });
});
