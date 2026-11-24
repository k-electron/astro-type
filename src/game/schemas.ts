import { z } from 'zod';
import { LogbookSchema } from '../analytics/logbook';
import { MAX_STARS_PER_STAGE } from '../curriculum/curriculum';
import {
  DEFAULT_BACKDROP,
  DEFAULT_BURST,
  DEFAULT_HULL,
  DEFAULT_SHIP,
  DEFAULT_SOUND_KIT,
  DEFAULT_TRAIL,
} from './catalog';

export const TrailIdSchema = z.enum([
  'CYAN',
  'AMBER',
  'EMERALD',
  'VIOLET',
  'SUPERNOVA',
  'TEAL',
  'GOLD',
  'SPECTRUM',
]);

export const SoundKitSchema = z.enum([
  'CYBER_SYNTH',
  'RETRO_8BIT',
  'DEEP_SPACE',
  'NEO_ACOUSTIC',
  'ORBITAL_CHOIR',
  'PULSE_DRUMS',
]);

export const BurstIdSchema = z.enum([
  'SPARKS',
  'STARFLOWER',
  'PIXEL_SHARDS',
  'SHOCKWAVE',
]);

export const BackdropIdSchema = z.enum([
  'STARFIELD',
  'NEBULA',
  'AURORA',
  'DEEP_VOID',
]);

export const ShipIdSchema = z.enum([
  'INTERCEPTOR',
  'DART',
  'MANTA',
  'CORVETTE',
]);

export const HullIdSchema = z.enum(['STANDARD', 'HEX', 'PLATED', 'CRYSTAL']);

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

/** What the player owns of one kind of Cosmetic, and which one is equipped. */
function ownership<T extends string>(schema: z.ZodType<T>, defaultId: T) {
  return z.preprocess(
    (value) => (isRecord(value) ? value : {}),
    z.object({
      owned: ownedList(schema, defaultId),
      equipped: schema.catch(defaultId),
    }),
  );
}

/** The Cosmetics, by the catalog's kind names: what the player owns and wears of each. */
export const CosmeticsSchema = z.object({
  trail: ownership(TrailIdSchema, DEFAULT_TRAIL),
  soundKit: ownership(SoundKitSchema, DEFAULT_SOUND_KIT),
  burst: ownership(BurstIdSchema, DEFAULT_BURST),
  backdrop: ownership(BackdropIdSchema, DEFAULT_BACKDROP),
  ship: ownership(ShipIdSchema, DEFAULT_SHIP),
  hull: ownership(HullIdSchema, DEFAULT_HULL),
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

/** The Cosmetics as stored: anything that is not an object reads as every Cosmetic at its default. */
const readStoredCosmetics = (cosmetics: unknown): unknown =>
  isRecord(cosmetics) ? cosmetics : {};

/**
 * The Save's format version, which is also the version a Backup carries. A
 * step that changes what the Save holds, or what its numbers mean, raises it:
 * the Save module discards an older Save and refuses an older Backup, so no
 * Profile ever mixes old and new numbers, and no code reads an old format.
 */
export const SAVE_VERSION = 7;

/**
 * The Save: the only definition of what a Profile is. Unknown fields are
 * dropped, and a missing or wrong field takes its default or is clamped into
 * range (see the helpers above), so it loses only that field. The parse fails
 * only for a Save that isn't an object or whose `version` isn't `SAVE_VERSION`;
 * the Save module decides what a Save of another version means before it
 * parses, so nothing older is ever read as current.
 * `totalStars` is deliberately not a field here: the total of Stars is worked
 * out from the Stages' Stars (`totalStarsOf`), never saved.
 * Backups (#25) reuse this schema.
 */
export const SaveFieldsSchema = z.object({
  version: z.literal(SAVE_VERSION),
  totalCredits: numberField({ min: 0, integer: true, fallback: 0 }),
  stagesProgress: entriesOf(StageProgressSchema),
  logbook: LogbookSchema,
  cosmetics: z.preprocess(readStoredCosmetics, CosmeticsSchema),
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

/** The Save, with each Stage's progress carrying the id it is keyed by. */
export const PlayerProfileSchema = SaveFieldsSchema.transform((save) => ({
  ...save,
  stagesProgress: Object.fromEntries(
    Object.entries(save.stagesProgress).map(([id, progress]) => [
      id,
      { ...progress, stageId: progress.stageId || id },
    ]),
  ),
}));

/** The Profile a new player starts with: every field at its default. */
export const DEFAULT_PROFILE: PlayerProfile = PlayerProfileSchema.parse({
  version: SAVE_VERSION,
});

// The Profile and its parts. These are the only definitions of these types.
export type PlayerProfile = z.output<typeof PlayerProfileSchema>;
export type StageProgress = z.output<typeof StageProgressSchema>;
export type TrailId = z.output<typeof TrailIdSchema>;
export type SoundKit = z.output<typeof SoundKitSchema>;
export type BurstId = z.output<typeof BurstIdSchema>;
export type BackdropId = z.output<typeof BackdropIdSchema>;
export type ShipId = z.output<typeof ShipIdSchema>;
export type HullId = z.output<typeof HullIdSchema>;
export type BeatTheme = z.output<typeof BeatThemeSchema>;
export type Settings = z.output<typeof SettingsSchema>;
