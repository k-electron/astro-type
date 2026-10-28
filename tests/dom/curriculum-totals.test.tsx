import { describe, expect, it } from 'vitest';
import { CURRICULUM_SECTORS } from '../../src/curriculum/curriculum';
import { RETURNING_PLAYER } from '../shared/saves';
import {
  viewGalaxyMap,
  WIPE_SECTORS_LINE,
  wipeStagesLine,
} from '../shared/screens';
import { renderGame, screen } from './harness';

// The totals the screens quote ("N Sectors", "of N Stars", "all N Stages")
// are what the curriculum adds up to, so a Sector or Stage added to the
// curriculum shows up in them without anyone editing a screen.

/** The most Stars one Stage can give (Stars run 0 to 3). */
const MOST_STARS_A_STAGE_GIVES = 3;

const sectors = CURRICULUM_SECTORS.length;
const stages = CURRICULUM_SECTORS.reduce(
  (count, sector) => count + sector.stages.length,
  0,
);
const mostStars = stages * MOST_STARS_A_STAGE_GIVES;

const onShow = () => document.body.textContent ?? '';

describe('the totals the screens quote', () => {
  it('Academy Home offers the Galaxy Map with the number of Sectors the curriculum has', () => {
    renderGame();

    expect(
      screen.getByRole('button', { name: viewGalaxyMap(sectors) }),
    ).toBeTruthy();
  });

  it('the Galaxy Map shows the Stars earned out of the most the curriculum can give', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.openHeader('Galaxy Map');

    expect(onShow()).toMatch(new RegExp(`5\\s*/\\s*${mostStars} Stars`));
  });

  it('the Wipe warning says how many Stages reset, and that the Sectors lock again', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.openHeader('Galaxy Map');
    player.click(/^Wipe Achievements/);

    expect(onShow()).toContain(wipeStagesLine(stages));
    expect(onShow()).toContain(WIPE_SECTORS_LINE);
  });
});
