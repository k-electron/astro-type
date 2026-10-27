import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGame } from '../game/createGame';
import { UNREADABLE_SAVE_NOTICE } from '../game/save';
import { clearStage, STAGE_ID, startStage } from '../game/testHelpers';
import { createLocalStorageSave } from './storage';

/**
 * The Save in the player's browser. The Save module decides what a stored
 * value means; the adapter only moves bytes, and must never lose them: an
 * unreadable Save is kept where the player (or a repair) can still find it.
 * These tests run the real adapter over a stand-in for localStorage.
 */

const SAVE_KEY = 'astrotype_profile_v1';
const UNREADABLE_KEY = 'astrotype_profile_v1_unreadable';

/** What localStorage does, in a Map. */
function memoryLocalStorage() {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

let browserStorage: ReturnType<typeof memoryLocalStorage>;

beforeEach(() => {
  browserStorage = memoryLocalStorage();
  vi.stubGlobal('localStorage', browserStorage);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** The game as the app builds it at start-up: the real adapter over the browser's storage. */
const openGame = () => createGame({ storage: createLocalStorageSave() });

describe('a Save that cannot be read', () => {
  it.each([
    ['is not text this game can parse', 'not json at all {{{'],
    [
      'has a field the Save does not allow',
      '{ "totalCredits": "lots",\n  "stagesProgress": {} }',
    ],
  ])('is moved aside exactly as it was, when it %s', (_why, raw) => {
    browserStorage.setItem(SAVE_KEY, raw);

    const game = openGame();

    expect(game.getLoadNotice()).toBe(UNREADABLE_SAVE_NOTICE);
    expect(game.getProfile().totalCredits).toBe(0);
    expect(browserStorage.getItem(UNREADABLE_KEY)).toBe(raw);
    expect(browserStorage.getItem(SAVE_KEY)).toBeNull();
  });

  it('is still kept on the next visit, which starts fresh without a notice', () => {
    const raw = '{ "totalCredits": "lots" }';
    browserStorage.setItem(SAVE_KEY, raw);
    openGame();

    const nextVisit = openGame();

    expect(nextVisit.getLoadNotice()).toBeNull();
    expect(browserStorage.getItem(UNREADABLE_KEY)).toBe(raw);
  });

  it('is still kept after the player has played on from a fresh start', () => {
    const raw = 'garbage';
    browserStorage.setItem(SAVE_KEY, raw);
    const game = openGame();
    startStage(game, STAGE_ID);
    clearStage(game, { seconds: 60 });

    const nextVisit = openGame();

    expect(nextVisit.getLoadNotice()).toBeNull();
    expect(browserStorage.getItem(UNREADABLE_KEY)).toBe(raw);
  });
});

describe('a first visit', () => {
  it('starts fresh with no notice and sets nothing aside', () => {
    const game = openGame();

    expect(game.getLoadNotice()).toBeNull();
    expect(game.getProfile().totalStars).toBe(0);
    expect(browserStorage.getItem(UNREADABLE_KEY)).toBeNull();
  });
});

describe('a Save that can be read', () => {
  it('brings back what the last visit saved', () => {
    const game = openGame();
    startStage(game, STAGE_ID);
    clearStage(game, { seconds: 60 });

    const nextVisit = openGame();

    expect(nextVisit.getLoadNotice()).toBeNull();
    expect(nextVisit.getProfile().totalStars).toBe(3);
    expect(browserStorage.getItem(UNREADABLE_KEY)).toBeNull();
  });
});
