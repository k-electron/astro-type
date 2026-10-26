// Shared by the DOM and browser tests, so it imports from no test runner.

/**
 * The Multiplier a Streak has earned: x1, then x2 at 10, x3 at 20, x4 at 30.
 * Written out here on purpose rather than imported from the game's rules, so
 * a changed rule fails the tests that read it off the screen.
 */
export const multiplierAt = (streak: number) =>
  Math.min(4, 1 + Math.floor(streak / 10));
