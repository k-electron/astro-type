import { describe, expect, it } from 'vitest';
import { createGame, createMemoryStorage } from './createGame';
import { exportBackup } from './save';

// A Backup is the Profile exported to a file (ticket #25). The browser journeys
// check what the player sees; these check the Profile and the Save directly.

const stage = (starsEarned: number) => ({
  stageId: 's1-l1',
  completed: true,
  starsEarned,
});

/**
 * A Backup exactly as the live game exported it before versions existed: the
 * file from Analytics after clearing Stage 1 with 3 Stars (trimmed to the
 * parts the tests look at). It has no `version`, and it carries a stored
 * `totalStars`, which the game now computes instead.
 */
const OLD_LIVE_EXPORT = {
  totalCredits: 491,
  totalStars: 3,
  totalKeystrokes: 77,
  totalErrors: 0,
  totalWordsTyped: 15,
  totalPracticeSeconds: 11,
  highestWpmAllTime: 82,
  stagesProgress: {
    's1-l1': {
      stageId: 's1-l1',
      completed: true,
      starsEarned: 3,
      highScore: 33275,
      bestWpm: 82,
      bestAccuracy: 100,
      bestStreak: 77,
      timesPlayed: 1,
      lastPlayedAt: 1792937667247,
    },
  },
  keyAnalytics: { f: { hits: 24, misses: 0 }, ' ': { hits: 29, misses: 0 } },
  upgrades: {
    deflectorShields: 0,
    hyperdriveReactor: 0,
    precisionSensors: 0,
    equippedTrailTheme: 'CYAN',
    equippedAudioCore: 'CYBER_SYNTH',
    unlockedThemes: ['CYAN'],
    unlockedAudioCores: ['CYBER_SYNTH'],
  },
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
};

const REFUSAL =
  "That file isn't a Backup this game can read, so your progress was left as it was.";

function gameWith(save?: Record<string, unknown>) {
  const storage = createMemoryStorage(save);
  return { storage, game: createGame({ storage }) };
}

describe('importing a Backup', () => {
  it('brings back the Profile it was exported from, and saves it', () => {
    const { game: playedGame } = gameWith({
      totalCredits: 900,
      stagesProgress: { 's1-l1': stage(3) },
    });
    const backup = exportBackup(playedGame.getProfile());
    expect(JSON.parse(backup).version).toBe(1);

    const { game, storage } = gameWith();
    const outcome = game.store.getState().importProfile(backup);

    expect(outcome.ok).toBe(true);
    expect(game.getProfile().totalStars).toBe(3);
    expect(game.getProfile().totalCredits).toBe(900);
    expect(storage.saved?.totalCredits).toBe(900);
  });

  it('reads a Backup exported before versions existed as version 1', () => {
    const { game } = gameWith();
    const unversioned = JSON.stringify({
      totalCredits: 50,
      stagesProgress: { 's1-l1': stage(2) },
    });

    expect(game.store.getState().importProfile(unversioned).ok).toBe(true);
    expect(game.getProfile().version).toBe(1);
    expect(game.getProfile().totalStars).toBe(2);
  });

  it('reads an export of the live game from before versions existed, and saves it as version 1', () => {
    const { game, storage } = gameWith({
      totalCredits: 7,
      stagesProgress: { 's1-l2': stage(1) },
    });

    const outcome = game.store
      .getState()
      .importProfile(JSON.stringify(OLD_LIVE_EXPORT));

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

  it("reads this game's own Backup with the version taken off, as an old export", () => {
    const { game: playedGame } = gameWith({
      totalCredits: 900,
      stagesProgress: { 's1-l1': stage(3), 's1-l2': stage(2) },
      upgrades: { deflectorShields: 2 },
    });
    const { version: _version, ...oldExport } = JSON.parse(
      exportBackup(playedGame.getProfile()),
    );

    const { game, storage } = gameWith();
    const outcome = game.store
      .getState()
      .importProfile(JSON.stringify(oldExport));

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
      stagesProgress: { 's1-l1': stage(3) },
    });
    const before = game.getProfile();

    const outcome = game.store.getState().importProfile(text);

    expect(outcome.ok).toBe(false);
    expect(outcome.ok === false && outcome.message).toBe(REFUSAL);
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
      stagesProgress: { 's1-l1': stage(3) },
    });
    const before = game.getProfile();

    const outcome = game.store.getState().importProfile(text);

    expect(outcome.ok).toBe(false);
    expect(outcome.ok === false && outcome.message).toBeTruthy();
    expect(game.getProfile()).toEqual(before);
    expect(storage.saved).toBeNull();
  });
});
