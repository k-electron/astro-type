import { describe, expect, it } from 'vitest';
import {
  completeSave,
  FREE_COSMETIC,
  RETURNING_PLAYER,
} from '../../tests/shared/saves';
import type { Game } from './game';
import { DEFAULT_PROFILE, SAVE_VERSION } from './schemas';
import {
  hitPerfect,
  loadGame,
  startedGame,
  startStage,
  STAGE_ID,
} from '../../tests/shared/testHelpers';

// The Profile changes through five commands on the Game: changeSettings, buy,
// importBackup, wipeAchievements and resetProgress. The outcomes of importing
// a Backup are in backup.test.ts, and what the buttons look like is in the DOM
// tests; this file is what the commands do to the Profile and the Save.

/**
 * A Cosmetic is bought once, then equipped for free. Each kind is
 * kept in the Profile under its own `cosmetics[key]` (what is owned and what
 * is equipped), with the one the player starts with (`FREE_COSMETIC`), and the
 * others with their price, in the Hangar's order: the prices are the rule, so
 * they are written out. `equipMoments`
 * is what equipping one announces: a Trail, a Burst, a Backdrop, a Ship and a
 * Hull are heard, a Sound Kit makes no moment.
 */
const COSMETICS = [
  {
    kind: 'trail colour',
    key: 'trail',
    free: FREE_COSMETIC.trail,
    equipMoments: [{ type: 'equip' }],
    items: [
      ['AMBER', 350],
      ['EMERALD', 450],
      ['VIOLET', 600],
      ['SUPERNOVA', 900],
      ['TEAL', 1400],
      ['GOLD', 2200],
      ['SPECTRUM', 3200],
    ],
  },
  {
    kind: 'Sound Kit',
    key: 'soundKit',
    free: FREE_COSMETIC.soundKit,
    equipMoments: [],
    items: [
      ['RETRO_8BIT', 300],
      ['DEEP_SPACE', 450],
      ['NEO_ACOUSTIC', 600],
      ['ORBITAL_CHOIR', 1800],
      ['PULSE_DRUMS', 2600],
    ],
  },
  {
    kind: 'Burst',
    key: 'burst',
    free: FREE_COSMETIC.burst,
    equipMoments: [{ type: 'equip' }],
    items: [
      ['STARFLOWER', 600],
      ['PIXEL_SHARDS', 1600],
      ['SHOCKWAVE', 3000],
    ],
  },
  {
    kind: 'Backdrop',
    key: 'backdrop',
    free: FREE_COSMETIC.backdrop,
    equipMoments: [{ type: 'equip' }],
    items: [
      ['NEBULA', 800],
      ['AURORA', 2000],
      ['DEEP_VOID', 3500],
    ],
  },
  {
    kind: 'Ship',
    key: 'ship',
    free: FREE_COSMETIC.ship,
    equipMoments: [{ type: 'equip' }],
    items: [
      ['DART', 700],
      ['MANTA', 2400],
      ['CORVETTE', 4500],
    ],
  },
  {
    kind: 'Hull',
    key: 'hull',
    free: FREE_COSMETIC.hull,
    equipMoments: [{ type: 'equip' }],
    items: [
      ['HEX', 900],
      ['PLATED', 2400],
      ['CRYSTAL', 3000],
    ],
  },
] as const;

/**
 * Buy as a player does in the middle of a Run: pause, open the Hangar over the
 * Run, buy, close it, and resume from the Pause Menu.
 */
function buyFromHangar(game: Game, item: Parameters<Game['buy']>[0]): void {
  game.send({ type: 'PRESS_ESC' });
  game.send({ type: 'OPEN_HANGAR' });
  game.buy(item);
  game.send({ type: 'PRESS_CLOSE' });
  game.send({ type: 'PRESS_RESUME' });
}

/** A player with plenty of Credits and nothing bought. */
const richPlayer = (credits = 10000) => loadGame({ totalCredits: credits });

/** More Credits than the whole Hangar costs. */
const EVERYTHING = 100_000;

