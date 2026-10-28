import { describe, expect, it } from 'vitest';
import { multiplierAt } from '../../tests/shared/multiplier';
import { hitPerfect, miss, startedGame } from './testHelpers';

/**
 * The rules of scoring, Streak, Multiplier, Overdrive and shields, read from
 * the Run. The grade a keystroke gets at each distance (and with each level of
 * Precision Sensors) is in judgement-events.test.ts.
 *
 * A first hit on a fresh Run is at Multiplier x1 with Overdrive off, so
 * Perfect = 100, Great = 75, Good = 50. How far a Drone is when a key lands,
 * and so the grade, is in drone-speed.test.ts.
 */

describe('Multiplier', () => {
  it('steps up at Streak 10, 20 and 30 and stops at x4', () => {
    const game = startedGame();
    const seen: Record<number, { multiplier: number; score: number }> = {};
    for (let hit = 1; hit <= 40; hit++) {
      hitPerfect(game, 1);
      const run = game.getState().run;
      seen[hit] = { multiplier: run.multiplier, score: run.score };
      expect(run.currentStreak).toBe(hit);
    }
    // The Multiplier for a hit is set by the Streak that hit makes.
    expect(seen[9]).toEqual({ multiplier: 1, score: 900 });
    expect(seen[10]).toEqual({ multiplier: 2, score: 1100 });
    expect(seen[19]).toEqual({ multiplier: 2, score: 2900 });
    expect(seen[20]).toEqual({ multiplier: 3, score: 3200 });
    expect(seen[29]).toEqual({ multiplier: 3, score: 5900 });
    expect(seen[30].multiplier).toBe(4);
    expect(seen[40].multiplier).toBe(4);
  });

  it('drops back to x1 on a Miss and climbs again from the new Streak', () => {
    const game = startedGame();
    hitPerfect(game, 12);
    expect(game.getState().run.multiplier).toBe(2);
    miss(game);
    expect(game.getState().run.multiplier).toBe(1);
    hitPerfect(game, 9);
    expect(game.getState().run.multiplier).toBe(1);
    hitPerfect(game, 1);
    expect(game.getState().run.multiplier).toBe(2);
  });
});

describe('Overdrive', () => {
  it('fills with hits, starts on the 29th, and doubles the points from the next hit', () => {
    const game = startedGame();
    hitPerfect(game, 28);
    expect(game.getState().run.hyperspaceActive).toBe(false);
    expect(game.getState().run.hyperspaceEnergy).toBeCloseTo(98);
    expect(game.getState().run.score).toBe(900 + 10 * 200 + 9 * 300);

    const before29 = game.getState().run.score;
    hitPerfect(game, 1);
    expect(game.getState().run.hyperspaceActive).toBe(true);
    expect(game.getState().run.hyperspaceEnergy).toBe(100);
    // The hit that starts Overdrive is not doubled: Perfect x3.
    expect(game.getState().run.score - before29).toBe(300);

    const before30 = game.getState().run.score;
    hitPerfect(game, 1);
    // Streak 30 is x4, and Overdrive doubles it: 100 * 4 * 2.
    expect(game.getState().run.score - before30).toBe(800);
    expect(game.getState().run.score).toBe(6700);
  });

  it.each([
    // Reactor level, and the hit on which Overdrive starts.
    [0, 29],
    [1, 24],
    [2, 21],
    [3, 18],
  ])(
    'with Hyperdrive Reactor level %i it starts on hit %i',
    (reactor, startsOn) => {
      const game = startedGame({ hyperdriveReactor: reactor });
      hitPerfect(game, startsOn - 1);
      expect(game.getState().run.hyperspaceActive).toBe(false);
      hitPerfect(game, 1);
      expect(game.getState().run.hyperspaceActive).toBe(true);
    },
  );

  it('ends on an unshielded Miss, keeping only part of the energy', () => {
    const game = startedGame();
    hitPerfect(game, 29);
    expect(game.getState().run.hyperspaceActive).toBe(true);
    miss(game);
    const run = game.getState().run;
    expect(run.hyperspaceActive).toBe(false);
    expect(run.hyperspaceEnergy).toBe(75);
    expect(run.currentStreak).toBe(0);
    expect(run.multiplier).toBe(1);
  });
});

