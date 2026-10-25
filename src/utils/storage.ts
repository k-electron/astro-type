import type { SaveStorage } from '../game/save';

const STORAGE_KEY = 'astrotype_profile_v1';

/** Save storage in the browser's localStorage. The app passes this to the game. */
export function createLocalStorageSave(): SaveStorage {
  return {
    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    },
    save(profile) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      } catch {
        // Storage quota or error
      }
    },
  };
}
