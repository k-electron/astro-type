import { describe, expect, it } from 'vitest';
import {
  completeSave,
  OLD_LIVE_EXPORT,
  RETURNING_PLAYER,
} from '../../tests/shared/saves';
import type { UpgradesSchema } from '../store/schemas';
import type { Game } from './game';
import { DEFAULT_PROFILE } from './profile';
import {
  hitPerfect,
  loadGame,
  miss,
  startedGame,
  startStage,
  STAGE_ID,
  targetKey,
} from './testHelpers';

// The Profile changes through five commands on the Game: changeSettings, buy,
// importBackup, wipeAchievements and resetProgress. The outcomes of importing
// a Backup are in backup.test.ts, and what the buttons look like is in the DOM
// tests; this file is what the commands do to the Profile and the Save.

type UpgradeField = keyof typeof UpgradesSchema.shape;

/** An Upgrade's item id, the Profile field that holds its level, and the price of levels 1 to 3. */
const UPGRADES = [
  ['shields', 'deflectorShields', [250, 650, 1200]],
  ['reactor', 'hyperdriveReactor', [300, 750, 1400]],
  ['sensors', 'precisionSensors', [200, 500, 950]],
] as const satisfies ReadonlyArray<
  readonly [string, UpgradeField, readonly number[]]
>;

/**
 * A Cosmetic is bought once, then equipped for free. Each kind has the Profile
 * fields that hold what is equipped and what is owned, the one the player
 * starts with, and the others with their price.
 */
const COSMETICS = [
  {
    kind: 'trail colour',
    equipped: 'equippedTrailTheme',
    owned: 'unlockedThemes',
    free: 'CYAN',
    items: [
      ['AMBER', 350],
      ['EMERALD', 450],
      ['VIOLET', 600],
      ['SUPERNOVA', 900],
    ],
  },
  {
    kind: 'Synthesizer Voice',
    equipped: 'equippedAudioCore',
    owned: 'unlockedAudioCores',
    free: 'CYBER_SYNTH',
    items: [
      ['RETRO_8BIT', 300],
      ['DEEP_SPACE', 450],
      ['NEO_ACOUSTIC', 600],
    ],
  },
] as const;

/**
 * Buy as a player does in the middle of a Run: pause, open the Hangar over the
 * Run, buy, close it, and resume from the Pause Menu.
 */
function buyFromHangar(game: Game, item: Parameters<Game['buy']>[0]): void {
  game.send({ type: 'PRESS_PAUSE' });
  game.send({ type: 'OPEN_HANGAR' });
  game.buy(item);
  game.send({ type: 'PRESS_CLOSE' });
  game.send({ type: 'PRESS_RESUME' });
}

/** A player with plenty of Credits and nothing bought. */
const richPlayer = (credits = 10000) => loadGame({ totalCredits: credits });

describe('buy, for an Upgrade', () => {
  it.each(UPGRADES)(
    '%s: levels 1 to 3 are bought one at a time at the catalog price',
    (item, field, prices) => {
      const { game } = richPlayer();
      let credits = 10000;

      prices.forEach((price, index) => {
        game.buy(item);
        credits -= price;
        const { profile } = game.getState();
        expect(profile.upgrades[field], `level after buy ${index + 1}`).toBe(
          index + 1,
        );
        expect(profile.totalCredits).toBe(credits);
      });
    },
  );

  it.each(UPGRADES)('%s: at level 3 a buy changes nothing', (item, field) => {
    const { game } = loadGame({
      totalCredits: 5000,
      upgrades: { [field]: 3 },
    });
    const before = game.getState().profile;

    game.buy(item);

    expect(game.getState().profile).toEqual(before);
  });

  it.each(UPGRADES)(
    '%s: with the Credits one short of the price a buy changes nothing, and with exactly the price it buys',
    (item, field, [firstPrice]) => {
      const { game } = richPlayer(firstPrice - 1);
      const before = game.getState().profile;

      game.buy(item);
      expect(game.getState().profile).toEqual(before);

      const { game: exact } = richPlayer(firstPrice);
      exact.buy(item);
      expect(exact.getState().profile.upgrades[field]).toBe(1);
      expect(exact.getState().profile.totalCredits).toBe(0);
    },
  );

  it('prices each level on its own: the second level is refused with the first level’s price in hand', () => {
    const { game } = richPlayer(250);
    game.buy('shields');
    expect(game.getState().profile.upgrades.deflectorShields).toBe(1);
    expect(game.getState().profile.totalCredits).toBe(0);

    const { game: short } = loadGame({
      totalCredits: 649,
      upgrades: { deflectorShields: 1 },
    });
    short.buy('shields');
    expect(short.getState().profile.upgrades.deflectorShields).toBe(1);
    expect(short.getState().profile.totalCredits).toBe(649);
  });
});

