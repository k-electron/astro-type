import {
  SAVE_KEY,
  type SaveStorage,
  type StoredSave,
  UNREADABLE_NOTICE_KEY,
  unreadableSaveKey,
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
    moveAside(stamp) {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw === null) return;
        // Each copy has a key of its own, so an earlier one is never overwritten.
        const first = unreadableSaveKey(stamp);
        let key = first;
        for (let n = 2; localStorage.getItem(key) !== null; n++) {
          key = `${first}_${n}`;
        }
        // Copy first, then flag the notice, and only then clear the Save's own
        // key, so the Save is never gone before the copy is safe.
        localStorage.setItem(key, raw);
        localStorage.setItem(UNREADABLE_NOTICE_KEY, '1');
        localStorage.removeItem(SAVE_KEY);
      } catch {
        // Storage quota or error: leave the Save where it is.
      }
    },
    noticePending() {
      try {
        return localStorage.getItem(UNREADABLE_NOTICE_KEY) !== null;
      } catch {
        return false;
      }
    },
    clearNotice() {
      try {
        localStorage.removeItem(UNREADABLE_NOTICE_KEY);
      } catch {
        // Storage error: the notice may show again after a reload.
      }
    },
  };
}
