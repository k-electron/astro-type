import { describe, expect, it } from 'vitest';
import {
  REFUSED_BACKUP_MESSAGE,
  UNREADABLE_SAVE_NOTICE,
} from '../../src/game/save';
import { BEGIN_HOME_ROW, START_STAGE } from '../shared/screens';
import { type Player, renderGame, screen } from './harness';
import { OLD_LIVE_EXPORT, RETURNING_PLAYER } from '../shared/saves';
import { muteAllLabel } from '../../src/screens/audioLabels';
import { closeLabel } from '../../src/screens/closeLabel';

const stars = (count: number) =>
  screen.getByRole('button', { name: new RegExp(`^${count}\\s*★$`) });
const credits = (text: string) =>
  screen.getByRole('button', { name: new RegExp(`^${text}\\s*Cr$`) });

/** What the Galaxy Map's first Sector says about its Stars, like "5/12". */
function sectorOneStars(player: Player): string {
  player.openHeader('Galaxy Map');
  const text = screen.getByRole('button', { name: /Sector 01/ }).textContent;
  player.click(closeLabel('academy-home'));
  return text ?? '';
}

describe('a returning player', () => {
  it('sees their Stars and Credits in the header, and their Stars on the Galaxy Map', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });

    expect(stars(5)).toBeTruthy();
    expect(credits('1,234')).toBeTruthy();
    expect(screen.queryByText(UNREADABLE_SAVE_NOTICE)).toBeNull();
    expect(sectorOneStars(player)).toContain('5/12');
  });

  it('cannot unlock a Sector with a Save that claims more Stars than the Stages earned', () => {
    const player = renderGame({
      profile: { ...RETURNING_PLAYER, totalStars: 40 },
    });

    expect(stars(5)).toBeTruthy();
    player.openHeader('Galaxy Map');
    // Sector 02 needs 6 Stars; the Save's claim of 40 does not count.
    expect(
      screen.getByRole('button', { name: /Sector 02.*Needs 6★/ }),
    ).toBeTruthy();
  });

  it('still shows the Stars the Stages earned after a reload, when the Save claimed more', () => {
    const player = renderGame({
      profile: { ...RETURNING_PLAYER, totalStars: 40 },
    });
    // Muting makes the game write the Save back; the reload reads that Save.
    player.click(muteAllLabel(false));
    player.reload();

    expect(
      screen.getByRole('button', { name: muteAllLabel(true) }),
    ).toBeTruthy();
    expect(stars(5)).toBeTruthy();
  });

  it('keeps what a Save with missing fields has, and plays on defaults', () => {
    // This Save has no Credits and none of the sound settings.
    const { totalCredits: _credits, ...gappy } = RETURNING_PLAYER;
    const player = renderGame({ profile: gappy });

    expect(stars(5)).toBeTruthy();
    expect(credits('0')).toBeTruthy();
    expect(screen.queryByText(UNREADABLE_SAVE_NOTICE)).toBeNull();
    // Audio is not muted by default, so the header offers to mute it.
    expect(
      screen.getByRole('button', { name: muteAllLabel(false) }),
    ).toBeTruthy();
    player.click(START_STAGE);
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
  });

  it('is told when the player had muted all audio', () => {
    renderGame({ profile: { ...RETURNING_PLAYER, globalMuted: true } });

    expect(
      screen.getByRole('button', { name: muteAllLabel(true) }),
    ).toBeTruthy();
  });
});

describe('a first visit and a Save that cannot be read', () => {
  it('starts fresh without a notice when there is no Save', () => {
    renderGame();

    expect(stars(0)).toBeTruthy();
    expect(credits('0')).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('starts fresh with a notice when the Save is not one the game can read', () => {
    const player = renderGame({
      profile: { ...RETURNING_PLAYER, totalCredits: 'lots' },
    });

    expect(screen.getByText(UNREADABLE_SAVE_NOTICE)).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: /AstroType/, level: 1 }),
    ).toBeTruthy();
    expect(stars(0)).toBeTruthy();
    expect(credits('0')).toBeTruthy();
    // The game still works from a fresh start.
    player.click(BEGIN_HOME_ROW);
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
  });
});

describe('Import Backup and Factory Reset', () => {
  it('replaces the Profile with an old Backup that has no version', async () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.openHeader('Analytics');

    player.importBackup(JSON.stringify(OLD_LIVE_EXPORT));

    expect(await screen.findByRole('button', { name: /^3\s*★$/ })).toBeTruthy();
    expect(credits('491')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    player.click(closeLabel('academy-home'));
    expect(sectorOneStars(player)).toContain('3/12');
  });

  it('shows the Stars the Stages earned when an old Backup claims a different total', async () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.openHeader('Analytics');

    player.importBackup(JSON.stringify({ ...OLD_LIVE_EXPORT, totalStars: 99 }));

    expect(await screen.findByRole('button', { name: /^3\s*★$/ })).toBeTruthy();
    player.click(closeLabel('academy-home'));
    expect(sectorOneStars(player)).toContain('3/12');
  });

  it('refuses a file that is not a Backup, with a message, and changes nothing', async () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.openHeader('Analytics');
    expect(screen.queryByRole('alert')).toBeNull();

    player.importBackup('this is not a Backup at all');

    expect((await screen.findByRole('alert')).textContent).toMatch(/\S/);
    expect(stars(5)).toBeTruthy();
    expect(credits('1,234')).toBeTruthy();
    player.click(closeLabel('academy-home'));
    expect(sectorOneStars(player)).toContain('5/12');
  });

  it('refuses a file with no Profile in it with the exact message', async () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.openHeader('Analytics');

    player.importBackup('{}');

    expect((await screen.findByRole('alert')).textContent).toBe(
      REFUSED_BACKUP_MESSAGE,
    );
    expect(stars(5)).toBeTruthy();
    expect(credits('1,234')).toBeTruthy();
  });

  it('wipes everything on Factory Reset, and a Backup brings it back', async () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.openHeader('Analytics');

    player.click('Factory Reset');
    player.click('Confirm Reset');

    expect(stars(0)).toBeTruthy();
    expect(credits('0')).toBeTruthy();

    player.importBackup(JSON.stringify({ version: 1, ...RETURNING_PLAYER }));

    expect(await screen.findByRole('button', { name: /^5\s*★$/ })).toBeTruthy();
    expect(credits('1,234')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    player.click(closeLabel('academy-home'));
    expect(sectorOneStars(player)).toContain('5/12');
  });
});
