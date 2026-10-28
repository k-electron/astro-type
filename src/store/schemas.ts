import { z } from 'zod';

export const TrailColorThemeSchema = z.enum([
  'CYAN',
  'AMBER',
  'EMERALD',
  'VIOLET',
  'SUPERNOVA',
]);

export const AudioSynthCoreSchema = z.enum([
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

/** The most levels any Upgrade has. The Hangar, the store and the Save all stop here. */
export const MAX_UPGRADE_LEVEL = 3;

const UpgradeLevelSchema = z
  .number()
  .int()
  .min(0)
  .max(MAX_UPGRADE_LEVEL)
  .default(0);

export const UpgradesSchema = z.object({
  deflectorShields: UpgradeLevelSchema,
  hyperdriveReactor: UpgradeLevelSchema,
  precisionSensors: UpgradeLevelSchema,
  equippedTrailTheme: TrailColorThemeSchema.default('CYAN'),
  equippedAudioCore: AudioSynthCoreSchema.default('CYBER_SYNTH'),
  unlockedThemes: z.array(TrailColorThemeSchema).default(['CYAN']),
  unlockedAudioCores: z.array(AudioSynthCoreSchema).default(['CYBER_SYNTH']),
});

/** The most Stars one Stage gives. The star rules, the Save and the curriculum's totals stop here. */
export const MAX_STARS_PER_STAGE = 3;

/**
 * One Stage's progress. Only the shape is checked: the id is not looked up in
 * the curriculum, so Free Flight entries stay valid. A missing `stageId` is
 * filled in from the entry's key, in the Save schema below.
 */
export const StageProgressSchema = z.object({
  stageId: z.string().default(''),
  completed: z.boolean().default(false),
  starsEarned: z.number().int().min(0).max(MAX_STARS_PER_STAGE).default(0),
  highScore: z.number().int().min(0).default(0),
  bestWpm: z.number().min(0).default(0),
  bestAccuracy: z.number().min(0).max(100).default(0),
  bestStreak: z.number().int().min(0).default(0),
  timesPlayed: z.number().int().min(0).default(0),
  lastPlayedAt: z.number().optional(),
});

export const KeyAnalyticsSchema = z.object({
  hits: z.number().int().min(0).default(0),
  misses: z.number().int().min(0).default(0),
});

/**
 * The settings the player changes in the header: sound, music, the beat, and
 * what the Action Deck shows. One group, spread into the Save below, so a new
 * setting is one line here and `Settings` follows from it.
 */
export const SettingsSchema = z.object({
  soundEnabled: z.boolean().default(true),
  soundVolume: z.number().min(0).max(1).default(0.7),
  keyboardVisible: z.boolean().default(true),
  handsVisible: z.boolean().default(true),
  musicEnabled: z.boolean().default(true),
  musicVolume: z.number().min(0).max(1).default(0.4),
  beatTheme: BeatThemeSchema.default('NEON_SYNTHWAVE'),
  globalMuted: z.boolean().default(false),
});

/**
 * The Save: the only definition of what a Profile is. Unknown fields are
 * dropped, a missing field takes its default, and a field that is present but
 * wrong fails the parse (the Save module then treats the Save as unreadable).
 * `totalStars` is deliberately not a field here: the total of Stars is worked
 * out from the Stages' Stars (`totalStarsOf`), never saved. A Save or Backup
 * from before that still says it, and the field is dropped on read.
 * Backups (#25) reuse this schema.
 */
export const SaveFieldsSchema = z.object({
  version: z.literal(1).default(1),
  totalCredits: z.number().int().min(0).default(0),
  totalKeystrokes: z.number().int().min(0).default(0),
  totalErrors: z.number().int().min(0).default(0),
  totalWordsTyped: z.number().int().min(0).default(0),
  totalPracticeSeconds: z.number().min(0).default(0),
  highestWpmAllTime: z.number().min(0).default(0),
  stagesProgress: z.record(z.string(), StageProgressSchema).default({}),
  keyAnalytics: z.record(z.string(), KeyAnalyticsSchema).default({}),
  upgrades: UpgradesSchema.prefault({}),
  ambientMusicVolume: z.number().min(0).max(1).default(0.25),
  ...SettingsSchema.shape,
});

/** Total Stars are the sum of the Stars earned on each Stage. */
export const totalStarsOf = (
  stagesProgress: Record<string, { starsEarned: number }>,
): number =>
  Object.values(stagesProgress).reduce((sum, sp) => sum + sp.starsEarned, 0);

export const PlayerProfileSchema = SaveFieldsSchema.transform((save) => {
  const stagesProgress = Object.fromEntries(
    Object.entries(save.stagesProgress).map(([id, progress]) => [
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
export type TrailColorTheme = z.output<typeof TrailColorThemeSchema>;
export type AudioSynthCore = z.output<typeof AudioSynthCoreSchema>;
export type BeatTheme = z.output<typeof BeatThemeSchema>;
export type Settings = z.output<typeof SettingsSchema>;
