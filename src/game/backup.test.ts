import { describe, expect, it } from 'vitest';
import { createGame, createMemoryStorage } from './createGame';
import { exportBackup } from './save';

// A Backup is the Profile exported to a file (ticket #25). The browser journeys
// check what the player sees; these check the Profile and the Save directly.

const stage = (starsEarned: number) => ({
  stageId: 's1-l1',
  completed: true,
  starsEarned,
});

function gameWith(save?: Record<string, unknown>) {
  const storage = createMemoryStorage(save);
  return { storage, game: createGame({ storage }) };
}

describe('importing a Backup', () => {
  it('brings back the Profile it was exported from, and saves it', () => {
    const { game: playedGame } = gameWith({
      totalCredits: 900,
      stagesProgress: { 's1-l1': stage(3) },
    });
    const backup = exportBackup(playedGame.getProfile());
    expect(JSON.parse(backup).version).toBe(1);

    const { game, storage } = gameWith();
    const outcome = game.store.getState().importProfile(backup);

    expect(outcome.ok).toBe(true);
    expect(game.getProfile().totalStars).toBe(3);
    expect(game.getProfile().totalCredits).toBe(900);
    expect(storage.saved?.totalCredits).toBe(900);
  });

  it('reads a Backup exported before versions existed as version 1', () => {
    const { game } = gameWith();
    const unversioned = JSON.stringify({
      totalCredits: 50,
      stagesProgress: { 's1-l1': stage(2) },
    });

    expect(game.store.getState().importProfile(unversioned).ok).toBe(true);
    expect(game.getProfile().version).toBe(1);
    expect(game.getProfile().totalStars).toBe(2);
  });

  it.each([
    ['not JSON', '{"totalCredits": 5'],
    ['an unknown version', JSON.stringify({ version: 2, totalCredits: 5 })],
    ['a wrong field', JSON.stringify({ totalCredits: 'lots' })],
    ['not an object', 'null'],
    ['an empty file', ''],
  ])('refuses %s, leaving the Profile and the Save untouched', (_, text) => {
    const { game, storage } = gameWith({
      totalCredits: 321,
      stagesProgress: { 's1-l1': stage(3) },
    });
    const before = game.getProfile();

    const outcome = game.store.getState().importProfile(text);

    expect(outcome.ok).toBe(false);
    expect(outcome.ok === false && outcome.message).toBeTruthy();
    expect(game.getProfile()).toEqual(before);
    expect(storage.saved).toBeNull();
  });
});
