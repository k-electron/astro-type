import { cleanup } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FINGER_DISPLAY_NAMES } from '../../src/curriculum/curriculum';
import {
  NEWER_BACKUP_MESSAGE,
  NOT_A_BACKUP_MESSAGE,
} from '../../src/game/save';
import { SAVE_VERSION } from '../../src/game/schemas';
import { closeLabel } from '../../src/screens/closeLabel';
import { DISMISS_NOTICE_LABEL } from '../../src/screens/dismissLabel';
import {
  BEST_DAY_LABEL,
  DAYS_PLAYED_LABEL,
  NO_BEST_DAY,
  PRACTICE_TIME_LABEL,
  WORDS_TYPED_LABEL,
} from '../../src/screens/journeyLabels';
import {
  asCurrentSave,
  completeSave,
  keyStats,
  lifetimeTotals,
  RETURNING_PLAYER,
} from '../shared/saves';
import { renderGame, screen } from './harness';

// What Analytics tells the player about their keys: the hand balance, the
// reaches they struggle with, and the heatmap's keys. A character that needs
// Shift counts for the finger and the hand of the key it is typed on.

/** The text of the section whose heading is `heading`. */
const sectionText = (heading: RegExp) =>
  screen.getByText(heading).parentElement?.textContent ?? '';

/** The percentage on the hand balance's bar for this hand. */
const handAccuracy = (hand: 'Left' | 'Right') =>
  screen.getByText(new RegExp(`^${hand} Hand`)).parentElement?.textContent ??
  '';

describe('Analytics and the characters that need Shift', () => {
  // "!" is typed on the left pinky's "1", "B" on the left index's "b", "?" on
  // the right pinky's "/", and "(", "{" and '"' on the right hand's keys.
  const KEY_STATS = keyStats({
    '!': [3, 3],
    B: [1, 3],
    '?': [2, 2],
    '(': [4, 0],
    '{': [1, 0],
    '"': [1, 0],
  });

  it('names the finger of the key each struggling shifted character is typed on', () => {
    const player = renderGame({ profile: KEY_STATS });
    player.openHeader('Analytics');

    const reaches = sectionText(/Struggling Reaches/);
    expect(reaches).toMatch(
      new RegExp(`!\\s*${FINGER_DISPLAY_NAMES.LEFT_PINKY}`),
    );
    expect(reaches).toMatch(
      new RegExp(`B\\s*${FINGER_DISPLAY_NAMES.LEFT_INDEX}`),
    );
    expect(reaches).toMatch(
      new RegExp(`\\?\\s*${FINGER_DISPLAY_NAMES.RIGHT_PINKY}`),
    );
  });

  it('counts each shifted character for the hand that types its key', () => {
    const player = renderGame({ profile: KEY_STATS });
    player.openHeader('Analytics');

    // Left: "!" 3 of 6 and "B" 1 of 4 hit, 4 of 10. Right: 8 of 10.
    expect(handAccuracy('Left')).toContain('40%');
    expect(handAccuracy('Right')).toContain('80%');
  });

  it('shows a heatmap cell for every letter, number and punctuation key it shows today', () => {
    const player = renderGame({});
    player.openHeader('Analytics');

    // The keys as the heatmap draws them now: 1-0, Q-P, A-; and Z-. (a look
    // change to this list is the owner's call, not a refactor's).
    for (const key of [...'1234567890QWERTYUIOPASDFGHJKL;ZXCVBNM,.']) {
      const cell = screen.queryByTitle(
        new RegExp(`^${escapeForPattern(key)}: `),
      );
      expect(cell, `the heatmap has a cell for ${key}`).toBeTruthy();
    }
  });

  it('shows what was typed on a letter key on that key, rounded down', () => {
    // 48 of 49 is 97.96%, which reads 97% and not 98%.
    const player = renderGame({ profile: keyStats({ f: [48, 1] }) });
    player.openHeader('Analytics');

    expect(screen.getByTitle(/^F: 97%/)).toBeTruthy();
  });
});

