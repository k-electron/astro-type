import { describe, expect, it } from 'vitest';
import { CURRICULUM_SECTORS } from '../../src/data/curriculum';
import { RETURNING_PLAYER } from '../shared/saves';
import { DEBRIEF_TITLE, MENU_HEADINGS } from '../shared/screens';
import { type Player, renderGame, screen } from './harness';

// Wiping the Stars asks first. profile.test.tsx guards Factory Reset
// (confirming); this guards the two Wipe buttons, which clear the Stars and
// Stage records and keep the Credits, and Cancel on Factory Reset.

const stars = (count: number) =>
  screen.getByRole('button', { name: new RegExp(`^${count}\\s*★$`) });
const credits = (text: string) =>
  screen.getByRole('button', { name: new RegExp(`^${text}\\s*Cr$`) });
const confirmButton = (name: string) => screen.queryByRole('button', { name });

/** What the Galaxy Map's first Sector says about its Stars, like "5/12". */
function sectorOneStars(player: Player): string {
  player.openHeader('Sectors');
  return screen.getByRole('button', { name: /Sector 01/ }).textContent ?? '';
}

const [FIRST_STAGE, SECOND_STAGE] = CURRICULUM_SECTORS[0].stages;
const onShow = () => screen.getByRole('main').textContent ?? '';

const WIPES = [
  {
    where: 'the Galaxy Map',
    menu: 'Sectors',
    button: /^Wipe Achievements/,
  },
  { where: 'Analytics', menu: 'Analytics', button: 'Wipe Stars' },
] as const;

describe.each(WIPES)('Wipe on $where', ({ menu, button }) => {
  it('asks first, and Cancel leaves the Stars and the Stage records as they were', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.openHeader(menu);
    expect(confirmButton('Confirm Wipe')).toBeNull();

    player.click(button);
    expect(confirmButton('Confirm Wipe')).not.toBeNull();
    // Nothing is wiped by asking.
    expect(stars(5)).toBeTruthy();
    player.click('Cancel');

    expect(confirmButton('Confirm Wipe')).toBeNull();
    expect(
      screen.getByRole('heading', { name: MENU_HEADINGS[menu] }),
    ).toBeTruthy();
    expect(stars(5)).toBeTruthy();
    expect(credits('1,234')).toBeTruthy();
    player.click(/^Back to /);
    expect(sectorOneStars(player)).toContain('5/12');
  });

  it('Confirm Wipe clears the Stars and Stage records, keeps the Credits and the screen, and holds after a reload', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.openHeader(menu);

    player.click(button);
    player.click('Confirm Wipe');

    expect(confirmButton('Confirm Wipe')).toBeNull();
    expect(
      screen.getByRole('heading', { name: MENU_HEADINGS[menu] }),
    ).toBeTruthy();
    expect(stars(0)).toBeTruthy();
    expect(credits('1,234')).toBeTruthy();

    player.reload();

    expect(stars(0)).toBeTruthy();
    expect(credits('1,234')).toBeTruthy();
    expect(sectorOneStars(player)).toContain('0/12');
  });

  it('with no Run on show, sends Start Mission back to the first Stage', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.startStage(SECOND_STAGE.id);
    player.click('Pause');
    player.click('Exit to Academy Home');
    player.openHeader(menu);

    player.click(button);
    player.click('Confirm Wipe');
    player.click(/^Back to /);
    player.click('Start Mission');

    expect(onShow()).toContain(FIRST_STAGE.title);
  });

  it('over a Debrief, leaves the Debrief and the Stage it was for', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.startStage(SECOND_STAGE.id);
    player.typePrompt();
    player.openHeader(menu);

    player.click(button);
    player.click('Confirm Wipe');
    player.click(/^Back to /);
    expect(screen.getByText(DEBRIEF_TITLE)).toBeTruthy();
    player.click('Replay');

    expect(onShow()).toContain(SECOND_STAGE.title);
  });

  it('over a paused Run, clears the Stars and leaves the Run to resume where it was', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.click('Start Mission');
    player.typePrompt({ characters: 3 });
    const progress = () =>
      screen.getByRole('progressbar', { name: 'Progress' }).textContent;
    const reached = progress();
    expect(reached).not.toBe('0%');
    player.openHeader(menu);

    player.click(button);
    player.click('Confirm Wipe');
    expect(stars(0)).toBeTruthy();
    player.click(/^Back to /);
    player.click('Resume Flight');

    expect(progress()).toBe(reached);
    expect(stars(0)).toBeTruthy();
  });
});

describe('Cancel on Factory Reset', () => {
  it('leaves the Save as it was', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.openHeader('Analytics');

    player.click('Factory Reset');
    expect(
      screen.queryByRole('button', { name: 'Confirm Reset' }),
    ).not.toBeNull();
    player.click('Cancel');

    expect(screen.queryByRole('button', { name: 'Confirm Reset' })).toBeNull();
    expect(stars(5)).toBeTruthy();
    expect(credits('1,234')).toBeTruthy();
    expect(sectorOneStars(player)).toContain('5/12');
  });
});
