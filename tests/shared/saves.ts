/**
 * The one place a test builds a Save. Every layer starts from these: the unit
 * tests (`loadGame(seed)`), the DOM tests (`renderGame({ profile })`) and the
 * browser tests (`seedSave`). Fields left out of a Save take their defaults, as
 * they do for a real one. This imports from no test runner, so every layer of
 * tests can use it.
 *
 * These write the current format. A seed is read as "a Save as the current game
 * writes it": the three seeding seams above pass a plain-object seed that has
 * no `version` of its own through `asCurrentSave`, which adds `version:
 * SAVE_VERSION`. So a bare `{ totalCredits: 5 }` is a valid Save. A test that
 * needs a Save the current game would not have written (an older one, an
 * unversioned one, a garbled one, one from a newer game) builds the storage
 * itself and so skips the stamping: `createGame({ storage:
 * createMemoryStorage(raw) })` for a unit test, `renderGame({ storage })` for a
 * DOM test (the storage wins over `profile`). A seed that already has a
 * `version` key is left as it is, so a Save from a newer game can go through a
 * seam with its `version` spelled out.
 */
import { CURRICULUM_SECTORS } from '../../src/curriculum/curriculum';
import {
  type CosmeticKind,
  DEFAULT_BACKDROP,
  DEFAULT_BURST,
  DEFAULT_HULL,
  DEFAULT_SHIP,
  DEFAULT_SOUND_KIT,
  DEFAULT_TRAIL,
} from '../../src/game/catalog';
import {
  SAVE_VERSION,
  SoundKitSchema,
  type TrailId,
} from '../../src/game/schemas';

/**
 * The free default of each kind of Cosmetic: the one every player owns and
 * wears from the start. A Save keeps each kind under `cosmetics[kind]` as its
 * `owned` list and its `equipped` id. The one place a test names a default per
 * kind, so a seventh kind fails the typecheck here.
 */
export const FREE_COSMETIC = {
  trail: DEFAULT_TRAIL,
  soundKit: DEFAULT_SOUND_KIT,
  burst: DEFAULT_BURST,
  backdrop: DEFAULT_BACKDROP,
  ship: DEFAULT_SHIP,
  hull: DEFAULT_HULL,
} as const satisfies Record<CosmeticKind, string>;

/**
 * A seed as the current game would have written it: a plain object with no
 * `version` of its own gets `version: SAVE_VERSION`. Anything else (an object
 * that has a `version`, a list, text, a number, `null`, `undefined`) is
 * returned untouched, so a test can still seed what the game must refuse.
 */
export function asCurrentSave(seed: unknown): unknown {
  if (typeof seed !== 'object' || seed === null || Array.isArray(seed)) {
    return seed;
  }
  if (Object.hasOwn(seed, 'version')) return seed;
  return { ...seed, version: SAVE_VERSION };
}

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

/**
 * A Profile with exactly `total` Stars, from Stages cleared in curriculum
 * order with 3 Stars each (the last with what is left), leaving out the Stage
 * `skip` so a test can clear that one itself.
 */
