/**
 * The Profile module: the player's Credits, Stars, Upgrades, Cosmetics,
 * settings and Stage progress, and the commands that change them. Every
 * command saves through the one `updateProfile`.
 *
 * The Run reads this module and this module reads nothing of the Run: no
 * phase, no current Stage, no Drone. What a Run takes from the Profile is its
 * `Loadout`, derived on each call.
 */
import { unlocksSector } from '../curriculum/curriculum';
import {
  DEFAULT_PROFILE,
  type KeyAnalytics,
  KeyAnalyticsSchema,
  type PlayerProfile,
  type Settings,
  type StageProgress,
  StageProgressSchema,
  totalStarsOf,
} from './schemas';
import {
  type CatalogItemId,
  catalogEntry,
  type CoreEntry,
  type TrailEntry,
} from './catalog';
import type { Moment } from './moments';
import {
  type BackupImport,
  createSave,
  parseBackup,
  type SaveStorage,
} from './save';

export { DEFAULT_PROFILE };

/** What a Run takes from the Profile: its Upgrades, as the rules read them. */
export interface Loadout {
  /** Deflector Shields: Misses a Run absorbs, counted when the Run begins. */
  shields: number;
  /** Precision Sensors: widen the Judgement windows. */
  sensors: number;
  /** Hyperdrive Reactor: charges Overdrive faster. */
  reactor: number;
}

export function loadoutOf(profile: PlayerProfile): Loadout {
  const { deflectorShields, precisionSensors, hyperdriveReactor } =
    profile.upgrades;
  return {
    shields: deflectorShields,
    sensors: precisionSensors,
    reactor: hyperdriveReactor,
  };
}

/** What a cleared Run gives the Profile. */
export interface StageResult {
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
}

/** The Profile after a cleared Run, and what the clear means for the Debrief. */
export function recordStageResult(
  currentProfile: PlayerProfile,
  stageId: string,
  result: StageResult,
  now: number,
): {
  updatedProfile: PlayerProfile;
  newStarsAwarded: number;
  isNewHighScore: boolean;
} {
  const prevProgress =
    currentProfile.stagesProgress[stageId] ??
    StageProgressSchema.parse({ stageId });

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
    const existing = mergedKeyAnalytics[char] ?? KeyAnalyticsSchema.parse({});
    mergedKeyAnalytics[char] = {
      hits: existing.hits + stats.hits,
      misses: existing.misses + stats.misses,
    };
  });

  const updatedProfile: PlayerProfile = {
    ...currentProfile,
    totalCredits: currentProfile.totalCredits + result.creditsEarned,
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

/** Where the player stands with a Cosmetic: whether they own it, wear it, and can pay for it. */
export interface CosmeticStatus {
  owned: boolean;
  equipped: boolean;
  affordable: boolean;
}

export function cosmeticStatus(
  profile: PlayerProfile,
  entry: TrailEntry | CoreEntry,
): CosmeticStatus {
  const { owned, equipped } = COSMETIC_FIELDS[entry.kind];
  const { upgrades, totalCredits } = profile;
  const ownedIds: readonly string[] = upgrades[owned];
  return {
    owned: ownedIds.includes(entry.id),
    equipped: upgrades[equipped] === entry.id,
    affordable: totalCredits >= entry.price,
  };
}

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
  const status = cosmeticStatus(profile, entry);
  const isOwned = status.owned;
  if (!isOwned && !status.affordable) return null;
  return {
    totalCredits: isOwned ? totalCredits : totalCredits - entry.price,
    upgrades: {
      ...upgrades,
      [equipped]: entry.id,
      [owned]: isOwned ? ownedIds : [...ownedIds, entry.id],
    },
  };
}

// ---- The Profile's place in the store -----------------------------------

/** The Profile's state in the store. */
export interface ProfileState {
  profile: PlayerProfile;
  /** Set when the Save couldn't be read and the player started fresh. */
  loadNotice: string | null;
}

/** What a cleared Stage did to the Profile, for the Debrief. */
export interface StageRecord {
  newStarsAwarded: number;
  isNewHighScore: boolean;
  /** This Run's Stars took the fleet past a Sector's gate. */
  unlockedSector: boolean;
}

/** The Profile's commands. Each one changes the Profile and saves it. */
export interface ProfileCommands {
  /** Changes some settings. Each one's rules are in `settingsAfter`. */
  changeSettings: (patch: Partial<Settings>) => void;
  /**
   * Buys an Upgrade's next level, or buys or equips a Cosmetic, at the price
   * the catalog gives. False, and nothing changes, when it is maxed, owned
   * (an Upgrade) or unaffordable.
   */
  buy: (itemId: CatalogItemId) => boolean;
  /**
   * Replaces the Profile with a Backup's, and saves it. A Backup that fails
   * the Save's checks is refused: the Profile and the Save are left as they were.
   */
  importProfile: (text: string) => BackupImport;
  /** Wipes Stars and Stage progress; Credits and Upgrades stay. */
  wipeCurriculumAchievements: () => void;
  /** Back to a fresh Profile. */
  resetProgress: () => void;
  /** Takes in a cleared Stage's result: Credits, Stars, bests, key analytics. */
  recordStageResult: (
    stageId: string,
    result: StageResult,
    now: number,
  ) => StageRecord;
}

export type ProfileSlice = ProfileState & ProfileCommands;

export interface ProfileDeps {
  storage: SaveStorage;
  /** Told of a purchase as it happens. */
  emit: (moment: Moment) => void;
}

/**
 * The Profile's part of the game's one store: the Profile loaded from the
 * Save, and its commands. `set` and `get` are the store's, seen through the
 * Profile's fields only.
 */
export function createProfileSlice(
  { storage, emit }: ProfileDeps,
  set: (partial: Partial<ProfileState>) => void,
  get: () => ProfileState,
): ProfileSlice {
  const save = createSave(storage);
  const { profile: savedProfile, notice: loadNotice } = save.load();

  // The one way the Profile changes: the new Profile, and the Save with it.
  const updateProfile = (patch: Partial<PlayerProfile>) => {
    const profile = { ...get().profile, ...patch };
    set({ profile });
    save.write(profile);
  };

  return {
    profile: savedProfile,
    loadNotice,

    changeSettings: (patch) => {
      updateProfile(settingsAfter(get().profile, patch));
    },

    buy: (itemId) => {
      const purchase = purchaseOf(get().profile, itemId);
      if (!purchase) return false;
      updateProfile(purchase);
      // A Synthesizer Voice is sound state, not a moment: it just starts sounding.
      const { kind } = catalogEntry(itemId);
      if (kind === 'upgrade') emit({ type: 'upgrade' });
      else if (kind === 'trail') emit({ type: 'equip' });
      return true;
    },

    importProfile: (text) => {
      const backup = parseBackup(text);
      if (backup.ok) updateProfile(backup.profile);
      return backup;
    },

    wipeCurriculumAchievements: () => {
      updateProfile({ stagesProgress: {} });
    },

    resetProgress: () => {
      updateProfile(DEFAULT_PROFILE);
    },

    recordStageResult: (stageId, result, now) => {
      const before = get().profile;
      const { updatedProfile, newStarsAwarded, isNewHighScore } =
        recordStageResult(before, stageId, result, now);
      updateProfile(updatedProfile);
      return {
        newStarsAwarded,
        isNewHighScore,
        unlockedSector: unlocksSector(
          totalStarsOf(before.stagesProgress),
          totalStarsOf(updatedProfile.stagesProgress),
        ),
      };
    },
  };
}
