import type { Screen } from '../game/machine';

/**
 * What a menu's back button says, by the screen Close returns to.
 *
 * The rule: every back button reads "Back to <the screen it returns to>",
 * with that screen's name as the player sees it. This covers the Galaxy
 * Map's Close and Free Flight's Cancel too. The Cancel on a confirm dialog is
 * not a back button and keeps its name.
 */
export function closeLabel(opener: Screen | null): string {
  switch (opener) {
    case 'galaxy-map':
      return 'Back to Sectors';
    case 'debrief':
      return 'Back to Debriefing';
    case 'pause-menu':
    case 'flight-deck':
      return 'Back to Pause Menu';
    case 'hangar':
      return 'Back to Hangar';
    case 'analytics':
      return 'Back to Analytics';
    case 'free-flight':
      return 'Back to Free Flight';
    default:
      return 'Back to Academy';
  }
}

/** The Flight Deck button's label: Resume Flight when a paused Run is waiting. */
export function flightDeckLabel(runPaused: boolean): string {
  return runPaused ? 'Resume Flight' : 'Enter Flight Deck';
}