export function saveWithStars(total: number, skip?: string) {
  const stars: Record<string, number> = {};
  let left = total;
  for (const stage of CURRICULUM_SECTORS.flatMap((sector) => sector.stages)) {
    if (left === 0) break;
    if (stage.id === skip) continue;
    stars[stage.id] = Math.min(3, left);
    left -= stars[stage.id];
  }
  if (left > 0) throw new Error(`No Profile can hold ${total} Stars`);
  return clearedStages(stars);
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

/** RETURNING_PLAYER with Audio muted, so the header's Audio button says MUTED. */
export const MUTED_PLAYER = { ...RETURNING_PLAYER, globalMuted: true };

/**
 * The widest numbers the header can show: every Stage cleared with 3 Stars
 * (the most Stars there are) and six-digit Credits.
 */
export const MOST_STARS_AND_CREDITS = {
  ...EVERY_STAGE_CLEARED,
  totalCredits: 999_999,
};

/** RETURNING_PLAYER with every Sound Kit owned, so any can be equipped. */
export const OWNS_EVERY_SOUND_KIT = {
  ...RETURNING_PLAYER,
  cosmetics: {
    soundKit: {
      owned: [...SoundKitSchema.options],
      equipped: DEFAULT_SOUND_KIT,
    },
  },
};

/**
 * RETURNING_PLAYER who has bought the 8-Bit Retro Sound Kit (300 Cr) and so owns
 * two Sound Kits, Cyber Synth and 8-Bit Retro; Deep Space and Neo Acoustic are
 * still the Hangar's to sell. The Credits are left as they were.
 */
export const OWNS_RETRO_SOUND_KIT = {
  ...RETURNING_PLAYER,
  cosmetics: {
    soundKit: {
      owned: [DEFAULT_SOUND_KIT, 'RETRO_8BIT'],
      equipped: DEFAULT_SOUND_KIT,
    },
  },
};

/**
 * A Save that owns the Cosmetic and has it equipped. The kind's free default
 * is always owned too, as in a real Save. For another kind's Cosmetic, merge
 * the `cosmetics` of two of these (`{ cosmetics: { ...a.cosmetics,
 * ...b.cosmetics } }`): spreading the Saves themselves would let the second
 * `cosmetics` replace the first.
 */
export function cosmeticEquipped(kind: CosmeticKind, id: string) {
  return {
    cosmetics: { [kind]: { owned: [FREE_COSMETIC[kind], id], equipped: id } },
  };
}

/** A Save that owns the Trail and has it equipped (Cyan Nebula is always owned). */
export function trailEquipped(id: TrailId) {
  return cosmeticEquipped('trail', id);
}

/**
 * A complete Save in today's format, `version: SAVE_VERSION` and all:
 * RETURNING_PLAYER's 5 Stars and 1,234 Credits, plus every other field, each
 * set to something other than its default so a load that dropped it would
 * show: the settings, and a Cosmetic of every kind owned and worn alongside its
 * free default.
 */
export function completeSave() {
  return {
    version: SAVE_VERSION,
    ...RETURNING_PLAYER,
    totalStars: 5,
    totalCharactersTyped: 154,
    totalMissMarks: 3,
    totalWordsTyped: 30,
    totalPracticeSeconds: 120,
    highestWpmAllTime: 31,
    keyAnalytics: {
      f: { hits: 48, misses: 1 },
      j: { hits: 48, misses: 2 },
      ' ': { hits: 58, misses: 0 },
    },
    cosmetics: {
      trail: { owned: ['CYAN', 'AMBER'], equipped: 'AMBER' },
      soundKit: {
        owned: ['CYBER_SYNTH', 'RETRO_8BIT'],
        equipped: 'RETRO_8BIT',
      },
      burst: { owned: ['SPARKS', 'STARFLOWER'], equipped: 'STARFLOWER' },
      backdrop: { owned: ['STARFIELD', 'NEBULA'], equipped: 'NEBULA' },
      ship: { owned: ['INTERCEPTOR', 'DART'], equipped: 'DART' },
      hull: { owned: ['STANDARD', 'HEX'], equipped: 'HEX' },
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
 * A Save with these lifetime totals: the characters typed over every cleared
 * Run, and how many of them carried a Miss mark. Lifetime accuracy is the
 * share without one.
 */
export function lifetimeTotals(characters: number, missMarks: number) {
  return { totalCharactersTyped: characters, totalMissMarks: missMarks };
}

/**
 * A Save with these key stats: for each key, how many of its characters were
 * typed right first time (`hits`) and how many carried a Miss mark (`misses`).
 */
export function keyStats(
  stats: Record<string, [hits: number, misses: number]>,
) {
  return {
    keyAnalytics: Object.fromEntries(
      Object.entries(stats).map(([key, [hits, misses]]) => [
        key,
        { hits, misses },
      ]),
    ),
  };
}

/**
 * A Backup exported before versions existed; today it is refused. The file
 * from Analytics after clearing Stage 1 with 3 Stars (trimmed to the parts the
 * tests look at). It has no `version`, and it keeps its old shape on purpose
 * (`totalKeystrokes` and `totalErrors`, the Reactor under `hyperdriveReactor`,
 * a `highwaySpeed`): it is a fixture, not a builder. What makes it refused is
 * the missing `version`; the rest is how a real one looked.
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
