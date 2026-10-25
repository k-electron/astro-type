import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { CURRICULUM_SECTORS, FINGER_LANES, KEY_FINGER_MAP } from './curriculum';

// The curriculum is checked here, not at load (#11, #27). Every rule below
// fails only when a Stage would break for the player.

const StarThresholdsSchema = z.object({
  oneStarAccuracy: z.number().min(0).max(100),
  twoStarWpm: z.number().positive(),
  twoStarAccuracy: z.number().min(0).max(100),
  threeStarWpm: z.number().positive(),
  threeStarAccuracy: z.number().min(0).max(100),
  threeStarMinStreak: z.number().int().positive(),
});

const StageSchema = z.object({
  id: z.string().min(1),
  sectorId: z.string().min(1),
  stageNumber: z.number().int().positive(),
  title: z.string().min(1),
  subtitle: z.string(),
  description: z.string(),
  targetKeys: z.array(z.string().min(1)),
  sampleText: z.string().min(1),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert']),
  targetWpm: z.number().positive(),
  starThresholds: StarThresholdsSchema,
  timeLimitSeconds: z.number().positive().optional(),
  focusFingers: z.string().optional(),
  techniqueTip: z.string().optional(),
  drillPatternType: z
    .enum([
      'ANCHOR_CALIBRATION',
      'FINGER_EXPANSION',
      'ANCHOR_REACH_RETURN',
      'HAND_ALTERNATION',
      'VOWEL_REACH',
      'CADENCE_FLOW',
      'SHIFT_DISCIPLINE',
    ])
    .optional(),
});

const SectorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  codenick: z.string(),
  curriculumCategory: z.string(),
  description: z.string(),
  requiredStarsToUnlock: z.number().int().min(0),
  stages: z.array(StageSchema).min(1),
  accentColor: z.string(),
  themeSymbol: z.string(),
});

const CurriculumSchema = z.array(SectorSchema).min(1);

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
  it('matches the schema', () => {
    const result = CurriculumSchema.safeParse(sectors);
    expect(result.error?.issues ?? []).toEqual([]);
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
