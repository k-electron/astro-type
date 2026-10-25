import { describe, expect, it } from 'vitest';
import { createGame, createMemoryStorage, type Game } from './createGame';
import { clearStage, STAGE_ID } from './testHelpers';

// The Save is the Profile as stored in the player's browser (ticket #24).
// These tests load Saves through the headless game, the way the app does.

const NOTICE =
  "Your saved progress couldn't be read, so you're starting fresh.";

type MemoryStorage = ReturnType<typeof createMemoryStorage> & {
  /** The unreadable Save that was moved aside, as it was found. */
  movedAside?: unknown;
  /** The last Save written. */
  saved?: Record<string, unknown> & { version?: unknown };
};

type UpgradeKind = 'shields' | 'reactor' | 'sensors';

type SaveGame = Game & {
  getLoadNotice(): string | null;
  buyUpgrade(kind: UpgradeKind): boolean;
};

function load(save?: unknown) {
  const storage = createMemoryStorage(
    save as Parameters<typeof createMemoryStorage>[0],
  ) as MemoryStorage;
  const game = createGame({ storage }) as SaveGame;
  return { storage, game };
}

function progress(stageId: string, starsEarned: number) {
  return {
    stageId,
    completed: true,
    starsEarned,
    highScore: 22150,
    bestWpm: 31,
    bestAccuracy: 100,
    bestStreak: 40,
    timesPlayed: 2,
    lastPlayedAt: 1792904921385,
  };
}

/** A complete Save in today's format (no `version`): 5 Stars over two Stages. */
function returningPlayerSave() {
  return {
    totalCredits: 1234,
    totalStars: 5,
    totalKeystrokes: 154,
    totalErrors: 3,
    totalWordsTyped: 30,
    totalPracticeSeconds: 120,
    highestWpmAllTime: 31,
    stagesProgress: {
      's1-l1': progress('s1-l1', 3),
      's1-l2': progress('s1-l2', 2),
    },
    keyAnalytics: {
      f: { hits: 48, misses: 1 },
      j: { hits: 48, misses: 2 },
      ' ': { hits: 58, misses: 0 },
    },
    upgrades: {
      deflectorShields: 1,
      hyperdriveReactor: 2,
      precisionSensors: 0,
      equippedTrailTheme: 'CYAN',
      equippedAudioCore: 'CYBER_SYNTH',
      unlockedThemes: ['CYAN'],
      unlockedAudioCores: ['CYBER_SYNTH'],
    },
    soundEnabled: false,
    soundVolume: 0.3,
    ambientMusicVolume: 0.1,
    highwaySpeed: 'FAST',
    keyboardVisible: false,
    handsVisible: false,
    musicEnabled: false,
    musicVolume: 0.2,
    beatTheme: 'NEON_SYNTHWAVE',
    globalMuted: true,
  };
}

type ReturningSave = ReturnType<typeof returningPlayerSave>;

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
  const profile = game.getProfile();
  expect(profile.totalCredits).toBe(0);
  expect(profile.totalStars).toBe(0);
  expect(profile.stagesProgress).toEqual({});
  expect(profile.upgrades.deflectorShields).toBe(0);
  expect(profile.upgrades.hyperdriveReactor).toBe(0);
  expect(profile.upgrades.precisionSensors).toBe(0);
}

