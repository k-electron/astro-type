import { describe, expect, it } from 'vitest';
import {
  clearedStages,
  completeSave,
  OLD_LIVE_EXPORT,
} from '../../tests/shared/saves';
import { DEFAULT_TRAIL } from './catalog';
import { DEFAULT_PROFILE, SAVE_VERSION } from './schemas';
import {
  exportBackup,
  NEWER_BACKUP_MESSAGE,
  NOT_A_BACKUP_MESSAGE,
  OLDER_BACKUP_MESSAGE,
} from './save';
import { type Game, loadGame } from '../../tests/shared/testHelpers';

// A Backup is the Profile exported to a file (ticket #25). The browser journeys
// check what the player sees; these check the Profile and the Save directly.

const gameWith = (save?: Record<string, unknown>) => loadGame(save);

// What the Save and a Backup hold: the Profile without the derived total of Stars.
type Profile = Omit<ReturnType<Game['getState']>['profile'], 'totalStars'>;

describe('importing a Backup', () => {
  it('brings back the Profile it was exported from, and saves it', () => {
    const { game: playedGame } = gameWith({
      totalCredits: 900,
      ...clearedStages({ 's1-l1': 3 }),
    });
    const backup = exportBackup(playedGame.getState().profile);
    expect(JSON.parse(backup).version).toBe(SAVE_VERSION);

    const { game, storage } = gameWith();
    const outcome = game.importBackup(backup);

    expect(outcome.ok).toBe(true);
    expect(game.getState().profile.totalStars).toBe(3);
    expect(game.getState().profile.totalCredits).toBe(900);
    expect(storage.saved?.totalCredits).toBe(900);
  });

  it('brings back the lifetime characters typed and Miss marks it was exported with', () => {
    const save = completeSave();
    const { game: playedGame } = gameWith(save);
    const backup = exportBackup(playedGame.getState().profile);

    const { game, storage } = gameWith();
    game.importBackup(backup);

    const profile = game.getState().profile;
    expect(profile.totalCharactersTyped).toBe(save.totalCharactersTyped);
    expect(profile.totalMissMarks).toBe(save.totalMissMarks);
    expect(storage.saved?.totalCharactersTyped).toBe(save.totalCharactersTyped);
    expect(storage.saved?.totalMissMarks).toBe(save.totalMissMarks);
  });

  it('keeps the Credits, Cosmetics, settings and key stats of a Backup, and the next Save and Backup keep them', () => {
    const save = completeSave();
    const { game, storage } = gameWith();

    game.importBackup(JSON.stringify(save));

    const SETTINGS = [
      'soundEnabled',
      'soundVolume',
      'keyboardVisible',
      'handsVisible',
      'musicEnabled',
      'musicVolume',
      'beatTheme',
      'globalMuted',
    ] as const;
    const expectIntact = (profile: Profile | null) => {
      expect(profile?.totalCredits).toBe(save.totalCredits);
      expect(profile?.cosmetics).toEqual(save.cosmetics);
      expect(profile?.keyAnalytics).toEqual(save.keyAnalytics);
      expect(profile?.stagesProgress).toEqual(save.stagesProgress);
      for (const field of SETTINGS) {
        expect(profile?.[field], field).toEqual(save[field]);
      }
    };
    expect(game.getState().loadNotice).toBeNull();
    expectIntact(game.getState().profile);
    expectIntact(storage.saved);
    expectIntact(JSON.parse(exportBackup(game.getState().profile)));
  });

  // A wrong field costs only that field (ticket #103), in a Backup as in the Save.
  it('imports a Backup with a wrong field, taking the default for that field only', () => {
    const { game, storage } = gameWith();
    const backup = { ...completeSave(), totalCredits: 'lots' };

    const outcome = game.importBackup(JSON.stringify(backup));

    expect(outcome.ok).toBe(true);
    const profile = game.getState().profile;
    expect(profile.totalCredits).toBe(DEFAULT_PROFILE.totalCredits);
    expect(profile.totalStars).toBe(5);
    expect(profile.cosmetics).toEqual(completeSave().cosmetics);
    expect(storage.saved?.totalCredits).toBe(DEFAULT_PROFILE.totalCredits);
    expect(storage.saved?.stagesProgress).toEqual(
      completeSave().stagesProgress,
    );
    expect(game.getState().loadNotice).toBeNull();
  });

  it('imports a Backup with a number out of range, clamped into range', () => {
    const { game } = gameWith();
    const backup = {
      ...completeSave(),
      totalCredits: -50,
      musicVolume: 4,
    };

    const outcome = game.importBackup(JSON.stringify(backup));

    expect(outcome.ok).toBe(true);
    const profile = game.getState().profile;
    expect(profile.totalCredits).toBe(0);
    expect(profile.musicVolume).toBe(1);
  });

  it('imports a Backup that equips a Trail the game does not have, with the default Trail', () => {
    const { game } = gameWith();
    const save = completeSave();
    const backup = {
      ...save,
      cosmetics: {
        ...save.cosmetics,
        trail: { equipped: 'GONE_TRAIL', owned: [DEFAULT_TRAIL, 'GONE_TRAIL'] },
      },
    };

    const outcome = game.importBackup(JSON.stringify(backup));

    expect(outcome.ok).toBe(true);
    const { cosmetics, totalCredits } = game.getState().profile;
    expect(cosmetics.trail).toEqual({
      equipped: DEFAULT_TRAIL,
      owned: [DEFAULT_TRAIL],
    });
    expect(cosmetics.hull).toEqual(save.cosmetics.hull);
    expect(totalCredits).toBe(1234);
  });

  it('exports the Cosmetics under their names, and no Upgrades', () => {
    const { game } = gameWith(completeSave());

    const backup = JSON.parse(exportBackup(game.getState().profile));

    expect(backup.cosmetics).toEqual(completeSave().cosmetics);
    expect(backup).not.toHaveProperty('upgrades');
  });

  // The one rule for a Backup's `version`: lower or missing is refused as made
  // before the rules changed, higher as made by a newer game, and a file that
  // is not a Backup at all (not JSON, not an object, a version that is not a
  // number) as not a Backup. Each leaves the Profile and the Save untouched.
  const refusals: Array<[string, string, string]> = [
    ...[
      ['a Backup exported before versions existed', OLD_LIVE_EXPORT],
      [
        'version 3, a Backup with Upgrades',
        {
          ...completeSave(),
          version: 3,
          upgrades: { deflectorShields: 1, overdriveReactor: 2 },
        },
      ],
      ['version 2', { ...completeSave(), version: 2 }],
      ['version 1', { ...completeSave(), version: 1 }],
      ['version 0', { ...completeSave(), version: 0 }],
      ['a fractional version below the current one', { version: 1.5 }],
      ['an empty object', {}],
      ['an object with only unknown keys', { foo: 1, hello: 'world' }],
      [
        "some other program's JSON",
        { name: 'my-app', private: true, dependencies: { react: '^19.0.0' } },
      ],
    ].map(([what, backup]): [string, string, string] => [
      what as string,
      JSON.stringify(backup),
      OLDER_BACKUP_MESSAGE,
    ]),
    ...[
      ['one version above the current one', SAVE_VERSION + 1],
      ['a far newer version', 99],
    ].map(([what, version]): [string, string, string] => [
      what as string,
      JSON.stringify({ ...completeSave(), version }),
      NEWER_BACKUP_MESSAGE,
    ]),
    ['not JSON', '{"totalCredits": 5', NOT_A_BACKUP_MESSAGE],
    ['an empty file', '', NOT_A_BACKUP_MESSAGE],
    ['null', 'null', NOT_A_BACKUP_MESSAGE],
    ['an empty list', '[]', NOT_A_BACKUP_MESSAGE],
    ['a number', '42', NOT_A_BACKUP_MESSAGE],
    ['a string', '"a string"', NOT_A_BACKUP_MESSAGE],
    [
      'a version that is the right number as text',
      JSON.stringify({ ...completeSave(), version: String(SAVE_VERSION) }),
      NOT_A_BACKUP_MESSAGE,
    ],
    [
      'a version that is null',
      JSON.stringify({ ...completeSave(), version: null }),
      NOT_A_BACKUP_MESSAGE,
    ],
  ];

  it.each(refusals)(
    'refuses %s, leaving the Profile and the Save untouched',
    (_what, text, message) => {
      const { game, storage } = gameWith({
        totalCredits: 321,
        ...clearedStages({ 's1-l1': 3 }),
      });
      const before = game.getState().profile;

      const outcome = game.importBackup(text);

      expect(outcome.ok).toBe(false);
      expect(outcome.ok === false && outcome.message).toBe(message);
      expect(game.getState().profile).toEqual(before);
      expect(game.getState().profile.totalCredits).toBe(321);
      expect(storage.saved).toBeNull();
    },
  );

  it("refuses this game's own Backup once its version is taken off, as made before the rules changed", () => {
    const { game: playedGame } = gameWith({
      totalCredits: 900,
      ...clearedStages({ 's1-l1': 3, 's1-l2': 2 }),
    });
    const { version: _version, ...unversioned } = JSON.parse(
      exportBackup(playedGame.getState().profile),
    );

    const { game, storage } = gameWith();
    const outcome = game.importBackup(JSON.stringify(unversioned));

    expect(outcome.ok === false && outcome.message).toBe(OLDER_BACKUP_MESSAGE);
    expect(game.getState().profile.totalCredits).toBe(0);
    expect(storage.saved).toBeNull();
  });
});
