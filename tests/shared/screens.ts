/**
 * How a player tells the screens apart: the heading each header screen shows,
 * and the names of the Pause Menu, the Debrief, Academy Home and the HUD, and
 * the words on the buttons that move between them. Every name follows
 * GLOSSARY.md (see the table in issue #54). This imports from no test runner,
 * so unit, DOM and browser tests can share it.
 */

import { entriesOf } from '../../src/game/catalog';
import type { AudioSynthCore } from '../../src/game/schemas';

/** Each header button that opens a screen, and the heading of that screen. */
export const MENU_HEADINGS = {
  'Galaxy Map': 'Galaxy Map',
  Hangar: 'Starship Hangar Upgrades',
  Analytics: 'Typing Analytics & Heatmap',
  'Free Flight': 'Free Flight',
} as const;

/**
 * The names a player (or a screen reader) finds the other screens by. The app
 * writes each one inline in its component, so they are spelled out once here
 * and every test imports them. A name the source already exports is imported
 * from there instead: `flightDeckLabel` (Resume Flight, Enter Flight Deck) and
 * `closeLabel` (the Back buttons) in `src/screens/closeLabel.ts`, the audio
 * labels in `src/screens/audioLabels.ts`, and Free Flight's title and subtitle
 * in `src/curriculum/curriculum.ts`.
 */

/** The Pause Menu's accessible name (a dialog on the DOM, a heading in the browser). */
export const PAUSE_MENU_NAME = 'Flight Paused';

/**
 * The Debrief's title line, "Debrief · <Stage id>". The dot keeps it from
 * matching the "Back to Debrief" button.
 */
export const DEBRIEF_TITLE = /Debrief\s*·/;

/** Academy Home's heading. */
export const ACADEMY_HOME_HEADING = /AstroType: Cosmic Touch Typing/;

/** The Flight Deck's HUD region. */
export const HUD_NAME = 'HUD';

// ---- Buttons that start, pause and leave a Run ----------------------------

/** The header's Flight Deck button while no Run is paused ("Resume Flight" while one is). */
export const START_STAGE = 'Start Stage';

/** The header's Flight Deck button on a running Run, and its tooltip. */
export const PAUSE_FLIGHT = 'Pause Flight';

/** The Pause Menu's restart button. */
export const RESTART_STAGE = 'Restart Stage';

/** The button that goes to Academy Home: the Galaxy Map's exit and the Debrief's. */
export const ACADEMY_HOME = 'Academy Home';

/** The Debrief's Galaxy Map button, and the header's button that opens the screen. */
export const GALAXY_MAP = 'Galaxy Map';

/** The Debrief's button for the next Stage in the curriculum. */
export const NEXT_STAGE = 'Next Stage';

/** The Galaxy Map's per-Stage buttons. */
export const LAUNCH_STAGE = 'Launch Stage';
export const REPLAY_STAGE = 'Replay Stage';

// ---- Academy Home ----------------------------------------------------------

/** Academy Home's button for the first Stage. */
export const BEGIN_HOME_ROW = 'Begin Home Row';

/** Academy Home's button for the Galaxy Map, quoting the curriculum's Sector count. */
export function viewGalaxyMap(sectors: number): string {
  return `View Galaxy Map (${sectors} Sectors)`;
}

// ---- Galaxy Map ------------------------------------------------------------

/** The Galaxy Map's subheading over the list of Sectors. */
export const GALAXY_MAP_SUBHEADING = 'Sectors';

/** The Wipe confirmation's line about what it resets, for a curriculum of `stages` Stages. */
export function wipeStagesLine(stages: number): string {
  return `All ${stages} Stages reset to 0 ★`;
}

/** The Wipe confirmation's line about the Sectors. It stays. */
export const WIPE_SECTORS_LINE = 'Interstellar Sectors relocked to Gate 0';

// ---- Free Flight -----------------------------------------------------------

/** The label of the Free Flight screen's text box. */
export const YOUR_TEXT = 'Your Text';

// ---- Names that stay -------------------------------------------------------

/** Names the Glossary doesn't conflict with, so they stay on screen. */
export const STREAK_ALARMS = 'Streak alarms';
export const PRACTICE_TIME = 'Practice Time';

/**
 * How the header's audio panel names a Synthesizer Voice. A pattern, because
 * the voice's button also shows its price or a check.
 */
export function voiceName(id: AudioSynthCore): RegExp {
  const core = entriesOf('core').find((entry) => entry.id === id);
  if (!core) throw new Error(`No Synthesizer Voice ${id}`);
  return new RegExp(core.shortName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
}
