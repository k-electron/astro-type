import { describe, expect, it } from 'vitest';
import {
  completeSave,
  FREE_COSMETIC,
  RETURNING_PLAYER,
  stageProgress,
} from '../../tests/shared/saves';
import { createMemoryStorage } from '../../tests/shared/memoryStorage';
import { type CosmeticKind, entriesOf } from './catalog';
import { createSteppedClock } from './clock';
import { createGame, type Game } from './game';
import { clearedStagesOf, DEFAULT_PROFILE, SAVE_VERSION } from './schemas';
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

/** The Save with one kind of Cosmetic's entry changed: its owned list, its equipped id, or both. */
function withCosmetic(
  save: Record<string, unknown> & { cosmetics: Record<string, object> },
  kind: CosmeticKind,
  entry: { owned?: unknown; equipped?: unknown },
) {
  return {
    ...save,
    cosmetics: {
      ...save.cosmetics,
      [kind]: { ...save.cosmetics[kind], ...entry },
    },
  };
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
    expect(profile.globalMuted).toBe(true);
    expect(game.getState().loadNotice).toBeNull();
    expect(storage.movedAside).toEqual([]);
  });

  it('keeps what a player owns and wears of every kind of Cosmetic', () => {
    const save = completeSave();
    const { game } = load(save);

    expect(game.getState().profile.cosmetics).toEqual(save.cosmetics);
  });

  it('starts a player with no Save fresh, without a notice', () => {
    const { game, storage } = load(undefined);

    expectFreshProfile(game);
    expect(game.getState().loadNotice).toBeNull();
    expect(storage.movedAside).toEqual([]);
  });

  it('writes the Save back as the current version, and reads what it wrote as the same Profile', () => {
    const { game, storage } = load(completeSave());

    // 1,234 Credits buys an Emerald Trail (450), which saves.
    game.buy('EMERALD');

    expect(storage.saved?.version).toBe(SAVE_VERSION);
    const nextVisit = createGame({ storage });
    expect(nextVisit.getState().loadNotice).toBeNull();
    expect(nextVisit.getState().profile).toEqual(game.getState().profile);
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
      // The Upgrades of a Save from before they were removed, and a kind of
      // Cosmetic the game does not have.
      upgrades: { deflectorShields: 3 },
      cosmetics: {
        ...save.cosmetics,
        wings: { owned: ['FEATHER'], equipped: 'FEATHER' },
      },
    });

    expect(game.getState().loadNotice).toBeNull();
    expect(game.getState().profile).not.toHaveProperty('cheatCode');
    expect(game.getState().profile.stagesProgress['s1-l1']).not.toHaveProperty(
      'bonusStars',
    );
    expect(game.getState().profile).not.toHaveProperty('upgrades');
    expect(game.getState().profile.cosmetics).not.toHaveProperty('wings');

    game.buy('EMERALD');
    expect(storage.saved).not.toHaveProperty('cheatCode');
    expect(JSON.stringify(storage.saved)).not.toMatch(
      /xyzzy|bonusStars|upgrades|deflectorShields|wings/,
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

  it('takes the default for missing Credits, Stage progress and Logbook', () => {
    const { game } = load(
      without(completeSave(), 'totalCredits', 'stagesProgress', 'logbook'),
    );

    const profile = game.getState().profile;
    expect(game.getState().loadNotice).toBeNull();
    expect(profile.totalCredits).toBe(0);
    expect(profile.stagesProgress).toEqual({});
    expect(profile.logbook).toEqual(DEFAULT_PROFILE.logbook);
    expect(profile.totalStars).toBe(0);
  });

  it('takes the default Cosmetics when the Cosmetics are missing', () => {
    const { game } = load(without(completeSave(), 'cosmetics'));

    expect(game.getState().loadNotice).toBeNull();
    expect(game.getState().profile.cosmetics).toEqual(
      DEFAULT_PROFILE.cosmetics,
    );
    expect(game.getState().profile.totalCredits).toBe(1234);
  });
});

