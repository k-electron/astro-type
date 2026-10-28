import { describe, expect, it } from 'vitest';
import type { PlayerEvent } from './game';
import { newGame, startFreeFlight, typeText } from './testHelpers';

const NEXT_STAGE: PlayerEvent = { type: 'PRESS_NEXT_STAGE' };

describe('Next Stage on a Free Flight Debrief', () => {
  it('has no next Stage to start: it opens the Galaxy Map, as on the last Stage', () => {
    const text = 'ab ba';
    const game = newGame();
    startFreeFlight(game, text);
    typeText(game, text);
    expect(game.getState().screen).toBe('debrief');
    const result = game.getState().debrief;
    const flown = game.getState().run.currentStage.id;

    game.send(NEXT_STAGE);

    const after = game.getState();
    expect(after.screen).toBe('galaxy-map');
    // No Stage was started: the Free Flight's Debrief and Run are still there.
    expect(after.phase).toBe('cleared');
    expect(after.debrief).toEqual(result);
    expect(after.run.currentStage.id).toBe(flown);
  });
});
