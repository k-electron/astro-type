import { describe, expect, it } from 'vitest';
import { CURRICULUM_SECTORS, FINGER_LANES, KEY_FINGER_MAP } from './curriculum';

// The curriculum is checked here, not at load (#11, #27). Every rule below
// fails only when a Stage would break for the player. The shape of a Sector
// and a Stage is the `Sector` and `Stage` types in src/types/game.ts, which
// `CURRICULUM_SECTORS` is declared with, so the typecheck already holds it;
// what a type cannot say is checked here.

const sectors = CURRICULUM_SECTORS;
const stages = sectors.flatMap((sector) => sector.stages);

// A key the player can press: the character itself, or a capital letter
// typed with Shift on its lowercase key.
function keyFor(char: string) {
  return (
    KEY_FINGER_MAP[char] ??
    (char !== char.toLowerCase()
      ? KEY_FINGER_MAP[char.toLowerCase()]
      : undefined)
  );
}

describe('curriculum', () => {
  it('gives every Sector Stages, and every Stage something to type at a bar a player can reach', () => {
    const problems: string[] = [];
    for (const sector of sectors) {
      if (sector.stages.length === 0)
        problems.push(`${sector.id} has no Stages`);
    }
    for (const { id, sampleText, targetWpm, starThresholds: t } of stages) {
      if (sampleText.length === 0) problems.push(`${id}: no text to type`);
      if (!(targetWpm > 0)) problems.push(`${id}: target WPM is not positive`);
      for (const accuracy of [
        t.oneStarAccuracy,
        t.twoStarAccuracy,
        t.threeStarAccuracy,
      ]) {
        if (!(accuracy >= 0 && accuracy <= 100)) {
          problems.push(`${id}: accuracy ${accuracy} is not a percentage`);
        }
      }
      if (!(t.twoStarWpm > 0 && t.threeStarWpm > 0)) {
        problems.push(`${id}: a star WPM is not positive`);
      }
      if (
        !(Number.isInteger(t.threeStarMinStreak) && t.threeStarMinStreak > 0)
      ) {
        problems.push(`${id}: the 3-star Streak is not a whole number above 0`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('puts every Stage in the Sector that lists it', () => {
    const strays = sectors.flatMap((sector) =>
      sector.stages
        .filter((stage) => stage.sectorId !== sector.id)
        .map((stage) => `${stage.id} is listed in ${sector.id}`),
    );
    expect(strays).toEqual([]);
  });

  it('gives every Sector and every Stage its own id', () => {
    const duplicates = (ids: string[]) =>
      ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(duplicates(sectors.map((sector) => sector.id))).toEqual([]);
    expect(duplicates(stages.map((stage) => stage.id))).toEqual([]);
  });

  it('gives every character in every Stage a lane and a finger', () => {
    const fingerOfLane = new Map(
      FINGER_LANES.map((lane) => [lane.laneIndex, lane.finger]),
    );
    const problems: string[] = [];
    for (const stage of stages) {
      const chars = new Set([...stage.sampleText, ...stage.targetKeys]);
      for (const char of chars) {
        const key = keyFor(char);
        if (!key) {
          problems.push(`${stage.id}: ${JSON.stringify(char)} has no key`);
        } else if (fingerOfLane.get(key.lane) !== key.finger) {
          problems.push(
            `${stage.id}: ${JSON.stringify(char)} is on lane ${key.lane}, which is not ${key.finger}`,
          );
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('asks for more at each star level', () => {
    const problems = stages.flatMap(({ id, starThresholds: t }) => {
      const found: string[] = [];
      if (!(t.oneStarAccuracy < t.twoStarAccuracy)) {
        found.push(`${id}: 2-star accuracy is not above 1-star`);
      }
      if (!(t.twoStarAccuracy < t.threeStarAccuracy)) {
        found.push(`${id}: 3-star accuracy is not above 2-star`);
      }
      if (!(t.twoStarWpm < t.threeStarWpm)) {
        found.push(`${id}: 3-star WPM is not above 2-star`);
      }
      return found;
    });
    expect(problems).toEqual([]);
  });

  it('opens with an unlocked Sector, and no Sector asks for fewer Stars than the one before', () => {
    expect(sectors[0].requiredStarsToUnlock).toBe(0);
    const problems = sectors.flatMap((sector, i) =>
      i > 0 &&
      sector.requiredStarsToUnlock < sectors[i - 1].requiredStarsToUnlock
        ? [`${sector.id} asks for fewer Stars than ${sectors[i - 1].id}`]
        : [],
    );
    expect(problems).toEqual([]);
  });
});
