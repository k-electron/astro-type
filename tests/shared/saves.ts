/**
 * The one place a test builds a Save. Every layer starts from these: the unit
 * tests (`createMemoryStorage(save)`), the DOM tests (`renderGame({ profile })`)
 * and the browser tests (`seedSave`). Fields left out of a Save take their
 * defaults, as they do for a real one. This imports from no test runner, so
 * every layer of tests can use it.
 */
import { AudioSynthCoreSchema } from '../../src/store/schemas';

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

/** 5 Stars in all (Stage 1 with 3, Stage 2 with 2) and 1,234 Credits. */
export const RETURNING_PLAYER = {
  totalCredits: 1234,
  ...clearedStages({ 's1-l1': 3, 's1-l2': 2 }),
};

/** RETURNING_PLAYER with every Synthesizer core owned, so any can be equipped. */
export const OWNS_EVERY_AUDIO_CORE = {
  ...RETURNING_PLAYER,
  upgrades: { unlockedAudioCores: [...AudioSynthCoreSchema.options] },
};

/**
 * RETURNING_PLAYER who has bought the 8-Bit Retro core (300 Cr) and so owns
 * two Synthesizer cores, Cyber Synth and 8-Bit Retro; Deep Space and Neo
 * Acoustic are still the Hangar's to sell. The Credits are left as they were.
 */
export const OWNS_RETRO_AUDIO_CORE = {
  ...RETURNING_PLAYER,
  upgrades: { unlockedAudioCores: ['CYBER_SYNTH', 'RETRO_8BIT'] },
};

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
    keyboardVisible: false,
    handsVisible: false,
    musicEnabled: false,
    musicVolume: 0.2,
    beatTheme: 'COSMIC_LOFI',
    globalMuted: true,
  };
}

/**
 * A returning player's Save with Free Flight results in it, as production
 * writes them: Stage progress keyed `custom-<launch time>`, beside the
 * curriculum Stages and every other field of `completeSave()`. Free Flight Stars
 * count toward the fleet's total, so the Save's Stars are 5 + 2 + 3.
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
