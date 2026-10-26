import { describe, expect, it } from 'vitest';
import { type Player, renderGame, screen } from './harness';
import { clearedStages, RETURNING_PLAYER } from './saves';

const NOTICE =
  "Your saved progress couldn't be read, so you're starting fresh.";
const REFUSAL =
  "That file isn't a Backup this game can read, so your progress was left as it was.";

const stars = (count: number) =>
  screen.getByRole('button', { name: new RegExp(`^${count}\\s*★$`) });
const credits = (text: string) =>
  screen.getByRole('button', { name: new RegExp(`^${text}\\s*Cr$`) });

/** What the Galaxy Map's first Sector says about its Stars, like "5/12". */
function sectorOneStars(player: Player): string {
  player.openHeader('Sectors');
  const text = screen.getByRole('button', { name: /Sector 01/ }).textContent;
  player.click('Back to Academy');
  return text ?? '';
}

describe('a returning player', () => {
  it('sees their Stars and Credits in the header, and their Stars on the Galaxy Map', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });

    expect(stars(5)).toBeTruthy();
    expect(credits('1,234')).toBeTruthy();
    expect(screen.queryByText(NOTICE)).toBeNull();
    expect(sectorOneStars(player)).toContain('5/12');
  });

  it('cannot unlock a Sector with a Save that claims more Stars than the Stages earned', () => {
    const player = renderGame({
      profile: { ...RETURNING_PLAYER, totalStars: 40 },
    });

    expect(stars(5)).toBeTruthy();
    player.openHeader('Sectors');
    // Sector 02 needs 6 Stars; the Save's claim of 40 does not count.
    expect(
      screen.getByRole('button', { name: /Sector 02.*Needs 6★/ }),
    ).toBeTruthy();
  });

  it('keeps what a Save with missing fields has, and plays on defaults', () => {
    // This Save has no Credits and none of the sound settings.
    const { totalCredits: _credits, ...gappy } = RETURNING_PLAYER;
    const player = renderGame({ profile: gappy });

    expect(stars(5)).toBeTruthy();
    expect(credits('0')).toBeTruthy();
    expect(screen.queryByText(NOTICE)).toBeNull();
    // Audio is not muted by default, so the header offers to mute it.
    expect(screen.getByRole('button', { name: 'Mute All Audio' })).toBeTruthy();
    player.click('Start Mission');
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
  });

  it('is told when the player had muted all audio', () => {
    renderGame({ profile: { ...RETURNING_PLAYER, globalMuted: true } });

    expect(
      screen.getByRole('button', { name: 'Unmute All Audio' }),
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

    expect(screen.getByText(NOTICE)).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: /AstroType/, level: 1 }),
    ).toBeTruthy();
    expect(stars(0)).toBeTruthy();
    expect(credits('0')).toBeTruthy();
    // The game still works from a fresh start.
    player.click('Begin Home Row Mission');
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
  });
});

describe('Import Backup and Factory Reset', () => {
  /** A Backup exported before versions existed: no `version` at all. */
  const OLD_EXPORT = {
    totalCredits: 491,
    totalStars: 3,
    totalKeystrokes: 77,
    stagesProgress: clearedStages({ 's1-l1': 3 }).stagesProgress,
    soundEnabled: true,
    globalMuted: false,
  };

  it('replaces the Profile with an old Backup that has no version', async () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.openHeader('Analytics');

    player.importBackup(JSON.stringify(OLD_EXPORT));

    expect(await screen.findByRole('button', { name: /^3\s*★$/ })).toBeTruthy();
    expect(credits('491')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    player.click('Back to Academy');
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
    player.click('Back to Academy');
    expect(sectorOneStars(player)).toContain('5/12');
  });

  it('refuses a file with no Profile in it with the exact message', async () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.openHeader('Analytics');

    player.importBackup('{"foo":1,"hello":"world"}');

    expect((await screen.findByRole('alert')).textContent).toBe(REFUSAL);
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
    player.click('Back to Academy');
    expect(sectorOneStars(player)).toContain('5/12');
  });
});