describe.each(COSMETICS)('buy, for a $kind', (cosmetic) => {
  const { key, free, items } = cosmetic;

  for (const [item, price] of items) {
    it(`buys ${item} for its price, owns it from then on, and equips it`, () => {
      const { game } = richPlayer(price);

      expect(game.buy(item)).toBe(true);

      const { profile } = game.getState();
      expect(profile.totalCredits).toBe(0);
      expect(profile.cosmetics[key].equipped).toBe(item);
      expect(profile.cosmetics[key].owned).toContain(item);
      expect(profile.cosmetics[key].owned).toContain(free);
    });
  }

  it('is owned and worn from the start, with nothing else owned', () => {
    const { game } = richPlayer();

    const { cosmetics } = game.getState().profile;

    expect(cosmetics[key].equipped).toBe(free);
    expect(cosmetics[key].owned).toEqual([free]);
  });

  it('equips one that is already owned at no cost, including the one every player starts with', () => {
    const [[first, firstPrice], [second, secondPrice]] = items;
    const { game } = richPlayer(10000);
    game.buy(first);
    game.buy(second);
    const paid = 10000 - firstPrice - secondPrice;
    expect(game.getState().profile.totalCredits).toBe(paid);

    game.buy(first);
    expect(game.getState().profile.cosmetics[key].equipped).toBe(first);
    game.buy(free);
    expect(game.getState().profile.cosmetics[key].equipped).toBe(free);

    const { profile } = game.getState();
    expect(profile.totalCredits).toBe(paid);
    expect([...profile.cosmetics[key].owned].sort()).toEqual(
      [free, first, second].sort(),
    );
  });

  it('equips one that is already owned with no Credits at all', () => {
    const [[item]] = items;
    const { game } = loadGame({
      totalCredits: 0,
      cosmetics: { [key]: { owned: [free, item], equipped: free } },
    });
    expect(game.getState().profile.cosmetics[key].equipped).toBe(free);

    game.buy(item);

    expect(game.getState().profile.cosmetics[key].equipped).toBe(item);
    expect(game.getState().profile.totalCredits).toBe(0);
  });

  it.each([
    ['the one every player starts with', free, {}],
    [
      'one bought and equipped',
      items[0][0],
      { [key]: { equipped: items[0][0], owned: [free, items[0][0]] } },
    ],
  ] as const)(
    'does nothing for %s when it is already equipped: no change, no Save written, no moment',
    (_, item, cosmetics) => {
      const { game, storage } = loadGame({ totalCredits: 10000, cosmetics });
      expect(game.getState().profile.cosmetics[key].equipped).toBe(item);
      const before = game.getState().profile;
      const savedBefore = storage.saved;
      const moments: unknown[] = [];
      game.onMoment((moment) => moments.push(moment));

      expect(game.buy(item)).toBe(false);

      expect(game.getState().profile).toEqual(before);
      expect(storage.saved).toBe(savedBefore);
      expect(moments).toEqual([]);
    },
  );

  it('equips one that is owned but not equipped, announcing its moment', () => {
    const [[item]] = items;
    const { game, storage } = loadGame({
      totalCredits: 10000,
      cosmetics: { [key]: { owned: [free, item], equipped: free } },
    });
    const savedBefore = storage.saved;
    const moments: unknown[] = [];
    game.onMoment((moment) => moments.push(moment));

    expect(game.buy(item)).toBe(true);

    expect(game.getState().profile.cosmetics[key].equipped).toBe(item);
    expect(storage.saved).not.toBe(savedBefore);
    expect(moments).toEqual(cosmetic.equipMoments);
  });

  for (const [item, price] of items) {
    it(`changes nothing for ${item} when the Credits are one short of its price`, () => {
      const { game } = richPlayer(price - 1);
      const before = game.getState().profile;

      game.buy(item);

      expect(game.getState().profile).toEqual(before);
    });
  }

  it('keeps the purchase and the equipped choice across a reload', () => {
    const [[item, price]] = items;
    const { game, storage } = richPlayer(price + 50);
    game.buy(item);

    const reloaded = loadGame(storage.saved).game.getState().profile;

    expect(reloaded.cosmetics[key].equipped).toBe(item);
    expect(reloaded.cosmetics[key].owned).toContain(item);
    expect(reloaded.totalCredits).toBe(50);
  });
});

describe('buy, across the kinds of Cosmetic', () => {
  it('keeps each kind to its own entry: the first item of every kind, bought in turn, is each kind’s alone', () => {
    const { game } = richPlayer(EVERYTHING);
    for (const { items } of COSMETICS) game.buy(items[0][0]);

    const { profile } = game.getState();
    for (const { key, free, items } of COSMETICS) {
      const [[item]] = items;
      expect(profile.cosmetics[key].equipped, key).toBe(item);
      expect([...profile.cosmetics[key].owned].sort(), key).toEqual(
        [free, item].sort(),
      );
    }
  });
});

