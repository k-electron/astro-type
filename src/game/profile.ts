import type { KeyAnalytics, PlayerProfile, StageProgress } from '../types/game';
import { CURRICULUM_SECTORS } from '../data/curriculum';
import {
  PlayerProfileSchema,
  type Settings,
  totalStarsOf,
} from '../store/schemas';
import { type CatalogItemId, catalogEntry } from './catalog';

/** The Profile a new player starts with: every field at its default. */
export const DEFAULT_PROFILE: PlayerProfile = PlayerProfileSchema.parse({});

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
  now: number,
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
    lastPlayedAt: now,
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
    totalStars: totalStarsOf(newStagesProgress),
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

/** Whether going from `previousStars` to `nextStars` takes the fleet past some Sector's gate. */
export function unlocksSector(
  previousStars: number,
  nextStars: number,
): boolean {
  return CURRICULUM_SECTORS.some(
    (sector) =>
      !isSectorUnlocked(sector.id, previousStars).unlocked &&
      isSectorUnlocked(sector.id, nextStars).unlocked,
  );
}

/**
 * The Profile after the player changes some settings. Each setting's rules are
 * here: a volume is kept between 0 and 1, and a volume of 0 turns its channel
 * off while any volume above 0 turns it on (unless the patch says otherwise).
 * Turning a channel off keeps its volume.
 */
export function settingsAfter(
  profile: PlayerProfile,
  patch: Partial<Settings>,
): PlayerProfile {
  const next = { ...profile, ...patch };
  if (patch.soundVolume !== undefined) {
    next.soundVolume = clampVolume(patch.soundVolume);
    next.soundEnabled = patch.soundEnabled ?? next.soundVolume > 0;
  }
  if (patch.musicVolume !== undefined) {
    next.musicVolume = clampVolume(patch.musicVolume);
    next.musicEnabled = patch.musicEnabled ?? next.musicVolume > 0;
  }
  return next;
}

const clampVolume = (volume: number): number =>
  Math.max(0, Math.min(1, volume));

/** Where a Cosmetic's kind keeps what the player owns and what is equipped, in the Save. */
const COSMETIC_FIELDS = {
  trail: { owned: 'unlockedThemes', equipped: 'equippedTrailTheme' },
  core: { owned: 'unlockedAudioCores', equipped: 'equippedAudioCore' },
} as const;

/**
 * What the Profile becomes when the player buys an item: an Upgrade's next
 * level at its price, or a Cosmetic bought and equipped (a Cosmetic already
 * owned is equipped for nothing). Null when it changes nothing: an Upgrade at
 * its last level, or Credits short of the price.
 */
export function purchaseOf(
  profile: PlayerProfile,
  itemId: CatalogItemId,
): Pick<PlayerProfile, 'totalCredits' | 'upgrades'> | null {
  const entry = catalogEntry(itemId);
  const { upgrades, totalCredits } = profile;

  if (entry.kind === 'upgrade') {
    const level = upgrades[entry.field];
    const price = entry.prices[level];
    if (price === undefined || totalCredits < price) return null;
    return {
      totalCredits: totalCredits - price,
      upgrades: { ...upgrades, [entry.field]: level + 1 },
    };
  }

  const { owned, equipped } = COSMETIC_FIELDS[entry.kind];
  const ownedIds: readonly string[] = upgrades[owned];
  const isOwned = ownedIds.includes(entry.id);
  if (!isOwned && totalCredits < entry.price) return null;
  return {
    totalCredits: isOwned ? totalCredits : totalCredits - entry.price,
    upgrades: {
      ...upgrades,
      [equipped]: entry.id,
      [owned]: isOwned ? ownedIds : [...ownedIds, entry.id],
    },
  };
}
