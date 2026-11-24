import { describe, expect, it } from 'vitest';
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
  lifetimeTotals,
  RETURNING_PLAYER,
} from '../shared/saves';
import { renderGame, screen } from './harness';

// Analytics' Backup refusals and totals row. The keys are in
// analytics-keyboard.test.tsx.

/** The text of the section whose heading is `heading`. */
const sectionText = (heading: RegExp) =>
  screen.getByText(heading).parentElement?.textContent ?? '';

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
  // now, on the keyboard, whose rounding tests are in
  // analytics-keyboard.test.tsx (a share rounds down).
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
