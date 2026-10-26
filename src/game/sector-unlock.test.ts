import { describe, expect, it } from 'vitest';
import {
  clearStage,
  freeFlightStage,
  newGame,
  STAGE_ID,
  typeText,
} from './testHelpers';

/**
 * The Debrief says "New Sector Unlocked!" only when the Run just cleared is
 * what opened a Sector (decided in #35). Sectors open on the fleet's total
 * Stars: Sector 02 needs 6. Free Flight Stars count toward the fleet too.
 */

/** A Save with these Stages cleared at these Stars, the way the game stores it. */
function savedStars(stars: Record<string, number>) {
  return {
    stagesProgress: Object.fromEntries(
      Object.entries(stars).map(([stageId, starsEarned]) => [
        stageId,
        {
          stageId,
          completed: true,
          starsEarned,
          highScore: 22150,
          bestWpm: 31,
          bestAccuracy: 100,
          bestStreak: 40,
          timesPlayed: 2,
          lastPlayedAt: 1792904921385,
        },
      ]),
    ),
  };
}

/** Clear Stage 1 in a minute, no Misses: 3 Stars. */
function clearStage1(save?: Record<string, unknown>) {
  const game = newGame(save);
  game.startStage(STAGE_ID);
  clearStage(game, { seconds: 60 });
  return game;
}

function clearFreeFlight(save?: Record<string, unknown>) {
  const game = newGame(save);
  game.startStage(freeFlightStage('ab'));
  typeText(game, 'ab');
  return game;
}

describe('the Sector unlock notice in the Debrief', () => {
  it('shows when the Run just cleared took the fleet to 6 Stars', () => {
    // 3 Stars so far: clearing Stage 1 for 3 Stars takes the fleet to 6.
    const game = clearStage1(savedStars({ 's1-l2': 3 }));

    expect(game.getDebrief()?.starsEarned).toBe(3);
    expect(game.getDebrief()?.unlockedSector).toBe(true);
  });

  it('shows when a Free Flight clear is what took the fleet to 6 Stars', () => {
    // 5 Stars so far: any Star from a Free Flight reaches 6.
    const game = clearFreeFlight(savedStars({ 's1-l1': 3, 's1-l2': 2 }));

    expect(game.getScreen()).toBe('debrief');
    expect(game.getDebrief()?.starsEarned).toBeGreaterThan(0);
    expect(game.getDebrief()?.unlockedSector).toBe(true);
  });

  it('is absent after Stage 1 is cleared while Sector 02 is still locked', () => {
    // A fresh Profile: 3 Stars is short of the 6 that open Sector 02.
    const game = clearStage1();

    expect(game.getDebrief()?.starsEarned).toBe(3);
    expect(game.getProfile().totalStars).toBe(3);
    expect(game.getDebrief()?.unlockedSector).toBe(false);
  });

  it('is absent when the Sector the Stars would open was already open', () => {
    // 6 Stars already open Sector 02. Replaying Stage 1 for 3 Stars adds
    // nothing new, and a Sector open before the Run is not unlocked by it.
    const game = clearStage1(savedStars({ 's1-l1': 3, 's1-l2': 3 }));

    expect(game.getDebrief()?.starsEarned).toBe(3);
    expect(game.getDebrief()?.unlockedSector).toBe(false);
  });

  it('is absent after a Free Flight clear that opens nothing', () => {
    const game = clearFreeFlight();

    expect(game.getScreen()).toBe('debrief');
    expect(game.getDebrief()?.unlockedSector).toBe(false);
  });
});
