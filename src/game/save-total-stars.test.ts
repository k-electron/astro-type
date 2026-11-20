import { describe, expect, it } from 'vitest';
import { completeSave } from '../../tests/shared/saves';
import { exportBackup } from './save';
import {
  clearStage,
  loadGame,
  startStage,
  STAGE_ID,
} from '../../tests/shared/testHelpers';

// The total of Stars is worked out from the Stages' Stars whenever it is
// needed, so neither the Save the game writes nor the Backup it exports
// carries one. A Save or Backup that still says `totalStars` loads (the header
// in tests/dom/profile.test.tsx covers the Backup) and the Stages' Stars win
// over whatever it claimed.

describe('the Save the game writes', () => {
  it('has no total of Stars, whatever the Save it read claimed', () => {
    const { game, storage } = loadGame({ ...completeSave(), totalStars: 40 });

    game.buy('sensors'); // the game saves
    expect(storage.saved).not.toHaveProperty('totalStars');

    startStage(game, STAGE_ID);
    clearStage(game, { seconds: 60 });
    expect(storage.saved).not.toHaveProperty('totalStars');
  });
});

describe('the Backup the game exports', () => {
  it('has no total of Stars, even from a Profile loaded from a Backup that had one', () => {
    const save = completeSave();
    const { game } = loadGame();
    game.importBackup(JSON.stringify({ ...save, totalStars: 99 }));

    const backup = JSON.parse(exportBackup(game.getState().profile));

    expect(backup).not.toHaveProperty('totalStars');
    expect(backup.totalCredits).toBe(save.totalCredits);
    expect(backup.stagesProgress).toEqual(save.stagesProgress);
  });
});
