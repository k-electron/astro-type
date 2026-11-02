import { describe, expect, it } from 'vitest';
import { CURRICULUM_SECTORS } from '../curriculum/curriculum';
import {
  clearedStages,
  EVERY_STAGE_CLEARED,
  RETURNING_PLAYER,
} from '../../tests/shared/saves';
import { type PlayerEvent, RefusedMoveError } from './game';
import {
  type Game,
  newGame,
  startFreeFlight,
  startStage,
  typeText,
} from '../../tests/shared/testHelpers';

const NEXT_STAGE: PlayerEvent = { type: 'PRESS_NEXT_STAGE' };
const OPEN_GALAXY_MAP: PlayerEvent = { type: 'OPEN_GALAXY_MAP' };
const CLOSE: PlayerEvent = { type: 'PRESS_CLOSE' };

/** Sector 02 opens at 6 Stars, a rule number (the curriculum integrity check holds the table). */
const SECTOR_TWO_STARS = 6;

const sectorOneEnd =
  CURRICULUM_SECTORS[0].stages[CURRICULUM_SECTORS[0].stages.length - 1];
const sectorTwoStart = CURRICULUM_SECTORS[1].stages[0];
const lastStage = (() => {
  const sector = CURRICULUM_SECTORS[CURRICULUM_SECTORS.length - 1];
  return sector.stages[sector.stages.length - 1];
})();

/** Clear a Sector Stage by typing its text at the Strike Line's pace; its Debrief is then showing. */
function clearSectorStage(game: Game, stageId: string, stepsPerKey?: number) {
  startStage(game, stageId);
  const stage = game.getState().run.currentStage;
  typeText(game, stage.sampleText, stepsPerKey);
  expect(game.getState().screen, stageId).toBe('debrief');
}

/**
 * Press Next Stage where it has nothing to start. Whether the machine refuses
 * the move or ignores it is its own business; what matters is that the player
 * is left on the same Debrief, with the same Run, and no Stage began.
 */
function expectNextStageStartsNothing(game: Game) {
  const before = game.getState();
  try {
    game.send(NEXT_STAGE);
  } catch (error) {
    if (!(error instanceof RefusedMoveError)) throw error;
  }
  const after = game.getState();
  expect(after.screen).toBe('debrief');
  expect(after.phase).toBe('cleared');
  expect(after.run.currentStage.id).toBe(before.run.currentStage.id);
  expect(after.debrief).toEqual(before.debrief);
}

describe('Next Stage in front of a locked Sector', () => {
  it('is not offered after the last Stage of a Sector while the next Sector is locked, and starts nothing', () => {
    // A fresh Profile: one Stage's 3 Stars at most, short of Sector 02's 6.
    const game = newGame();

    clearSectorStage(game, sectorOneEnd.id);

    expect(game.getState().profile.totalStars).toBeLessThan(SECTOR_TWO_STARS);
    expect(game.getState().stageAhead).not.toBe('next-stage');
    expectNextStageStartsNothing(game);
    expect(game.getState().run.currentStage.id).not.toBe(sectorTwoStart.id);
  });

  it('is offered, and starts the Sector, when the Save already holds the Stars', () => {
    // 6 Stars before the clear: Sector 02 is open.
    const game = newGame(clearedStages({ 's1-l1': 3, 's1-l2': 3 }));
    clearSectorStage(game, sectorOneEnd.id);
    expect(game.getState().stageAhead).toBe('next-stage');

    game.send(NEXT_STAGE);

    expect(game.getState().screen).toBe('flight-deck');
    expect(game.getState().run.currentStage.id).toBe(sectorTwoStart.id);
  });

  it('is offered when the clear itself takes the Stars to the gate', () => {
    // 5 Stars so far; clearing the Stage adds at least 1, which opens Sector 02.
    const game = newGame(RETURNING_PLAYER);
    clearSectorStage(game, sectorOneEnd.id);
    expect(game.getState().debrief?.unlockedSector).toBe(true);
    expect(game.getState().stageAhead).toBe('next-stage');

    game.send(NEXT_STAGE);

    expect(game.getState().run.currentStage.id).toBe(sectorTwoStart.id);
  });
});

describe('Next Stage with nothing after it', () => {
  it('on the last Stage starts nothing: the Galaxy Map is its own button, and Close returns to the Debrief', () => {
    const game = newGame(EVERY_STAGE_CLEARED);
    clearSectorStage(game, lastStage.id);
    expect(game.getState().stageAhead).not.toBe('next-stage');
    expectNextStageStartsNothing(game);

    game.send(OPEN_GALAXY_MAP);
    expect(game.getState().screen).toBe('galaxy-map');
    game.send(CLOSE);

    expect(game.getState().screen).toBe('debrief');
  });

  it('on a Free Flight Debrief starts nothing either', () => {
    const text = 'ab ba';
    const game = newGame();
    startFreeFlight(game, text);
    typeText(game, text);
    expect(game.getState().screen).toBe('debrief');

    expect(game.getState().stageAhead).not.toBe('next-stage');
    expectNextStageStartsNothing(game);
  });
});