describe('a Save that is readable', () => {
  it('loads a returning player’s Save in today’s format, unchanged and without a notice', () => {
    const { game, storage } = load(returningPlayerSave());

    const profile = game.getProfile();
    expect(profile.totalCredits).toBe(1234);
    expect(profile.totalStars).toBe(5);
    expect(profile.stagesProgress['s1-l1'].starsEarned).toBe(3);
    expect(profile.stagesProgress['s1-l2'].starsEarned).toBe(2);
    expect(profile.upgrades.deflectorShields).toBe(1);
    expect(profile.upgrades.hyperdriveReactor).toBe(2);
    expect(profile.highwaySpeed).toBe('FAST');
    expect(profile.globalMuted).toBe(true);
    expect(game.getLoadNotice()).toBeNull();
    expect(storage.movedAside).toBeUndefined();
  });

  it('reads a Save that says version 1 the same way', () => {
    const { game } = load({ ...returningPlayerSave(), version: 1 });

    expect(game.getProfile().totalStars).toBe(5);
    expect(game.getProfile().totalCredits).toBe(1234);
    expect(game.getLoadNotice()).toBeNull();
  });

  it('starts a player with no Save fresh, without a notice', () => {
    const { game, storage } = load(undefined);

    expectFreshProfile(game);
    expect(game.getLoadNotice()).toBeNull();
    expect(storage.movedAside).toBeUndefined();
  });

  it('writes an unversioned Save back as version 1', () => {
    const { game, storage } = load(returningPlayerSave());

    // 1,234 Credits buys the first sensors Upgrade (200), which saves.
    expect(game.buyUpgrade('sensors')).toBe(true);

    expect(storage.saved?.version).toBe(1);
  });

  it('keeps a Stage-progress entry whose id is not in the curriculum, as a Free Flight entry is', () => {
    const save = returningPlayerSave();
    const { game } = load({
      ...save,
      stagesProgress: {
        ...save.stagesProgress,
        'custom-1792904921385': progress('custom-1792904921385', 1),
      },
    });

    expect(game.getLoadNotice()).toBeNull();
    expect(
      game.getProfile().stagesProgress['custom-1792904921385'].starsEarned,
    ).toBe(1);
    expect(game.getProfile().totalStars).toBe(6);
  });

  it('accepts Upgrades at level 3', () => {
    const { game } = load(
      withUpgrades(returningPlayerSave(), {
        deflectorShields: 3,
        hyperdriveReactor: 3,
        precisionSensors: 3,
      }),
    );

    expect(game.getLoadNotice()).toBeNull();
    expect(game.getProfile().upgrades.deflectorShields).toBe(3);
  });

  it('drops fields the Save does not define, and writes them back no more', () => {
    const save = returningPlayerSave();
    const { game, storage } = load({
      ...save,
      cheatCode: 'xyzzy',
      stagesProgress: {
        ...save.stagesProgress,
        's1-l1': { ...save.stagesProgress['s1-l1'], bonusStars: 99 },
      },
      upgrades: { ...save.upgrades, warpDrive: 4 },
    });

    expect(game.getLoadNotice()).toBeNull();
    expect(game.getProfile()).not.toHaveProperty('cheatCode');
    expect(game.getProfile().stagesProgress['s1-l1']).not.toHaveProperty(
      'bonusStars',
    );
    expect(game.getProfile().upgrades).not.toHaveProperty('warpDrive');

    game.buyUpgrade('sensors');
    expect(storage.saved).not.toHaveProperty('cheatCode');
    expect(JSON.stringify(storage.saved)).not.toMatch(
      /xyzzy|bonusStars|warpDrive/,
    );
  });
});

describe('a Save with a field missing', () => {
  const settings = {
    soundEnabled: true,
    soundVolume: 0.7,
    ambientMusicVolume: 0.25,
    highwaySpeed: 'NORMAL',
    keyboardVisible: true,
    handsVisible: true,
    musicEnabled: true,
    musicVolume: 0.4,
    beatTheme: 'NEON_SYNTHWAVE',
    globalMuted: false,
  } as const;

  it.each(Object.entries(settings))(
    'takes the default for a missing %s and keeps the rest',
    (field, defaultValue) => {
      const { game } = load(without(returningPlayerSave(), field));

      expect(game.getLoadNotice()).toBeNull();
      expect(game.getProfile()).toMatchObject({ [field]: defaultValue });
      expect(game.getProfile().totalCredits).toBe(1234);
      expect(game.getProfile().totalStars).toBe(5);
    },
  );

  it('takes the default for missing Credits, Stage progress and key stats', () => {
    const { game } = load(
      without(
        returningPlayerSave(),
        'totalCredits',
        'stagesProgress',
        'keyAnalytics',
      ),
    );

    const profile = game.getProfile();
    expect(game.getLoadNotice()).toBeNull();
    expect(profile.totalCredits).toBe(0);
    expect(profile.stagesProgress).toEqual({});
    expect(profile.keyAnalytics).toEqual({});
    expect(profile.totalStars).toBe(0);
  });

  it('takes the default Upgrades when the Upgrades are missing', () => {
    const { game } = load(without(returningPlayerSave(), 'upgrades'));

    expect(game.getLoadNotice()).toBeNull();
    expect(game.getProfile().upgrades.deflectorShields).toBe(0);
    expect(game.getProfile().upgrades.hyperdriveReactor).toBe(0);
    expect(game.getProfile().upgrades.precisionSensors).toBe(0);
    expect(game.getProfile().totalCredits).toBe(1234);
  });
});

