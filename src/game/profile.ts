/**
 * The Profile module: the player's Credits, Stars, Cosmetics,
 * settings, Stage progress and Logbook, and the commands that change them. Every
 * command saves through the one `updateProfile`.
 *
 * The Run reads this module and this module reads nothing of the Run: no
 * phase, no current Stage, no Drone.
 */
import type { FlightLog } from '../analytics/keystroke';
import { foldRun } from '../analytics/logbook';
import type { RunFacts } from '../analytics/runReport';
import { unlocksSector } from '../curriculum/curriculum';
import {
  DEFAULT_PROFILE,
  type PlayerProfile,
  type Settings,
  type StageProgress,
  StageProgressSchema,
  totalStarsOf,
} from './schemas';
import {
  type CatalogItemId,
  type CatalogKind,
  catalogEntry,
  type CosmeticEntry,
} from './catalog';
import { type Clock, localDay } from './clock';
import type { Moment } from './moments';
import {
  type BackupImport,
  createSave,
  parseBackup,
  type SaveStorage,
} from './save';

/** What a cleared Run gives the Profile. */
export interface StageResult {
  score: number;
  wpm: number;
  accuracy: number;
  maxStreak: number;
  starsEarned: number;
  creditsEarned: number;
  /** The Run's Keystrokes and what else it knows, which the Logbook folds in. */
  flightLog: FlightLog;
  facts: RunFacts;
}

/**
 * The Profile after a cleared Run, and what the clear means for the Debrief.
 * `stageId` is the Sector Stage that was cleared, whose entry keeps the best
 * result and its Stars; null for a Free Flight, which is practice: it leaves no
 * Stage entry and earns no Stars, but its Credits count and its typing folds
 * into the Logbook like any cleared Run's, on the local day of `now`.
 */
export function recordStageResult(
  currentProfile: PlayerProfile,
  stageId: string | null,
  result: StageResult,
  now: number,
): { updatedProfile: PlayerProfile } & Omit<StageRecord, 'unlockedSector'> {
  const afterRun: PlayerProfile = {
    ...currentProfile,
    totalCredits: currentProfile.totalCredits + result.creditsEarned,
    logbook: foldRun(
      currentProfile.logbook,
      result.flightLog,
      result.facts,
      localDay(now),
    ),
  };
  if (stageId === null) {
    return {
      updatedProfile: afterRun,
      newStarsAwarded: 0,
      isNewHighScore: false,
    };
  }

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

  const updatedProfile: PlayerProfile = {
    ...afterRun,
    stagesProgress: {
      ...currentProfile.stagesProgress,
      [stageId]: updatedStageProgress,
    },
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

/**
 * What buying an item announces, by its kind: a new kind is a build error
 * until it says what it sounds like.
 */
const PURCHASE_MOMENT: Record<CatalogKind, Moment | null> = {
  trail: { type: 'equip' },
  // A Sound Kit is sound state, not a moment: it just starts sounding.
  soundKit: null,
  burst: { type: 'equip' },
  backdrop: { type: 'equip' },
  ship: { type: 'equip' },
  hull: { type: 'equip' },
};

/** Where the player stands with a Cosmetic: whether they own it, wear it, and can pay for it. */
export interface CosmeticStatus {
  owned: boolean;
  equipped: boolean;
  affordable: boolean;
}

export function cosmeticStatus(
  profile: PlayerProfile,
  entry: CosmeticEntry,
): CosmeticStatus {
  const { totalCredits } = profile;
  const { owned, equipped }: { owned: readonly string[]; equipped: string } =
    profile.cosmetics[entry.kind];
  return {
    owned: owned.includes(entry.id),
    equipped: equipped === entry.id,
    affordable: totalCredits >= entry.price,
  };
}

/**
 * What the Profile becomes when the player buys a Cosmetic: bought and
 * equipped (one already owned is equipped for nothing). Null when it changes
 * nothing: a Cosmetic already equipped, or Credits short of the price.
 */
export function purchaseOf(
  profile: PlayerProfile,
  itemId: CatalogItemId,
): Pick<PlayerProfile, 'totalCredits' | 'cosmetics'> | null {
  const entry = catalogEntry(itemId);
  const { cosmetics, totalCredits } = profile;
  const ownedIds: readonly string[] = cosmetics[entry.kind].owned;
  const status = cosmeticStatus(profile, entry);
  if (status.equipped) return null;
  const isOwned = status.owned;
  if (!isOwned && !status.affordable) return null;
  return {
    totalCredits: isOwned ? totalCredits : totalCredits - entry.price,
    cosmetics: {
      ...cosmetics,
      [entry.kind]: {
        equipped: entry.id,
        owned: isOwned ? ownedIds : [...ownedIds, entry.id],
      },
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
   * Buys or equips a Cosmetic at the price the catalog gives. False, and
   * nothing changes, when it is already equipped or unaffordable.
   */
  buy: (itemId: CatalogItemId) => boolean;
  /**
   * Replaces the Profile with a Backup's, and saves it. A Backup that fails
   * the Save's checks is refused: the Profile and the Save are left as they were.
   */
  importProfile: (text: string) => BackupImport;
  /** Wipes Stars and Stage progress; Credits, Cosmetics and the Logbook stay. */
  wipeCurriculumAchievements: () => void;
  /** Back to a fresh Profile. */
  resetProgress: () => void;
  /** Clears the notice that a Save was moved aside, for good (it stays gone after a reload). */
  dismissLoadNotice: () => void;
  /**
   * Takes in a cleared Run's result: Credits, the Logbook and, for a Sector
   * Stage, its Stars and bests. `stageId` is null for a Free Flight, which
   * leaves no Stage entry.
   */
  recordStageResult: (
    stageId: string | null,
    result: StageResult,
    now: number,
  ) => StageRecord;
}

export type ProfileSlice = ProfileState & ProfileCommands;

export interface ProfileDeps {
  storage: SaveStorage;
  /** Names a moved-aside Save for the time it was moved. */
  clock: Clock;
  /** Told of a purchase as it happens. */
  emit: (moment: Moment) => void;
}

/**
 * The Profile's part of the game's one store: the Profile loaded from the
 * Save, and its commands. `set` and `get` are the store's, seen through the
 * Profile's fields only.
 */
export function createProfileSlice(
  { storage, clock, emit }: ProfileDeps,
  set: (partial: Partial<ProfileState>) => void,
  get: () => ProfileState,
): ProfileSlice {
  const save = createSave(storage, clock);
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
      const moment = PURCHASE_MOMENT[catalogEntry(itemId).kind];
      if (moment) emit(moment);
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

    dismissLoadNotice: () => {
      save.dismissNotice();
      set({ loadNotice: null });
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
