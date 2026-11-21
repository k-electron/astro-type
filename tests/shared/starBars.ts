// Shared by the screen tests (DOM and browser), so it imports from no test
// runner and no React.
import type { StarBar } from '../../src/game/rules';

/** A Sector Stage's own numbers: its two WPM bars. */
interface StageBars {
  starThresholds: { twoStarWpm: number; threeStarWpm: number };
}

/**
 * The three Star bars of a Sector Stage as a player is asked for them. The
 * accuracy bars are rule numbers, restated here because this is their oracle:
 * 90% for 1 Star with no speed, 95% for 2 and 98% for 3, the same on every
 * Stage. The two WPM bars are the Stage's own, read from its data.
 */
export function barsOf(stage: StageBars): StarBar[] {
  return [
    { star: 1, accuracy: 90, wpm: null },
    { star: 2, accuracy: 95, wpm: stage.starThresholds.twoStarWpm },
    { star: 3, accuracy: 98, wpm: stage.starThresholds.threeStarWpm },
  ];
}
