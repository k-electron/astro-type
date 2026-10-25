import { expect, type Page, test } from '@playwright/test';
import { drone, hud, labelled, launchFreeFlight } from './helpers';

// Round 2 (#35): the Action Deck's popup for a Perfect hit during Overdrive
// shows the points that hit really scored, "OVERDRIVE STRIKE! +{points}", and
// not a fixed number. A Perfect hit is worth 100, times the Multiplier, times 2
// for Overdrive: +200, +400, +600 or +800 at x1, x2, x3 and x4. A hit counts
// the Streak it makes, so the hit that makes Streak 10 is already worth x2.
//
// THE SEAM THIS TEST NEEDS (it does not exist yet): the popup is text drawn in
// the canvas, and the page offers no way to read it. The deck's accessibility
// layer must name the popup while it is on screen, with its whole text as the
// accessible name (title or aria-label), the way it already names Drones and
// keycaps: "⚡ OVERDRIVE STRIKE! +600". This test finds it with `labelled`, and
// takes the leading bolt as optional. Until the layer names the popup, the first
// check of each step fails ("no OVERDRIVE STRIKE popup at all"); once it does,
// the second check fails on the number while the popup is still hard-coded.
//
// A real clock and real key presses throughout. The press that is checked
// comes after the lead Drone has settled at the Strike Line, which is what
// makes it a Perfect. The hit's score in the HUD is checked too, so a hit that
// was not a clean Perfect in Overdrive fails there and not on the popup.

// Ten different letters, repeated: enough for both climbs below (the Run is
// never finished), and "z" is never the next letter.
const TEXT = 'abcdefghij'.repeat(8);
const WRONG_KEY = 'z';

test.use({ viewport: { width: 1280, height: 1100 } });
test.setTimeout(180_000);

/** The Multiplier a Streak has earned: x1, then x2 at 10, x3 at 20, x4 at 30. */
const multiplierAt = (streak: number) =>
  Math.min(4, 1 + Math.floor(streak / 10));

/** An Overdrive badge on the HUD: "OVERDRIVE x6". Group 1 is the 6. */
const BADGE = /^overdrive\s*x(\d+)$/i;

/** The deck's popup for a Perfect hit in Overdrive, any number. */
const ANY_STRIKE = /^\W*overdrive strike!\s*\+\d+$/i;

const strikeWorth = (page: Page, points: number) =>
  labelled(page, new RegExp(`^\\W*overdrive strike!\\s*\\+${points}$`, 'i'));

/** The badge's number while Overdrive is on, or null. */
async function badgeNumber(page: Page): Promise<number | null> {
  const badge = hud(page).getByText(BADGE);
  if ((await badge.count()) === 0) return null;
  const text = ((await badge.first().textContent()) ?? '').trim();
  const match = BADGE.exec(text);
  return match ? Number(match[1]) : null;
}

async function hudScore(page: Page): Promise<number> {
  const text = (await hud(page).textContent()) ?? '';
  const match = /score\s*([\d,]+)/i.exec(text);
  if (!match) throw new Error(`No score in the HUD: ${text}`);
  return Number(match[1].replaceAll(',', ''));
}

/** A Run in progress: types the text a key at a time. */
function followRun(page: Page) {
  let typed = 0;
  let streak = 0;
  const next = () => TEXT[typed % 10];

  async function hit() {
    await page.keyboard.press(next());
    typed += 1;
    streak += 1;
    await expect(hud(page)).toContainText(
      new RegExp(`Streak\\s*${streak}(?!\\d)`, 'i'),
    );
  }

  /** Waits until the lead Drone has stopped moving: at the Strike Line. */
  async function settle() {
    const lead = drone(page, next()).first();
    let last = Number.NaN;
    let still = 0;
    await expect(async () => {
      const box = await lead.boundingBox({ timeout: 500 });
      const bottom = box ? box.y + box.height : -1;
      still = bottom === last ? still + 1 : 0;
      last = bottom;
      expect(still).toBeGreaterThanOrEqual(5);
    }).toPass({ timeout: 15_000, intervals: [100] });
  }

  /**
   * Types a Perfect hit and checks the popup it raises says what that hit is
   * worth. The hit counts the Streak it makes, so the hit that makes Streak
   * 10 is already a x2 hit (and 20 a x3, 30 a x4).
   */
  async function strike(step: string) {
    await settle();
    expect(await badgeNumber(page), `${step}: Overdrive is on`).not.toBeNull();
    const points = 100 * 2 * multiplierAt(streak + 1);

    const scoreBefore = await hudScore(page);
    await page.keyboard.press(next());
    typed += 1;
    streak += 1;
    await expect(hud(page)).toContainText(
      new RegExp(`Streak\\s*${streak}(?!\\d)`, 'i'),
    );
    // The hit itself scored what the rules say: if this fails, the hit was
    // not a clean Perfect (or the rules moved), and the popup is not the
    // question.
    await expect
      .poll(() => hudScore(page), { message: `${step}: score of the hit` })
      .toBe(scoreBefore + points);

    // A popup from an earlier hit may still be fading, so the number is
    // checked for being on screen, not for being the only popup.
    await expect
      .soft(
        labelled(page, ANY_STRIKE).first(),
        `${step}: an "OVERDRIVE STRIKE! +n" popup is named on the deck`,
      )
      .toBeVisible({ timeout: 2000 });
    await expect
      .soft(
        strikeWorth(page, points).first(),
        `${step}: the popup reads +${points}`,
      )
      .toBeVisible({ timeout: 2000 });
  }

  return {
    hit,
    strike,
    get streak() {
      return streak;
    },
    badge: () => badgeNumber(page),
    async miss() {
      await page.keyboard.press(WRONG_KEY);
      streak = 0;
      await expect(hud(page)).toContainText(/Streak\s*0(?!\d)/i);
    },
    /** Hits on, quickly, until the badge shows Overdrive at this number. */
    async hitUntilBadge(wanted: (n: number) => boolean, limit: number) {
      for (let tries = 0; tries < limit; tries++) {
        const n = await badgeNumber(page);
        if (n !== null && wanted(n)) return n;
        await hit();
      }
      throw new Error(`No matching Overdrive badge in ${limit} hits`);
    },
  };
}

test('a Perfect hit in Overdrive raises a popup with the points it scored, at every Multiplier', async ({
  page,
}) => {
  await launchFreeFlight(page, TEXT);
  const run = followRun(page);

  // A long Streak fills the Overdrive meter. A Miss then ends the Streak and
  // Overdrive, but the meter is still most of the way full, so Overdrive comes
  // back while the Multiplier is x1 and carries through every step.
  await run.hitUntilBadge(() => true, 60);
  await run.miss();
  await run.hitUntilBadge(() => true, 20);
  expect(run.streak, 'Overdrive came back before Streak 10').toBeLessThan(10);

  // One Perfect hit under each Multiplier, as soon as the Streak reaches it:
  // the first hit back in Overdrive (x1), then the hits making Streak 10, 20
  // and 30.
  const probed = new Set<number>();
  while (run.streak < 31) {
    const multiplier = multiplierAt(run.streak + 1);
    if (probed.has(multiplier)) {
      await run.hit();
    } else {
      probed.add(multiplier);
      await run.strike(`x${multiplier} (+${200 * multiplier})`);
    }
  }
  expect([...probed].sort()).toEqual([1, 2, 3, 4]);
});
