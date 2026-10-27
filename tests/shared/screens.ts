/**
 * How a player tells the screens apart: the heading each header screen shows,
 * and the names of the Pause Menu, the Debrief, Academy Home and the HUD.
 * This imports from no test runner, so unit, DOM and browser tests can share it.
 */

/** Each header button that opens a screen, and the heading of that screen. */
export const MENU_HEADINGS = {
  Sectors: 'Flight Sectors & Missions',
  Hangar: 'Starship Hangar Upgrades',
  Analytics: 'Typing Analytics & Heatmap',
  'Free Flight': 'Custom Typing Practice',
} as const;

/**
 * The names a player (or a screen reader) finds the other screens by. The app
 * writes each one inline in its component, so they are spelled out once here
 * and every test imports them.
 */

/** The Pause Menu's accessible name (a dialog on the DOM, a heading in the browser). */
export const PAUSE_MENU_NAME = 'Mission Paused';

/** The Debrief's title line, "Mission Debriefing · <Stage id>". */
export const DEBRIEF_TITLE = /Mission Debriefing/;

/** Academy Home's heading. */
export const ACADEMY_HOME_HEADING = /AstroType: Cosmic Touch Typing/;

/** The Flight Deck's HUD region. */
export const HUD_NAME = 'HUD';
