import type { GameState } from '../game/game';

/**
 * Everything the keycaps and the hands draw from, out of the game's snapshot:
 * the Stage and the typed index (which key is the target, which hand, which
 * thumb), the last key pressed, and the Hands and keyboard switches. The scene
 * redraws them when any of these changes, and the session redraws a still deck
 * on the same test, so the two can't disagree about what counts. A new input
 * that the keys draw from goes here, once. (The equipped Trail is not one: it
 * colours the lasers, which `judge` reads fresh from the game.)
 */
export interface DeckInputs {
  stage: GameState['run']['stage'];
  charIndex: number;
  lastPressedKey: string | null;
  keyboardVisible: boolean;
  handsVisible: boolean;
}

export function deckInputs({ run, profile }: GameState): DeckInputs {
  return {
    stage: run.stage,
    charIndex: run.currentCharIndex,
    lastPressedKey: run.lastPressedKey,
    keyboardVisible: profile.keyboardVisible,
    handsVisible: profile.handsVisible,
  };
}

export function sameDeckInputs(a: DeckInputs, b: DeckInputs): boolean {
  return (Object.keys(a) as (keyof DeckInputs)[]).every((k) => a[k] === b[k]);
}
