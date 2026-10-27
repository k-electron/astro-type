/**
 * How a player tells the screens apart: the heading each header screen shows.
 * This imports from no test runner, so unit, DOM and browser tests can share it.
 */

/** Each header button that opens a screen, and the heading of that screen. */
export const MENU_HEADINGS = {
  Sectors: 'Flight Sectors & Missions',
  Hangar: 'Starship Hangar Upgrades',
  Analytics: 'Typing Analytics & Heatmap',
  'Free Flight': 'Custom Typing Practice',
} as const;
