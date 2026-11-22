import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type Clock, createSteppedClock } from '../game/clock';
import { createGame } from '../game/game';
import { SAVE_VERSION } from '../game/schemas';
import {
  SAVE_KEY,
  UNREADABLE_NOTICE_KEY,
  UNREADABLE_SAVE_KEY,
  UNREADABLE_SAVE_NOTICE,
  unreadableSaveKey,
} from '../game/save';
import {
  clearStage,
  STAGE_ID,
  startStage,
} from '../../tests/shared/testHelpers';
import { createLocalStorageSave } from './localStorageSave';

/**
 * The Save in the player's browser. The Save module decides what a stored
 * value means; the adapter only moves bytes, and must never lose them: an
 * unreadable Save is kept where the player (or a repair) can still find it.
 * These tests run the real adapter over a stand-in for localStorage.
 */

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
const openGame = (clock: Clock = createSteppedClock()) =>
  createGame({ storage: createLocalStorageSave(), clock });

/** The key a Save is first kept under when it is moved aside at the clock's time. */
const copyKey = (clock: Clock) =>
  unreadableSaveKey(new Date(clock.now()).toISOString());

describe('a Save that cannot be read', () => {
  it.each([
    ['is not text this game can parse', 'not json at all {{{'],
    [
      'is from a newer version than this game knows',
      `{ "version": ${SAVE_VERSION + 1},\n  "totalCredits": 5 }`,
    ],
    ['is JSON but not a Save', '[1, 2,   3]'],
  ])('is moved aside exactly as it was, when it %s', (_why, raw) => {
    browserStorage.setItem(SAVE_KEY, raw);
    const clock = createSteppedClock();

    const game = openGame(clock);

    expect(game.getState().loadNotice).toBe(UNREADABLE_SAVE_NOTICE);
    expect(game.getState().profile.totalCredits).toBe(0);
    expect(browserStorage.getItem(copyKey(clock))).toBe(raw);
    expect(browserStorage.getItem(SAVE_KEY)).toBeNull();
    expect(browserStorage.getItem(UNREADABLE_NOTICE_KEY)).toBe('1');
  });

  it('is not moved aside when only a field is wrong: it loads, and nothing is set aside', () => {
    const raw = `{ "version": ${SAVE_VERSION},\n  "totalCredits": "lots",\n  "stagesProgress": {} }`;
    browserStorage.setItem(SAVE_KEY, raw);
    const clock = createSteppedClock();

    const game = openGame(clock);

    expect(game.getState().loadNotice).toBeNull();
    expect(browserStorage.getItem(copyKey(clock))).toBeNull();
    expect(browserStorage.getItem(UNREADABLE_NOTICE_KEY)).toBeNull();
  });

  it('leaves an earlier copy under the old key untouched', () => {
    browserStorage.setItem(UNREADABLE_SAVE_KEY, 'a copy from an older version');
    browserStorage.setItem(SAVE_KEY, 'garbage');
    const clock = createSteppedClock();

    openGame(clock);

    expect(browserStorage.getItem(UNREADABLE_SAVE_KEY)).toBe(
      'a copy from an older version',
    );
    expect(browserStorage.getItem(copyKey(clock))).toBe('garbage');
  });

  it('never overwrites an earlier copy: a second unreadable Save at a later time is kept beside the first', () => {
    const clock = createSteppedClock();
    browserStorage.setItem(SAVE_KEY, 'first garbage');
    openGame(clock);
    const firstKey = copyKey(clock);

    clock.step(600);
    browserStorage.setItem(SAVE_KEY, 'second garbage');
    openGame(clock);
    const secondKey = copyKey(clock);

    expect(secondKey).not.toBe(firstKey);
    expect(browserStorage.getItem(firstKey)).toBe('first garbage');
    expect(browserStorage.getItem(secondKey)).toBe('second garbage');
  });

  it('never overwrites an earlier copy: Saves moved aside at the very same time are kept under a suffix', () => {
    const clock = createSteppedClock();
    browserStorage.setItem(SAVE_KEY, 'first garbage');
    openGame(clock);
    browserStorage.setItem(SAVE_KEY, 'second garbage');
    openGame(clock);
    browserStorage.setItem(SAVE_KEY, 'third garbage');
    openGame(clock);

    expect(browserStorage.getItem(copyKey(clock))).toBe('first garbage');
    expect(browserStorage.getItem(`${copyKey(clock)}_2`)).toBe(
      'second garbage',
    );
    expect(browserStorage.getItem(`${copyKey(clock)}_3`)).toBe('third garbage');
  });

  it('shows the notice again on the next visit, which starts fresh and keeps the copy', () => {
    const raw = 'garbage';
    browserStorage.setItem(SAVE_KEY, raw);
    const clock = createSteppedClock();
    openGame(clock);

    const nextVisit = openGame(createSteppedClock());

    expect(nextVisit.getState().loadNotice).toBe(UNREADABLE_SAVE_NOTICE);
    expect(nextVisit.getState().profile.totalStars).toBe(0);
    expect(browserStorage.getItem(copyKey(clock))).toBe(raw);
    expect(browserStorage.getItem(`${copyKey(clock)}_2`)).toBeNull();
  });

  it('shows the notice again after the player has played on from a fresh start, without moving the fresh Save aside', () => {
    const raw = 'garbage';
    browserStorage.setItem(SAVE_KEY, raw);
    const clock = createSteppedClock();
    const game = openGame(clock);
    const key = copyKey(clock); // before the Run moves the clock on
    startStage(game, STAGE_ID);
    clearStage(game, { seconds: 60 });

    const nextVisit = openGame(createSteppedClock());

    expect(nextVisit.getState().loadNotice).toBe(UNREADABLE_SAVE_NOTICE);
    expect(nextVisit.getState().profile.totalStars).toBe(3);
    expect(browserStorage.getItem(key)).toBe(raw);
    expect(browserStorage.getItem(`${key}_2`)).toBeNull();
  });

  it('stops showing the notice once the player dismisses it, and still keeps the copy', () => {
    const raw = 'garbage';
    browserStorage.setItem(SAVE_KEY, raw);
    const clock = createSteppedClock();
    const game = openGame(clock);

    game.dismissLoadNotice();

    expect(game.getState().loadNotice).toBeNull();
    expect(browserStorage.getItem(UNREADABLE_NOTICE_KEY)).toBeNull();
    const nextVisit = openGame(createSteppedClock());
    expect(nextVisit.getState().loadNotice).toBeNull();
    expect(browserStorage.getItem(copyKey(clock))).toBe(raw);
  });
});

