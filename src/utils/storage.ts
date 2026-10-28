import {
  SAVE_KEY,
  type SaveStorage,
  type StoredSave,
  UNREADABLE_SAVE_KEY,
} from '../game/save';

/**
 * Save storage in the browser's localStorage. The app passes this to the game.
 * It only moves bytes: the Save module decides what they mean.
 */
export function createLocalStorageSave(): SaveStorage {
  return {
    read(): StoredSave {
      let raw: string | null;
      try {
        raw = localStorage.getItem(SAVE_KEY);
      } catch {
        return { kind: 'empty' };
      }
      if (raw === null) return { kind: 'empty' };
      try {
        return { kind: 'found', value: JSON.parse(raw) };
      } catch {
        return { kind: 'garbled' };
      }
    },
    write(profile) {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(profile));
      } catch {
        // Storage quota or error
      }
    },
    moveAside() {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw === null) return;
        // Copy first, and only clear the Save's own key once the copy is safe.
        localStorage.setItem(UNREADABLE_SAVE_KEY, raw);
        localStorage.removeItem(SAVE_KEY);
      } catch {
        // Storage quota or error: leave the Save where it is.
      }
    },
  };
}