describe('a Save that cannot be read', () => {
  const unreadable: Array<[string, unknown]> = [
    [
      'Credits that are text',
      { ...returningPlayerSave(), totalCredits: '1234' },
    ],
    ['negative Credits', { ...returningPlayerSave(), totalCredits: -5 }],
    [
      'a Stage with more than 3 Stars',
      {
        ...returningPlayerSave(),
        stagesProgress: { 's1-l1': progress('s1-l1', 4) },
      },
    ],
    [
      'a Stage-progress entry that is not an entry',
      { ...returningPlayerSave(), stagesProgress: { 's1-l1': 'done' } },
    ],
    [
      'a shield Upgrade at level 4',
      withUpgrades(returningPlayerSave(), { deflectorShields: 4 }),
    ],
    [
      'a reactor Upgrade at level 7',
      withUpgrades(returningPlayerSave(), { hyperdriveReactor: 7 }),
    ],
    [
      'a sensors Upgrade at level -1',
      withUpgrades(returningPlayerSave(), { precisionSensors: -1 }),
    ],
    [
      'an Upgrade level that is text',
      withUpgrades(returningPlayerSave(), { deflectorShields: '2' as never }),
    ],
    [
      'a speed setting the game does not have',
      { ...returningPlayerSave(), highwaySpeed: 'WARP' },
    ],
    [
      'a sound setting that is text',
      { ...returningPlayerSave(), soundEnabled: 'yes' },
    ],
    [
      'Stage progress that is a list',
      { ...returningPlayerSave(), stagesProgress: [] },
    ],
    ['an unknown version', { ...returningPlayerSave(), version: 2 }],
    ['version 0', { ...returningPlayerSave(), version: 0 }],
    ['a version that is text', { ...returningPlayerSave(), version: '1' }],
    ['a list instead of a Save', []],
    ['text instead of a Save', 'my progress'],
  ];

  it.each(unreadable)(
    'with %s: shows the notice, starts fresh and moves the Save aside',
    (_what, bad) => {
      const { game, storage } = load(bad);

      expect(game.getLoadNotice()).toBe(NOTICE);
      expectFreshProfile(game);
      expect(storage.movedAside).toEqual(bad);
    },
  );

  it('still plays from the fresh start, and keeps the bad Save as it was found', () => {
    const bad = { ...returningPlayerSave(), totalCredits: 'lots' };
    const { game, storage } = load(bad);

    game.startStage(STAGE_ID);
    clearStage(game, { seconds: 60 });

    expect(game.getProfile().stagesProgress[STAGE_ID].starsEarned).toBe(3);
    expect(game.getProfile().totalStars).toBe(3);
    expect(storage.movedAside).toEqual(bad);
  });
});

describe('total Stars', () => {
  it('are computed from the Stage progress when the Save claims more', () => {
    const { game } = load({ ...returningPlayerSave(), totalStars: 40 });

    expect(game.getProfile().totalStars).toBe(5);
    expect(game.getLoadNotice()).toBeNull();
  });

  it('are computed from the Stage progress when the Save claims fewer', () => {
    const { game } = load({ ...returningPlayerSave(), totalStars: 0 });

    expect(game.getProfile().totalStars).toBe(5);
  });

  it('are computed when the Save does not carry them', () => {
    const { game } = load(without(returningPlayerSave(), 'totalStars'));

    expect(game.getProfile().totalStars).toBe(5);
    expect(game.getLoadNotice()).toBeNull();
  });

  it('count a Stage cleared with 0 Stars as 0', () => {
    const save = returningPlayerSave();
    const { game } = load({
      ...save,
      stagesProgress: { 's1-l1': progress('s1-l1', 0) },
    });

    expect(game.getProfile().totalStars).toBe(0);
  });
});

describe('buying an Upgrade', () => {
  const catalog: Array<
    [
      UpgradeKind,
      'deflectorShields' | 'hyperdriveReactor' | 'precisionSensors',
      number[],
    ]
  > = [
    ['shields', 'deflectorShields', [250, 650, 1200]],
    ['reactor', 'hyperdriveReactor', [300, 750, 1400]],
    ['sensors', 'precisionSensors', [200, 500, 950]],
  ];

  function richPlayer() {
    return load({
      ...without(returningPlayerSave(), 'upgrades'),
      totalCredits: 10000,
    });
  }

  it.each(catalog)(
    '%s: levels 1 to 3 are bought for the catalog price, and level 4 is refused with the Credits unchanged',
    (kind, field, prices) => {
      const { game } = richPlayer();
      let credits = 10000;

      prices.forEach((price, index) => {
        expect(game.buyUpgrade(kind)).toBe(true);
        credits -= price;
        expect(game.getProfile().upgrades[field]).toBe(index + 1);
        expect(game.getProfile().totalCredits).toBe(credits);
      });

      expect(game.buyUpgrade(kind)).toBe(false);
      expect(game.getProfile().upgrades[field]).toBe(3);
      expect(game.getProfile().totalCredits).toBe(credits);
    },
  );

  it('refuses a purchase past level 3 for a player who loaded at level 3', () => {
    const { game } = load({
      ...withUpgrades(returningPlayerSave(), { deflectorShields: 3 }),
      totalCredits: 5000,
    });

    expect(game.buyUpgrade('shields')).toBe(false);

    expect(game.getProfile().upgrades.deflectorShields).toBe(3);
    expect(game.getProfile().totalCredits).toBe(5000);
  });

  it('is refused when the Credits fall short, with nothing changed', () => {
    const { game } = load({
      ...without(returningPlayerSave(), 'upgrades'),
      totalCredits: 249,
    });

    expect(game.buyUpgrade('shields')).toBe(false);

    expect(game.getProfile().upgrades.deflectorShields).toBe(0);
    expect(game.getProfile().totalCredits).toBe(249);
  });
});
