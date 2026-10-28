import { describe, expect, it } from 'vitest';
import { completeSave, OLD_LIVE_EXPORT } from '../../tests/shared/saves';
import { exportBackup } from './save';
import { clearStage, loadGame, startStage, STAGE_ID } from './testHelpers';

// The total of Stars is worked out from the Stages' Stars whenever it is
// needed, so neither the Save the game writes nor the Backup it exports
// carries one. Saves and Backups made before still say `totalStars`; they load
// (save.test.ts, backup.test.ts, and the header in tests/dom/profile.test.tsx)
// and the Stages' Stars win over whatever they claimed.

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
  it('has no total of Stars, even from a Profile loaded from an export that had one', () => {
    const { game } = loadGame();
    game.importBackup(JSON.stringify({ ...OLD_LIVE_EXPORT, totalStars: 99 }));

    const backup = JSON.parse(exportBackup(game.getState().profile));

    expect(backup).not.toHaveProperty('totalStars');
    expect(backup.totalCredits).toBe(OLD_LIVE_EXPORT.totalCredits);
    expect(backup.stagesProgress).toEqual(OLD_LIVE_EXPORT.stagesProgress);
  });
});
