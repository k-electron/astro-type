import { describe, expect, it } from 'vitest';
import { FREE_FLIGHT_SAVE } from '../../tests/shared/saves';
import {
  loadGame,
  newGame,
  STAGE_ID,
  startStage,
  typeText,
} from './testHelpers';

/**
 * Free Flight is a curriculum concept (#73): the Game builds the Stage from
 * what the player sent, `{ text, targetWpm }`, and no screen builds one.
 */

const TEXT = 'ab ba';

function launch(text: string, targetWpm: number) {
  const game = newGame();
  game.send({ type: 'LAUNCH_FREE_FLIGHT', text, targetWpm });
  return game;
}

describe('launching a Free Flight from { text, targetWpm }', () => {
  it('starts a Run of exactly that text, on a Free Flight Stage with a custom id', () => {
    const game = launch(TEXT, 30);

    const state = game.getState();
    expect(state.screen).toBe('flight-deck');
    expect(state.run.currentStage.sampleText).toBe(TEXT);
    expect(state.run.currentStage.origin).toBe('free-flight');
    expect(state.run.currentStage.id).toMatch(/^custom-/);
    expect(state.run.currentStage.targetWpm).toBe(30);
  });

  it('carries the target WPM into what the Run asks for', () => {
    // The same text typed at the same pace (half a second a key, so about
    // 24 WPM) is judged against the Target Cadence the player chose. Which
    // Stars Free Flight should award is #36's question, not this test's: it
    // only needs the cadence to reach the Run.
    const clearAt = (targetWpm: number) => {
      const game = launch(TEXT, targetWpm);
      typeText(game, TEXT);
      return game.getState().debrief?.starsEarned ?? -1;
    };

    expect(clearAt(10)).toBeGreaterThan(clearAt(100));
  });

  it('records the result under the custom id, as a Free Flight always has', () => {
    const game = launch(TEXT, 30);
    const { id } = game.getState().run.currentStage;
    typeText(game, TEXT);

    const debrief = game.getState().debrief;
    const entry = game.getState().profile.stagesProgress[id];
    expect(entry).toMatchObject({
      stageId: id,
      completed: true,
      timesPlayed: 1,
    });
    // Whatever Stars the Debrief shows (#36) are the ones the Save keeps, and
    // they count in the fleet's total.
    expect(entry.starsEarned).toBe(debrief?.starsEarned);
    expect(game.getState().profile.totalStars).toBe(debrief?.starsEarned);
  });
});

describe('where a Stage comes from', () => {
  it('a Stage picked from the curriculum is a Sector Stage', () => {
    const game = newGame();
    startStage(game, STAGE_ID);

    expect(game.getState().run.currentStage.origin).toBe('sector');
  });
});

describe('a Save with Free Flight results', () => {
  const customIds = Object.keys(FREE_FLIGHT_SAVE.stagesProgress).filter((id) =>
    id.startsWith('custom-'),
  );
  // That such a Save loads unchanged and keeps its Free Flight entries
  // through a later clear is in save.test.ts.

  it('adds a new Free Flight result beside the old ones', () => {
    const { game } = loadGame(FREE_FLIGHT_SAVE);
    game.send({ type: 'LAUNCH_FREE_FLIGHT', text: TEXT, targetWpm: 30 });
    const { id } = game.getState().run.currentStage;
    typeText(game, TEXT);

    const progress = game.getState().profile.stagesProgress;
    expect(Object.keys(progress)).toEqual(
      expect.arrayContaining([...customIds, id]),
    );
    expect(progress[id]).toMatchObject({ stageId: id, completed: true });
  });
});
