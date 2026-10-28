import { describe, expect, it } from 'vitest';
import { CURRICULUM_SECTORS } from '../../src/curriculum/curriculum';
import { RETURNING_PLAYER } from '../shared/saves';
import { renderGame } from './harness';

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

    expect(onShow()).toContain(`${sectors} Sectors`);
  });

  it('the Galaxy Map shows the Stars earned out of the most the curriculum can give', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.openHeader('Sectors');

    expect(onShow()).toMatch(new RegExp(`5\\s*/\\s*${mostStars} Stars`));
  });

  it('the Wipe warning says how many Stages lose their Stars', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.openHeader('Sectors');
    player.click(/^Wipe Achievements/);

    expect(onShow()).toContain(`All ${stages} Stage`);
  });
});
