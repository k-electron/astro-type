import { z } from 'zod';
import { MAX_STARS_PER_STAGE } from '../curriculum/curriculum';
import { DEFAULT_TRAIL, MAX_UPGRADE_LEVEL } from './catalog';

export const TrailIdSchema = z.enum([
  'CYAN',
  'AMBER',
  'EMERALD',
  'VIOLET',
  'SUPERNOVA',
]);

export const SoundKitSchema = z.enum([
  'CYBER_SYNTH',
  'RETRO_8BIT',
  'DEEP_SPACE',
  'NEO_ACOUSTIC',
]);

export const BeatThemeSchema = z.enum([
  'NEON_SYNTHWAVE',
  'CYBER_PULSE',
  'COSMIC_LOFI',
]);

/**
 * The Save is read field by field: one wrong field loses only that field,
 * never the whole Save. These helpers are the fallbacks. A value of the wrong
 * type takes the field's default, a number out of range is clamped into it,
 * and a number with a fraction where a whole number is required is rounded
 * down. Only the Save's shape as a whole (not an object, an unknown `version`)
 * fails the parse.
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function numberField(options: {
  min: number;
  max?: number;
  integer?: boolean;
  fallback: number;
}) {
  const { min, max = Number.POSITIVE_INFINITY, integer, fallback } = options;
  return z.preprocess((value) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
    const whole = integer ? Math.floor(value) : value;
    return Math.min(max, Math.max(min, whole));
  }, z.number());
}

const booleanField = (fallback: boolean) =>
  z.preprocess(
    (value) => (typeof value === 'boolean' ? value : fallback),
    z.boolean(),
  );

/** The ids a list holds that the enum knows, each once, and always the default. */
function ownedList<T extends string>(schema: z.ZodType<T>, defaultId: T) {
  return z.preprocess((value) => {
    const known = Array.isArray(value)
      ? value.flatMap((id) => {
          const parsed = schema.safeParse(id);
          return parsed.success ? [parsed.data] : [];
        })
      : [];
    const owned = [...new Set(known)];
    return owned.includes(defaultId) ? owned : [defaultId, ...owned];
  }, z.array(schema));
}

/** A record's entries that are objects, each read by `entry`; the others are dropped. */
function entriesOf<T>(entry: z.ZodType<T>) {
  return z.preprocess((value) => {
    if (!isRecord(value)) return {};
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => isRecord(item))
        .map(([id, item]) => [id, entry.parse(item)]),
    );
  }, z.custom<Record<string, T>>());
}

const upgradeLevel = () =>
  numberField({ min: 0, max: MAX_UPGRADE_LEVEL, integer: true, fallback: 0 });

// The fields keep the names a Save was first written with (a Trail was a
// "theme", a Sound Kit an "audio core"), so every Save in the wild still loads.
export const UpgradesSchema = z.object({
  deflectorShields: upgradeLevel(),
  overdriveReactor: upgradeLevel(),
  precisionSensors: upgradeLevel(),
  equippedTrailTheme: TrailIdSchema.catch(DEFAULT_TRAIL),
  equippedAudioCore: SoundKitSchema.catch('CYBER_SYNTH'),
  unlockedThemes: ownedList(TrailIdSchema, DEFAULT_TRAIL),
  unlockedAudioCores: ownedList(SoundKitSchema, 'CYBER_SYNTH'),
});

/**
 * One Stage's progress. Only the shape is checked: the id is not looked up in
 * the curriculum. A missing `stageId` is filled in from the entry's key, in the
 * Save schema below.
 */
export const StageProgressSchema = z.object({
  stageId: z.preprocess((id) => (typeof id === 'string' ? id : ''), z.string()),
  completed: booleanField(false),
  starsEarned: numberField({
    min: 0,
    max: MAX_STARS_PER_STAGE,
    integer: true,
    fallback: 0,
  }),
  highScore: numberField({ min: 0, integer: true, fallback: 0 }),
  bestWpm: numberField({ min: 0, fallback: 0 }),
  bestAccuracy: numberField({ min: 0, max: 100, fallback: 0 }),
  bestStreak: numberField({ min: 0, integer: true, fallback: 0 }),
  timesPlayed: numberField({ min: 0, integer: true, fallback: 0 }),
  lastPlayedAt: z.preprocess(
    (time) =>
      typeof time === 'number' && Number.isFinite(time) ? time : undefined,
    z.number().optional(),
  ),
});

export const KeyAnalyticsSchema = z.object({
  hits: numberField({ min: 0, integer: true, fallback: 0 }),
  misses: numberField({ min: 0, integer: true, fallback: 0 }),
});

