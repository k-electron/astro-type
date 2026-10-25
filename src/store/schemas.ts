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

export const UpgradesSchema = z
  .object({
    deflectorShields: z.number().int().min(0).max(5).default(0),
    hyperdriveReactor: z.number().int().min(0).max(5).default(0),
    precisionSensors: z.number().int().min(0).max(5).default(0),
    equippedTrailTheme: TrailColorThemeSchema.default('CYAN'),
    equippedAudioCore: AudioSynthCoreSchema.default('CYBER_SYNTH'),
    unlockedThemes: z.array(TrailColorThemeSchema).default(['CYAN']),
    unlockedAudioCores: z.array(AudioSynthCoreSchema).default(['CYBER_SYNTH']),
  })
  .passthrough();

export const StageProgressSchema = z
  .object({
    stageId: z.string(),
    completed: z.boolean().default(false),
    starsEarned: z.number().int().min(0).max(3).default(0),
    highScore: z.number().int().min(0).default(0),
    bestWpm: z.number().min(0).default(0),
    bestAccuracy: z.number().min(0).max(100).default(0),
    bestStreak: z.number().int().min(0).default(0),
    timesPlayed: z.number().int().min(0).default(0),
    lastPlayedAt: z.number().optional(),
  })
  .passthrough();

export const KeyAnalyticsSchema = z
  .object({
    hits: z.number().int().min(0).default(0),
    misses: z.number().int().min(0).default(0),
    key: z.string().optional(),
    avgReactionMs: z.number().optional(),
    accuracy: z.number().optional(),
  })
  .passthrough();

export const PlayerProfileSchema = z
  .object({
    totalCredits: z.number().int().min(0).default(0),
    totalStars: z.number().int().min(0).default(0),
    totalKeystrokes: z.number().int().min(0).default(0),
    totalErrors: z.number().int().min(0).default(0),
    totalWordsTyped: z.number().int().min(0).default(0),
    totalPracticeSeconds: z.number().min(0).default(0),
    highestWpmAllTime: z.number().min(0).default(0),
    stagesProgress: z.record(z.string(), StageProgressSchema).default({}),
    keyAnalytics: z.record(z.string(), KeyAnalyticsSchema).default({}),
    upgrades: UpgradesSchema.default({
      deflectorShields: 0,
      hyperdriveReactor: 0,
      precisionSensors: 0,
      equippedTrailTheme: 'CYAN',
      equippedAudioCore: 'CYBER_SYNTH',
      unlockedThemes: ['CYAN'],
      unlockedAudioCores: ['CYBER_SYNTH'],
    }),
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
  })
  .passthrough();

export const LivePerformanceSchema = z
  .object({
    score: z.number().int().min(0).default(0),
    currentStreak: z.number().int().min(0).default(0),
    maxStreak: z.number().int().min(0).default(0),
    multiplier: z.number().int().min(1).max(8).default(1),
    hyperspaceActive: z.boolean().default(false),
    hyperspaceEnergy: z.number().min(0).max(100).default(0),
    shieldsRemaining: z.number().int().min(0).default(0),
    correctKeystrokes: z.number().int().min(0).default(0),
    incorrectKeystrokes: z.number().int().min(0).default(0),
    totalKeystrokes: z.number().int().min(0).default(0),
    grossWpm: z.number().min(0).default(0),
    netWpm: z.number().min(0).default(0),
    accuracy: z.number().min(0).max(100).default(100),
    currentCharIndex: z.number().int().min(0).default(0),
    timeElapsedSeconds: z.number().min(0).default(0),
    timingFeedback: z
      .enum(['PERFECT', 'GREAT', 'GOOD', 'MISS'])
      .nullable()
      .default(null),
    timingFeedbackKey: z.number().int().default(0),
    cadenceConsistency: z.number().min(0).max(100).optional().default(100),
  })
  .passthrough();

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
export type ValidatedPlayerProfile = z.infer<typeof PlayerProfileSchema>;
export type ValidatedLivePerformance = z.infer<typeof LivePerformanceSchema>;
