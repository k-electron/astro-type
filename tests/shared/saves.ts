/**
 * Saves a returning player might already have, for `renderGame({ profile })`
 * and the browser tests' `seedSave`. Fields left out of a Save take their
 * defaults, as they do for a real one. This imports from no test runner, so
 * every layer of tests can use it.
 */

/** A Profile's Stage progress: each Stage id cleared with that many Stars. */
export function clearedStages(
  stars: Record<string, number>,
): Record<string, unknown> {
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

/** 5 Stars in all (Stage 1 with 3, Stage 2 with 2) and 1,234 Credits. */
export const RETURNING_PLAYER = {
  totalCredits: 1234,
  ...clearedStages({ 's1-l1': 3, 's1-l2': 2 }),
};
