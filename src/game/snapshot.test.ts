import { describe, expect, it } from 'vitest';
import type { PlayerEvent } from './createGame';
import {
  type Game,
  hitPerfect,
  newGame,
  SAMPLE_TEXT,
  STAGE_ID,
  startedGame,
  startStage,
  targetKey,
  WRONG_KEY,
} from './testHelpers';

/**
 * The one settled snapshot, through the headless game. A screen reads
 * `getState()` and re-renders when `subscribe` fires, so what matters to a
 * player is that it never sees a half-made move (the screen has changed but
 * the Run or the Debrief has not) and that one move is one change. These tests
 * look at the snapshot from inside the notification, which is where React reads it.
 */

type Snapshot = ReturnType<Game['getState']>;

const OPEN_HANGAR: PlayerEvent = { type: 'OPEN_HANGAR' };
const PAUSE: PlayerEvent = { type: 'PRESS_PAUSE' };
const CLOSE: PlayerEvent = { type: 'PRESS_CLOSE' };
const REPLAY: PlayerEvent = { type: 'PRESS_REPLAY' };

/** Listen to a game, keeping the snapshot each notification saw at the moment it fired. */
function watch(game: Game): { seen: Snapshot[]; stop: () => void } {
  const seen: Snapshot[] = [];
  const stop = game.subscribe(() => {
    seen.push(game.getState());
  });
  return { seen, stop };
}

/** A game with Stage 1 started and `typed` characters typed, as hits. */
function runningGame(typed = 5): Game {
  const game = startedGame();
  hitPerfect(game, typed);
  return game;
}

describe('one notification per move', () => {
  it('starting a Stage notifies once, with the screen, the phase and the Run together', () => {
    const game = newGame();
    const { seen } = watch(game);

    startStage(game, STAGE_ID);

    expect(seen).toHaveLength(1);
    const [state] = seen;
    expect(state.screen).toBe('flight-deck');
    expect(state.phase).toBe('running');
    expect(state.run.currentStage.id).toBe(STAGE_ID);
    expect(state.run.currentCharIndex).toBe(0);
  });

  it('a move between screens notifies once, with the new screen and its opener together', () => {
    const game = newGame();
    const { seen } = watch(game);

    game.send(OPEN_HANGAR);
    expect(seen).toHaveLength(1);
    expect(seen[0].screen).toBe('hangar');
    expect(seen[0].opener).toBe('academy-home');

    game.send(CLOSE);
    expect(seen).toHaveLength(2);
    expect(seen[1].screen).toBe('academy-home');
  });

  it('pausing notifies once, with the Pause Menu and the paused phase together', () => {
    const game = runningGame();
    const { seen } = watch(game);

    game.send(PAUSE);

    expect(seen).toHaveLength(1);
    expect(seen[0].screen).toBe('pause-menu');
    expect(seen[0].phase).toBe('paused');
  });

  it('a hit notifies once, and the notification already shows the hit', () => {
    const game = runningGame();
    game.step(30);
    const before = game.getState().run;
    const key = targetKey(game);
    const { seen } = watch(game);

    game.pressKey(key);

    expect(seen).toHaveLength(1);
    expect(seen[0].run.currentCharIndex).toBe(before.currentCharIndex + 1);
    expect(seen[0].run.score).toBeGreaterThan(before.score);
  });

  it('a Miss notifies once, and the notification already shows the Miss', () => {
    const game = runningGame();
    game.step(30);
    const before = game.getState().run;
    const { seen } = watch(game);

    game.pressKey(WRONG_KEY);

    expect(seen).toHaveLength(1);
    expect(seen[0].run.currentCharIndex).toBe(before.currentCharIndex);
    expect(seen[0].run).not.toBe(before);
  });

  it('a step that moves the Drones notifies once, with the Run Time already advanced', () => {
    const game = runningGame();
    const before = game.getState();
    const { seen } = watch(game);

    game.step(1);

    expect(seen).toHaveLength(1);
    expect(seen[0].runTime).toBeGreaterThan(before.runTime);
    expect(seen[0].run).not.toBe(before.run);
  });

  it('a key and a step that change nothing do not notify', () => {
    const game = runningGame();
    game.send(PAUSE);
    const { seen } = watch(game);

    game.step(30); // no Run Time passes while paused
    game.pressKey('Shift'); // a key that types no character is ignored

    expect(seen).toHaveLength(0);
  });

  it('a listener that has unsubscribed hears nothing more', () => {
    const game = newGame();
    const { seen, stop } = watch(game);
    game.send(OPEN_HANGAR);
    stop();

    game.send(CLOSE);

    expect(seen).toHaveLength(1);
  });
});

