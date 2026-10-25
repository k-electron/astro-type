import { z } from 'zod';
import { KEY_FINGER_MAP } from '../data/curriculum';

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

export const HighwaySpeedSchema = z.enum(['SLOW', 'NORMAL', 'FAST', 'HYPER']);

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

/**
 * One Stage's progress. Only the shape is checked: the id is not looked up in
 * the curriculum, so Free Flight entries stay valid. A missing `stageId` is
 * filled in from the entry's key, in the Save schema below.
 */
export const StageProgressSchema = z.object({
  stageId: z.string().default(''),
  completed: z.boolean().default(false),
  starsEarned: z.number().int().min(0).max(3).default(0),
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
 * The Save: the only definition of what a Profile is. Unknown fields are
 * dropped, a missing field takes its default, and a field that is present but
 * wrong fails the parse (the Save module then treats the Save as unreadable).
 * `totalStars` is deliberately not a field here: it is computed, never read.
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
  soundEnabled: z.boolean().default(true),
  soundVolume: z.number().min(0).max(1).default(0.7),
  ambientMusicVolume: z.number().min(0).max(1).default(0.25),
  highwaySpeed: HighwaySpeedSchema.default('NORMAL'),
  keyboardVisible: z.boolean().default(true),
  handsVisible: z.boolean().default(true),
  musicEnabled: z.boolean().default(true),
  musicVolume: z.number().min(0).max(1).default(0.4),
  beatTheme: BeatThemeSchema.default('NEON_SYNTHWAVE'),
  globalMuted: z.boolean().default(false),
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
  return {
    ...save,
    stagesProgress,
    totalStars: totalStarsOf(stagesProgress),
  };
});

// Free Flight text, checked at Launch. This schema is the only definition of
// what Free Flight text is: look-alike characters become plain keys, and any
// character the shown keyboard still can't type is reported.
const LOOK_ALIKES: [RegExp, string][] = [
  [/[\u2018\u2019\u201B]/g, "'"], // curly single quotes
  [/[\u201C\u201D\u201F]/g, '"'], // curly double quotes
  [/[\u2010-\u2015\u2212]/g, '-'], // long dashes and the minus sign
  [/\r\n|[\r\n\t\u2028\u2029]/g, ' '], // line breaks and tabs
];

/** A character has a key on the shown keyboard when the finger map has it. */
const isTypeable = (character: string): boolean => character in KEY_FINGER_MAP;

/** A character as itself, or as its code when it would be invisible. */
const describeCharacter = (character: string): string =>
  /[\p{C}\p{Z}]/u.test(character)
    ? `U+${(character.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0')}`
    : character;

export const FreeFlightTextSchema = z
  .string()
  .transform((text) =>
    LOOK_ALIKES.reduce(
      (cleaned, [lookAlike, plain]) => cleaned.replace(lookAlike, plain),
      text,
    ).trim(),
  )
  .check((context) => {
    if (context.value === '') {
      context.issues.push({
        code: 'custom',
        message: 'Enter some text to type.',
        input: context.value,
      });
      return;
    }
    const untypeable = [...new Set([...context.value])].filter(
      (character) => !isTypeable(character),
    );
    if (untypeable.length > 0) {
      const characters = untypeable.map(describeCharacter);
      context.issues.push({
        code: 'custom',
        message: `These characters can't be typed on this keyboard: ${characters.join(' ')}`,
        input: context.value,
        params: { characters },
      });
    }
  });

export type FreeFlightText = z.infer<typeof FreeFlightTextSchema>;

// The Profile and its parts. These are the only definitions of these types.
export type PlayerProfile = z.output<typeof PlayerProfileSchema>;
export type ShipUpgrades = z.output<typeof UpgradesSchema>;
export type StageProgress = z.output<typeof StageProgressSchema>;
export type KeyAnalytics = z.output<typeof KeyAnalyticsSchema>;
export type TrailColorTheme = z.output<typeof TrailColorThemeSchema>;
export type AudioSynthCore = z.output<typeof AudioSynthCoreSchema>;
export type BeatTheme = z.output<typeof BeatThemeSchema>;
