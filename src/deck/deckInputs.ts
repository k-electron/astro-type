import type { GameState } from '../game/game';

/**
 * Everything the keycaps and the hands draw from, out of the game's snapshot:
 * the Stage and the typed index (which key is the target, which hand, which
 * thumb), the last key pressed, the Hands and keyboard switches, and the
 * equipped trail, the one Cosmetic the deck wears. The scene redraws them
 * when any of these changes, and the session redraws a still deck on the
 * same test, so the two can't disagree about what counts. A new input that
 * the keys draw from goes here, once.
 */
export interface DeckInputs {
  stage: GameState['run']['currentStage'];
  charIndex: number;
  lastPressedKey: string | null;
  keyboardVisible: boolean;
  handsVisible: boolean;
  trail: GameState['profile']['upgrades']['equippedTrailTheme'];
}

export function deckInputs({ run, profile }: GameState): DeckInputs {
  return {
    stage: run.currentStage,
    charIndex: run.currentCharIndex,
    lastPressedKey: run.lastPressedKey,
    keyboardVisible: profile.keyboardVisible,
    handsVisible: profile.handsVisible,
    trail: profile.upgrades.equippedTrailTheme,
  };
}

export function sameDeckInputs(a: DeckInputs, b: DeckInputs): boolean {
  return (Object.keys(a) as (keyof DeckInputs)[]).every((k) => a[k] === b[k]);
}