describe('a Save from before the game’s rules changed', () => {
  // An older Save (a lower version, or none) is discarded without a fuss: no
  // notice, nothing set aside, and the old text stays where it is until the
  // next write replaces it.
  const OLDER_SAVES = [
    [
      'has version 4, whose high scores were graded',
      '{ "version": 4,\n  "totalCredits": 5,\n  "highScore": 9000 }',
    ],
    [
      'has version 3, with Upgrades',
      '{ "version": 3,\n  "totalCredits": 5,\n  "upgrades": { "deflectorShields": 1 } }',
    ],
    ['has version 2', '{ "version": 2,\n  "totalCredits": 5 }'],
    ['has version 1', '{ "version": 1,\n  "totalCredits": 5 }'],
    ['has no version', '{ "totalCredits": 5 }'],
  ];

  it.each(OLDER_SAVES)(
    'starts fresh, with no notice and nothing set aside, when it %s',
    (_why, raw) => {
      browserStorage.setItem(SAVE_KEY, raw);

      const game = openGame();

      expect(game.getState().loadNotice).toBeNull();
      expect(game.getState().profile.totalCredits).toBe(0);
      expect(browserStorage.getItem(SAVE_KEY)).toBe(raw);
      expect(browserStorage.getItem(UNREADABLE_NOTICE_KEY)).toBeNull();
      expect([...browserStorage.items.keys()]).toEqual([SAVE_KEY]);
    },
  );

  it('is replaced by the current Save on the next write, and the next visit reads that one', () => {
    browserStorage.setItem(SAVE_KEY, '{ "version": 4,\n  "totalCredits": 5 }');
    const game = openGame();

    startStage(game, STAGE_ID);
    clearStage(game, { seconds: 60 });

    const stored = JSON.parse(browserStorage.getItem(SAVE_KEY) ?? 'null');
    expect(stored.version).toBe(SAVE_VERSION);
    expect([...browserStorage.items.keys()]).toEqual([SAVE_KEY]);
    const nextVisit = openGame();
    expect(nextVisit.getState().loadNotice).toBeNull();
    expect(nextVisit.getState().profile.totalStars).toBe(3);
  });

  it('still shows a notice that an earlier unreadable Save left pending, and sets no new copy aside', () => {
    browserStorage.setItem(UNREADABLE_NOTICE_KEY, '1');
    browserStorage.setItem(SAVE_KEY, '{ "version": 1,\n  "totalCredits": 5 }');

    const game = openGame();

    expect(game.getState().loadNotice).toBe(UNREADABLE_SAVE_NOTICE);
    expect(game.getState().profile.totalCredits).toBe(0);
    expect([...browserStorage.items.keys()].sort()).toEqual(
      [SAVE_KEY, UNREADABLE_NOTICE_KEY].sort(),
    );
  });
});

describe('a first visit', () => {
  it('starts fresh with no notice and sets nothing aside', () => {
    const game = openGame();

    expect(game.getState().loadNotice).toBeNull();
    expect(game.getState().profile.totalStars).toBe(0);
    expect(browserStorage.getItem(UNREADABLE_SAVE_KEY)).toBeNull();
    expect(browserStorage.getItem(UNREADABLE_NOTICE_KEY)).toBeNull();
  });
});

describe('a Save that can be read', () => {
  it('brings back what the last visit saved', () => {
    const game = openGame();
    startStage(game, STAGE_ID);
    clearStage(game, { seconds: 60 });

    const nextVisit = openGame();

    expect(nextVisit.getState().loadNotice).toBeNull();
    expect(nextVisit.getState().profile.totalStars).toBe(3);
    expect(browserStorage.getItem(UNREADABLE_NOTICE_KEY)).toBeNull();
  });
});
