import { describe, expect, it } from 'vitest';
import {
  completeSave,
  FREE_FLIGHT_SAVE,
  OLD_DRONE_SPEEDS,
  RETURNING_PLAYER,
  stageProgress,
  withOldDroneSpeed,
} from '../../tests/shared/saves';
import type { Game } from './createGame';
import { DEFAULT_PROFILE } from './profile';
import { UNREADABLE_SAVE_NOTICE } from './save';
import { clearStage, loadGame, startStage, STAGE_ID } from './testHelpers';

// The Save is the Profile as stored in the player's browser (ticket #24).
// These tests load Saves through the headless game, the way the app does.

const load = (save?: unknown) => loadGame(save);

type ReturningSave = ReturnType<typeof completeSave>;

function withUpgrades(
  save: ReturningSave,
  upgrades: Partial<ReturningSave['upgrades']>,
) {
  return { ...save, upgrades: { ...save.upgrades, ...upgrades } };
}

/** The Save with the given top-level fields taken out. */
function without(save: ReturningSave, ...fields: string[]) {
  return Object.fromEntries(
    Object.entries(save).filter(([key]) => !fields.includes(key)),
  );
}

function expectFreshProfile(game: Game) {
  expect(game.getState().profile).toEqual(DEFAULT_PROFILE);
}

describe('a Save that is readable', () => {
  it('loads a returning player’s Save in today’s format, unchanged and without a notice', () => {
    const { game, storage } = load(completeSave());

    const profile = game.getState().profile;
    expect(profile.totalCredits).toBe(1234);
    expect(profile.totalStars).toBe(5);
    expect(profile.stagesProgress['s1-l1'].starsEarned).toBe(3);
    expect(profile.stagesProgress['s1-l2'].starsEarned).toBe(2);
    expect(profile.upgrades.deflectorShields).toBe(1);
    expect(profile.upgrades.hyperdriveReactor).toBe(2);
    expect(profile.globalMuted).toBe(true);
    expect(game.getState().loadNotice).toBeNull();
    expect(storage.movedAside).toBeUndefined();
  });

  it('reads a Save that says version 1 the same way', () => {
    const { game } = load({ ...completeSave(), version: 1 });

    expect(game.getState().profile.totalStars).toBe(5);
    expect(game.getState().profile.totalCredits).toBe(1234);
    expect(game.getState().loadNotice).toBeNull();
  });

  it('starts a player with no Save fresh, without a notice', () => {
    const { game, storage } = load(undefined);

    expectFreshProfile(game);
    expect(game.getState().loadNotice).toBeNull();
    expect(storage.movedAside).toBeUndefined();
  });

  it('writes an unversioned Save back as version 1', () => {
    const { game, storage } = load(completeSave());

    // 1,234 Credits buys the first sensors Upgrade (200), which saves.
    game.buy('sensors');

    expect(storage.saved?.version).toBe(1);
  });

  it('keeps a Stage-progress entry whose id is not in the curriculum, as a Free Flight entry is', () => {
    const save = completeSave();
    const { game } = load({
      ...save,
      stagesProgress: {
        ...save.stagesProgress,
        'custom-1792904921385': stageProgress('custom-1792904921385', 1),
      },
    });

    expect(game.getState().loadNotice).toBeNull();
    expect(
      game.getState().profile.stagesProgress['custom-1792904921385']
        .starsEarned,
    ).toBe(1);
    expect(game.getState().profile.totalStars).toBe(6);
  });

  it('loads a production Save with Free Flight results, each `custom-` entry as it was written', () => {
    const { game } = load(FREE_FLIGHT_SAVE);

    expect(game.getState().loadNotice).toBeNull();
    expect(game.getState().profile.stagesProgress).toEqual(
      FREE_FLIGHT_SAVE.stagesProgress,
    );
    expect(game.getState().profile.totalStars).toBe(
      FREE_FLIGHT_SAVE.totalStars,
    );
  });

  it('keeps the Free Flight results when the next write goes out', () => {
    const { game, storage } = load(FREE_FLIGHT_SAVE);
    startStage(game, STAGE_ID);
    clearStage(game, { seconds: 60 });

    expect(game.getState().screen).toBe('debrief');
    const customEntries = Object.fromEntries(
      Object.entries(FREE_FLIGHT_SAVE.stagesProgress).filter(([id]) =>
        id.startsWith('custom-'),
      ),
    );
    expect(Object.keys(customEntries)).toHaveLength(2);
    expect(storage.saved?.stagesProgress).toMatchObject(customEntries);
  });

  it('accepts Upgrades at level 3', () => {
    const { game } = load(
      withUpgrades(completeSave(), {
        deflectorShields: 3,
        hyperdriveReactor: 3,
        precisionSensors: 3,
      }),
    );

    expect(game.getState().loadNotice).toBeNull();
    expect(game.getState().profile.upgrades.deflectorShields).toBe(3);
  });

  it('drops fields the Save does not define, and writes them back no more', () => {
    const save = completeSave();
    const { game, storage } = load({
      ...save,
      cheatCode: 'xyzzy',
      stagesProgress: {
        ...save.stagesProgress,
        's1-l1': { ...save.stagesProgress['s1-l1'], bonusStars: 99 },
      },
      upgrades: { ...save.upgrades, warpDrive: 4 },
    });

    expect(game.getState().loadNotice).toBeNull();
    expect(game.getState().profile).not.toHaveProperty('cheatCode');
    expect(game.getState().profile.stagesProgress['s1-l1']).not.toHaveProperty(
      'bonusStars',
    );
    expect(game.getState().profile.upgrades).not.toHaveProperty('warpDrive');

    game.buy('sensors');
    expect(storage.saved).not.toHaveProperty('cheatCode');
    expect(JSON.stringify(storage.saved)).not.toMatch(
      /xyzzy|bonusStars|warpDrive/,
    );
  });
});