describe('a Save with a wrong field', () => {
  // A wrong field costs only that field (ticket #103): it takes its default, or
  // is clamped or floored into range, and everything else loads as it was
  // stored. Each row is a bad Save and the Save that it should read as; the two
  // must load to the same Profile, with no notice and nothing moved aside.
  const save = completeSave();
  const withStages = (stagesProgress: Record<string, unknown>) => ({
    ...save,
    stagesProgress,
  });
  // The Logbook is read slice by slice and summary by summary (#155): what it
  // gives up is the damaged piece alone. These build a Save whose Logbook has
  // one summary changed.
  const [aKey] = Object.keys(save.logbook.runs[0].keys);
  const withSummary = (changes: Record<string, unknown>) => ({
    ...save,
    logbook: {
      ...save.logbook,
      runs: [
        { ...save.logbook.runs[0], ...changes },
        ...save.logbook.runs.slice(1),
      ],
    },
  });
  const withKeys = (keys: Record<string, unknown>) => withSummary({ keys });
  const aKeyTally = save.logbook.runs[0].keys[aKey];
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
      'a Logbook that is text',
      { ...save, logbook: 'all of it' },
      without(save, 'logbook'),
    ],
    [
      'a lifetime part that is a list',
      { ...save, logbook: { ...save.logbook, lifetime: [] } },
      { ...save, logbook: { ...save.logbook, lifetime: {} } },
    ],
    [
      'a count in a summary that is null',
      withSummary({ words: null }),
      withSummary({ words: 0 }),
    ],
    [
      'Stage progress that is a list',
      { ...save, stagesProgress: [] },
      without(save, 'stagesProgress'),
    ],
    [
      'Cosmetics that are text',
      { ...save, cosmetics: 'all' },
      without(save, 'cosmetics'),
    ],
    // Out of range: clamped.
    [
      'negative Credits',
      { ...save, totalCredits: -5 },
      { ...save, totalCredits: 0 },
    ],
    [
      'a negative count in a summary',
      withSummary({ misses: -1 }),
      withSummary({ misses: 0 }),
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
      'a negative tally for a key',
      withKeys({
        ...save.logbook.runs[0].keys,
        [aKey]: { ...aKeyTally, firstAttempts: -3 },
      }),
      withKeys({
        ...save.logbook.runs[0].keys,
        [aKey]: { ...aKeyTally, firstAttempts: 0 },
      }),
    ],
    // Not a whole number where one is needed: rounded down.
    [
      'Credits with a fraction',
      { ...save, totalCredits: 12.7 },
      { ...save, totalCredits: 12 },
    ],
    // An unknown name: the default.
    [
      'a beat theme the game does not have',
      { ...save, beatTheme: 'POLKA' },
      without(save, 'beatTheme'),
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
      'a key tally that is a number',
      withKeys({ ...save.logbook.runs[0].keys, '§': 5 }),
      withKeys(save.logbook.runs[0].keys),
    ],
    [
      'a key tally that is a list',
      withKeys({ ...save.logbook.runs[0].keys, '§': [1, 2] }),
      withKeys(save.logbook.runs[0].keys),
    ],
    [
      'a summary that is text',
      {
        ...save,
        logbook: { ...save.logbook, runs: [...save.logbook.runs, 'a Run'] },
      },
      save,
    ],
    [
      'a summary with a day that is not a date',
      {
        ...save,
        logbook: {
          ...save.logbook,
          runs: [
            ...save.logbook.runs,
            { ...save.logbook.runs[0], day: 'soon' },
          ],
        },
      },
      save,
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
});

