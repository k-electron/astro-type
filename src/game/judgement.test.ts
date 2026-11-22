import { describe, expect, it } from 'vitest';
import { multiplierAt } from '../../tests/shared/multiplier';
import {
  hitFlat,
  miss,
  startFlatRun as flatRun,
  typeText,
} from '../../tests/shared/testHelpers';

/**
 * The rules of scoring, Streak, Multiplier and Overdrive, read from the Run.
 * A Judgement is a hit or a Miss, and a hit scores 100 x the Multiplier (x2 in
 * Overdrive) wherever its Drone is (#137). The clean-word bonus is in
 * clean-words.test.ts. Every player plays these rules: nothing bought changes
 * them (#136).
 *
 * These Runs are a Free Flight of one letter with no spaces (`FLAT_TEXT`), so
 * no word finishes before the last character and every point in the score is a
 * hit's own. Each test stops short of the last character.
 */

describe('a hit', () => {
  it('scores the same wherever its Drone is: the moment the Run starts, mid-fall, or after a long wait on the Strike Line', () => {
    const scoreOfFirstKeyAfter = (steps: number) => {
      const game = flatRun();
      game.step(steps);
      game.pressKey('f');
      return game.getState().run.score;
    };

    for (const steps of [0, 1, 3, 7, 30, 600]) {
      expect(scoreOfFirstKeyAfter(steps), `after ${steps} steps`).toBe(100);
    }
  });

  it('scores the same for a fast typist, a key a step after the last, as for one who waits', () => {
    const fast = flatRun();
    for (let key = 0; key < 20; key++) {
      fast.step(1);
      fast.pressKey('f');
    }
    const waiting = flatRun();
    hitFlat(waiting, 20);

    expect(fast.getState().run.score).toBe(waiting.getState().run.score);
    // Nine hits at x1, ten at x2, the twentieth at x3.
    expect(fast.getState().run.score).toBe(9 * 100 + 10 * 200 + 300);
  });
});

describe('Multiplier', () => {
  it('steps up at Streak 10, 20 and 30 and stops at x4', () => {
    const game = flatRun();
    const seen: Record<number, { multiplier: number; score: number }> = {};
    for (let streak = 1; streak <= 40; streak++) {
      typeText(game, 'f');
      const run = game.getState().run;
      seen[streak] = { multiplier: run.multiplier, score: run.score };
      expect(run.currentStreak).toBe(streak);
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
    const game = flatRun();
    hitFlat(game, 12);
    expect(game.getState().run.multiplier).toBe(2);
    miss(game);
    expect(game.getState().run.multiplier).toBe(1);
    hitFlat(game, 9);
    expect(game.getState().run.multiplier).toBe(1);
    hitFlat(game, 1);
    expect(game.getState().run.multiplier).toBe(2);
  });
});

describe('Overdrive', () => {
  it('fills with hits, starts on the 29th, and doubles the points from the next hit', () => {
    const game = flatRun();
    hitFlat(game, 28);
    expect(game.getState().run.overdriveActive).toBe(false);
    expect(game.getState().run.overdriveEnergy).toBeCloseTo(98);
    expect(game.getState().run.score).toBe(900 + 10 * 200 + 9 * 300);

    const before29 = game.getState().run.score;
    hitFlat(game, 1);
    expect(game.getState().run.overdriveActive).toBe(true);
    expect(game.getState().run.overdriveEnergy).toBe(100);
    // The hit that starts Overdrive is not doubled: 100 x3.
    expect(game.getState().run.score - before29).toBe(300);

    const before30 = game.getState().run.score;
    hitFlat(game, 1);
    // Streak 30 is x4, and Overdrive doubles it: 100 * 4 * 2.
    expect(game.getState().run.score - before30).toBe(800);
    expect(game.getState().run.score).toBe(6700);
  });

  it('ends on a Miss, keeping only part of the energy', () => {
    const game = flatRun();
    hitFlat(game, 29);
    expect(game.getState().run.overdriveActive).toBe(true);
    miss(game);
    const run = game.getState().run;
    expect(run.overdriveActive).toBe(false);
    expect(run.overdriveEnergy).toBe(75);
    expect(run.currentStreak).toBe(0);
    expect(run.multiplier).toBe(1);
  });
});

describe('Overdrive after a Miss', () => {
  it('lights again from the energy the Miss left, and holds through the climb, doubling every hit after the one that lights it', () => {
    const game = flatRun();
    hitFlat(game, 29);
    miss(game);
    // A Miss costs 25 of the 100 energy, and each hit fills 3.5.
    expect(game.getState().run.overdriveActive).toBe(false);
    expect(game.getState().run.overdriveEnergy).toBe(75);

    hitFlat(game, 7); // 75 + 7 x 3.5 = 99.5: one short
    expect(game.getState().run.overdriveActive).toBe(false);
    hitFlat(game, 1);
    expect(game.getState().run.overdriveActive).toBe(true);
    expect(game.getState().run.currentStreak).toBe(8);

    // From the next hit, 100 x Multiplier x 2, all the way up the Streak.
    while (game.getState().run.currentStreak < 31) {
      const before = game.getState().run.score;
      hitFlat(game, 1);
      const { currentStreak, overdriveActive, score } = game.getState().run;
      expect(overdriveActive, `Overdrive at Streak ${currentStreak}`).toBe(
        true,
      );
      expect(score - before, `points at Streak ${currentStreak}`).toBe(
        100 * multiplierAt(currentStreak) * 2,
      );
    }
  });
});

describe('A Miss', () => {
  it('leaves the same character to type, and the next correct key scores as normal', () => {
    const game = flatRun();
    hitFlat(game, 3);
    const index = game.getState().run.currentCharIndex;
    miss(game);
    expect(game.getState().run.currentCharIndex).toBe(index);
    hitFlat(game, 1);
    expect(game.getState().run.currentCharIndex).toBe(index + 1);
    expect(game.getState().run.score).toBe(400);
  });

  it('always ends the Streak and costs 25 Overdrive energy; the score stays', () => {
    const game = flatRun();
    hitFlat(game, 12);
    expect(game.getState().run).toMatchObject({
      score: 1500,
      currentStreak: 12,
      multiplier: 2,
    });
    expect(game.getState().run.overdriveEnergy).toBeCloseTo(42);

    miss(game);

    const run = game.getState().run;
    expect(run.currentStreak).toBe(0);
    expect(run.multiplier).toBe(1);
    expect(run.overdriveEnergy).toBeCloseTo(17);
    expect(run.score).toBe(1500);
    expect(run.incorrectKeystrokes).toBe(1);
    expect(run.totalKeystrokes).toBe(13);
  });

  it('breaks the Streak every time, not just the first: three wrong keys in a row cost three Misses and 25 energy each', () => {
    const game = flatRun();
    hitFlat(game, 28); // 98 energy, one hit short of Overdrive

    miss(game, 3);

    const run = game.getState().run;
    expect(run.currentStreak).toBe(0);
    expect(run.multiplier).toBe(1);
    expect(run.incorrectKeystrokes).toBe(3);
    expect(run.overdriveEnergy).toBeCloseTo(98 - 3 * 25);
  });
});
