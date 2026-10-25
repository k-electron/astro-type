import type { SaveStorage, StoredSave } from '../game/save';

const STORAGE_KEY = 'astrotype_profile_v1';
/** Where an unreadable Save is moved to, untouched. */
const UNREADABLE_KEY = 'astrotype_profile_v1_unreadable';

/**
 * Save storage in the browser's localStorage. The app passes this to the game.
 * It only moves bytes: the Save module decides what they mean.
 */
export function createLocalStorageSave(): SaveStorage {
  return {
    read(): StoredSave {
      let raw: string | null;
      try {
        raw = localStorage.getItem(STORAGE_KEY);
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      } catch {
        // Storage quota or error
      }
    },
    moveAside() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw === null) return;
        // Copy first, and only clear the Save's own key once the copy is safe.
        localStorage.setItem(UNREADABLE_KEY, raw);
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Storage quota or error: leave the Save where it is.
      }
    },
  };
}
