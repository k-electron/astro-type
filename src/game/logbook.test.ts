import { describe, expect, it } from 'vitest';
import { CURRICULUM_SECTORS, getStageById } from '../curriculum/curriculum';
import { completeSave } from '../../tests/shared/saves';
import {
  clearStage,
  dayClock,
  loadGame,
  newGame,
  STAGE_ID,
  startFreeFlight,
  startStage,
  TEST_DAY,
  typeText,
} from '../../tests/shared/testHelpers';
import { createSteppedClock } from './clock';
import { DEFAULT_PROFILE, SAVE_VERSION } from './schemas';

/**
 * The Logbook as the `Game` keeps it (#155): a cleared Run folds in at the
 * clear, an abandoned one never does, and the Profile's wipes and Backup treat
 * it as the Glossary says. What the fold makes of a Run, and what it keeps and
 * forgets, is in src/analytics/logbook.test.ts.
 */

const logbookOf = (game: ReturnType<typeof newGame>) =>
  game.getState().profile.logbook;

describe('a cleared Run', () => {
  it('is in the Logbook with the Sector and Stage it was flown on, and saved with it', () => {
    const { game, storage } = loadGame();
    startStage(game, STAGE_ID);

    clearStage(game, { seconds: 60 });

    const stage = getStageById(STAGE_ID);
    const sector = CURRICULUM_SECTORS.find(({ id }) => id === stage?.sectorId);
    expect(logbookOf(game).runs).toHaveLength(1);
    expect(logbookOf(game).runs[0]).toMatchObject({
      day: TEST_DAY,
      where: {
        sector: { id: sector?.id, name: sector?.name },
        stage: { id: stage?.id, name: stage?.title },
      },
    });
    expect(storage.saved?.logbook).toEqual(logbookOf(game));
    expect(storage.saved?.version).toBe(SAVE_VERSION);
  });

  it("starts its Sector's summary, with the Stage's own keys as the ones the Sector brought in, and saves it", () => {
    const { game, storage } = loadGame();
    startStage(game, STAGE_ID);

    clearStage(game, { seconds: 60 });

    const stage = getStageById(STAGE_ID);
    const sector = CURRICULUM_SECTORS.find(({ id }) => id === stage?.sectorId);
    const [summary] = logbookOf(game).sectors;
    expect(logbookOf(game).sectors).toHaveLength(1);
    expect(summary).toMatchObject({
      id: sector?.id,
      name: sector?.name,
      days: 1,
      runs: 1,
    });
    // Every key of a new player's first Run is new to them.
    expect(summary.keysBroughtIn.length).toBeGreaterThan(0);
    expect(storage.saved?.logbook.sectors).toEqual(logbookOf(game).sectors);
  });

  it('is a Free Flight with no Sector, and still in the Logbook', () => {
    const game = newGame();
    startFreeFlight(game, 'ab ba');

    typeText(game, 'ab ba');

    expect(logbookOf(game).runs).toHaveLength(1);
    expect(logbookOf(game).runs[0].where).toBeNull();
    expect(logbookOf(game).lifetime.runs).toBe(1);
    expect(logbookOf(game).sectors).toEqual([]);
  });

  it('is logged on the day it was cleared, even when it began the day before', () => {
    // Local 23:59:55: a Run of about ten seconds is cleared after midnight.
    const clock = createSteppedClock(
      new Date(2026, 10, 23, 23, 59, 55).getTime(),
    );
    const { game } = loadGame(undefined, undefined, clock);
    startFreeFlight(game, 'ab');
    game.step(30);
    game.pressKey('a');
    game.step(600);
    game.pressKey('b');

    expect(logbookOf(game).runs.map(({ day }) => day)).toEqual(['2026-11-24']);
  });

  it('is logged on the day it began when it is cleared before midnight', () => {
    const clock = createSteppedClock(
      new Date(2026, 10, 23, 23, 59, 55).getTime(),
    );
    const { game } = loadGame(undefined, undefined, clock);
    startFreeFlight(game, 'ab');

    typeText(game, 'ab');

    expect(logbookOf(game).runs.map(({ day }) => day)).toEqual(['2026-11-23']);
  });
});

describe('an abandoned Run', () => {
  it('leaves nothing in the Logbook, however much of it was typed', () => {
    const game = newGame();
    startStage(game, STAGE_ID);
    game.step(30);
    game.pressKey(getStageById(STAGE_ID)?.sampleText[0] ?? '');
    game.step(30);
    game.pressKey('x');

    game.send({ type: 'PRESS_HOME' });

    expect(logbookOf(game)).toEqual(DEFAULT_PROFILE.logbook);
  });
});

describe("the Game's day", () => {
  it('is the local calendar day of the wall clock, read at each move', () => {
    const clock = dayClock('2026-11-23');
    const { game } = loadGame(undefined, undefined, clock);
    expect(game.getState().today).toBe('2026-11-23');

    clock.setDay('2026-12-31');
    game.step(1);

    expect(game.getState().today).toBe('2026-12-31');
  });
});

describe('Wipe Stars and Factory Reset', () => {
  it('Wipe Stars leaves the Logbook as it was and wipes the Stars', () => {
    const save = completeSave();
    const { game } = loadGame(save);

    game.wipeAchievements();

    expect(game.getState().profile.totalStars).toBe(0);
    expect(logbookOf(game)).toEqual(save.logbook);
  });

  it('Factory Reset clears the Logbook with the rest of the Profile', () => {
    const { game, storage } = loadGame(completeSave());

    game.resetProgress();

    expect(logbookOf(game)).toEqual(DEFAULT_PROFILE.logbook);
    expect(storage.saved?.logbook).toEqual(DEFAULT_PROFILE.logbook);
  });
});
