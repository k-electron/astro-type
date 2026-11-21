import { describe, expect, it } from 'vitest';
import { clearedStages, saveWithStars } from '../../tests/shared/saves';
import {
  clearStage,
  newGame,
  SAMPLE_TEXT,
  STAGE_ID,
  startFreeFlight,
  startStage,
  typeText,
} from '../../tests/shared/testHelpers';

/**
 * The Debrief says "New Sector Unlocked!" only when the Run just cleared is
 * what opened a Sector (decided in #35). Sectors open on the fleet's total
 * Stars: Sector 02 needs 6, and Sectors 03 to 07 need 14, 24, 32, 40 and 48
 * (#134: no gate asks for more than 2 Stars per Stage before it). Only a Sector Stage's Stars count; a Free Flight
 * earns none (#86), so it can never open one.
 */

/** Clear Stage 1 in a minute, no Misses: 3 Stars. */
function clearStage1(save?: Record<string, unknown>) {
  const game = newGame(save);
  startStage(game, STAGE_ID);
  clearStage(game, { seconds: 60 });
  return game;
}

function clearFreeFlight(save?: Record<string, unknown>) {
  const game = newGame(save);
  startFreeFlight(game, 'ab');
  typeText(game, 'ab');
  return game;
}

describe('the Sector unlock notice in the Debrief', () => {
  it('shows when the Run just cleared took the fleet to 6 Stars', () => {
    // 3 Stars so far: clearing Stage 1 for 3 Stars takes the fleet to 6.
    const game = clearStage1(clearedStages({ 's1-l2': 3 }));

    expect(game.getState().debrief?.starsEarned).toBe(3);
    expect(game.getState().debrief?.unlockedSector).toBe(true);
  });

  it('is absent after Stage 1 is cleared while Sector 02 is still locked', () => {
    // A fresh Profile: 3 Stars is short of the 6 that open Sector 02.
    const game = clearStage1();

    expect(game.getState().debrief?.starsEarned).toBe(3);
    expect(game.getState().profile.totalStars).toBe(3);
    expect(game.getState().debrief?.unlockedSector).toBe(false);
  });

  it('is absent when the Sector the Stars would open was already open', () => {
    // 6 Stars already open Sector 02. Replaying Stage 1 for 3 Stars adds
    // nothing new, and a Sector open before the Run is not unlocked by it.
    const game = clearStage1(clearedStages({ 's1-l1': 3, 's1-l2': 3 }));

    expect(game.getState().debrief?.starsEarned).toBe(3);
    expect(game.getState().debrief?.unlockedSector).toBe(false);
  });

  it('is absent after a Free Flight clear, even one Star short of the gate', () => {
    // 5 Stars so far: a Free Flight adds none, so the gate at 6 stays shut.
    const game = clearFreeFlight(clearedStages({ 's1-l1': 3, 's1-l2': 2 }));

    expect(game.getState().screen).toBe('debrief');
    expect(game.getState().profile.totalStars).toBe(5);
    expect(game.getState().debrief?.unlockedSector).toBe(false);
  });
});

/** Sector 02 to 07 and the fleet's Stars each opens at, restated: they are the rule. */
const GATES = [
  { sector: 2, stars: 6 },
  { sector: 3, stars: 14 },
  { sector: 4, stars: 24 },
  { sector: 5, stars: 32 },
  { sector: 6, stars: 40 },
  { sector: 7, stars: 48 },
];

/** A pace of 48 WPM: Stage 1 is cleared for 3 Stars. */
const FAST_STEPS_PER_KEY = 15;

describe('each Sector opens at its own total of Stars', () => {
  /**
   * Clear Stage 1 for 3 Stars on a Save whose other Stages hold `before`
   * Stars, and say whether the clear opened a Sector.
   */
  function clearOpens(before: number): boolean {
    const game = newGame(saveWithStars(before, STAGE_ID));
    startStage(game, STAGE_ID);
    typeText(game, SAMPLE_TEXT, FAST_STEPS_PER_KEY);
    expect(game.getState().debrief?.starsEarned).toBe(3);
    expect(game.getState().profile.totalStars).toBe(before + 3);
    return game.getState().debrief?.unlockedSector ?? false;
  }

  it.each(GATES)(
    'Sector 0$sector opens when the clear takes the fleet to $stars Stars, and not one Star short',
    ({ stars }) => {
      expect(clearOpens(stars - 3), 'at the gate').toBe(true);
      expect(clearOpens(stars - 4), 'one Star short').toBe(false);
    },
  );
});
