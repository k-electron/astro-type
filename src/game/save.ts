import type { PlayerProfile } from '../types/game';

/**
 * Where the game keeps its Save. The game never touches browser storage
 * itself: the app passes localStorage, tests pass memory.
 */
export interface SaveStorage {
  /** The stored Save as parsed JSON, or null when there is none. */
  load(): unknown | null;
  save(profile: PlayerProfile): void;
}

export interface MemorySaveStorage extends SaveStorage {
  /** The last Profile the game saved, or null if it never saved. */
  readonly saved: PlayerProfile | null;
}

/** In-memory Save storage for tests. `initial` is a Save as JSON.parse'd today. */
export function createMemoryStorage(initial?: unknown): MemorySaveStorage {
  let stored: unknown = initial ?? null;
  let saved: PlayerProfile | null = null;
  return {
    load: () => stored,
    save: (profile) => {
      stored = profile;
      saved = profile;
    },
    get saved() {
      return saved;
    },
  };
}
