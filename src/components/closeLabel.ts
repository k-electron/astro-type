import type { Screen } from '../types/game';

/** What a menu's back button says, by the screen Close returns to. */
export function closeLabel(opener: Screen | null): string {
  switch (opener) {
    case 'galaxy-map':
      return 'Back to Sectors';
    case 'debrief':
      return 'Back to Debriefing';
    case 'pause-menu':
    case 'flight-deck':
      return 'Pause Menu';
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