describe('Overdrive after a Miss', () => {
  it('lights again from the energy the Miss left, and holds through the climb, doubling every hit after the one that lights it', () => {
    const game = startedGame();
    hitPerfect(game, 29);
    miss(game);
    // A Miss costs 25 of the 100 energy, and each hit fills 3.5.
    expect(game.getState().run.hyperspaceActive).toBe(false);
    expect(game.getState().run.hyperspaceEnergy).toBe(75);

    hitPerfect(game, 7); // 75 + 7 x 3.5 = 99.5: one short
    expect(game.getState().run.hyperspaceActive).toBe(false);
    hitPerfect(game, 1);
    expect(game.getState().run.hyperspaceActive).toBe(true);
    expect(game.getState().run.currentStreak).toBe(8);

    // From the next hit, 100 x Multiplier x 2, all the way up the Streak.
    while (game.getState().run.currentStreak < 31) {
      const before = game.getState().run.score;
      hitPerfect(game, 1);
      const { currentStreak, hyperspaceActive, score } = game.getState().run;
      expect(hyperspaceActive, `Overdrive at Streak ${currentStreak}`).toBe(
        true,
      );
      expect(score - before, `points at Streak ${currentStreak}`).toBe(
        100 * multiplierAt(currentStreak) * 2,
      );
    }
  });
});

describe('Shields', () => {
  it('without a shield, a Miss ends the Streak and costs Overdrive energy; the score stays', () => {
    const game = startedGame();
    hitPerfect(game, 12);
    expect(game.getState().run).toMatchObject({
      score: 1500,
      currentStreak: 12,
      multiplier: 2,
    });
    expect(game.getState().run.hyperspaceEnergy).toBeCloseTo(42);

    miss(game);

    const run = game.getState().run;
    expect(run.currentStreak).toBe(0);
    expect(run.multiplier).toBe(1);
    expect(run.hyperspaceEnergy).toBeCloseTo(17);
    expect(run.score).toBe(1500);
    expect(run.incorrectKeystrokes).toBe(1);
    expect(run.totalKeystrokes).toBe(13);
  });

  it('a shield absorbs one Miss: Streak, Multiplier and energy stay, and the next Miss goes through', () => {
    const game = startedGame({ deflectorShields: 1 });
    expect(game.getState().run.shieldsRemaining).toBe(1);
    hitPerfect(game, 12);

    miss(game);
    let run = game.getState().run;
    expect(run.shieldsRemaining).toBe(0);
    expect(run.currentStreak).toBe(12);
    expect(run.multiplier).toBe(2);
    expect(run.hyperspaceEnergy).toBeCloseTo(42);
    expect(run.score).toBe(1500);

    miss(game);
    run = game.getState().run;
    expect(run.currentStreak).toBe(0);
    expect(run.multiplier).toBe(1);
  });

  it('a shield keeps Overdrive on', () => {
    const game = startedGame({ deflectorShields: 1 });
    hitPerfect(game, 29);
    miss(game);
    expect(game.getState().run.hyperspaceActive).toBe(true);
    expect(game.getState().run.hyperspaceEnergy).toBe(100);
  });

  it('an absorbed Miss still counts against accuracy', () => {
    const game = startedGame({ deflectorShields: 3 });
    hitPerfect(game, 12);
    miss(game, 3);
    const run = game.getState().run;
    expect(run.shieldsRemaining).toBe(0);
    expect(run.currentStreak).toBe(12);
    expect(run.incorrectKeystrokes).toBe(3);
    expect(run.totalKeystrokes).toBe(15);

    miss(game);
    expect(game.getState().run.currentStreak).toBe(0);
    expect(game.getState().run.incorrectKeystrokes).toBe(4);
  });
});

describe('A Miss', () => {
  it('leaves the same character to type, and the next correct key scores as normal', () => {
    const game = startedGame();
    hitPerfect(game, 3);
    const index = game.getState().run.currentCharIndex;
    miss(game);
    expect(game.getState().run.currentCharIndex).toBe(index);
    hitPerfect(game, 1);
    expect(game.getState().run.currentCharIndex).toBe(index + 1);
    expect(game.getState().run.score).toBe(400);
  });
});
