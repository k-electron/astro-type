import type { Stage } from '../types/game';

/** The Target Cadence the Free Flight screen opens on. */
export const DEFAULT_FREE_FLIGHT_WPM = 40;

/**
 * The Stage a Free Flight Run flies: the player's own `text` (already checked
 * as typeable) and Target Cadence, with Star thresholds worked out from the
 * cadence. `id` is a new one for each launch.
 */
export function buildFreeFlightStage(
  id: string,
  text: string,
  targetWpm: number,
): Stage {
  return {
    id,
    sectorId: 'sector-custom',
    stageNumber: 0,
    title: 'Free Flight Drill',
    subtitle: 'Custom Practice Mission',
    description: 'Player tailored free-form typing session.',
    targetKeys: Array.from(new Set(text.toLowerCase().split(''))),
    sampleText: text,
    difficulty:
      targetWpm > 50 ? 'Expert' : targetWpm > 35 ? 'Advanced' : 'Intermediate',
    targetWpm,
    focusFingers: 'Free Flight Custom Selection',
    techniqueTip:
      'Maintain relaxed posture and steady keystroke cadence across your custom text.',
    drillPatternType: 'CADENCE_FLOW',
    starThresholds: {
      oneStarAccuracy: 75,
      twoStarWpm: targetWpm,
      twoStarAccuracy: 90,
      threeStarWpm: Math.round(targetWpm * 1.3),
      threeStarAccuracy: 96,
      threeStarMinStreak: 20,
    },
  };
}
