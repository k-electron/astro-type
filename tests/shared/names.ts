// Shared by every layer of tests (unit, DOM and browser), so it imports from
// no test runner.

/**
 * The words the game never says. It calls them Streak and Overdrive (combo,
 * hyperspace, warp), Stage and Run (mission), the Action Deck (highway),
 * Drones (note), the Debrief (debriefing), Academy Home (main menu), the
 * Flight Deck (cockpit), Free Flight (drill, custom practice) and Stars
 * (rating). GLOSSARY.md lists each one as a word to avoid. "Trail theme" is
 * banned too, since #88 renamed the Cosmetic a Trail; it is banned as a phrase,
 * because "trail" alone is the name.
 *
 * `\b` keeps this to whole words: "Debrief" is the screen's name and passes
 * (only "debriefing" is banned), and a word that merely contains one
 * ("swarp", "Comboy", "Notebook", "Operating") is not flagged. The endings
 * cover the plurals and "warped" and "warping", and a space or hyphen may
 * split "hyper space", "main menu" and "custom practice".
 */
export const BANNED_NAME =
  /\b(?:combos?|trail[\s-]?themes?|hyper[\s-]?space|warp(?:s|ed|ing)?|missions?|highways?|notes?|debriefings?|main[\s-]?menus?|cockpits?|drills?|custom[\s-]?practices?|ratings?)\b/i;
