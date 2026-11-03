import type { Clock } from './clock';
import {
  DEFAULT_PROFILE,
  PlayerProfileSchema,
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

/** What importing a Backup comes to: the new Profile, or a refusal. */
export type BackupImport =
  | { ok: true; profile: PlayerProfile }
  | { ok: false; message: string };

/**
 * A Backup file for the Profile: its JSON text. It is the Save's own fields,
 * so it carries `version: 1`, and the same schema checks it on the way back.
 */
export function exportBackup(profile: PlayerProfile): string {
  // The schema keeps only the Save's own fields, so a Profile that carries
  // more (the total of Stars a screen reads) exports as the Save would.
  return JSON.stringify(
    { ...SaveFieldsSchema.parse(profile), version: 1 },
    null,
    2,
  );
}

/**
 * The names of the Profile's own fields. A Backup exported before versions
 * existed is the whole Profile as JSON, so it carries these (`totalStars`
 * included, which the game no longer saves but old exports wrote out).
 */
const PROFILE_FIELDS: ReadonlySet<string> = new Set([
  ...Object.keys(SaveFieldsSchema.shape).filter((field) => field !== 'version'),
  'totalStars',
]);

/** Whether an unversioned object holds at least one field of a Profile. */
const hasProfileContent = (value: unknown): boolean =>
  typeof value === 'object' &&
  value !== null &&
  Object.keys(value).some((field) => PROFILE_FIELDS.has(field));

/**
 * Checks a Backup file's text with the Save's schema. Text that isn't JSON or a
 * `version` that isn't 1 is refused (with the "newer version" message when the
 * `version` is a number above 1, the "isn't a Backup" one otherwise); a wrong field is read the way a Save's is, so
 * that field is defaulted or clamped and the rest imported. A Backup exported before
 * versions existed is read as version 1, but only when it holds real Profile
 * content: `{}` or unrelated JSON is refused instead of becoming a fresh
 * Profile. A Backup that says `version: 1` is accepted even when sparse, since
 * a missing field takes its default. Nothing is stored or changed here: the
 * caller replaces the Profile only on `ok`.
 */
export function parseBackup(text: string): BackupImport {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, message: NOT_A_BACKUP_MESSAGE };
  }
  const version =
    typeof value === 'object' && value !== null && 'version' in value
      ? value.version
      : undefined;
  if (typeof version === 'number' && version > 1) {
    return { ok: false, message: NEWER_BACKUP_MESSAGE };
  }
  const versioned = version !== undefined;
  if (!versioned && !hasProfileContent(value)) {
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
   * Reads the Save. Nothing stored gives a fresh Profile. A wrong field loses
   * only that field (see the schema); a missing field takes its default, and
   * an unversioned Save is read as version 1. Text that isn't JSON, JSON that
   * isn't an object and an unknown version are moved aside, and the player
   * starts fresh. The notice shows when a Save was moved aside now, or an
   * earlier one was and the player has not dismissed the notice.
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