describe('Analytics rounds accuracy down', () => {
  // A share is shown rounded down, so 66.67% reads 66% and never 67%, and a
  // result that is not perfect never reads 100%. A share that is whole shows
  // whole, even where the float maths of ratio * 100 would fall short of it
  // (0.57 * 100 is 56.99999999999999).

  it("shows a key's accuracy rounded down: 2 hits and 1 miss is 66%", () => {
    const player = renderGame({
      profile: keyStats({ f: [2, 1] }),
    });
    player.openHeader('Analytics');

    expect(screen.getByTitle(/^F: 66%/)).toBeTruthy();
  });

  it("shows a key's accuracy as the whole share it is: 57 hits and 43 misses is 57%", () => {
    const player = renderGame({
      profile: keyStats({ f: [57, 43] }),
    });
    player.openHeader('Analytics');

    expect(screen.getByTitle(/^F: 57%/)).toBeTruthy();
  });

  it('shows each hand rounded down: 2 hits and 1 miss on the left is 66%, 7 and 1 on the right is 87%', () => {
    const player = renderGame({
      profile: keyStats({ f: [2, 1], j: [7, 1] }),
    });
    player.openHeader('Analytics');

    expect(handAccuracy('Left')).toContain('66%');
    expect(handAccuracy('Right')).toContain('87%');
  });

  it('shows a hand as the whole share it is: 57 hits and 43 misses is 57%', () => {
    const player = renderGame({
      profile: keyStats({ f: [57, 43] }),
    });
    player.openHeader('Analytics');

    expect(handAccuracy('Left')).toContain('57%');
  });
});