describe('clearing a Stage settles the machine, the Run and the Profile together', () => {
  /** A Stage 1 Run one correct key short of the end, with its Credits on record. */
  function oneKeyFromClearing() {
    const game = startedGame();
    hitPerfect(game, SAMPLE_TEXT.length - 1);
    game.step(30);
    return { game, creditsBefore: game.getState().profile.totalCredits };
  }

  it('the last key notifies once, and the notification shows the Debrief, the result and the updated Profile', () => {
    const { game, creditsBefore } = oneKeyFromClearing();
    expect(game.getState().profile.stagesProgress[STAGE_ID]).toBeUndefined();
    const { seen } = watch(game);

    game.pressKey(targetKey(game));

    expect(seen).toHaveLength(1);
    const [state] = seen;
    expect(state.screen).toBe('debrief');
    expect(state.phase).toBe('cleared');
    expect(state.debrief).not.toBeNull();
    expect(state.debrief?.starsEarned).toBeGreaterThan(0);
    expect(state.profile.stagesProgress[STAGE_ID]?.completed).toBe(true);
    expect(state.profile.totalCredits).toBeGreaterThan(creditsBefore);
  });

  it('no notification on the way ever shows the Debrief without its result, or a cleared Run without the Profile recording it', () => {
    const game = startedGame();
    const { seen } = watch(game);

    hitPerfect(game, SAMPLE_TEXT.length);
    game.send(OPEN_HANGAR);
    game.send(CLOSE);

    expect(seen.length).toBeGreaterThan(SAMPLE_TEXT.length);
    expect(seen.some((state) => state.screen === 'debrief')).toBe(true);
    for (const state of seen) {
      if (state.screen === 'debrief' || state.phase === 'cleared') {
        expect(state.debrief).not.toBeNull();
        expect(state.profile.stagesProgress[STAGE_ID]?.completed).toBe(true);
      }
    }
  });

  it('Replay from the Debrief notifies once, with the new Run and the flight deck together', () => {
    const { game } = oneKeyFromClearing();
    game.pressKey(targetKey(game));
    expect(game.getState().screen).toBe('debrief');
    const { seen } = watch(game);

    game.send(REPLAY);

    expect(seen).toHaveLength(1);
    const [state] = seen;
    expect(state.screen).toBe('flight-deck');
    expect(state.phase).toBe('running');
    expect(state.run.currentStage.id).toBe(STAGE_ID);
    expect(state.run.currentCharIndex).toBe(0);
    expect(state.run.score).toBe(0);
  });
});

describe('the snapshot keeps its identity until something changes', () => {
  it('getState gives the same snapshot until a move changes it', () => {
    const game = runningGame();
    const first = game.getState();
    expect(game.getState()).toBe(first);

    game.step(1);

    expect(game.getState()).not.toBe(first);
  });

  it('opening and closing a menu leaves the Run the very same object', () => {
    const game = newGame();
    startStage(game, STAGE_ID);
    game.send(PAUSE);
    const run = game.getState().run;

    game.send(OPEN_HANGAR);
    expect(game.getState().screen).toBe('hangar');
    expect(game.getState().run).toBe(run);

    game.send(CLOSE);
    expect(game.getState().screen).toBe('pause-menu');
    expect(game.getState().run).toBe(run);
  });

  it('a move on a screen that has no Run in play leaves the Run the same object', () => {
    const game = newGame();
    const run = game.getState().run;

    game.send(OPEN_HANGAR);
    game.send(CLOSE);

    expect(game.getState().run).toBe(run);
  });

  it('a hit, a Miss and a step each hand back a new Run', () => {
    const game = runningGame();
    game.step(30);

    const beforeHit = game.getState().run;
    game.pressKey(targetKey(game));
    const afterHit = game.getState().run;
    expect(afterHit).not.toBe(beforeHit);

    game.pressKey(WRONG_KEY);
    const afterMiss = game.getState().run;
    expect(afterMiss).not.toBe(afterHit);

    game.step(1);
    expect(game.getState().run).not.toBe(afterMiss);
  });
});
