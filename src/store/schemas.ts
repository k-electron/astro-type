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

export type ValidatedPlayerProfile = z.infer<typeof PlayerProfileSchema>;
export type ValidatedLivePerformance = z.infer<typeof LivePerformanceSchema>;