describe('a Save made when the player could choose a Drone speed', () => {
  // Every Run now moves at one speed, so a Save no longer has a speed setting.
  // The old field is simply left behind: whatever it says, the Save loads.
  it.each([
    ...OLD_DRONE_SPEEDS,
    'WARP', // not a speed the game ever had; nothing reads the field now
  ])(
    'with %s loads with its progress and settings, and saves without the speed',
    (speed) => {
      const { game, storage } = load(withOldDroneSpeed(completeSave(), speed));

      const profile = game.getState().profile;
      expect(game.getState().loadNotice).toBeNull();
      expect(storage.movedAside).toBeUndefined();
      expect(profile.totalStars).toBe(5);
      expect(profile.totalCredits).toBe(1234);
      expect(profile.stagesProgress['s1-l1'].starsEarned).toBe(3);
      expect(profile.upgrades.deflectorShields).toBe(1);
      expect(profile.globalMuted).toBe(true);
      expect(profile).not.toHaveProperty('highwaySpeed');

      // Saving again writes the Save back without the speed.
      game.buy('sensors');
      expect(storage.saved?.totalStars).toBe(5);
      expect(storage.saved).not.toHaveProperty('highwaySpeed');
    },
  );
});

describe('a Save with a field missing', () => {
  // The settings the Save carries. `completeSave` sets each of them to
  // something other than its default.
  const SETTINGS = [
    'soundEnabled',
    'soundVolume',
    'ambientMusicVolume',
    'keyboardVisible',
    'handsVisible',
    'musicEnabled',
    'musicVolume',
    'beatTheme',
    'globalMuted',
  ] as const;

  it.each(SETTINGS)(
    'takes the default for a missing %s and keeps the rest',
    (field) => {
      const { game } = load(without(completeSave(), field));

      expect(game.getState().loadNotice).toBeNull();
      expect(game.getState().profile[field]).toEqual(DEFAULT_PROFILE[field]);
      expect(game.getState().profile.totalCredits).toBe(
        RETURNING_PLAYER.totalCredits,
      );
      expect(game.getState().profile.totalStars).toBe(5);
    },
  );

  it('takes the default for missing Credits, Stage progress and key stats', () => {
    const { game } = load(
      without(completeSave(), 'totalCredits', 'stagesProgress', 'keyAnalytics'),
    );

    const profile = game.getState().profile;
    expect(game.getState().loadNotice).toBeNull();
    expect(profile.totalCredits).toBe(0);
    expect(profile.stagesProgress).toEqual({});
    expect(profile.keyAnalytics).toEqual({});
    expect(profile.totalStars).toBe(0);
  });

  it('takes the default Upgrades when the Upgrades are missing', () => {
    const { game } = load(without(completeSave(), 'upgrades'));

    expect(game.getState().loadNotice).toBeNull();
    expect(game.getState().profile.upgrades.deflectorShields).toBe(0);
    expect(game.getState().profile.upgrades.hyperdriveReactor).toBe(0);
    expect(game.getState().profile.upgrades.precisionSensors).toBe(0);
    expect(game.getState().profile.totalCredits).toBe(1234);
  });
});

