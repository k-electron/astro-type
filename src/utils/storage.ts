import {
  KeyAnalytics,
  PlayerProfile,
  StageProgress,
  TrailColorTheme,
  AudioSynthCore,
} from '../types/game';
import { CURRICULUM_SECTORS } from '../data/curriculum';

const STORAGE_KEY = 'astrotype_profile_v1';

export const DEFAULT_PROFILE: PlayerProfile = {
  totalCredits: 0,
  totalStars: 0,
  totalKeystrokes: 0,
  totalErrors: 0,
  totalWordsTyped: 0,
  totalPracticeSeconds: 0,
  highestWpmAllTime: 0,
  stagesProgress: {},
  keyAnalytics: {},
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

export function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_PROFILE;
    }
    const parsed = JSON.parse(raw);
    const stagesProgress = (parsed.stagesProgress || {}) as Record<
      string,
      StageProgress
    >;
    const computedStars = calculateTotalStars(stagesProgress);
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      totalStars: computedStars,
      stagesProgress,
      upgrades: {
        ...DEFAULT_PROFILE.upgrades,
        ...(parsed.upgrades || {}),
      },
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Storage quota or error
  }
}

export function calculateTotalStars(
  stagesProgress: Record<string, StageProgress>,
): number {
  return Object.values(stagesProgress).reduce(
    (sum, sp) => sum + (sp.starsEarned || 0),
    0,
  );
}

export function recordStageResult(
  currentProfile: PlayerProfile,
  stageId: string,
  result: {
    score: number;
    wpm: number;
    accuracy: number;
    maxStreak: number;
    starsEarned: number;
    creditsEarned: number;
    keystrokesCount: number;
    errorsCount: number;
    practiceSeconds: number;
    keyStats: Record<string, { hits: number; misses: number }>;
  },
): {
  updatedProfile: PlayerProfile;
  newStarsAwarded: number;
  isNewHighScore: boolean;
} {
  const prevProgress = currentProfile.stagesProgress[stageId] || {
    stageId,
    completed: false,
    starsEarned: 0,
    highScore: 0,
    bestWpm: 0,
    bestAccuracy: 0,
    bestStreak: 0,
    timesPlayed: 0,
  };

  const isNewHighScore = result.score > prevProgress.highScore;
  const bestStars = Math.max(prevProgress.starsEarned, result.starsEarned);
  const newStarsAwarded = Math.max(0, bestStars - prevProgress.starsEarned);

  const updatedStageProgress: StageProgress = {
    stageId,
    completed: true,
    starsEarned: bestStars,
    highScore: Math.max(prevProgress.highScore, result.score),
    bestWpm: Math.max(prevProgress.bestWpm, result.wpm),
    bestAccuracy: Math.max(prevProgress.bestAccuracy, result.accuracy),
    bestStreak: Math.max(prevProgress.bestStreak, result.maxStreak),
    timesPlayed: prevProgress.timesPlayed + 1,
    lastPlayedAt: Date.now(),
  };

  const newStagesProgress = {
    ...currentProfile.stagesProgress,
    [stageId]: updatedStageProgress,
  };

  // Merge key analytics
  const mergedKeyAnalytics: Record<string, KeyAnalytics> = {
    ...currentProfile.keyAnalytics,
  };
  Object.entries(result.keyStats).forEach(([char, stats]) => {
    const existing = mergedKeyAnalytics[char] || { hits: 0, misses: 0 };
    mergedKeyAnalytics[char] = {
      hits: existing.hits + stats.hits,
      misses: existing.misses + stats.misses,
    };
  });

  const updatedProfile: PlayerProfile = {
    ...currentProfile,
    totalCredits: currentProfile.totalCredits + result.creditsEarned,
    totalStars: calculateTotalStars(newStagesProgress),
    totalKeystrokes: currentProfile.totalKeystrokes + result.keystrokesCount,
    totalErrors: currentProfile.totalErrors + result.errorsCount,
    totalWordsTyped:
      currentProfile.totalWordsTyped + Math.round(result.keystrokesCount / 5),
    totalPracticeSeconds:
      currentProfile.totalPracticeSeconds + result.practiceSeconds,
    highestWpmAllTime: Math.max(currentProfile.highestWpmAllTime, result.wpm),
    stagesProgress: newStagesProgress,
    keyAnalytics: mergedKeyAnalytics,
  };

  saveProfile(updatedProfile);
  return { updatedProfile, newStarsAwarded, isNewHighScore };
}

