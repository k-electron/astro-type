import { describe, expect, it } from 'vitest';
import { OLD_DRONE_SPEEDS, withOldDroneSpeed } from '../../tests/shared/saves';
import {
  type Game,
  newGame,
  STAGE_ID,
  startFreeFlight,
  startStage,
  targetKey,
} from './testHelpers';

/**
 * One Drone speed. Every Run, in a Sector Stage or in Free Flight, moves at
 * FAST: the lead Drone starts 22 from the Strike Line (y = 62 to y = 84) and
 * falls 2.2 a step, a step being 1/60 s. So it is 17.6 away after 2 steps,
 * 15.4 after 3, 8.8 after 6, 6.6 after 7, and waits on the line from step 10.
 * The Perfect window is 8 and the Great window 16 (Judgement, GLOSSARY.md).
 *
 * The player used to choose a speed, and Saves and Backups made then still
 * carry the choice in `highwaySpeed`. It must change nothing now.
 */
const PERFECT = 100;
const GREAT = 75;
const GOOD = 50;

/** Each Save a player might arrive with, and the seed that builds it. */
const SAVES: Array<[string, unknown]> = [
  ['a fresh Save', undefined],
  ...OLD_DRONE_SPEEDS.map((speed): [string, unknown] => [
    `a Save made at the ${speed} speed`,
    withOldDroneSpeed({}, speed),
  ]),
];

/** The first key of a Run, pressed `steps` steps in, and the points it scored. */
function firstKeyScores(game: Game, key: string, steps: number): number {
  game.step(steps);
  game.pressKey(key);
  return game.getState().run.score;
}

/** [steps before the first key, the points that key scores]. */
const FIRST_KEY_AT_FAST = [
  [2, GOOD], // 17.6 from the line
  [3, GREAT], // 15.4
  [6, GREAT], // 8.8
  [7, PERFECT], // 6.6
  [10, PERFECT], // waiting on the line
] as const;

describe('a Stage Run moves at one Drone speed', () => {
  it.each(SAVES)('from %s', (_what, seed) => {
    for (const [steps, points] of FIRST_KEY_AT_FAST) {
      const game = newGame(seed);
      startStage(game, STAGE_ID);
      expect(
        firstKeyScores(game, targetKey(game), steps),
        `the first key ${steps} steps in`,
      ).toBe(points);
    }
  });
});

describe('a Free Flight Run moves at the same Drone speed', () => {
  it.each(SAVES)('from %s', (_what, seed) => {
    for (const [steps, points] of FIRST_KEY_AT_FAST) {
      const game = newGame(seed);
      startFreeFlight(game, 'ff jj ff jj');
      expect(
        firstKeyScores(game, 'f', steps),
        `the first key ${steps} steps in`,
      ).toBe(points);
    }
  });
});

describe('the Drones move the same way in every Run', () => {
  const leadHeight = (game: Game) => game.getState().run.drones[0].yPercent;

  it.each(SAVES)(
    'from %s, the lead Drone falls 2.2 a step to the Strike Line and waits there',
    (_what, seed) => {
      const game = newGame(seed);
      startStage(game, STAGE_ID);
      expect(leadHeight(game)).toBe(62);

      for (const steps of [1, 2, 3]) {
        const fresh = newGame(seed);
        startStage(fresh, STAGE_ID);
        fresh.step(steps);
        expect(leadHeight(fresh)).toBeCloseTo(62 + 2.2 * steps, 6);
      }

      // It is locked on from y = 83.5, which it reaches on the 10th step.
      game.step(9);
      expect(game.getState().run.drones[0].isTargetLocked).toBeFalsy();
      game.step(1);
      expect(game.getState().run.drones[0].isTargetLocked).toBe(true);

      // It never falls past the line, however long it waits.
      game.step(600);
      expect(leadHeight(game)).toBe(84);
    },
  );

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

  it.each(OLD_DRONE_SPEEDS)(
    'the Drone behind eases down just as it does in a fresh Save, whatever the old %s speed',
    (speed) => {
      const path = (seed: unknown) => {
        const game = newGame(seed);
        startStage(game, STAGE_ID);
        let done = 0;
        return [1, 2, 3, 5, 8, 13, 21, 60].map((at) => {
          game.step(at - done);
          done = at;
          return game.getState().run.drones[1].yPercent;
        });
      };

      expect(path(withOldDroneSpeed({}, speed))).toEqual(path(undefined));
    },
  );
});

describe('Perfect stays reachable at high WPM', () => {
  // A key every N steps is 3600 / N keys a minute, which is 720 / N words
  // (5 keys a word) a minute. The next Drone has to come down to the Strike
  // Line between one key and the next, and may not drop past the Perfect
  // window (8 from the line) in a single step.
  it.each([
    ['103 WPM', 7],
    ['120 WPM', 6],
  ])(
    'a steady %s typist scores Perfect on every key',
    (_wpm, stepsBetweenKeys) => {
      const game = newGame();
      startStage(game, STAGE_ID);
      const grades: string[] = [];
      game.onMoment((moment) => {
        if (moment.type === 'hit') grades.push(moment.grade);
      });

      game.step(30); // the first Drone is waiting on the line
      for (let key = 0; key < 30; key++) {
        game.pressKey(targetKey(game));
        game.step(stepsBetweenKeys);
      }

      expect(grades).toEqual(Array.from({ length: 30 }, () => 'perfect'));
    },
  );
});