describe('a Save that cannot be read', () => {
  const unreadable: Array<[string, unknown]> = [
    ['Credits that are text', { ...completeSave(), totalCredits: '1234' }],
    ['negative Credits', { ...completeSave(), totalCredits: -5 }],
    [
      'a Stage with more than 3 Stars',
      {
        ...completeSave(),
        stagesProgress: { 's1-l1': stageProgress('s1-l1', 4) },
      },
    ],
    [
      'a Stage-progress entry that is not an entry',
      { ...completeSave(), stagesProgress: { 's1-l1': 'done' } },
    ],
    [
      'a shield Upgrade at level 4',
      withUpgrades(completeSave(), { deflectorShields: 4 }),
    ],
    [
      'a reactor Upgrade at level 7',
      withUpgrades(completeSave(), { hyperdriveReactor: 7 }),
    ],
    [
      'a sensors Upgrade at level -1',
      withUpgrades(completeSave(), { precisionSensors: -1 }),
    ],
    [
      'an Upgrade level that is text',
      withUpgrades(completeSave(), { deflectorShields: '2' as never }),
    ],
    [
      'a sound setting that is text',
      { ...completeSave(), soundEnabled: 'yes' },
    ],
    [
      'Stage progress that is a list',
      { ...completeSave(), stagesProgress: [] },
    ],
    ['an unknown version', { ...completeSave(), version: 2 }],
    ['version 0', { ...completeSave(), version: 0 }],
    ['a version that is text', { ...completeSave(), version: '1' }],
    ['a list instead of a Save', []],
    ['text instead of a Save', 'my progress'],
  ];

  it.each(unreadable)(
    'with %s: shows the notice, starts fresh and moves the Save aside',
    (_what, bad) => {
      const { game, storage } = load(bad);

      expect(game.getState().loadNotice).toBe(UNREADABLE_SAVE_NOTICE);
      expectFreshProfile(game);
      expect(storage.movedAside).toEqual(bad);
    },
  );

  it('still plays from the fresh start, and keeps the bad Save as it was found', () => {
    const bad = { ...completeSave(), totalCredits: 'lots' };
    const { game, storage } = load(bad);

    startStage(game, STAGE_ID);
    clearStage(game, { seconds: 60 });

    expect(game.getState().profile.stagesProgress[STAGE_ID].starsEarned).toBe(
      3,
    );
    expect(game.getState().profile.totalStars).toBe(3);
    expect(storage.movedAside).toEqual(bad);
  });
});

describe('total Stars', () => {
  it('are computed from the Stage progress when the Save claims more', () => {
    const { game } = load({ ...completeSave(), totalStars: 40 });

    expect(game.getState().profile.totalStars).toBe(5);
    expect(game.getState().loadNotice).toBeNull();
  });

  it('are computed from the Stage progress when the Save claims fewer', () => {
    const { game } = load({ ...completeSave(), totalStars: 0 });

    expect(game.getState().profile.totalStars).toBe(5);
  });

  it('are computed when the Save does not carry them', () => {
    const { game } = load(without(completeSave(), 'totalStars'));

    expect(game.getState().profile.totalStars).toBe(5);
    expect(game.getState().loadNotice).toBeNull();
  });

  it('count a Stage cleared with 0 Stars as 0', () => {
    const save = completeSave();
    const { game } = load({
      ...save,
      stagesProgress: { 's1-l1': stageProgress('s1-l1', 0) },
    });

    expect(game.getState().profile.totalStars).toBe(0);
  });
});