describe('a Save from before the game’s rules changed', () => {
  // An older Save (a lower version, or none) is not trusted to mean what its
  // numbers say now, so it is discarded: a fresh Profile, silently. Nothing is
  // moved aside, and the old value stays in storage until the next write
  // replaces it. The raw Save is built on the storage here, as no seeding
  // helper would write it.
  const save = completeSave();
  // Version 3 was the last Save with Upgrades (#136): a Profile that bought
  // them would carry an advantage the game no longer has, so it starts fresh.
  const withUpgrades = {
    ...without(save, 'cosmetics'),
    version: 3,
    upgrades: { deflectorShields: 1, overdriveReactor: 2, precisionSensors: 3 },
  };
  // Version 5 was the last Save with lifetime totals and per-key hits and
  // misses of its own (#155): the Logbook replaced them, so no Profile mixes
  // the two.
  const version5 = {
    ...without(save, 'logbook'),
    version: 5,
    totalCharactersTyped: 154,
    totalMissMarks: 3,
    totalWordsTyped: 30,
    totalPracticeSeconds: 120,
    highestWpmAllTime: 31,
    keyAnalytics: { f: { hits: 48, misses: 1 } },
  };
  const older: Array<[string, unknown]> = [
    ['version 5, with its lifetime totals and key stats', version5],
    // Version 4 was the last Save whose high scores came from graded hits
    // (#137): a score now means something else, so it starts fresh.
    ['version 4', { ...save, version: 4 }],
    ['version 3, with its Upgrades', withUpgrades],
    ['version 3', { ...save, version: 3 }],
    // Version 2 was the Save before the Stars were honest (#134): its Stars
    // were earned under other bars, so it starts fresh like any older one.
    ['version 2', { ...save, version: 2 }],
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
    const storage = createMemoryStorage(withUpgrades);
    const game = createGame({ storage });

    startStage(game, STAGE_ID);
    clearStage(game, { seconds: 60 });

    expect(storage.saved?.version).toBe(SAVE_VERSION);
    // Nothing of the old Save came along: not its Upgrades, not its Cosmetics.
    expect(storage.saved).not.toHaveProperty('upgrades');
    expect(storage.saved?.cosmetics).toEqual(DEFAULT_PROFILE.cosmetics);
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

describe('the Cosmetics in a Save', () => {
  // One entry per kind under `cosmetics`, with its owned list and its equipped
  // id. A bad part costs only that part: the kind takes its free default and
  // everything else loads as it was stored.
  const KINDS = [
    'trail',
    'soundKit',
    'burst',
    'backdrop',
    'ship',
    'hull',
  ] as const satisfies readonly CosmeticKind[];

  it('gives a kind the Save leaves out its free default, owned and worn, and keeps the other kinds', () => {
    const save = completeSave();
    for (const kind of KINDS) {
      const { [kind]: _left, ...rest } = save.cosmetics;
      const { game, storage } = load({ ...save, cosmetics: rest });

      const { profile } = game.getState();
      expect(game.getState().loadNotice, kind).toBeNull();
      expect(storage.movedAside, kind).toEqual([]);
      expect(profile.cosmetics[kind], kind).toEqual({
        owned: [FREE_COSMETIC[kind]],
        equipped: FREE_COSMETIC[kind],
      });
      expect(profile.cosmetics, kind).toEqual({
        ...save.cosmetics,
        [kind]: profile.cosmetics[kind],
      });
      expect(profile.totalCredits).toBe(1234);
      expect(profile.totalStars).toBe(5);
    }
  });

  describe.each(KINDS)('for a %s', (kind) => {
    const free = FREE_COSMETIC[kind];
    const other = entriesOf(kind).find((entry) => entry.id !== free)?.id;
    if (!other) throw new Error(`The catalog has no spare ${kind}`);
    const save = completeSave();
    const owning = withCosmetic(save, kind, {
      owned: [free, other],
      equipped: other,
    });

    it('keeps what is owned and worn', () => {
      const { game } = load(owning);

      expect(game.getState().profile.cosmetics[kind]).toEqual({
        owned: [free, other],
        equipped: other,
      });
    });

    it('wears the free default when the equipped id is missing, and keeps what is owned', () => {
      const { game } = load({
        ...owning,
        cosmetics: { ...owning.cosmetics, [kind]: { owned: [free, other] } },
      });

      expect(game.getState().loadNotice).toBeNull();
      expect(game.getState().profile.cosmetics[kind]).toEqual({
        owned: [free, other],
        equipped: free,
      });
    });

    it('falls back to the free default for an equipped id the game does not have, and keeps the rest', () => {
      const { game } = load(withCosmetic(owning, kind, { equipped: 'GONE' }));

      const { profile } = game.getState();
      expect(game.getState().loadNotice).toBeNull();
      expect(profile.cosmetics[kind]).toEqual({
        owned: [free, other],
        equipped: free,
      });
      expect(profile.totalCredits).toBe(1234);
    });

    it('drops an owned id the game does not have, and keeps the others', () => {
      const { game } = load(
        withCosmetic(owning, kind, { owned: [free, 'GONE', other] }),
      );

      expect(game.getState().loadNotice).toBeNull();
      expect(game.getState().profile.cosmetics[kind].owned).toEqual([
        free,
        other,
      ]);
    });

    it('always owns the free default, even when the list leaves it out', () => {
      const { game } = load(withCosmetic(owning, kind, { owned: [other] }));

      expect([...game.getState().profile.cosmetics[kind].owned].sort()).toEqual(
        [free, other].sort(),
      );
    });

    it('owns only the free default when the list is not a list', () => {
      const { game } = load(
        withCosmetic(owning, kind, { owned: 'all', equipped: free }),
      );

      expect(game.getState().loadNotice).toBeNull();
      expect(game.getState().profile.cosmetics[kind].owned).toEqual([free]);
    });
  });
});
