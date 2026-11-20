import { describe, expect, it } from 'vitest';
import {
  completeSave,
  RETURNING_PLAYER,
  stageProgress,
} from '../../tests/shared/saves';
import { createMemoryStorage } from '../../tests/shared/memoryStorage';
import { DEFAULT_TRAIL, entriesOf, MAX_UPGRADE_LEVEL } from './catalog';
import { createSteppedClock } from './clock';
import { createGame, type Game } from './game';
import {
  clearedStagesOf,
  DEFAULT_PROFILE,
  SAVE_VERSION,
  SoundKitSchema,
} from './schemas';
import { UNREADABLE_SAVE_NOTICE } from './save';
import {
  clearStage,
  loadGame,
  startStage,
  STAGE_ID,
} from '../../tests/shared/testHelpers';

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
  expect(game.getState().profile).toEqual({
    ...DEFAULT_PROFILE,
    totalStars: 0,
  });
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
    expect(profile.upgrades.overdriveReactor).toBe(2);
    expect(profile.globalMuted).toBe(true);
    expect(game.getState().loadNotice).toBeNull();
    expect(storage.movedAside).toEqual([]);
  });

  it('starts a player with no Save fresh, without a notice', () => {
    const { game, storage } = load(undefined);

    expectFreshProfile(game);
    expect(game.getState().loadNotice).toBeNull();
    expect(storage.movedAside).toEqual([]);
  });

  it('writes the Save back as the current version, and reads what it wrote as the same Profile', () => {
    const { game, storage } = load(completeSave());

    // 1,234 Credits buys the first sensors Upgrade (200), which saves.
    game.buy('sensors');

    expect(storage.saved?.version).toBe(SAVE_VERSION);
    const nextVisit = createGame({ storage });
    expect(nextVisit.getState().loadNotice).toBeNull();
    expect(nextVisit.getState().profile).toEqual(game.getState().profile);
  });

  it('accepts Upgrades at level 3', () => {
    const { game } = load(
      withUpgrades(completeSave(), {
        deflectorShields: 3,
        overdriveReactor: 3,
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

describe('a Save with a field missing', () => {
  // The settings the Save carries. `completeSave` sets each of them to
  // something other than its default.
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
    expect(game.getState().profile.upgrades.overdriveReactor).toBe(0);
    expect(game.getState().profile.upgrades.precisionSensors).toBe(0);
    expect(game.getState().profile.totalCredits).toBe(1234);
  });
});

describe('a Save with a wrong field', () => {
  // A wrong field costs only that field (ticket #103): it takes its default, or
  // is clamped or floored into range, and everything else loads as it was
  // stored. Each row is a bad Save and the Save that it should read as; the two
  // must load to the same Profile, with no notice and nothing moved aside.
  const save = completeSave();
  const otherTrail = entriesOf('trail').find(
    (trail) => trail.id !== DEFAULT_TRAIL,
  )?.id;
  const otherKit = SoundKitSchema.options.find(
    (kit) => kit !== DEFAULT_PROFILE.upgrades.equippedAudioCore,
  );
  if (!otherTrail || !otherKit)
    throw new Error('The catalog has no spare Cosmetic');
  const owningCosmetics = withUpgrades(save, {
    equippedTrailTheme: otherTrail,
    unlockedThemes: [DEFAULT_TRAIL, otherTrail],
    equippedAudioCore: otherKit,
    unlockedAudioCores: [DEFAULT_PROFILE.upgrades.equippedAudioCore, otherKit],
  });
  const withStages = (stagesProgress: Record<string, unknown>) => ({
    ...save,
    stagesProgress,
  });
  const withKeys = (keyAnalytics: Record<string, unknown>) => ({
    ...save,
    keyAnalytics,
  });
  const clamped: Array<[string, unknown, unknown]> = [
    // Wrong type: the field's default.
    [
      'Credits that are text',
      { ...save, totalCredits: '1234' },
      without(save, 'totalCredits'),
    ],
    [
      'a sound setting that is text',
      { ...save, soundEnabled: 'yes' },
      without(save, 'soundEnabled'),
    ],
    [
      'a volume that is text',
      { ...save, musicVolume: 'loud' },
      without(save, 'musicVolume'),
    ],
    [
      'a count that is null',
      { ...save, totalCharactersTyped: null },
      without(save, 'totalCharactersTyped'),
    ],
    [
      'Stage progress that is a list',
      { ...save, stagesProgress: [] },
      without(save, 'stagesProgress'),
    ],
    [
      'Upgrades that are text',
      { ...save, upgrades: 'maxed' },
      without(save, 'upgrades'),
    ],
    [
      'an Upgrade level that is text',
      withUpgrades(save, { deflectorShields: '2' as never }),
      withUpgrades(save, { deflectorShields: 0 }),
    ],
    // Out of range: clamped.
    [
      'negative Credits',
      { ...save, totalCredits: -5 },
      { ...save, totalCredits: 0 },
    ],
    [
      'a negative count',
      { ...save, totalMissMarks: -1 },
      { ...save, totalMissMarks: 0 },
    ],
    [
      'a shield Upgrade above the maximum',
      withUpgrades(save, { deflectorShields: MAX_UPGRADE_LEVEL + 1 }),
      withUpgrades(save, { deflectorShields: MAX_UPGRADE_LEVEL }),
    ],
    [
      'a reactor Upgrade far above the maximum',
      withUpgrades(save, { overdriveReactor: 7 }),
      withUpgrades(save, { overdriveReactor: MAX_UPGRADE_LEVEL }),
    ],
    [
      'a sensors Upgrade below 0',
      withUpgrades(save, { precisionSensors: -1 }),
      withUpgrades(save, { precisionSensors: 0 }),
    ],
    [
      'a volume above 1',
      { ...save, soundVolume: 1.5 },
      { ...save, soundVolume: 1 },
    ],
    [
      'a volume below 0',
      { ...save, musicVolume: -0.2 },
      { ...save, musicVolume: 0 },
    ],
    [
      'a Stage with more than 3 Stars',
      withStages({
        ...save.stagesProgress,
        's1-l1': stageProgress('s1-l1', 4),
      }),
      withStages({
        ...save.stagesProgress,
        's1-l1': stageProgress('s1-l1', 3),
      }),
    ],
    [
      'a Stage with fewer than 0 Stars',
      withStages({
        ...save.stagesProgress,
        's1-l2': stageProgress('s1-l2', -1),
      }),
      withStages({
        ...save.stagesProgress,
        's1-l2': stageProgress('s1-l2', 0),
      }),
    ],
    [
      'an accuracy above 100',
      withStages({
        ...save.stagesProgress,
        's1-l1': stageProgress('s1-l1', 3, { bestAccuracy: 150 }),
      }),
      withStages({
        ...save.stagesProgress,
        's1-l1': stageProgress('s1-l1', 3, { bestAccuracy: 100 }),
      }),
    ],
    [
      'negative hits for a key',
      withKeys({ ...save.keyAnalytics, f: { hits: -3, misses: 1 } }),
      withKeys({ ...save.keyAnalytics, f: { hits: 0, misses: 1 } }),
    ],
    // Not a whole number where one is needed: rounded down.
    [
      'Credits with a fraction',
      { ...save, totalCredits: 12.7 },
      { ...save, totalCredits: 12 },
    ],
    [
      'an Upgrade level with a fraction',
      withUpgrades(save, { deflectorShields: 1.9 }),
      withUpgrades(save, { deflectorShields: 1 }),
    ],
    // An unknown name: the default.
    [
      'a beat theme the game does not have',
      { ...save, beatTheme: 'POLKA' },
      without(save, 'beatTheme'),
    ],
    [
      'an equipped Trail the game does not have',
      withUpgrades(owningCosmetics, {
        equippedTrailTheme: 'GONE_TRAIL' as never,
      }),
      withUpgrades(owningCosmetics, { equippedTrailTheme: DEFAULT_TRAIL }),
    ],
    [
      'an equipped Sound Kit the game does not have',
      withUpgrades(owningCosmetics, { equippedAudioCore: 'GONE_KIT' as never }),
      withUpgrades(owningCosmetics, {
        equippedAudioCore: DEFAULT_PROFILE.upgrades.equippedAudioCore,
      }),
    ],
    // An entry that is not an entry: dropped, and the rest kept.
    [
      'a Stage-progress entry that is text',
      withStages({ ...save.stagesProgress, 's1-l3': 'done' }),
      withStages(save.stagesProgress),
    ],
    [
      'a Stage-progress entry that is a list',
      withStages({ ...save.stagesProgress, 's1-l3': [3] }),
      withStages(save.stagesProgress),
    ],
    [
      'a key-stats entry that is a number',
      withKeys({ ...save.keyAnalytics, x: 5 }),
      withKeys(save.keyAnalytics),
    ],
    [
      'a key-stats entry that is a list',
      withKeys({ ...save.keyAnalytics, x: [1, 2] }),
      withKeys(save.keyAnalytics),
    ],
  ];

  it.each(clamped)(
    'with %s: loads as if only that field were repaired, without a notice',
    (_what, bad, repaired) => {
      const { game, storage } = load(bad);

      expect(game.getState().loadNotice).toBeNull();
      expect(storage.movedAside).toEqual([]);
      expect(storage.noticeFlagged).toBe(false);
      expect(game.getState().profile).toEqual(
        load(repaired).game.getState().profile,
      );
    },
  );

  it('keeps the progress and Credits around a wrong field', () => {
    const { game } = load({ ...save, soundVolume: 'quiet' });

    expect(game.getState().profile.totalStars).toBe(5);
    expect(game.getState().profile.totalCredits).toBe(1234);
    expect(game.getState().profile.soundVolume).toBe(
      DEFAULT_PROFILE.soundVolume,
    );
  });

  it('caps a reactor Upgrade above the maximum at the maximum, in the Save the game writes next', () => {
    const { game, storage } = load(withUpgrades(save, { overdriveReactor: 7 }));

    expect(game.getState().profile.upgrades.overdriveReactor).toBe(
      MAX_UPGRADE_LEVEL,
    );
    game.buy('sensors'); // 200 Credits, and the game saves
    expect(storage.saved?.upgrades.overdriveReactor).toBe(MAX_UPGRADE_LEVEL);
  });

  describe('in the lists of owned Cosmetics', () => {
    const sorted = (list: readonly string[]) => [...list].sort();

    it('drops an owned Trail the game does not have, and keeps the others', () => {
      const { game } = load(
        withUpgrades(owningCosmetics, {
          unlockedThemes: [DEFAULT_TRAIL, 'GONE_TRAIL', otherTrail] as never,
        }),
      );

      expect(game.getState().loadNotice).toBeNull();
      expect(sorted(game.getState().profile.upgrades.unlockedThemes)).toEqual(
        sorted([DEFAULT_TRAIL, otherTrail]),
      );
    });

    it('drops an owned Sound Kit the game does not have, and keeps the others', () => {
      const { game } = load(
        withUpgrades(owningCosmetics, {
          unlockedAudioCores: [
            DEFAULT_PROFILE.upgrades.equippedAudioCore,
            'GONE_KIT',
            otherKit,
          ] as never,
        }),
      );

      expect(game.getState().loadNotice).toBeNull();
      expect(
        sorted(game.getState().profile.upgrades.unlockedAudioCores),
      ).toEqual(sorted([DEFAULT_PROFILE.upgrades.equippedAudioCore, otherKit]));
    });

    it('always owns the default Trail and Sound Kit, even when the lists leave them out', () => {
      const { game } = load(
        withUpgrades(save, {
          equippedTrailTheme: DEFAULT_TRAIL,
          unlockedThemes: [otherTrail] as never,
          unlockedAudioCores: [otherKit] as never,
        }),
      );

      const upgrades = game.getState().profile.upgrades;
      expect(sorted(upgrades.unlockedThemes)).toEqual(
        sorted([DEFAULT_TRAIL, otherTrail]),
      );
      expect(sorted(upgrades.unlockedAudioCores)).toEqual(
        sorted([DEFAULT_PROFILE.upgrades.equippedAudioCore, otherKit]),
      );
    });

    it('owns only the defaults when a list is not a list', () => {
      const { game } = load(
        withUpgrades(save, {
          unlockedThemes: 'all' as never,
          unlockedAudioCores: 7 as never,
        }),
      );

      const upgrades = game.getState().profile.upgrades;
      expect(game.getState().loadNotice).toBeNull();
      expect(upgrades.unlockedThemes).toEqual([DEFAULT_TRAIL]);
      expect(upgrades.unlockedAudioCores).toEqual([
        DEFAULT_PROFILE.upgrades.equippedAudioCore,
      ]);
    });
  });
});

describe('a Save from before the game’s rules changed', () => {
  // An older Save (a lower version, or none) is not trusted to mean what its
  // numbers say now, so it is discarded: a fresh Profile, silently. Nothing is
  // moved aside, and the old value stays in storage until the next write
  // replaces it. The raw Save is built on the storage here, as no seeding
  // helper would write it.
  const save = completeSave();
  const older: Array<[string, unknown]> = [
    ['version 1', { ...save, version: 1 }],
    ['version 0', { ...save, version: 0 }],
    ['a fractional version below the current one', { ...save, version: 1.5 }],
    ['no version', without(save, 'version')],
    ['no version and nothing else', {}],
  ];

  it.each(older)(
    'with %s: starts fresh, with no notice, and writes nothing at load',
    (_what, raw) => {
      const storage = createMemoryStorage(raw);

      const game = createGame({ storage });

      expectFreshProfile(game);
      expect(game.getState().loadNotice).toBeNull();
      expect(storage.movedAside).toEqual([]);
      expect(storage.noticeFlagged).toBe(false);
      expect(storage.saved).toBeNull();
      expect(storage.read()).toEqual({ kind: 'found', value: raw });
    },
  );

  it('is replaced by the current Save on the next write, and the next visit reads that', () => {
    const storage = createMemoryStorage({ ...save, version: 1 });
    const game = createGame({ storage });

    startStage(game, STAGE_ID);
    clearStage(game, { seconds: 60 });

    expect(storage.saved?.version).toBe(SAVE_VERSION);
    // Nothing of the old Save came along: it had a Shields level of 1.
    expect(storage.saved?.upgrades.deflectorShields).toBe(0);
    expect(storage.movedAside).toEqual([]);
    const nextVisit = createGame({ storage });
    expect(nextVisit.getState().loadNotice).toBeNull();
    expect(nextVisit.getState().profile.totalStars).toBe(3);
    expect(nextVisit.getState().profile).toEqual(game.getState().profile);
  });

  it('is not counted as a Save that cannot be read: a stored JSON null is nothing stored', () => {
    const { game, storage } = load(null);

    expectFreshProfile(game);
    expect(game.getState().loadNotice).toBeNull();
    expect(storage.movedAside).toEqual([]);
  });
});

describe('a Save that cannot be read at all', () => {
  // Not an object, a version that is not a number, or a version higher than
  // this game's: nothing in it can be trusted, so it is set aside whole and the
  // player starts fresh. (Text that is not JSON is the localStorage adapter's
  // case: the Save module is handed parsed values here. See
  // localStorageSave.test.ts.) An older version is not here: it is discarded
  // without a fuss, below.
  const newer = { ...completeSave(), version: SAVE_VERSION + 1 };
  const unreadable: Array<[string, unknown]> = [
    ['a version this game does not know yet', newer],
    ['a far newer version', { ...completeSave(), version: 99 }],
    [
      'a version that is the right number as text',
      { ...completeSave(), version: String(SAVE_VERSION) },
    ],
    ['a version that is null', { ...completeSave(), version: null }],
    ['a list instead of a Save', []],
    ['text instead of a Save', 'my progress'],
    ['a number instead of a Save', 42],
  ];

  it.each(unreadable)(
    'with %s: shows the notice, starts fresh and moves the Save aside',
    (_what, bad) => {
      const { game, storage } = load(bad);

      expect(game.getState().loadNotice).toBe(UNREADABLE_SAVE_NOTICE);
      expectFreshProfile(game);
      expect(storage.movedAside).toEqual([bad]);
    },
  );

  it('still plays from the fresh start, and keeps the bad Save as it was found', () => {
    const bad = { ...completeSave(), version: SAVE_VERSION + 1 };
    const { game, storage } = load(bad);

    startStage(game, STAGE_ID);
    clearStage(game, { seconds: 60 });

    expect(game.getState().profile.stagesProgress[STAGE_ID].starsEarned).toBe(
      3,
    );
    expect(game.getState().profile.totalStars).toBe(3);
    expect(storage.movedAside).toEqual([bad]);
  });

  it('is stamped with the time on the game’s own clock', () => {
    // Not the stepped clock's default start, so a fixed stamp would not pass.
    const clock = createSteppedClock(1_800_000_000_000);
    clock.step(3600);
    const { storage } = loadGame(
      { ...completeSave(), version: SAVE_VERSION + 1 },
      undefined,
      clock,
    );

    expect(storage.movedAsideStamps).toEqual([
      new Date(clock.now()).toISOString(),
    ]);
  });
});

describe('the notice for a Save that could not be read', () => {
  const bad = { ...completeSave(), version: SAVE_VERSION + 1 };

  it('shows again on the next load, when the player has not played on', () => {
    const { storage } = loadGame(bad);

    const nextVisit = createGame({ storage });

    expect(nextVisit.getState().loadNotice).toBe(UNREADABLE_SAVE_NOTICE);
    expectFreshProfile(nextVisit);
    expect(storage.movedAside).toEqual([bad]);
  });

  it('shows again on the next load, after a fresh Save was written, and does not move that Save aside', () => {
    const { game, storage } = loadGame(bad);
    startStage(game, STAGE_ID);
    clearStage(game, { seconds: 60 });

    const nextVisit = createGame({ storage });

    expect(nextVisit.getState().loadNotice).toBe(UNREADABLE_SAVE_NOTICE);
    expect(nextVisit.getState().profile.totalStars).toBe(3);
    expect(storage.movedAside).toEqual([bad]);
  });

  it('is gone for good once the player dismisses it', () => {
    const { game, storage } = loadGame(bad);
    startStage(game, STAGE_ID);
    clearStage(game, { seconds: 60 });

    game.dismissLoadNotice();

    expect(game.getState().loadNotice).toBeNull();
    const nextVisit = createGame({ storage });
    expect(nextVisit.getState().loadNotice).toBeNull();
    expect(nextVisit.getState().profile.totalStars).toBe(3);
    expect(storage.movedAside).toEqual([bad]);
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

describe('clearedStagesOf', () => {
  it('counts only the Stages that are completed', () => {
    expect(clearedStagesOf({})).toBe(0);
    expect(
      clearedStagesOf({
        a: { completed: true },
        b: { completed: true },
        c: { completed: false },
      }),
    ).toBe(2);
  });
});
