import type { Clock } from './clock';
import {
  DEFAULT_PROFILE,
  PlayerProfileSchema,
  SAVE_VERSION,
  SaveFieldsSchema,
  type PlayerProfile,
} from './schemas';

/**
 * The Save module. It is the only code that reads or writes the Save: it
 * checks what storage holds against the one Save schema, decides what an
 * unreadable Save means, and writes the Profile back. The store never touches
 * browser storage, and a storage adapter only moves bytes.
 */

/** What storage holds under the Save's key. */
export type StoredSave =
  /** Nothing is stored. */
  | { kind: 'empty' }
  /** Something is stored, parsed from JSON. */
  | { kind: 'found'; value: unknown }
  /** Something is stored that isn't JSON at all. */
  | { kind: 'garbled' };

/**
 * Where the Save physically lives. The app passes localStorage, tests pass
 * memory. An adapter does raw reads and writes only; the rules are below.
 */
export interface SaveStorage {
  read(): StoredSave;
  write(profile: PlayerProfile): void;
  /**
   * Copy the stored Save, untouched, to a place of its own named for `stamp`
   * (an ISO-8601 time), never over an earlier copy; set the notice flag; and
   * only once the copy is safe leave nothing under the Save's own key. Never
   * deletes the Save before the copy exists.
   */
  moveAside(stamp: string): void;
  /** Whether a Save was moved aside and the player has not dismissed the notice. */
  noticePending(): boolean;
  /** The player dismissed the notice: forget the flag. */
  clearNotice(): void;
}

/** Where the Save lives in the browser's localStorage. */
export const SAVE_KEY = 'astrotype_profile_v1';

/**
 * The key an unreadable Save was moved to before each copy had its own. A copy
 * made now is `UNREADABLE_SAVE_KEY_<ISO-8601 time>`, with `_2`, `_3` and so on
 * when that key is taken. This legacy key is never written or touched.
 */
export const UNREADABLE_SAVE_KEY = 'astrotype_profile_v1_unreadable';

/** The first key a copy made at `stamp` (an ISO-8601 time) is tried under. */
export const unreadableSaveKey = (stamp: string): string =>
  `${UNREADABLE_SAVE_KEY}_${stamp}`;

/** Set to "1" when a Save is moved aside; cleared when the player dismisses the notice. */
export const UNREADABLE_NOTICE_KEY = 'astrotype_profile_v1_unreadable_notice';

export const UNREADABLE_SAVE_NOTICE =
  "Your saved progress couldn't be read, so you're starting fresh.";

/** Why a Backup was refused: the file isn't one this game can read at all. */
export const NOT_A_BACKUP_MESSAGE =
  "That file isn't a Backup, so your progress was left as it was.";

/** Why a Backup was refused: its `version` is a number above the one this game writes. */
export const NEWER_BACKUP_MESSAGE =
  'That Backup was made by a newer version of the game, so your progress was left as it was.';

/**
 * Why a Backup was refused: its `version` is missing or a number below the one
 * this game writes. What it holds was measured by older rules, so none of it is
 * read.
 */
export const OLDER_BACKUP_MESSAGE =
  "That Backup was made before the game's rules changed, so your progress was left as it was.";

/** What importing a Backup comes to: the new Profile, or a refusal. */
export type BackupImport =
  | { ok: true; profile: PlayerProfile }
  | { ok: false; message: string };

/**
 * What a stored value's `version` says about it, before anything else is read:
 * one rule for the Save and for a Backup, so the two cannot disagree.
 * - `current`: an object at `SAVE_VERSION`, read field by field.
 * - `older`: an object with no `version`, or a number below `SAVE_VERSION`.
 * - `newer`: an object whose `version` is a number above `SAVE_VERSION`.
 * - `unknown`: anything else, which can't be told from a damaged Save.
 */
type StoredVersion = 'current' | 'older' | 'newer' | 'unknown';