describe('Analytics refusing a Backup', () => {
  it('says a newer Backup was made by a newer version, until the player dismisses it', async () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.openHeader('Analytics');
    expect(
      screen.queryByRole('button', { name: DISMISS_NOTICE_LABEL }),
    ).toBeNull();

    player.importBackup(
      JSON.stringify({ version: SAVE_VERSION + 1, totalCredits: 5 }),
    );

    expect((await screen.findByRole('alert')).textContent).toBe(
      NEWER_BACKUP_MESSAGE,
    );
    player.click(DISMISS_NOTICE_LABEL);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText(NEWER_BACKUP_MESSAGE)).toBeNull();
  });

  it('says a file that is not JSON is not a Backup', async () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.openHeader('Analytics');

    player.importBackup('this is not a Backup at all');

    expect((await screen.findByRole('alert')).textContent).toBe(
      NOT_A_BACKUP_MESSAGE,
    );
  });

  it('clears the message when a good Backup is imported after a refusal', async () => {
    const player = renderGame();
    player.openHeader('Analytics');
    player.importBackup('this is not a Backup at all');
    await screen.findByRole('alert');

    player.importBackup(JSON.stringify(asCurrentSave(RETURNING_PLAYER)));

    // The imported Profile is on show (5 Stars), so the import has finished.
    await screen.findByRole('button', { name: /^5\s*★$/ });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText(NOT_A_BACKUP_MESSAGE)).toBeNull();
  });

  it.each([
    ['Factory Reset', 'Confirm Reset'],
    ['Wipe Stars', 'Confirm Wipe'],
  ])(
    'forgets the message once the player confirms %s',
    async (open, confirm) => {
      const player = renderGame({ profile: RETURNING_PLAYER });
      player.openHeader('Analytics');
      player.importBackup('this is not a Backup at all');
      await screen.findByRole('alert');

      player.click(open);
      player.click(confirm);

      expect(screen.queryByRole('alert')).toBeNull();
    },
  );

  it('forgets the message when the player leaves Analytics and comes back', async () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.openHeader('Analytics');
    player.importBackup('this is not a Backup at all');
    await screen.findByRole('alert');

    player.click(closeLabel('academy-home'));
    player.openHeader('Analytics');

    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe("Analytics' totals row", () => {
  // The totals row replaced the lifetime cards (#155). The old Highest Speed
  // card's rounding guard (37.9 never reads 38) now guards the Best Day. The
  // old Lifetime Accuracy card is gone: accuracy is read from the last 8 weeks
  // now, in the key blocks, whose rounding tests above stay (a share rounds
  // down, and a Miss never leaves a key at 100%).
  const reading = (label: string) => sectionText(new RegExp(`^${label}`));

  it('shows the days played, practice time, words typed and best day of Runs cleared on two days', () => {
    // Two Free Flights of 10 characters, a day apart: 2 words each.
    const player = renderGame({ today: '2026-11-20' });
    player.launchFreeFlight('ff jj ff j');
    player.type('ff jj ff j');
    player.setToday('2026-11-22');
    player.launchFreeFlight('ff jj ff j');
    player.type('ff jj ff j');

    player.openHeader('Analytics');

    expect(reading(DAYS_PLAYED_LABEL)).toMatch(/2$/);
    expect(reading(WORDS_TYPED_LABEL)).toMatch(/4$/);
    // 10 keys at half a second each, twice: 10 s, under a minute.
    expect(reading(PRACTICE_TIME_LABEL)).toMatch(/0m$/);
    // Too few letters in a day for a best day.
    expect(reading(BEST_DAY_LABEL)).toContain(NO_BEST_DAY);
  });

  it('shows no days and no best day before any Run is cleared', () => {
    const player = renderGame();
    player.openHeader('Analytics');

    expect(reading(DAYS_PLAYED_LABEL)).toMatch(/0$/);
    expect(reading(BEST_DAY_LABEL)).toContain(NO_BEST_DAY);
  });

  it('keeps the totals through Wipe Stars and clears them with Factory Reset', () => {
    const { daysPlayed } = completeSave().logbook.lifetime;
    const player = renderGame({ profile: completeSave() });
    player.openHeader('Analytics');
    expect(daysPlayed).toBeGreaterThan(0);
    expect(reading(DAYS_PLAYED_LABEL)).toMatch(new RegExp(`${daysPlayed}$`));

    player.click('Wipe Stars');
    player.click('Confirm Wipe');
    expect(reading(DAYS_PLAYED_LABEL)).toMatch(new RegExp(`${daysPlayed}$`));

    player.click('Factory Reset');
    player.click('Confirm Reset');
    expect(reading(DAYS_PLAYED_LABEL)).toMatch(/0$/);
  });

  it('shows practice time in hours and minutes', () => {
    // 65 minutes of Run Time, in steps.
    const player = renderGame({
      profile: lifetimeTotals({ practiceSteps: 65 * 60 * 60 }),
    });
    player.openHeader('Analytics');

    expect(reading(PRACTICE_TIME_LABEL)).toMatch(/1h 5m$/);
  });

  it("shows the best day's speed rounded down, so a 37.9 WPM day never reads as 38", () => {
    const player = renderGame({
      profile: lifetimeTotals({
        bestDay: { day: '2026-11-02', letterWpm: 37.9 },
      }),
    });
    player.openHeader('Analytics');

    expect(reading(BEST_DAY_LABEL)).toMatch(/37\s*WPM/);
    expect(reading(BEST_DAY_LABEL)).not.toMatch(/38/);
  });
});

describe("Analytics' key blocks read the last 8 weeks of Runs", () => {
  it('show how the keys of Runs just cleared went: a Miss on f is 50% for f', () => {
    const player = renderGame({ text: 'ff' });
    player.press('x');
    player.type('ff');

    player.openHeader('Analytics');

    expect(screen.getByTitle(/^F: 50%/)).toBeTruthy();
  });

  it('forget a Run from 56 days before, but keep it at 55', () => {
    // `keyStats` logs its Run on the test day, 2026-11-23: 55 days on is 2027-01-17.
    const logged = keyStats({ f: [48, 1] });

    const kept = renderGame({ profile: logged, today: '2027-01-17' });
    kept.openHeader('Analytics');
    expect(screen.getByTitle(/^F: 97%/)).toBeTruthy();
    cleanup();

    const faded = renderGame({ profile: logged, today: '2027-01-18' });
    faded.openHeader('Analytics');
    expect(screen.getByTitle(/^F: Not tested yet/)).toBeTruthy();
  });
});

function escapeForPattern(text: string): string {
  return text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}
