import type { PlayerProfile } from '../../src/game/schemas';
import type { SaveStorage, StoredSave } from '../../src/game/save';

export interface MemorySaveStorage extends SaveStorage {
  /** The last Profile the game saved, or null if it never saved. */
  readonly saved: PlayerProfile | null;
  /**
   * Every Save that was moved aside as unreadable, as it was stored, oldest
   * first. Empty when nothing was moved.
   */
  readonly movedAside: readonly unknown[];
  /** The stamp each move-aside was given (`movedAside[i]` was moved at `movedAsideStamps[i]`). */
  readonly movedAsideStamps: readonly string[];
  /** Whether the notice flag is set: a Save was moved aside and nobody dismissed the notice. */
  readonly noticeFlagged: boolean;
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
  const movedAside: unknown[] = [];
  const movedAsideStamps: string[] = [];
  let noticeFlagged = false;
  return {
    read: () => stored,
    write: (profile) => {
      stored = { kind: 'found', value: profile };
      saved = profile;
    },
    moveAside: (stamp) => {
      movedAside.push(stored.kind === 'found' ? stored.value : undefined);
      movedAsideStamps.push(stamp);
      noticeFlagged = true;
      stored = { kind: 'empty' };
    },
    noticePending: () => noticeFlagged,
    clearNotice: () => {
      noticeFlagged = false;
    },
    get saved() {
      return saved;
    },
    get movedAside() {
      return movedAside;
    },
    get movedAsideStamps() {
      return movedAsideStamps;
    },
    get noticeFlagged() {
      return noticeFlagged;
    },
  };
}
