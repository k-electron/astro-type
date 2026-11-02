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
 * It also holds the old on-screen names that #89 retired, each as the whole
 * phrase so the words the Glossary keeps still pass:
 * - Action Deck, not "Tactile Rhythm Flight Deck" or "Audio Flight Deck". Only
 *   the full phrases are banned: "Flight Deck", "Rhythm" and "Tactile" stay
 *   ("The Tactile Anchors" is a Stage title).
 * - Free Flight, not "Launch Custom Flight" (Start Free Flight) or any "custom
 *   flight".
 * - Key Labels, not "Hide Deck", "Show Deck" or "Show or hide the Action
 *   Deck" (the button hides the letters on the keys, not the deck).
 * - Sound Kit, not "audio core", "audio synth" or "Synthesizer" (Voice, core, Engine Cores).
 *   "Synth" stays: Cyber Synth is a Sound Kit's name.
 * - Deep Space Beats, not "Deep Space Drone". "Drone" stays (a falling target).
 * - Rhythm and Target WPM, not "Cadence" anywhere (Stage titles, tips,
 *   labels), in the singular or the plural.
 * - Analytics, not "Report". This one is a whole line only (`^reports?$`):
 *   each reader trims a piece of text before it tests, so a button or label
 *   that says just "Report" is caught, while "report" inside a sentence is
 *   not. It can't false-positive on a longer word either way.
 *
 * `\b` keeps this to whole words: "Debrief" is the screen's name and passes
 * (only "debriefing" is banned), and a word that merely contains one
 * ("swarp", "Comboy", "Notebook", "Operating") is not flagged. The endings
 * cover the plurals and "warped" and "warping", and a space or hyphen may
 * split "hyper space", "main menu" and "custom practice".
 */
export const BANNED_NAME =
  /\b(?:combos?|trail[\s-]?themes?|hyper[\s-]?space|warp(?:s|ed|ing)?|missions?|highways?|notes?|debriefings?|main[\s-]?menus?|cockpits?|drills?|custom[\s-]?practices?|ratings?|tactile[\s-]rhythm|audio[\s-]flight[\s-]deck|custom[\s-]flights?|(?:hide|show)[\s-]+(?:the[\s-]+)?(?:action[\s-]+)?deck|audio[\s-]cores?|audio[\s-]synths?|synthesizers?|deep[\s-]space[\s-]drone|cadences?)\b|^reports?$/i;