describe.each(COSMETICS)('buy, for a $kind', (cosmetic) => {
  const { equipped, owned, free, items } = cosmetic;

  for (const [item, price] of items) {
    it(`buys ${item} for its price, owns it from then on, and equips it`, () => {
      const { game } = richPlayer(price);

      game.buy(item);

      const { profile } = game.getState();
      expect(profile.totalCredits).toBe(0);
      expect(profile.upgrades[equipped]).toBe(item);
      expect(profile.upgrades[owned]).toContain(item);
      expect(profile.upgrades[owned]).toContain(free);
    });
  }

  it('equips one that is already owned at no cost, including the one every player starts with', () => {
    const [[first, firstPrice], [second, secondPrice]] = items;
    const { game } = richPlayer(10000);
    game.buy(first);
    game.buy(second);
    const paid = 10000 - firstPrice - secondPrice;
    expect(game.getState().profile.totalCredits).toBe(paid);

    game.buy(first);
    expect(game.getState().profile.upgrades[equipped]).toBe(first);
    game.buy(free);
    expect(game.getState().profile.upgrades[equipped]).toBe(free);

    const { profile } = game.getState();
    expect(profile.totalCredits).toBe(paid);
    expect([...profile.upgrades[owned]].sort()).toEqual(
      [free, first, second].sort(),
    );
  });

  it('equips one that is already owned with no Credits at all', () => {
    const [[item]] = items;
    const { game } = loadGame({
      totalCredits: 0,
      upgrades: { [owned]: [free, item] },
    });
    expect(game.getState().profile.upgrades[equipped]).toBe(free);

    game.buy(item);

    expect(game.getState().profile.upgrades[equipped]).toBe(item);
    expect(game.getState().profile.totalCredits).toBe(0);
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

    expect(reloaded.upgrades[equipped]).toBe(item);
    expect(reloaded.upgrades[owned]).toContain(item);
    expect(reloaded.totalCredits).toBe(50);
  });
});

describe('a purchase and the Save', () => {
  // Saves made before the catalog keep loading, and a purchase writes the
  // Save back under the same keys it was read from: the Upgrade levels, the
  // owned and equipped Cosmetics, and every setting. Not looked at here, as
  // other tickets move them: `totalStars`, `ambientMusicVolume` and the
  // retired speed field, which are leaving the Save.
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

  it.each([
    ['a complete Save', completeSave()],
    [
      'an export of the live game from before versions existed',
      OLD_LIVE_EXPORT,
    ],
  ])(
    're-saves %s under today’s keys after each kind of purchase',
    (_, save) => {
      const { game, storage } = loadGame({ ...save, totalCredits: 5000 });
      expect(game.getState().loadNotice).toBeNull();

      game.buy('sensors');
      game.buy('AMBER');
      game.buy('RETRO_8BIT');

      expect(storage.saved?.version).toBe(1);
      expect(storage.saved?.totalCredits).toBe(5000 - 200 - 350 - 300);
      expect(storage.saved?.upgrades).toEqual({
        deflectorShields: save.upgrades.deflectorShields,
        hyperdriveReactor: save.upgrades.hyperdriveReactor,
        precisionSensors: 1,
        equippedTrailTheme: 'AMBER',
        equippedAudioCore: 'RETRO_8BIT',
        unlockedThemes: ['CYAN', 'AMBER'],
        unlockedAudioCores: ['CYBER_SYNTH', 'RETRO_8BIT'],
      });
      for (const field of SETTINGS) {
        expect(storage.saved?.[field], field).toEqual(save[field]);
      }
      expect(storage.saved?.stagesProgress).toEqual(save.stagesProgress);
    },
  );
});

