import { describe, expect, it } from 'vitest';
import { FINGER_DISPLAY_NAMES } from '../../src/curriculum/curriculum';
import {
  NEWER_BACKUP_MESSAGE,
  NOT_A_BACKUP_MESSAGE,
} from '../../src/game/save';
import { closeLabel } from '../../src/screens/closeLabel';
import { DISMISS_NOTICE_LABEL } from '../../src/screens/dismissLabel';
import { RETURNING_PLAYER } from '../shared/saves';
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
  const KEY_ANALYTICS = {
    '!': { hits: 3, misses: 3 },
    B: { hits: 1, misses: 3 },
    '?': { hits: 2, misses: 2 },
    '(': { hits: 4, misses: 0 },
    '{': { hits: 1, misses: 0 },
    '"': { hits: 1, misses: 0 },
  };

  it('names the finger of the key each struggling shifted character is typed on', () => {
    const player = renderGame({ profile: { keyAnalytics: KEY_ANALYTICS } });
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
    const player = renderGame({ profile: { keyAnalytics: KEY_ANALYTICS } });
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

  it('shows what was typed on a letter key on that key', () => {
    const player = renderGame({
      profile: { keyAnalytics: { f: { hits: 48, misses: 1 } } },
    });
    player.openHeader('Analytics');

    expect(screen.getByTitle(/^F: 98%/)).toBeTruthy();
  });
});

describe('Analytics refusing a Backup', () => {
  it('says a newer Backup was made by a newer version, until the player dismisses it', async () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.openHeader('Analytics');
    expect(
      screen.queryByRole('button', { name: DISMISS_NOTICE_LABEL }),
    ).toBeNull();

    player.importBackup(JSON.stringify({ version: 2, totalCredits: 5 }));

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

    player.importBackup(JSON.stringify({ version: 1, ...RETURNING_PLAYER }));

    // The imported Profile is on show (5 Stars), so the import has finished.
    await screen.findByRole('button', { name: /^5\s*★$/ });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText(NOT_A_BACKUP_MESSAGE)).toBeNull();
  });

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

function escapeForPattern(text: string): string {
  return text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}
