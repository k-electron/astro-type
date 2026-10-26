// Shared by every layer of tests (unit, DOM and browser), so it imports from
// no test runner.

/**
 * The words the game never says: it calls them Streak and Overdrive (see
 * GLOSSARY.md, where Streak, Multiplier and Overdrive list these as words to
 * avoid). `\b` keeps this to whole words, so a word that merely contains one
 * ("swarp", "Comboy") is not flagged; the endings cover "combos", "warped",
 * "warping" and "hyper-space".
 */
export const BANNED_NAME =
  /\b(?:combos?|hyper[\s-]?space|warp(?:s|ed|ing)?)\b/i;
