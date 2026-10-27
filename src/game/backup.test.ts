import { describe, expect, it } from 'vitest';
import {
  clearedStages,
  OLD_DRONE_SPEEDS,
  OLD_LIVE_EXPORT,
  withOldDroneSpeed,
} from '../../tests/shared/saves';
import { exportBackup, REFUSED_BACKUP_MESSAGE } from './save';
import { loadGame } from './testHelpers';

// A Backup is the Profile exported to a file (ticket #25). The browser journeys
// check what the player sees; these check the Profile and the Save directly.

const gameWith = (save?: Record<string, unknown>) => loadGame(save);

describe('importing a Backup', () => {
  it('brings back the Profile it was exported from, and saves it', () => {
    const { game: playedGame } = gameWith({
      totalCredits: 900,
      ...clearedStages({ 's1-l1': 3 }),
    });
    const backup = exportBackup(playedGame.getProfile());
    expect(JSON.parse(backup).version).toBe(1);

    const { game, storage } = gameWith();
    const outcome = game.importBackup(backup);

    expect(outcome.ok).toBe(true);
    expect(game.getProfile().totalStars).toBe(3);
    expect(game.getProfile().totalCredits).toBe(900);
    expect(storage.saved?.totalCredits).toBe(900);
  });

  it('reads a Backup exported before versions existed as version 1', () => {
    const { game } = gameWith();
    const unversioned = JSON.stringify({
      totalCredits: 50,
      ...clearedStages({ 's1-l1': 2 }),
    });

    expect(game.importBackup(unversioned).ok).toBe(true);
    expect(game.getProfile().version).toBe(1);
    expect(game.getProfile().totalStars).toBe(2);
  });

  it('reads an export of the live game from before versions existed, and saves it as version 1', () => {
    const { game, storage } = gameWith({
      totalCredits: 7,
      ...clearedStages({ 's1-l2': 1 }),
    });

    const outcome = game.importBackup(JSON.stringify(OLD_LIVE_EXPORT));

    expect(outcome.ok).toBe(true);
    const profile = game.getProfile();
    expect(profile.version).toBe(1);
    expect(profile.totalStars).toBe(3);
    expect(profile.totalCredits).toBe(491);
    expect(profile.stagesProgress['s1-l1']?.bestWpm).toBe(82);
    expect(profile.stagesProgress['s1-l2']).toBeUndefined();
    expect(storage.saved?.version).toBe(1);
    expect(storage.saved?.totalCredits).toBe(491);
  });

  // Backups made when the player could choose a Drone speed carry it. Every
  // Run now moves at one speed, so the Backup loads with its progress and the
  // field is left behind, in the Save and in the next Backup.
  it.each(OLD_DRONE_SPEEDS)(
    'reads an old Backup carrying the %s speed, keeps its progress, and leaves the speed behind',
    (speed) => {
      const { game, storage } = gameWith();

      const outcome = game.importBackup(
        JSON.stringify(withOldDroneSpeed(OLD_LIVE_EXPORT, speed)),
      );

      expect(outcome.ok).toBe(true);
      const profile = game.getProfile();
      expect(profile.totalStars).toBe(3);
      expect(profile.totalCredits).toBe(491);
      expect(profile.stagesProgress['s1-l1']?.bestWpm).toBe(82);
      expect(profile).not.toHaveProperty('highwaySpeed');
      expect(storage.saved?.totalCredits).toBe(491);
      expect(storage.saved).not.toHaveProperty('highwaySpeed');
      expect(JSON.parse(exportBackup(profile))).not.toHaveProperty(
        'highwaySpeed',
      );
    },
  );

  it('reads a versioned Backup carrying a speed the same way', () => {
    const { game: playedGame } = gameWith({
      totalCredits: 900,
      ...clearedStages({ 's1-l1': 3, 's1-l2': 2 }),
    });
    const backup = withOldDroneSpeed(
      JSON.parse(exportBackup(playedGame.getProfile())),
      'HYPER',
    );

    const { game, storage } = gameWith();
    const outcome = game.importBackup(JSON.stringify(backup));

    expect(outcome.ok).toBe(true);
    expect(backup.version).toBe(1);
    expect(game.getProfile().totalStars).toBe(5);
    expect(game.getProfile().totalCredits).toBe(900);
    expect(storage.saved).not.toHaveProperty('highwaySpeed');
  });

  it("reads this game's own Backup with the version taken off, as an old export", () => {
    const { game: playedGame } = gameWith({
      totalCredits: 900,
      ...clearedStages({ 's1-l1': 3, 's1-l2': 2 }),
      upgrades: { deflectorShields: 2 },
    });
    const { version: _version, ...oldExport } = JSON.parse(
      exportBackup(playedGame.getProfile()),
    );

    const { game, storage } = gameWith();
    const outcome = game.importBackup(JSON.stringify(oldExport));

    expect(outcome.ok).toBe(true);
    expect(game.getProfile().totalStars).toBe(5);
    expect(game.getProfile().totalCredits).toBe(900);
    expect(game.getProfile().upgrades.deflectorShields).toBe(2);
    expect(storage.saved?.version).toBe(1);
  });

  // A file with no version has to hold real Profile content: a wrong file
  // must not quietly reset the Profile to its defaults.
  it.each([
    ['an empty object', '{}'],
    ['an empty list', '[]'],
    ['an object with only unknown keys', '{"foo":1,"hello":"world"}'],
    [
      "some other program's JSON",
      '{"name":"my-app","private":true,"dependencies":{"react":"^19.0.0"}}',
    ],
  ])('refuses %s, leaving the Profile and the Save untouched', (_, text) => {
    const { game, storage } = gameWith({
      totalCredits: 321,
      ...clearedStages({ 's1-l1': 3 }),
    });
    const before = game.getProfile();

    const outcome = game.importBackup(text);

    expect(outcome.ok).toBe(false);
    expect(outcome.ok === false && outcome.message).toBe(
      REFUSED_BACKUP_MESSAGE,
    );
    expect(game.getProfile()).toEqual(before);
    expect(game.getProfile().totalCredits).toBe(321);
    expect(storage.saved).toBeNull();
  });

  it.each([
    ['not JSON', '{"totalCredits": 5'],
    ['an unknown version', JSON.stringify({ version: 2, totalCredits: 5 })],
    ['a wrong field', JSON.stringify({ totalCredits: 'lots' })],
    ['not an object', 'null'],
    ['an empty file', ''],
  ])('refuses %s, leaving the Profile and the Save untouched', (_, text) => {
    const { game, storage } = gameWith({
      totalCredits: 321,
      ...clearedStages({ 's1-l1': 3 }),
    });
    const before = game.getProfile();

    const outcome = game.importBackup(text);

    expect(outcome.ok).toBe(false);
    expect(outcome.ok === false && outcome.message).toBeTruthy();
    expect(game.getProfile()).toEqual(before);
    expect(storage.saved).toBeNull();
  });
});
