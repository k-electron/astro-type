import { PlayerProfileSchema, type PlayerProfile } from '../store/schemas';
import { DEFAULT_PROFILE } from './profile';

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
   * Move the stored Save to its own "unreadable" place, untouched, and leave
   * nothing under the Save's own key. Never deletes it.
   */
  moveAside(): void;
}

export const UNREADABLE_SAVE_NOTICE =
  "Your saved progress couldn't be read, so you're starting fresh.";

export interface LoadedSave {
  profile: PlayerProfile;
  /** The line Academy Home shows when the Save was unreadable, else null. */
  notice: string | null;
}

export interface Save {
  /**
   * Reads the Save. Nothing stored gives a fresh Profile. A missing field
   * takes its default, and an unversioned Save is read as version 1. A Save
   * with a wrong field or an unknown version is moved aside, and the player
   * starts fresh with a notice.
   */
  load(): LoadedSave;
  write(profile: PlayerProfile): void;
}

export function createSave(storage: SaveStorage): Save {
  return {
    load() {
      const stored = storage.read();
      if (stored.kind === 'empty') {
        return { profile: DEFAULT_PROFILE, notice: null };
      }
      if (stored.kind === 'found') {
        // A stored JSON `null` is the same as nothing stored.
        if (stored.value === null) {
          return { profile: DEFAULT_PROFILE, notice: null };
        }
        const result = PlayerProfileSchema.safeParse(stored.value);
        if (result.success) {
          return { profile: result.data, notice: null };
        }
      }
      storage.moveAside();
      return { profile: DEFAULT_PROFILE, notice: UNREADABLE_SAVE_NOTICE };
    },
    write: (profile) => storage.write(profile),
  };
}

export interface MemorySaveStorage extends SaveStorage {
  /** The last Profile the game saved, or null if it never saved. */
  readonly saved: PlayerProfile | null;
  /** The Save that was moved aside as unreadable, as it was stored. */
  readonly movedAside: unknown;
}

/**
 * In-memory Save storage for tests. `initial` is any value `JSON.parse` could
 * give, even a malformed one on purpose.
 */
export function createMemoryStorage(initial?: unknown): MemorySaveStorage {
  let stored: StoredSave =
    initial === undefined
      ? { kind: 'empty' }
      : { kind: 'found', value: initial };
  let saved: PlayerProfile | null = null;
  let movedAside: unknown;
  return {
    read: () => stored,
    write: (profile) => {
      stored = { kind: 'found', value: profile };
      saved = profile;
    },
    moveAside: () => {
      movedAside = stored.kind === 'found' ? stored.value : undefined;
      stored = { kind: 'empty' };
    },
    get saved() {
      return saved;
    },
    get movedAside() {
      return movedAside;
    },
  };
}
