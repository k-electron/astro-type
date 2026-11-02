/**
 * The one place a test builds a Save. Every layer starts from these: the unit
 * tests (`createMemoryStorage(save)`), the DOM tests (`renderGame({ profile })`)
 * and the browser tests (`seedSave`). Fields left out of a Save take their
 * defaults, as they do for a real one. This imports from no test runner, so
 * every layer of tests can use it.
 */
import { CURRICULUM_SECTORS } from '../../src/curriculum/curriculum';
import { SoundKitSchema, type TrailId } from '../../src/game/schemas';

/** One Stage's progress, cleared with `stars` Stars. `overrides` change any field. */
export function stageProgress(
  stageId: string,
  stars: number,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    stageId,
    completed: true,
    starsEarned: stars,
    highScore: 22150,
    bestWpm: 31,
    bestAccuracy: 100,
    bestStreak: 40,
    timesPlayed: 2,
    lastPlayedAt: 1792904921385,
    ...overrides,
  };
}

/** A Profile's Stage progress: each Stage id cleared with that many Stars. */
export function clearedStages(stars: Record<string, number>): {
  stagesProgress: Record<string, Record<string, unknown>>;
} {
  return {
    stagesProgress: Object.fromEntries(
      Object.entries(stars).map(([stageId, starsEarned]) => [
        stageId,
        stageProgress(stageId, starsEarned),
      ]),
    ),
  };
}

/** Every Stage in the game cleared with 3 Stars, so no Sector is locked. */
export const EVERY_STAGE_CLEARED = clearedStages(
  Object.fromEntries(
    CURRICULUM_SECTORS.flatMap((sector) =>
      sector.stages.map((stage) => [stage.id, 3]),
    ),
  ),
);

/** 5 Stars in all (Stage 1 with 3, Stage 2 with 2) and 1,234 Credits. */
export const RETURNING_PLAYER = {
  totalCredits: 1234,
  ...clearedStages({ 's1-l1': 3, 's1-l2': 2 }),
};

/** RETURNING_PLAYER with every Sound Kit owned, so any can be equipped. */
export const OWNS_EVERY_SOUND_KIT = {
  ...RETURNING_PLAYER,
  upgrades: { unlockedAudioCores: [...SoundKitSchema.options] },
};

/**
 * RETURNING_PLAYER who has bought the 8-Bit Retro Sound Kit (300 Cr) and so owns
 * two Sound Kits, Cyber Synth and 8-Bit Retro; Deep Space and Neo Acoustic are
 * still the Hangar's to sell. The Credits are left as they were.
 */
export const OWNS_RETRO_SOUND_KIT = {
  ...RETURNING_PLAYER,
  upgrades: { unlockedAudioCores: ['CYBER_SYNTH', 'RETRO_8BIT'] },
};

/** A Save that owns the Trail and has it equipped (Cyan Nebula is always owned). */
export function trailEquipped(id: TrailId) {
  return {
    upgrades: { equippedTrailTheme: id, unlockedThemes: ['CYAN', id] },
  };
}

/**
 * A complete Save in today's format (no `version`): RETURNING_PLAYER's 5 Stars
 * and 1,234 Credits, plus every other field, each set to something other than
 * its default so a load that dropped it would show.
 */
export function completeSave() {
  return {
    ...RETURNING_PLAYER,
    totalStars: 5,
    totalKeystrokes: 154,
    totalErrors: 3,
    totalWordsTyped: 30,
    totalPracticeSeconds: 120,
    highestWpmAllTime: 31,
    keyAnalytics: {
      f: { hits: 48, misses: 1 },
      j: { hits: 48, misses: 2 },
      ' ': { hits: 58, misses: 0 },
    },
    upgrades: {
      deflectorShields: 1,
      overdriveReactor: 2,
      precisionSensors: 0,
      equippedTrailTheme: 'CYAN',
      equippedAudioCore: 'CYBER_SYNTH',
      unlockedThemes: ['CYAN'],
      unlockedAudioCores: ['CYBER_SYNTH'],
    },
    soundEnabled: false,
    soundVolume: 0.3,
    ambientMusicVolume: 0.1,
    keyboardVisible: false,
    handsVisible: false,
    musicEnabled: false,
    musicVolume: 0.2,
    beatTheme: 'COSMIC_LOFI',
    globalMuted: true,
  };
}

/**
 * A returning player's Save from before Free Flight became practice (#86), with
 * its results in it as production wrote them: Stage progress keyed
 * `custom-<launch time>`, beside the curriculum Stages and every other field of
 * `completeSave()`. It claims 10 Stars, 5 from the curriculum and 5 from Free
 * Flight, which is enough to open Sector 02 (6); once the `custom-` entries are
 * dropped on reading, 5 are left and Sector 02 is locked again.
 */
export const FREE_FLIGHT_SAVE = (() => {
  const save = completeSave();
  return {
    ...save,
    totalStars: 10,
    stagesProgress: {
      ...save.stagesProgress,
      'custom-1792904921385': stageProgress('custom-1792904921385', 2, {
        highScore: 9100,
        bestWpm: 44,
        timesPlayed: 3,
      }),
      'custom-1792905000123': stageProgress('custom-1792905000123', 3, {
        highScore: 15200,
        bestWpm: 61,
        bestStreak: 25,
        timesPlayed: 1,
      }),
    },
  };
})();

/**
 * The Drone speeds the game once let a player choose. Every Run now moves at
 * one speed (FAST), but Saves and Backups made before that still carry the
 * choice in a `highwaySpeed` field, which must load and then be left behind.
 */
export const OLD_DRONE_SPEEDS = ['SLOW', 'NORMAL', 'FAST', 'HYPER'] as const;

/** A Save or Backup as it was before the speed choice went: carrying `highwaySpeed`. */
export function withOldDroneSpeed<T extends object>(
  save: T,
  speed: string,
): T & { highwaySpeed: string } {
  return { ...save, highwaySpeed: speed };
}

/**
 * A Save or Backup as production wrote it before the Overdrive Reactor's level
 * was saved as `overdriveReactor`: the same Save with that level under the old
 * key, `hyperdriveReactor`, and no new key. The old key is spelled out here on
 * purpose, as it is the oracle for reading such a file. Returns raw JSON, not a
 * typed Save.
 */
export function withLegacyReactorKey<T extends { upgrades: object }>(
  save: T,
  level: number,
) {
  const upgrades = Object.fromEntries(
    Object.entries(save.upgrades).filter(([key]) => key !== 'overdriveReactor'),
  );
  return { ...save, upgrades: { ...upgrades, hyperdriveReactor: level } };
}

/**
 * A Backup exactly as the live game exported it before versions existed: the
 * file from Analytics after clearing Stage 1 with 3 Stars (trimmed to the
 * parts the tests look at). It has no `version`, and it carries a stored
 * `totalStars`, which the game now computes instead. This is a fixture on
 * purpose, not a builder: its historical shape is what is under test.
 */
export const OLD_LIVE_EXPORT = {
  totalCredits: 491,
  totalStars: 3,
  totalKeystrokes: 77,
  totalErrors: 0,
  totalWordsTyped: 15,
  totalPracticeSeconds: 11,
  highestWpmAllTime: 82,
  stagesProgress: {
    's1-l1': stageProgress('s1-l1', 3, {
      highScore: 33275,
      bestWpm: 82,
      bestAccuracy: 100,
      bestStreak: 77,
      timesPlayed: 1,
      lastPlayedAt: 1792937667247,
    }),
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