export function isSectorUnlocked(
  sectorId: string,
  currentStars: number,
): { unlocked: boolean; starsRequired: number; starsRemaining: number } {
  const sector = CURRICULUM_SECTORS.find((s) => s.id === sectorId);
  if (!sector) return { unlocked: true, starsRequired: 0, starsRemaining: 0 };
  const starsRequired = sector.requiredStarsToUnlock;
  const unlocked = currentStars >= starsRequired;
  return {
    unlocked,
    starsRequired,
    starsRemaining: Math.max(0, starsRequired - currentStars),
  };
}

export const UPGRADE_CATALOG = {
  deflectorShields: [
    {
      level: 1,
      cost: 250,
      desc: 'Absorbs 1 typing error per stage without breaking combo',
    },
    {
      level: 2,
      cost: 650,
      desc: 'Absorbs 2 typing errors per stage without breaking combo',
    },
    {
      level: 3,
      cost: 1200,
      desc: 'Absorbs 3 typing errors per stage without breaking combo',
    },
  ],
  hyperdriveReactor: [
    {
      level: 1,
      cost: 300,
      desc: '+20% Overdrive energy charge rate on combo streaks',
    },
    {
      level: 2,
      cost: 750,
      desc: '+40% Overdrive energy charge rate on combo streaks',
    },
    {
      level: 3,
      cost: 1400,
      desc: '+60% Overdrive energy charge rate on combo streaks',
    },
  ],
  precisionSensors: [
    {
      level: 1,
      cost: 200,
      desc: '+15% wider strike timing window for PERFECT scores',
    },
    {
      level: 2,
      cost: 500,
      desc: '+30% wider strike timing window for PERFECT scores',
    },
    {
      level: 3,
      cost: 950,
      desc: '+45% wider strike timing window for PERFECT scores',
    },
  ],
  themes: [
    {
      id: 'CYAN' as TrailColorTheme,
      name: 'Cyan Nebula',
      cost: 0,
      color: '#06b6d4',
    },
    {
      id: 'AMBER' as TrailColorTheme,
      name: 'Solar Flare',
      cost: 350,
      color: '#f59e0b',
    },
    {
      id: 'EMERALD' as TrailColorTheme,
      name: 'Ion Emerald',
      cost: 450,
      color: '#10b981',
    },
    {
      id: 'VIOLET' as TrailColorTheme,
      name: 'Pulsar Violet',
      cost: 600,
      color: '#8b5cf6',
    },
    {
      id: 'SUPERNOVA' as TrailColorTheme,
      name: 'Supernova Prism',
      cost: 900,
      color: '#f43f5e',
    },
  ],
  audioCores: [
    {
      id: 'CYBER_SYNTH' as AudioSynthCore,
      name: 'Cyber Synth (Default)',
      cost: 0,
      desc: 'Harmonic dual-oscillator space synth',
    },
    {
      id: 'RETRO_8BIT' as AudioSynthCore,
      name: '8-Bit Retro Arcade',
      cost: 300,
      desc: 'Classic chiptune square wave blasters',
    },
    {
      id: 'DEEP_SPACE' as AudioSynthCore,
      name: 'Deep Space Drone',
      cost: 450,
      desc: 'Smooth sine-wave bass resonant chimes',
    },
    {
      id: 'NEO_ACOUSTIC' as AudioSynthCore,
      name: 'Neo Acoustic Harp',
      cost: 600,
      desc: 'Warm triangular bells and melodic tones',
    },
  ],
};
