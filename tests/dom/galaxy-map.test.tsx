import { fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  CURRICULUM_SECTORS,
  FIRST_STAGE,
} from '../../src/curriculum/curriculum';
import { clearedStages } from '../shared/saves';
import {
  DEBRIEF_TITLE,
  GALAXY_MAP,
  MENU_HEADINGS,
  NEXT_STAGE,
  PAUSE_FLIGHT,
  PAUSE_MENU_NAME,
  viewGalaxyMap,
} from '../shared/screens';
import { type Player, renderGame, screen, within } from './harness';

// Where the Galaxy Map starts: on the furthest Sector the player has unlocked,
// whichever way they come in (#96). A player reads the selected Sector as the
// map's one level-3 heading, its name; the list of Sectors writes the names as
// plain text, and the Stage cards use level-4 headings.

const MOST_STARS_A_STAGE_GIVES = 3;

const [SECTOR_ONE, SECTOR_TWO, SECTOR_THREE, SECTOR_FOUR] = CURRICULUM_SECTORS;

/**
 * A Save with exactly `total` Stars, from Stages cleared in curriculum order
 * with the most Stars each, leaving out `skip` so a test can clear it itself.
 */
function saveWithStars(total: number, skip?: string) {
  const stars: Record<string, number> = {};
  let left = total;
  for (const stage of CURRICULUM_SECTORS.flatMap((sector) => sector.stages)) {
    if (left === 0) break;
    if (stage.id === skip) continue;
    stars[stage.id] = Math.min(MOST_STARS_A_STAGE_GIVES, left);
    left -= stars[stage.id];
  }
  return clearedStages(stars);
}

/** Stars that open Sector 03 and not Sector 04. */
const UNLOCKS_SECTOR_THREE = SECTOR_THREE.requiredStarsToUnlock;
const SECTOR_THREE_PLAYER = saveWithStars(UNLOCKS_SECTOR_THREE);

/**
 * The name of the Sector the Galaxy Map has selected: its one level-3
 * heading. Scoped to the map, since a Pause Menu can be open behind it.
 */
function selectedSector(): string | null {
  const map = screen.getByRole('dialog', { name: MENU_HEADINGS['Galaxy Map'] });
  return within(map).getByRole('heading', { level: 3 }).textContent;
}

/** The card the Debrief shows over the Flight Deck. */
function debriefCard(): HTMLElement {
  return screen.getByRole('dialog', { name: DEBRIEF_TITLE });
}

/** The Debrief's own Galaxy Map button (the header has one of that name too). */
function clickDebriefGalaxyMap() {
  fireEvent.click(
    within(debriefCard()).getByRole('button', { name: GALAXY_MAP }),
  );
}

/** Clear the first Stage, whose Stars the Save already holds or not. */
function clearFirstStage(player: Player) {
  player.startStage(FIRST_STAGE.id);
  player.typePrompt();
  expect(screen.getByText(DEBRIEF_TITLE)).toBeTruthy();
}

describe('the Galaxy Map starts on the furthest unlocked Sector', () => {
  const WAYS_IN: { from: string; open: (player: Player) => void }[] = [
    {
      from: "the header's Galaxy Map",
      open: (player) => player.openHeader('Galaxy Map'),
    },
    {
      from: "the header's Stars button",
      open: (player) =>
        player.clickHeader(new RegExp(`^${UNLOCKS_SECTOR_THREE}\\s*★$`)),
    },
    {
      from: 'Academy Home',
      open: (player) => player.click(viewGalaxyMap(CURRICULUM_SECTORS.length)),
    },
    {
      from: 'the Pause Menu',
      open: (player) => {
        player.startStage(FIRST_STAGE.id);
        player.clickHeader(PAUSE_FLIGHT);
        expect(
          screen.getByRole('dialog', { name: PAUSE_MENU_NAME }),
        ).toBeTruthy();
        // The Pause Menu's own button; the source doesn't export its name.
        player.click('View Galaxy Map');
      },
    },
    {
      from: "a Debrief's Galaxy Map button",
      open: (player) => {
        clearFirstStage(player);
        clickDebriefGalaxyMap();
      },
    },
    {
      // Clearing the last Stage of Sector 03 leaves Sector 04 locked, so the
      // Debrief's Galaxy Map button takes the place of Next Stage.
      from: "a Debrief's Galaxy Map button in place of Next Stage",
      open: (player) => {
        player.startStage(
          SECTOR_THREE.stages[SECTOR_THREE.stages.length - 1].id,
        );
        player.typePrompt();
        expect(screen.queryByRole('button', { name: NEXT_STAGE })).toBeNull();
        clickDebriefGalaxyMap();
      },
    },
  ];

  it.each(WAYS_IN)('opened from $from, it shows Sector 03', ({ open }) => {
    // Sector 03 is the furthest the Save opens: Sector 04 is still locked.
    expect(UNLOCKS_SECTOR_THREE).toBeLessThan(
      SECTOR_FOUR.requiredStarsToUnlock,
    );
    const player = renderGame({ profile: SECTOR_THREE_PLAYER });

    open(player);

    expect(selectedSector()).toBe(SECTOR_THREE.name);
  });

  it('shows Sector 01 to a fresh Profile', () => {
    const player = renderGame();

    player.openHeader('Galaxy Map');

    expect(selectedSector()).toBe(SECTOR_ONE.name);
  });

  it('shows the Sector a clear has just unlocked, from the Debrief', () => {
    // One Star short of Sector 02, with Stage 1 still to clear: its Stars
    // take the fleet over the gate.
    const gate = SECTOR_TWO.requiredStarsToUnlock;
    const player = renderGame({
      profile: saveWithStars(gate - 1, FIRST_STAGE.id),
    });
    // The clear can't jump past Sector 02.
    expect(SECTOR_THREE.requiredStarsToUnlock).toBeGreaterThan(
      gate - 1 + MOST_STARS_A_STAGE_GIVES,
    );

    clearFirstStage(player);
    expect(screen.getByText(/New Sector Unlocked/)).toBeTruthy();
    clickDebriefGalaxyMap();

    expect(selectedSector()).toBe(SECTOR_TWO.name);
  });

  it('shows the Sector just finished when the next one is still locked', () => {
    // A fresh Profile clears the last Stage of Sector 01 with too few Stars
    // for Sector 02, so Sector 01 is where the missing Stars are.
    const player = renderGame();
    player.startStage(SECTOR_ONE.stages[SECTOR_ONE.stages.length - 1].id);
    player.typePrompt();
    expect(screen.queryByText(/New Sector Unlocked/)).toBeNull();

    clickDebriefGalaxyMap();

    expect(selectedSector()).toBe(SECTOR_ONE.name);
  });

  it('still selects the Sector the player clicks in the list', () => {
    const player = renderGame({ profile: SECTOR_THREE_PLAYER });
    player.openHeader('Galaxy Map');

    player.click(new RegExp(SECTOR_TWO.name));

    expect(selectedSector()).toBe(SECTOR_TWO.name);
  });
});