describe('a purchase during a Run', () => {
  it('Precision Sensors widen the Perfect window for the keys still to come', () => {
    // Two steps after a Drone appears it is 17.6 from the Strike Line: a Good
    // (50 points) without Sensors, a Great (75) with Sensors level 1.
    const keyAtTwoSteps = (game: ReturnType<typeof startedGame>) => {
      game.step(2);
      game.pressKey(targetKey(game));
      return game.getState().run.score;
    };
    const plain = startedGame({}, { totalCredits: 2000 });
    expect(keyAtTwoSteps(plain)).toBe(50);

    const upgraded = startedGame({}, { totalCredits: 2000 });
    buyFromHangar(upgraded, 'sensors');
    expect(upgraded.getState().phase).toBe('running');
    expect(keyAtTwoSteps(upgraded)).toBe(75);
  });

  it('the Overdrive Reactor fills the meter faster from then on', () => {
    // Without a Reactor Overdrive starts on the 29th hit. Buying level 1 after
    // the 10th speeds up the rest.
    const game = startedGame({}, { totalCredits: 2000 });
    hitPerfect(game, 10);
    buyFromHangar(game, 'reactor');
    hitPerfect(game, 15);
    expect(game.getState().run.hyperspaceActive, 'after 25 hits').toBe(false);

    hitPerfect(game, 1);

    expect(game.getState().run.hyperspaceActive, 'after 26 hits').toBe(true);
  });

  it('Deflector Shields are taken on when a Run starts, so this Run goes without and the next has one', () => {
    const game = startedGame({}, { totalCredits: 2000 });
    hitPerfect(game, 3);

    buyFromHangar(game, 'shields');
    expect(game.getState().run.shieldsRemaining).toBe(0);
    miss(game);
    expect(game.getState().run.currentStreak, 'the Miss goes through').toBe(0);

    startStage(game, STAGE_ID);
    expect(game.getState().run.shieldsRemaining).toBe(1);
    hitPerfect(game, 3);
    miss(game);
    expect(game.getState().run.currentStreak, 'the shield absorbs it').toBe(3);
  });

  it('spends the Credits at once and saves them', () => {
    const { game, storage } = loadGame({ totalCredits: 2000 });
    startStage(game, STAGE_ID);
    hitPerfect(game, 2);

    buyFromHangar(game, 'sensors');

    expect(game.getState().profile.totalCredits).toBe(1800);
    expect(storage.saved?.totalCredits).toBe(1800);
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
  it('clears the Stars and the Stage records, keeps the Credits, Upgrades and settings, and saves', () => {
    const { game, storage } = loadGame(completeSave());

    game.wipeAchievements();

    const { profile } = game.getState();
    expect(profile.totalStars).toBe(0);
    expect(profile.stagesProgress).toEqual({});
    expect(profile.totalCredits).toBe(1234);
    expect(profile.upgrades).toEqual(completeSave().upgrades);
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
])('%s and the Stage the next mission starts on', (_, command) => {
  const SECOND_STAGE = 's1-l2';

  it('sends the next mission back to the first Stage when no Run is on show', () => {
    const { game } = loadGame(RETURNING_PLAYER);
    startStage(game, SECOND_STAGE);
    game.send({ type: 'PRESS_PAUSE' });
    game.send({ type: 'PRESS_HOME' });

    command(game);
    game.send({ type: 'PRESS_PLAY' });

    expect(game.getState().run.currentStage?.id).toBe(STAGE_ID);
  });

  it('leaves the Stage of a Run that is still on show behind a menu', () => {
    const { game } = loadGame(RETURNING_PLAYER);
    startStage(game, SECOND_STAGE);
    game.send({ type: 'PRESS_PAUSE' });
    game.send({ type: 'OPEN_HANGAR' });

    command(game);

    expect(game.getState().run.currentStage?.id).toBe(SECOND_STAGE);
  });
});