/**
 * The settings the player changes in the header: sound, music, the beat, and
 * what the Action Deck shows. One group, spread into the Save below, so a new
 * setting is one line here and `Settings` follows from it.
 */
export const SettingsSchema = z.object({
  soundEnabled: booleanField(true),
  soundVolume: numberField({ min: 0, max: 1, fallback: 0.7 }),
  keyboardVisible: booleanField(true),
  handsVisible: booleanField(true),
  musicEnabled: booleanField(true),
  musicVolume: numberField({ min: 0, max: 1, fallback: 0.4 }),
  beatTheme: BeatThemeSchema.catch('NEON_SYNTHWAVE'),
  globalMuted: booleanField(false),
});

/**
 * The Upgrades as stored: anything that is not an object reads as no Upgrades
 * at all. Saves and Backups made before the Reactor was renamed hold its level
 * as `hyperdriveReactor`. It is read as `overdriveReactor` (the new key wins
 * when both are there), so no version bump is needed; the old key is never
 * written.
 */
function readStoredUpgrades(upgrades: unknown): unknown {
  if (!isRecord(upgrades)) return {};
  const { hyperdriveReactor, ...rest } = upgrades;
  if (hyperdriveReactor === undefined) return upgrades;
  return { overdriveReactor: hyperdriveReactor, ...rest };
}

/**
 * The Save: the only definition of what a Profile is. Unknown fields are
 * dropped, and a missing or wrong field takes its default or is clamped into
 * range (see the helpers above), so it loses only that field. The parse fails
 * only for a Save that isn't an object or has an unknown `version`; the Save
 * module then treats the Save as unreadable.
 * `totalStars` is deliberately not a field here: the total of Stars is worked
 * out from the Stages' Stars (`totalStarsOf`), never saved. A Save or Backup
 * from before that still says it, and the field is dropped on read.
 * Backups (#25) reuse this schema.
 */
export const SaveFieldsSchema = z.object({
  version: z.literal(1).default(1),
  totalCredits: numberField({ min: 0, integer: true, fallback: 0 }),
  totalKeystrokes: numberField({ min: 0, integer: true, fallback: 0 }),
  totalErrors: numberField({ min: 0, integer: true, fallback: 0 }),
  totalWordsTyped: numberField({ min: 0, integer: true, fallback: 0 }),
  totalPracticeSeconds: numberField({ min: 0, fallback: 0 }),
  highestWpmAllTime: numberField({ min: 0, fallback: 0 }),
  stagesProgress: entriesOf(StageProgressSchema),
  keyAnalytics: entriesOf(KeyAnalyticsSchema),
  upgrades: z.preprocess(readStoredUpgrades, UpgradesSchema),
  ...SettingsSchema.shape,
});

/** Total Stars are the sum of the Stars earned on each Stage. */
export const totalStarsOf = (
  stagesProgress: Record<string, { starsEarned: number }>,
): number =>
  Object.values(stagesProgress).reduce((sum, sp) => sum + sp.starsEarned, 0);

/** How many Stages are cleared: the ones with `completed` set, which Wipe Stars resets. */
export const clearedStagesOf = (
  stagesProgress: Record<string, { completed: boolean }>,
): number => Object.values(stagesProgress).filter((sp) => sp.completed).length;

/**
 * Saves and Backups made before Free Flight became practice (#86) hold an
 * entry for each Free Flight, keyed `custom-<launch time>`. They are dropped on
 * read, so their Stars stop counting; the game never writes one.
 */
const FREE_FLIGHT_ENTRY_PREFIX = 'custom-';

export const PlayerProfileSchema = SaveFieldsSchema.transform((save) => {
  const stagesProgress = Object.fromEntries(
    Object.entries(save.stagesProgress)
      .filter(([id]) => !id.startsWith(FREE_FLIGHT_ENTRY_PREFIX))
      .map(([id, progress]) => [
        id,
        { ...progress, stageId: progress.stageId || id },
      ]),
  );
  return { ...save, stagesProgress };
});

/** The Profile a new player starts with: every field at its default. */
export const DEFAULT_PROFILE: PlayerProfile = PlayerProfileSchema.parse({});

// The Profile and its parts. These are the only definitions of these types.
export type PlayerProfile = z.output<typeof PlayerProfileSchema>;
export type ShipUpgrades = z.output<typeof UpgradesSchema>;
export type StageProgress = z.output<typeof StageProgressSchema>;
export type KeyAnalytics = z.output<typeof KeyAnalyticsSchema>;
export type TrailId = z.output<typeof TrailIdSchema>;
export type SoundKit = z.output<typeof SoundKitSchema>;
export type BeatTheme = z.output<typeof BeatThemeSchema>;
export type Settings = z.output<typeof SettingsSchema>;
