import { describe, expect, it } from 'vitest';
import {
  type Game,
  newGame,
  STAGE_ID,
  startFreeFlight,
  startStage,
} from '../../tests/shared/testHelpers';

/**
 * One Drone speed. Every Run, in a Sector Stage or in Free Flight, moves at
 * FAST: the lead Drone starts 22 from the Strike Line (y = 62 to y = 84) and
 * falls 2.2 a step, a step being 1/60 s. So it is 17.6 away after 2 steps,
 * 15.4 after 3, 8.8 after 6, 6.6 after 7, and waits on the line from step 10.
 * How far it has fallen does not change what a key scores (#137): that is in
 * judgement.test.ts.
 */

describe('the Drones move the same way in every Run', () => {
  const leadHeight = (game: Game) => game.getState().run.drones[0].yPercent;

  it('the lead Drone falls 2.2 a step to the Strike Line and waits there', () => {
    const game = newGame();
    startStage(game, STAGE_ID);
    expect(leadHeight(game)).toBe(62);

    for (const steps of [1, 2, 3]) {
      const fresh = newGame();
      startStage(fresh, STAGE_ID);
      fresh.step(steps);
      expect(leadHeight(fresh)).toBeCloseTo(62 + 2.2 * steps, 6);
    }

    // It never falls past the line, however long it waits.
    game.step(600);
    expect(leadHeight(game)).toBe(84);
  });

  it('a Free Flight’s lead Drone falls the same way', () => {
    const game = newGame();
    startFreeFlight(game, 'ff jj ff jj');
    expect(leadHeight(game)).toBe(62);

    game.step(3);
    expect(leadHeight(game)).toBeCloseTo(62 + 2.2 * 3, 6);

    game.step(600);
    expect(leadHeight(game)).toBe(84);
  });

  it('the Drone behind eases down toward its slot and settles there', () => {
    const game = newGame();
    startStage(game, STAGE_ID);
    const start = game.getState().run.drones[1].yPercent;

    game.step(10);
    const underway = game.getState().run.drones[1].yPercent;
    expect(underway).toBeGreaterThan(start);
    expect(underway).toBeLessThan(68);

    game.step(600);
    expect(game.getState().run.drones[1].yPercent).toBeCloseTo(68, 3);
  });
});
