import type { PlayerProfile } from '../../src/game/schemas';
import type { SaveStorage, StoredSave } from '../../src/game/save';

export interface MemorySaveStorage extends SaveStorage {
  /** The last Profile the game saved, or null if it never saved. */
  readonly saved: PlayerProfile | null;
  /** The Save that was moved aside as unreadable, as it was stored. */
  readonly movedAside: unknown;
}

/**
 * In-memory Save storage, the stand-in for localStorage in every test layer. `initial` is any value `JSON.parse` could
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