describe('a purchase and the Save', () => {
  // A purchase writes the Save back under the same keys it was read from: the
  // owned and equipped Cosmetics, and every setting.
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

  it('re-saves a complete Save under the same keys after each kind of purchase', () => {
    const save = completeSave();
    const { game, storage } = loadGame({ ...save, totalCredits: 5000 });
    expect(game.getState().loadNotice).toBeNull();

    // `completeSave` already wears Amber and the 8-Bit Retro kit: these are new.
    game.buy('EMERALD');
    game.buy('DEEP_SPACE');
    game.buy('PIXEL_SHARDS');

    expect(storage.saved?.version).toBe(SAVE_VERSION);
    expect(storage.saved?.totalCredits).toBe(5000 - 450 - 450 - 1600);
    expect(storage.saved?.cosmetics).toEqual({
      trail: {
        owned: [...save.cosmetics.trail.owned, 'EMERALD'],
        equipped: 'EMERALD',
      },
      soundKit: {
        owned: [...save.cosmetics.soundKit.owned, 'DEEP_SPACE'],
        equipped: 'DEEP_SPACE',
      },
      burst: {
        owned: [...save.cosmetics.burst.owned, 'PIXEL_SHARDS'],
        equipped: 'PIXEL_SHARDS',
      },
      backdrop: save.cosmetics.backdrop,
      ship: save.cosmetics.ship,
      hull: save.cosmetics.hull,
    });
    for (const field of SETTINGS) {
      expect(storage.saved?.[field], field).toEqual(save[field]);
    }
    expect(storage.saved?.stagesProgress).toEqual(save.stagesProgress);
  });
});

describe('a purchase during a Run', () => {
  it('leaves the Run as it was: a Cosmetic changes how the game looks, never how it plays', () => {
    const game = startedGame({ totalCredits: 2000 });
    hitPerfect(game, 3);
    const played = (g: Game) => {
      const { score, currentStreak, multiplier, overdriveEnergy } =
        g.getState().run;
      return { score, currentStreak, multiplier, overdriveEnergy };
    };
    const before = played(game);

    buyFromHangar(game, 'AMBER');

    expect(game.getState().phase).toBe('running');
    expect(played(game)).toEqual(before);
  });

  it('spends the Credits at once and saves them', () => {
    const { game, storage } = loadGame({ totalCredits: 2000 });
    startStage(game, STAGE_ID);
    hitPerfect(game, 2);

    buyFromHangar(game, 'AMBER');

    expect(game.getState().profile.totalCredits).toBe(1650);
    expect(storage.saved?.totalCredits).toBe(1650);
  });
});

