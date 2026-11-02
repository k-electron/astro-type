import type { Screen } from '../game/machine';

/**
 * What a menu's back button says, by the screen Close returns to.
 *
 * The rule: every back button reads "Back to <the screen it returns to>",
 * with that screen's name as the player sees it. This covers the Galaxy
 * Map's Close and Free Flight's Cancel too. The Cancel on a confirm dialog is
 * not a back button and keeps its name.
 *
 * Every screen has a case and there is no default, so a new screen without a
 * label fails the build.
 */
export function closeLabel(opener: Screen | null): string {
  switch (opener) {
    case 'galaxy-map':
      return 'Back to Galaxy Map';
    case 'debrief':
      return 'Back to Debrief';
    case 'pause-menu':
    case 'flight-deck':
      return 'Back to Pause Menu';
    case 'hangar':
      return 'Back to Hangar';
    case 'analytics':
      return 'Back to Analytics';
    case 'free-flight':
      return 'Back to Free Flight';
    case 'academy-home':
    case null:
      return 'Back to Academy Home';
  }
}

/**
 * The Flight Deck button's label when it is not pausing a running Run, in the
 * header and on the overlays: Resume Flight when a paused Run is waiting (the
 * Pause Menu's resume button is named the same), otherwise Start Stage.
 */
export function flightDeckLabel(runPaused: boolean): string {
  return runPaused ? 'Resume Flight' : 'Start Stage';
}
