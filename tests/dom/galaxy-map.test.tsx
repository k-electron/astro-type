import { fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  CURRICULUM_SECTORS,
  FIRST_STAGE,
} from '../../src/curriculum/curriculum';
import {
  starBarEarnedLabel,
  starBarLabel,
} from '../../src/screens/starBarLabels';
import { saveWithStars, stageProgress } from '../shared/saves';
import {
  DEBRIEF_TITLE,
  GALAXY_MAP,
  MENU_HEADINGS,
  NEXT_STAGE,
  PAUSE_FLIGHT,
  PAUSE_MENU_NAME,
  STAR_BARS_LIST,
  viewGalaxyMap,
  NEW_SECTOR_UNLOCKED,
} from '../shared/screens';
import { barsOf } from '../shared/starBars';
import {
  debriefCard,
  type Player,
  renderGame,
  screen,
  stageCard,
  within,
} from './harness';

// Where the Galaxy Map starts: on the furthest Sector the player has unlocked,
// whichever way they come in (#96). A player reads the selected Sector as the
// map's one level-3 heading, its name; the list of Sectors writes the names as
// plain text, and the Stage cards use level-4 headings.

const MOST_STARS_A_STAGE_GIVES = 3;

const [SECTOR_ONE, SECTOR_TWO, SECTOR_THREE, SECTOR_FOUR] = CURRICULUM_SECTORS;

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
    expect(screen.getByText(NEW_SECTOR_UNLOCKED)).toBeTruthy();
    clickDebriefGalaxyMap();

    expect(selectedSector()).toBe(SECTOR_TWO.name);
  });

  it('shows the Sector just finished when the next one is still locked', () => {
    // A fresh Profile clears the last Stage of Sector 01 with too few Stars
    // for Sector 02, so Sector 01 is where the missing Stars are.
    const player = renderGame();
    player.startStage(SECTOR_ONE.stages[SECTOR_ONE.stages.length - 1].id);
    player.typePrompt();
    expect(screen.queryByText(NEW_SECTOR_UNLOCKED)).toBeNull();

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

describe("a Stage's best accuracy", () => {
  it('is shown rounded down, so a 96.55% best never reads as 97%', () => {
    const player = renderGame({
      profile: {
        stagesProgress: {
          [FIRST_STAGE.id]: stageProgress(FIRST_STAGE.id, 2, {
            bestAccuracy: 96.55,
          }),
        },
      },
    });

    player.openHeader('Galaxy Map');

    const map = screen.getByRole('dialog', {
      name: MENU_HEADINGS['Galaxy Map'],
    });
    expect(map.textContent).toMatch(/Acc:\s*96%/);
  });
});

describe("a Stage's best WPM", () => {
  it('is shown rounded down, so a 37.9 best never reads as 38 WPM', () => {
    const player = renderGame({
      profile: {
        stagesProgress: {
          [FIRST_STAGE.id]: stageProgress(FIRST_STAGE.id, 2, {
            bestWpm: 37.9,
          }),
        },
      },
    });

    player.openHeader('Galaxy Map');

    const map = screen.getByRole('dialog', {
      name: MENU_HEADINGS['Galaxy Map'],
    });
    expect(map.textContent).toMatch(/\b37\s*WPM/);
    expect(map.textContent).not.toMatch(/\b38\s*WPM/);
  });
});

describe("a Stage's Star bars on its card", () => {
  /** The words on the three bars of a Stage's card, in order. */
  function barsOnCard(title: string): (string | null)[] {
    const list = within(stageCard(title)).getByRole('list', {
      name: STAR_BARS_LIST,
    });
    return within(list)
      .getAllByRole('listitem')
      .map((item) => item.textContent);
  }

  it("shows every Stage of the Sector its three bars, with the Stage's own WPM bars and none lit before it is cleared", () => {
    const player = renderGame();
    player.openHeader('Galaxy Map');

    for (const stage of SECTOR_ONE.stages) {
      const bars = barsOf(stage);
      expect(barsOnCard(stage.title), stage.id).toEqual(bars.map(starBarLabel));
      for (const bar of bars) {
        expect(
          within(stageCard(stage.title)).queryByLabelText(
            starBarEarnedLabel(bar),
          ),
          `${stage.id} bar ${bar.star}`,
        ).toBeNull();
      }
    }
  });

  it.each([0, 1, 2, 3])(
    'lights the bars a best result of %i Stars has met, and only those',
    (stars) => {
      const [stage, other] = SECTOR_ONE.stages;
      const player = renderGame({
        profile: {
          stagesProgress: { [stage.id]: stageProgress(stage.id, stars) },
        },
      });
      player.openHeader('Galaxy Map');

      for (const bar of barsOf(stage)) {
        const lit = within(stageCard(stage.title)).queryByLabelText(
          starBarEarnedLabel(bar),
        );
        expect(lit !== null, `bar ${bar.star}`).toBe(bar.star <= stars);
      }
      // Lit by this Stage's own best result: the next Stage, never cleared, has none.
      for (const bar of barsOf(other)) {
        expect(
          within(stageCard(other.title)).queryByLabelText(
            starBarEarnedLabel(bar),
          ),
        ).toBeNull();
      }
    },
  );

  it('keeps the same words on a bar when it is lit', () => {
    const stage = FIRST_STAGE;
    const player = renderGame({
      profile: {
        stagesProgress: { [stage.id]: stageProgress(stage.id, 2) },
      },
    });
    player.openHeader('Galaxy Map');

    expect(barsOnCard(stage.title)).toEqual(barsOf(stage).map(starBarLabel));
  });
});