describe('changeSettings', () => {
  // Each patch is a change a player makes in the header: one setting moves
  // and every other field of the Profile stays as it was.
  it.each([
    { soundEnabled: false },
    { musicEnabled: false },
    { globalMuted: true },
    { keyboardVisible: false },
    { handsVisible: false },
    { beatTheme: 'CYBER_PULSE' },
    { soundVolume: 0.2 },
    { musicVolume: 0.9 },
  ] as const)('%j changes that setting and nothing else', (patch) => {
    const { game } = loadGame(RETURNING_PLAYER);
    const before = game.getState().profile;

    game.changeSettings(patch);

    expect(game.getState().profile).toEqual({ ...before, ...patch });
  });

  it('takes several settings in one patch', () => {
    const { game } = loadGame(RETURNING_PLAYER);

    game.changeSettings({ keyboardVisible: false, beatTheme: 'COSMIC_LOFI' });

    const { profile } = game.getState();
    expect(profile.keyboardVisible).toBe(false);
    expect(profile.beatTheme).toBe('COSMIC_LOFI');
  });

  it.each([
    ['laser sounds', 'soundVolume', 'soundEnabled'],
    ['rhythm beats', 'musicVolume', 'musicEnabled'],
  ] as const)(
    'a volume of 0 turns the %s off, and a volume above 0 turns them back on',
    (_, volume, channel) => {
      const { game } = loadGame(RETURNING_PLAYER);
      expect(game.getState().profile[channel]).toBe(true);

      game.changeSettings({ [volume]: 0 });
      expect(game.getState().profile[volume]).toBe(0);
      expect(game.getState().profile[channel]).toBe(false);

      game.changeSettings({ [volume]: 0.3 });
      expect(game.getState().profile[volume]).toBe(0.3);
      expect(game.getState().profile[channel]).toBe(true);
    },
  );

  it('turning a channel off keeps its volume for when it is turned on again', () => {
    const { game } = loadGame(RETURNING_PLAYER);
    game.changeSettings({ musicVolume: 0.6 });

    game.changeSettings({ musicEnabled: false });
    expect(game.getState().profile.musicVolume).toBe(0.6);

    game.changeSettings({ musicEnabled: true });
    expect(game.getState().profile.musicVolume).toBe(0.6);
    expect(game.getState().profile.musicEnabled).toBe(true);
  });

  it('is saved, and the next visit starts with the same settings', () => {
    const { game, storage } = loadGame(RETURNING_PLAYER);

    game.changeSettings({
      globalMuted: true,
      soundVolume: 0,
      musicVolume: 0.9,
      keyboardVisible: false,
      handsVisible: false,
      beatTheme: 'COSMIC_LOFI',
    });

    const settings = (
      profile: ReturnType<typeof game.getState>['profile'],
    ) => ({
      globalMuted: profile.globalMuted,
      soundEnabled: profile.soundEnabled,
      soundVolume: profile.soundVolume,
      musicVolume: profile.musicVolume,
      keyboardVisible: profile.keyboardVisible,
      handsVisible: profile.handsVisible,
      beatTheme: profile.beatTheme,
    });
    expect(settings(game.getState().profile)).toEqual({
      globalMuted: true,
      soundEnabled: false,
      soundVolume: 0,
      musicVolume: 0.9,
      keyboardVisible: false,
      handsVisible: false,
      beatTheme: 'COSMIC_LOFI',
    });
    const nextVisit = loadGame(storage.saved).game.getState().profile;
    expect(settings(nextVisit)).toEqual(settings(game.getState().profile));
    expect(nextVisit.totalCredits).toBe(1234);
  });

  it('works during a Run without disturbing it', () => {
    const { game } = loadGame(RETURNING_PLAYER);
    startStage(game, STAGE_ID);
    hitPerfect(game, 5);
    const before = game.getState().run;

    game.changeSettings({ musicVolume: 0, globalMuted: true });

    expect(game.getState().run).toEqual(before);
    expect(game.getState().phase).toBe('running');
  });
});

describe('wipeAchievements', () => {
  it('clears the Stars and the Stage records, keeps the Credits, Cosmetics and settings, and saves', () => {
    const { game, storage } = loadGame(completeSave());

    game.wipeAchievements();

    const { profile } = game.getState();
    expect(profile.totalStars).toBe(0);
    expect(profile.stagesProgress).toEqual({});
    expect(profile.totalCredits).toBe(1234);
    expect(profile.cosmetics).toEqual(completeSave().cosmetics);
    expect(profile.globalMuted).toBe(true);
    expect(profile.soundVolume).toBe(0.3);
    expect(storage.saved?.stagesProgress).toEqual({});
    expect(storage.saved?.totalCredits).toBe(1234);
  });
});

describe('resetProgress', () => {
  it('returns a fresh Profile and saves it', () => {
    const { game, storage } = loadGame(completeSave());

    game.resetProgress();

    expect(game.getState().profile).toEqual({
      ...DEFAULT_PROFILE,
      totalStars: 0,
    });
    expect(storage.saved?.totalCredits).toBe(0);
    expect(storage.saved?.stagesProgress).toEqual({});
  });
});

describe.each([
  [
    'wipeAchievements',
    (game: ReturnType<typeof loadGame>['game']) => game.wipeAchievements(),
  ],
  [
    'resetProgress',
    (game: ReturnType<typeof loadGame>['game']) => game.resetProgress(),
  ],
])('%s and the Stage the next Stage starts on', (_, command) => {
  const SECOND_STAGE = 's1-l2';

  it('sends the next Stage back to the first Stage when no Run is on show', () => {
    const { game } = loadGame(RETURNING_PLAYER);
    startStage(game, SECOND_STAGE);
    game.send({ type: 'PRESS_ESC' });
    game.send({ type: 'PRESS_HOME' });

    command(game);
    game.send({ type: 'PRESS_FLIGHT_DECK' });

    expect(game.getState().run.stage?.id).toBe(STAGE_ID);
  });

  it('leaves the Stage of a Run that is still on show behind a menu', () => {
    const { game } = loadGame(RETURNING_PLAYER);
    startStage(game, SECOND_STAGE);
    game.send({ type: 'PRESS_ESC' });
    game.send({ type: 'OPEN_HANGAR' });

    command(game);

    expect(game.getState().run.stage?.id).toBe(SECOND_STAGE);
  });
});
