import { describe, expect, it } from 'vitest';
import { clearedStages } from '../../tests/shared/saves';
import {
  clearStage,
  newGame,
  STAGE_ID,
  startFreeFlight,
  startStage,
  typeText,
} from './testHelpers';

/**
 * The Debrief says "New Sector Unlocked!" only when the Run just cleared is
 * what opened a Sector (decided in #35). Sectors open on the fleet's total
 * Stars: Sector 02 needs 6. Free Flight Stars count toward the fleet too.
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

  it('shows when a Free Flight clear is what took the fleet to 6 Stars', () => {
    // 5 Stars so far: any Star from a Free Flight reaches 6.
    const game = clearFreeFlight(clearedStages({ 's1-l1': 3, 's1-l2': 2 }));

    expect(game.getState().screen).toBe('debrief');
    expect(game.getState().debrief?.starsEarned).toBeGreaterThan(0);
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

  it('is absent after a Free Flight clear that opens nothing', () => {
    const game = clearFreeFlight();

    expect(game.getState().screen).toBe('debrief');
    expect(game.getState().debrief?.unlockedSector).toBe(false);
  });
});