function storedVersionOf(value: unknown): StoredVersion {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return 'unknown';
  }
  const version: unknown = 'version' in value ? value.version : undefined;
  if (version === undefined) return 'older';
  if (typeof version !== 'number') return 'unknown';
  if (version < SAVE_VERSION) return 'older';
  return version > SAVE_VERSION ? 'newer' : 'current';
}

/**
 * A Backup file for the Profile: its JSON text. It is the Save's own fields,
 * so it carries `version: SAVE_VERSION`, and the same schema checks it on the
 * way back.
 */
export function exportBackup(profile: PlayerProfile): string {
  // The schema keeps only the Save's own fields, so a Profile that carries
  // more (the total of Stars a screen reads) exports as the Save would.
  return JSON.stringify(SaveFieldsSchema.parse(profile), null, 2);
}

/**
 * Checks a Backup file's text. Text that isn't JSON, isn't an object or has a
 * `version` that isn't a number is refused as "not a Backup". A number above
 * `SAVE_VERSION` is refused as made by a newer game, and a missing `version` or
 * a number below it as made before the rules changed. Only a Backup at
 * `SAVE_VERSION` is read, the way a Save is: a wrong field is defaulted or
 * clamped and the rest imported. Nothing is stored or changed here: the caller
 * replaces the Profile only on `ok`.
 */
export function parseBackup(text: string): BackupImport {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, message: NOT_A_BACKUP_MESSAGE };
  }
  const version = storedVersionOf(value);
  if (version === 'older') {
    return { ok: false, message: OLDER_BACKUP_MESSAGE };
  }
  if (version === 'newer') {
    return { ok: false, message: NEWER_BACKUP_MESSAGE };
  }
  if (version === 'unknown') {
    return { ok: false, message: NOT_A_BACKUP_MESSAGE };
  }
  const result = PlayerProfileSchema.safeParse(value);
  return result.success
    ? { ok: true, profile: result.data }
    : { ok: false, message: NOT_A_BACKUP_MESSAGE };
}

export interface LoadedSave {
  profile: PlayerProfile;
  /** The line Academy Home shows when the Save was unreadable, else null. */
  notice: string | null;
}

export interface Save {
  /**
   * Reads the Save. Nothing stored gives a fresh Profile, and so does a Save
   * of an older version (none, or a number below the current one): it is
   * left where it is without a notice, and the next write replaces it. A wrong
   * field loses only that field (see the schema); a missing field takes its
   * default. Text that isn't JSON, JSON that isn't an object, a version that
   * isn't a number and a version above the current one are moved aside, and the
   * player starts fresh. The notice shows when a Save was moved aside now, or
   * an earlier one was and the player has not dismissed the notice.
   */
  load(): LoadedSave;
  write(profile: PlayerProfile): void;
  /** The player dismissed the notice: it stops showing on later loads too. */
  dismissNotice(): void;
}

/**
 * @param clock Gives the time a moved-aside Save is named for.
 */
export function createSave(storage: SaveStorage, clock: Clock): Save {
  /** What was found: a Profile, nothing, or something that can't be a Save. */
  const readStored = (): PlayerProfile | 'unreadable' => {
    const stored = storage.read();
    if (stored.kind === 'empty') return DEFAULT_PROFILE;
    if (stored.kind === 'garbled') return 'unreadable';
    // A stored JSON `null` is the same as nothing stored.
    if (stored.value === null) return DEFAULT_PROFILE;
    const version = storedVersionOf(stored.value);
    if (version === 'older') return DEFAULT_PROFILE;
    if (version !== 'current') return 'unreadable';
    const result = PlayerProfileSchema.safeParse(stored.value);
    return result.success ? result.data : 'unreadable';
  };

  return {
    load() {
      const read = readStored();
      if (read === 'unreadable') {
        storage.moveAside(new Date(clock.now()).toISOString());
        return { profile: DEFAULT_PROFILE, notice: UNREADABLE_SAVE_NOTICE };
      }
      return {
        profile: read,
        notice: storage.noticePending() ? UNREADABLE_SAVE_NOTICE : null,
      };
    },
    write: (profile) => storage.write(profile),
    dismissNotice: () => storage.clearNotice(),
  };
}
